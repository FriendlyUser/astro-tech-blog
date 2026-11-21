---
title: "Rate limiting in Go with golang.org/x/time/rate"
description: "Token-bucket rate limiting in Go: rate.NewLimiter, when to use Allow, Wait or Reserve, per-client limiters with cleanup, and HTTP middleware that returns 429."
tags: ["Go", "Rate Limiting", "net/http", "Middleware", "golang.org/x/time"]
pubDate: "2026-11-01T16:00:00.000Z"
imgSrc: "/imgs/2026/go_rate_limiting.webp"
imgAlt: "A token bucket refilling at a steady rate, with incoming requests either taking a token or bouncing off with a 429"
---

`golang.org/x/time/rate` is the Go team's token-bucket rate limiter. It lives in the `x/` repositories rather than the standard library, but it is the default choice for both sides of rate limiting: protecting your server from clients that send too much, and keeping your own client under a third-party API's limit. This post covers how the bucket works, the three ways to ask it for permission, and a per-IP HTTP middleware that returns `429 Too Many Requests` with a correct `Retry-After`.

Examples use Go 1.27 and `golang.org/x/time` v0.16.0, and were run on the Go playground.

## The token bucket

A limiter has two numbers:

- **`r`, the rate**: tokens added per second, of type `rate.Limit` (a `float64`).
- **`b`, the burst**: the most tokens the bucket can hold.

Each event spends one token. The bucket starts full, so a quiet client can send `b` requests at once, then is held to `r` per second until the bucket refills. A burst of 1 means strictly evenly spaced events.

```go
api := rate.NewLimiter(10, 20)                            // 10 per second, bursts of 20
paced := rate.NewLimiter(rate.Every(200*time.Millisecond), 1) // one every 200 ms, no burst
open := rate.NewLimiter(rate.Inf, 0)                          // no limit; burst is ignored
```

`rate.Every` converts an interval to a rate, which reads better for slow limits like "one every 5 minutes". `SetLimit` and `SetBurst` change a live limiter, for example after a config reload, and a `Limiter` is safe for concurrent use.

## Allow, Wait or Reserve

The limiter offers three ways to take a token, and choosing the right one is most of the design.

**`Allow()`** answers now: true if a token was available (and spends it), false otherwise. Use it when you will drop or reject the event, as a server does with excess requests.

**`Wait(ctx)`** blocks until a token is available, or returns an error if the context is cancelled first. It returns an error immediately if the wait would outlast the context's deadline, rather than sleeping until the deadline and then failing. Use it on the client side, to pace your own outgoing calls.

**`Reserve()`** spends a token now, whether or not one is available yet, and returns a `*Reservation` that says how long you'd have to wait (`Delay()`). You then either wait that long, or call `Cancel()` to give the token back. Use it when you need the delay itself, for example to set `Retry-After`.

Each has an `N` variant (`AllowN`, `WaitN`, `ReserveN`) for events that cost more than one token, such as a batch of records or a large upload. An `N` greater than the burst can never succeed: `WaitN` returns an error and `ReserveN` returns a reservation whose `OK()` is false.

Here they are side by side:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"golang.org/x/time/rate"
)

func main() {
	// Allow: 1 token per second, bucket holds 3.
	lim := rate.NewLimiter(1, 3)
	for i := 0; i < 5; i++ {
		fmt.Print(lim.Allow(), " ")
	}
	fmt.Println()

	// Reserve: how long until a token is available?
	r := lim.Reserve()
	fmt.Println("reserve ok:", r.OK(), "delay:", r.Delay().Round(time.Millisecond))
	r.Cancel()

	// Wait: an outbound client limited to 5 requests per second, no burst.
	out := rate.NewLimiter(5, 1)
	start := time.Now()
	for i := 0; i < 4; i++ {
		if err := out.Wait(context.Background()); err != nil {
			fmt.Println(err)
		}
		fmt.Print(time.Since(start).Round(10*time.Millisecond), " ")
	}
	fmt.Println()

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	fmt.Println("wait with short deadline:", out.Wait(ctx))
	fmt.Println("WaitN over burst:", out.WaitN(context.Background(), 2))
}
```

Output (times rounded):

```text
true true true false false 
reserve ok: true delay: 1s
0s 200ms 400ms 600ms 
wait with short deadline: rate: Wait(n=1) would exceed context deadline
WaitN over burst: rate: Wait(n=2) exceeds limiter's burst 1
```

The first three `Allow` calls drain the bucket and the next two are refused. The reservation says the next token is a second away. The `Wait` loop spaces calls 200 ms apart, the first one immediate because the bucket started with one token. The last two lines show `Wait` refusing up front instead of sleeping uselessly.

## A per-client limiter for an HTTP server

One limiter for the whole server limits total traffic, which is useful as a safety valve but lets one noisy client use up everyone's share. For fairness you want a bucket per client, usually keyed by IP address or by API key. That means a map, a mutex, and a way to forget clients so the map doesn't grow forever:

```go
package main

import (
	"context"
	"math"
	"net"
	"net/http"
	"strconv"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type client struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter keeps one token bucket per client IP.
type IPRateLimiter struct {
	mu      sync.Mutex
	clients map[string]*client
	limit   rate.Limit
	burst   int
	ttl     time.Duration
}

func NewIPRateLimiter(limit rate.Limit, burst int, ttl time.Duration) *IPRateLimiter {
	return &IPRateLimiter{
		clients: make(map[string]*client),
		limit:   limit,
		burst:   burst,
		ttl:     ttl,
	}
}

func (l *IPRateLimiter) get(key string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	c, ok := l.clients[key]
	if !ok {
		c = &client{limiter: rate.NewLimiter(l.limit, l.burst)}
		l.clients[key] = c
	}
	c.lastSeen = time.Now()
	return c.limiter
}

// Cleanup forgets clients that haven't been seen for ttl and returns how many it removed.
func (l *IPRateLimiter) Cleanup(now time.Time) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	removed := 0
	for key, c := range l.clients {
		if now.Sub(c.lastSeen) > l.ttl {
			delete(l.clients, key)
			removed++
		}
	}
	return removed
}

