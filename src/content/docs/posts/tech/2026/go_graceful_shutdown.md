---
title: "Graceful shutdown for a Go HTTP server"
description: "Shut down a Go HTTP server without dropping requests: signal.NotifyContext, Server.Shutdown with a timeout, draining workers, BaseContext and a readiness flag."
tags: ["Go", "net/http", "Graceful Shutdown", "Kubernetes", "Signals"]
pubDate: "2026-12-17T16:00:00.000Z"
imgSrc: "/imgs/2026/go_graceful_shutdown.webp"
imgAlt: "A timeline from SIGTERM through readiness off, connection draining and worker drain to exit, inside a 30-second grace period"
---

When a Go server is stopped, by a deploy, a scale-down or Ctrl+C, the default behaviour is to die immediately. Requests in flight get a reset connection, and jobs a background goroutine was halfway through are lost. Graceful shutdown means catching the signal, stopping new work, letting current work finish within a time limit, and then exiting. The standard library has every piece; the work is putting them in the right order.

Examples use Go 1.27. The shutdown sequence was run on the Go playground, with an in-memory listener in place of the TCP port and a cancelled context standing in for the signal.

## The sequence

On SIGTERM, a well-behaved server does this, in order:

1. **Fail its readiness check**, so the load balancer stops sending new requests.
2. **Wait a few seconds** for the load balancer to notice.
3. **Stop accepting connections** and wait for in-flight requests, with a deadline.
4. **If the deadline passes**, cancel the remaining requests and close their connections.
5. **Drain background work** that requests may have queued.
6. **Exit.**

Here is a complete server that does all six. It has a liveness endpoint, a readiness endpoint, a slow endpoint to test draining with, and a small worker pool fed by `POST /jobs`.

```go
package main

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

const (
	readinessDelay  = 5 * time.Second  // let the load balancer notice we're not ready
	shutdownTimeout = 15 * time.Second // let in-flight requests finish
)

func main() {
	if err := run(); err != nil {
		slog.Error("exit", "err", err)
		os.Exit(1)
	}
}

func run() error {
	// ctx is cancelled on the first SIGINT or SIGTERM.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Requests get their own base context, cancelled only if draining takes too long.
	baseCtx, cancelRequests := context.WithCancel(context.Background())
	defer cancelRequests()

	var ready atomic.Bool
	jobs := make(chan string, 100)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, "ok") // liveness: the process is up
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if !ready.Load() {
			http.Error(w, "shutting down", http.StatusServiceUnavailable)
			return
		}
		io.WriteString(w, "ready")
	})
	mux.HandleFunc("POST /jobs", func(w http.ResponseWriter, r *http.Request) {
		select {
		case jobs <- r.URL.Query().Get("name"):
			w.WriteHeader(http.StatusAccepted)
		default:
			http.Error(w, "queue full", http.StatusServiceUnavailable)
		}
	})
	mux.HandleFunc("GET /slow", func(w http.ResponseWriter, r *http.Request) {
		select {
		case <-time.After(3 * time.Second):
			io.WriteString(w, "done")
		case <-r.Context().Done():
			http.Error(w, "cancelled", http.StatusServiceUnavailable)
		}
	})

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return baseCtx },
	}

	// Background workers drain the job queue until it is closed.
	var workers sync.WaitGroup
	for i := range 3 {
		workers.Go(func() {
			for name := range jobs {
				slog.Info("job", "worker", i, "name", name)
				time.Sleep(500 * time.Millisecond) // pretend to work
			}
		})
	}

	serveErr := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", srv.Addr)
		serveErr <- srv.ListenAndServe()
	}()
	ready.Store(true)

	select {
	case err := <-serveErr:
		return err // failed to start, e.g. port in use
	case <-ctx.Done():
	}
	stop() // a second Ctrl+C now kills the process immediately
	slog.Info("shutting down", "cause", context.Cause(ctx))

	// 1. Fail readiness and wait for the load balancer to stop sending traffic.
	ready.Store(false)
	time.Sleep(readinessDelay)

	// 2. Stop accepting connections and wait for in-flight requests.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	err := srv.Shutdown(shutdownCtx)
	if err != nil {
		slog.Warn("requests still running after timeout; cancelling them", "err", err)
		cancelRequests()
		srv.Close()
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	// 3. No more HTTP requests can enqueue jobs; let the workers finish the queue.
	close(jobs)
	workers.Wait()
	slog.Info("stopped")
	return nil
}
```

