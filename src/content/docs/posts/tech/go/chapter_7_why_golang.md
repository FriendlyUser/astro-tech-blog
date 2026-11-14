---
tags: ['go']
title: "Concurrency in Go: goroutines, channels and select"
description: "Start goroutines, wait for them with sync.WaitGroup, pass data over channels, wait on several channels with select, and build a small concurrent request processor."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/241285989.webp
---
Go builds concurrency into the language: the `go` keyword starts a goroutine, and channels let goroutines pass values to each other. This post covers both, plus `select`, and finishes with a small program that processes requests concurrently.

## Goroutines

A goroutine is a function running concurrently with the rest of the program. Goroutines are cheap: they start with a small stack that grows as needed, and the Go runtime schedules many of them onto a smaller number of OS threads. On one CPU core they run concurrently (interleaved); with more cores (`GOMAXPROCS` defaults to the number available) they can run in parallel.

Prefix a function call with `go` to start one:

```go
package main

import (
	"fmt"
	"sync"
)

func sayHello(wg *sync.WaitGroup) {
	defer wg.Done()
	fmt.Println("Hello, world!")
}

func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go sayHello(&wg)
	// do other things
	wg.Wait()
}
```

The `go` statement returns immediately. When `main` returns, the program exits without waiting for other goroutines, so without `wg.Wait()` the greeting may never print. `sync.WaitGroup` is the usual way to wait for a group of goroutines to finish.

## Channels

A channel is a typed pipe between goroutines. `ch <- v` sends, `v := <-ch` receives.

```go
package main

import "fmt"

func writeToChannel(ch chan<- string) {
	ch <- "Hello, world!"
}

func main() {
	ch := make(chan string)
	go writeToChannel(ch)
	msg := <-ch
	fmt.Println(msg)
}
```

`chan<- string` in the parameter list means `writeToChannel` can only send on the channel; the compiler rejects a receive.

The channel from `make(chan string)` is **unbuffered**: a send blocks until another goroutine receives, so the send and receive also synchronise the two goroutines. Here that's why `main` doesn't need a `WaitGroup`: it waits at `<-ch` until the message arrives.

A few more rules worth knowing:

- `make(chan string, 10)` creates a **buffered** channel. Sends only block when the buffer is full.
- The sender can `close(ch)` to signal no more values. `for v := range ch` receives until the channel is closed and drained.
- Sending on a closed channel panics. Receiving from a closed channel returns the zero value immediately; use `v, ok := <-ch` to tell the difference.
- If every goroutine is blocked on channel operations, the runtime stops with `fatal error: all goroutines are asleep - deadlock!`.

## select

`select` waits on several channel operations and runs whichever case is ready first. If more than one is ready, it picks one at random.

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(1 * time.Second)
		ch1 <- "Hello"
	}()
	go func() {
		time.Sleep(2 * time.Second)
		ch2 <- "World"
	}()

	for i := 0; i < 2; i++ {
		select {
		case msg := <-ch1:
			fmt.Println("from ch1:", msg)
		case msg := <-ch2:
			fmt.Println("from ch2:", msg)
		case <-time.After(3 * time.Second):
			fmt.Println("timed out")
		}
	}
}
```

This prints `from ch1: Hello` after one second and `from ch2: World` after two. The `time.After` case is a timeout: if neither channel delivers within three seconds, that case runs instead.

A `default` case is different: it runs *immediately* when no other case is ready, so `select` doesn't block at all. Use it for a non-blocking send or receive, not for a timeout.

## Example: processing requests concurrently

This program simulates a server that receives requests on one channel, handles each one in its own goroutine, and sends results back on another channel.

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Request struct {
	ID      int
	Message string
}

type Response struct {
	ID      int
	Message string
}

func server(requests <-chan Request, responses chan<- Response) {
	var wg sync.WaitGroup
	for req := range requests {
		wg.Add(1)
		go func(req Request) {
			defer wg.Done()
			time.Sleep(time.Second) // simulate work
			responses <- Response{
				ID:      req.ID,
				Message: fmt.Sprintf("Processed request %d: %s", req.ID, req.Message),
			}
		}(req)
	}
	// requests is closed: wait for in-flight work, then signal we're done.
	wg.Wait()
	close(responses)
}

func main() {
	requests := make(chan Request)
	responses := make(chan Response)

	go server(requests, responses)

	go func() {
		for i := 1; i <= 5; i++ {
			requests <- Request{ID: i, Message: fmt.Sprintf("Hello %d", i)}
		}
		close(requests)
	}()

	for res := range responses {
		fmt.Println(res.Message)
	}
}
```

How it fits together:

- `server` ranges over `requests` and starts a goroutine per request, so all five are processed at the same time. The whole run takes about one second, not five.
- A separate goroutine sends the requests and then closes `requests`, which ends the `range` loop in `server`.
- `server` waits for its workers and closes `responses`, which ends the `range` loop in `main`. Without the close, `main` would need to know in advance how many responses to expect.

Sample output:

```text
Processed request 3: Hello 3
Processed request 1: Hello 1
Processed request 5: Hello 5
Processed request 2: Hello 2
Processed request 4: Hello 4
```

The order changes from run to run because the workers finish in whatever order the scheduler lets them. If you need results in request order, sort them by `ID` or write each one into a slice at its index.

## Gotchas

- Always know how a goroutine will stop. A goroutine blocked forever on a channel is a leak.
- Channels aren't the only tool. For shared state such as a counter or a cache, a `sync.Mutex` is often simpler.
- Run tests with `go test -race` to catch data races.

## Further reading

- [A Tour of Go: Concurrency](https://go.dev/tour/concurrency/1)
- [Effective Go: Concurrency](https://go.dev/doc/effective_go#concurrency)
- [Go Concurrency Patterns: Pipelines and cancellation](https://go.dev/blog/pipelines)