// RunCleanup calls Cleanup every interval until ctx is cancelled.
func (l *IPRateLimiter) RunCleanup(ctx context.Context, interval time.Duration) {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-t.C:
			l.Cleanup(now)
		}
	}
}

// Middleware rejects requests over the limit with 429 and a Retry-After header.
func (l *IPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		res := l.get(clientIP(r)).Reserve()
		if !res.OK() {
			// Only happens if burst is 0: the request can never be allowed.
			http.Error(w, "rate limit misconfigured", http.StatusInternalServerError)
			return
		}
		if d := res.Delay(); d > 0 {
			res.Cancel() // we won't wait, so hand the token back
			w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(d.Seconds()))))
			http.Error(w, http.StatusText(http.StatusTooManyRequests), http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP uses the connection's address. Behind a proxy, see the notes below.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
```

Why `Reserve` instead of `Allow`: `Allow` only says no. `Reserve` says "no, but in 400 ms", which is what `Retry-After` needs, and `Cancel` returns the token so a rejected request doesn't make the client's wait longer. `Retry-After` takes whole seconds, so the delay is rounded up.

`lastSeen` is updated under the same lock as the map, so `Cleanup` only removes clients that have been idle for the whole TTL. If one comes back later, it gets a new, full bucket, which is what its old bucket would have refilled to anyway, as long as the TTL is longer than the time to refill (`burst / rate`). The limiter itself is used outside the map lock, because `rate.Limiter` does its own locking.

Wiring it up in `main`:

```go
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	ipl := NewIPRateLimiter(2, 5, 3*time.Minute) // 2 req/s per IP, bursts of 5
	go ipl.RunCleanup(ctx, time.Minute)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/items", listItems)

	srv := &http.Server{Addr: ":8080", Handler: ipl.Middleware(mux)}
	go srv.ListenAndServe()
	<-ctx.Done()
	srv.Shutdown(context.Background())
}
```

(That needs `os`, `os/signal` and a `listItems` handler, and real code should check the errors from `ListenAndServe` and `Shutdown`.)

A test pins down the behaviour, using `httptest` so no server is needed. With a limit of 2 per second and a burst of 2, the third quick request from one IP is rejected while another IP is unaffected:

```go
package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestMiddleware(t *testing.T) {
	ipl := NewIPRateLimiter(2, 2, 3*time.Minute)
	h := ipl.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))

	send := func(ip string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("GET", "/", nil)
		req.RemoteAddr = ip + ":51234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		return rec
	}

	for i, want := range []int{200, 200, 429} {
		rec := send("203.0.113.7")
		if rec.Code != want {
			t.Fatalf("request %d: got %d, want %d", i+1, rec.Code, want)
		}
		if want == 429 && rec.Header().Get("Retry-After") != "1" {
			t.Errorf("Retry-After = %q, want 1", rec.Header().Get("Retry-After"))
		}
	}
	if rec := send("198.51.100.4"); rec.Code != 200 {
		t.Errorf("other client got %d, want 200", rec.Code)
	}

	if n := ipl.Cleanup(time.Now().Add(4 * time.Minute)); n != 2 {
		t.Errorf("Cleanup removed %d clients, want 2", n)
	}
}
```

The rejected request gets `Retry-After: 1`: the next token is about half a second away, rounded up to a whole second.

## Choosing the key

The IP in `r.RemoteAddr` is the address of whoever opened the TCP connection. Behind a load balancer or reverse proxy, that is the proxy, and every client shares one bucket.

- If you're behind a proxy you control, read the client IP from the header it sets (`X-Forwarded-For`, `X-Real-IP`, or the provider's own), and **only trust that header from the proxy's addresses**. Anyone can send `X-Forwarded-For` directly, and a limiter that trusts it can be bypassed by sending a different value with each request.
- For authenticated APIs, key by API key or user ID instead. It is fairer (an office behind one NAT address isn't one client) and harder to dodge.
- For IPv6, consider keying by the /64 prefix, since one client can usually choose from a whole /64 of addresses.

## Gotchas

- **The limiter is in memory.** With three replicas behind a load balancer, each one allows the full rate, so the effective limit is three times what you configured, and it resets on deploy. For a hard global limit you need shared state, such as Redis, or limiting at the gateway. In-process limiting is still the right first layer, because it's cheap and protects each instance.
- **A huge burst defeats the limit for a while.** The bucket starts full, so `NewLimiter(1, 1000)` lets a new client send 1,000 requests at once.
- **`Wait` holds goroutines.** On a server, blocking request goroutines in `Wait` until a token arrives lets a flood of slow requests tie up memory and connections. Reject with 429 instead, and save `Wait` for outbound clients.
- **`AllowN` and `ReserveN` take a `time.Time`**; pass `time.Now()`. The explicit time exists for tests and for replaying events.
- **For log spam, use `rate.Sometimes`.** `rate.Sometimes{First: 3, Interval: time.Minute}` runs a function the first 3 times and then at most once a minute, which is a tidy way to stop one error from flooding the logs.

## Further reading

- [`golang.org/x/time/rate` documentation](https://pkg.go.dev/golang.org/x/time/rate)
- [Token bucket](https://en.wikipedia.org/wiki/Token_bucket) (Wikipedia)
- [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110), section 10.2.3 defines `Retry-After`
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585), section 4 defines `429 Too Many Requests`