Run it, start a slow request with `curl localhost:8080/slow`, and press Ctrl+C within three seconds. The log says `shutting down` with `cause="interrupt signal received"`, `/readyz` returns 503 for the next five seconds, the slow request still completes with `done`, the workers finish any queued jobs, and the process exits after logging `stopped`.

The rest of this post walks through the pieces.

## Catching the signal: signal.NotifyContext

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()
```

`NotifyContext` returns a context that is cancelled when one of the listed signals arrives. `os.Interrupt` is Ctrl+C; `syscall.SIGTERM` is what Docker, systemd and Kubernetes send to stop a process. Since Go 1.26, `context.Cause(ctx)` reports which signal it was, as an error such as `terminated signal received` for SIGTERM.

Calling `stop()` as soon as shutdown begins restores the default signal behaviour. A second Ctrl+C then kills the process immediately, which is what a person at a terminal expects when shutdown is taking too long.

## Server.Shutdown and its trap

`srv.Shutdown(ctx)` closes the listeners, closes idle keep-alive connections, and then waits for active connections to finish their current request and go idle. If `ctx` expires first, it returns the context's error, and connections that are still busy are left open. That is why the code calls `srv.Close()` afterwards, which closes them forcibly.

The trap is on the other side. As soon as `Shutdown` is called, `ListenAndServe` returns `http.ErrServerClosed`. If `main` looks like this:

```go
go func() {
	<-ctx.Done()
	srv.Shutdown(context.Background())
}()
log.Fatal(srv.ListenAndServe()) // returns as soon as Shutdown starts, and the process exits
```

then the program exits the moment shutdown starts, and nothing drains. `ListenAndServe` returning means "stopped accepting", not "finished". The fix, used in `run` above, is to run `ListenAndServe` in a goroutine, wait for the signal on the main goroutine, and return only after `Shutdown` has returned. The `serveErr` channel also covers the other case: if the server fails to start, for example because the port is taken, `run` returns that error instead of waiting forever for a signal.

`Shutdown` doesn't know about hijacked connections, such as WebSockets. Register a function with `srv.RegisterOnShutdown` to tell those handlers to close, and track them yourself.

## BaseContext: cancelling requests only when needed

Each request's `r.Context()` is derived from the server's base context, which you can set with `BaseContext`. It is tempting to pass the signal context there, so handlers see the cancellation. Don't: every in-flight request would be cancelled the instant SIGTERM arrives, which is the opposite of draining.

The example uses a separate context that is cancelled only if `Shutdown` times out:

```go
baseCtx, cancelRequests := context.WithCancel(context.Background())
srv.BaseContext = func(net.Listener) context.Context { return baseCtx }
```

During a normal drain, requests run to completion. If draining takes longer than `shutdownTimeout`, `cancelRequests()` tells every handler that respects its context (database queries, outbound HTTP calls, the `select` in `/slow`) to give up, and `srv.Close()` closes the connections.

`Close` does not wait for handlers to return. Anything a handler might still touch after that, like the `jobs` channel here, has to stay safe to use. The `/jobs` handler never blocks, so it has returned long before the workers start draining.

## Draining background workers

Requests often hand work to background goroutines. Those must finish after the HTTP server stops, not before, because until then a request could still enqueue a job. The order in `run` is:

1. `srv.Shutdown` returns, so no handler is running and none can start.
2. `close(jobs)`, so each worker's `for name := range jobs` loop ends once the queue is empty.
3. `workers.Wait()` blocks until all of them have returned.

`workers.Go(func() { ... })` is the `sync.WaitGroup.Go` method added in Go 1.25. It does the `Add(1)` and `defer Done()` for you, which removes the classic bug of calling `Add` inside the goroutine. On older Go, write `workers.Add(1)` before `go func() { defer workers.Done(); ... }()`.

If workers do long jobs, give them a context too, and decide whether a job that can't finish in time should be abandoned and retried later. A job queue that matters should live somewhere durable (a database table, a message broker), so that a killed process loses nothing.

## The readiness flag

Liveness and readiness answer different questions:

- **`/healthz` (liveness)**: is the process alive? It keeps returning 200 during shutdown. If it failed, an orchestrator might restart the container in the middle of draining.
- **`/readyz` (readiness)**: should this instance get new traffic? It returns 503 from the moment shutdown starts.

The flag is an `atomic.Bool`, because handlers read it on many goroutines while `run` writes it. The `readinessDelay` sleep between failing readiness and calling `Shutdown` is the step people skip. Load balancers and service meshes learn about the change asynchronously, so for a few seconds after SIGTERM they can still route new requests to this instance. If the listener is already closed, those requests fail. Five seconds is a reasonable starting point; match it to your probe period and load balancer.

## Kubernetes: fitting inside the grace period

When Kubernetes deletes a pod, it removes the pod from Service endpoints and sends SIGTERM to the containers at roughly the same time, which is why the readiness delay exists. It then waits `terminationGracePeriodSeconds` (30 by default) and sends SIGKILL if the process is still running. SIGKILL can't be caught, so everything above must fit inside that window:

```yaml
spec:
  terminationGracePeriodSeconds: 30
  containers:
    - name: app
      image: example/app:1.0
      ports:
        - containerPort: 8080
      readinessProbe:
        httpGet:
          path: /readyz
          port: 8080
        periodSeconds: 2
        failureThreshold: 1
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
```

The budget for this example is 5 seconds of readiness delay, up to 15 seconds of request draining, and whatever the workers need for the remaining queue, which together must stay under 30 seconds with some margin. If your requests or jobs can legitimately take longer, raise `terminationGracePeriodSeconds` rather than shortening the timeouts until they cut work off. A `preStop` hook, if you add one, runs before SIGTERM is sent, and its time counts against the same grace period.

## Gotchas

- **PID 1 and shells.** If the container starts your binary through a shell (`CMD ./app` in shell form, or a wrapper script), the shell receives SIGTERM and may not forward it. Your program never sees the signal and is SIGKILLed after the grace period. Use the exec form, `CMD ["./app"]`, or `exec ./app` in the script.
- **Set server timeouts.** `ReadHeaderTimeout` (and usually `ReadTimeout`, `WriteTimeout` and `IdleTimeout`) stops slow or idle clients from holding connections open, which also makes shutdown faster.
- **Long-lived responses.** Streaming responses and server-sent events never go idle on their own, so `Shutdown` waits for them until the timeout. Watch `r.Context()` in those handlers, and use `RegisterOnShutdown` to end them early.
- **Test it.** Start the server, send a slow request, send SIGTERM (`kill -TERM <pid>`), and check that the request completes and the process exits with status 0. It's the only way to know the order is right.
- **Windows.** `os.Interrupt` (Ctrl+C) works on Windows. SIGTERM is a Unix convention, so the `syscall.SIGTERM` case matters for containers and Linux servers.

## Further reading

- [`http.Server.Shutdown`](https://pkg.go.dev/net/http#Server.Shutdown)
- [`signal.NotifyContext`](https://pkg.go.dev/os/signal#NotifyContext)
- [`sync.WaitGroup`](https://pkg.go.dev/sync#WaitGroup)
- [Pod termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination) (Kubernetes documentation)
- [Configure liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) (Kubernetes documentation)
