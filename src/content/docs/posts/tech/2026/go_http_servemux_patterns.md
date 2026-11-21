---
title: "Routing in Go's net/http with method and wildcard patterns"
description: "How Go's ServeMux patterns work: methods, {id} and {path...} wildcards, {$}, precedence and conflicts, automatic 405s, and middleware as plain functions."
tags: ["Go", "HTTP", "Routing", "Middleware", "REST API"]
pubDate: "2026-04-04T16:00:00.000Z"
imgSrc: "/imgs/2026/go_http_servemux_patterns.webp"
imgAlt: "A routing tree from a ServeMux to method and wildcard patterns with their status codes, and a DELETE request answered with 405"
---

Since Go 1.22, the standard library's `http.ServeMux` matches on HTTP method and path wildcards, so `mux.HandleFunc("GET /items/{id}", ...)` works with no third-party router. For a typical JSON API that covers what people used to pull in chi or gorilla/mux for. This post goes past the basics: how the pattern syntax works in detail, which pattern wins when several match, what you get for free (405 responses, `HEAD`), and how to write middleware without a framework.

Examples use Go 1.26 and were run on the Go playground. For a gentler introduction to `net/http` and `html/template`, see [Web development in Go: net/http routing and html/template](/posts/tech/go/chapter_9_why_golang/).

## Pattern syntax

A pattern has up to three parts:

```text
[METHOD ][HOST]/[PATH]
```

- **Method**, followed by a space: `GET /items`. Without one, the pattern matches every method. A `GET` pattern also matches `HEAD` requests.
- **Host**: `api.example.com/items`. Only requests for that host match. Patterns with a host take precedence over patterns without one.
- **Path**, with optional wildcards.

There are three kinds of wildcard:

| Wildcard | Matches | Example |
|---|---|---|
| `{name}` | exactly one path segment | `GET /items/{id}` matches `/items/42`, not `/items/42/edit` |
| `{name...}` | the rest of the path, must be last | `GET /files/{path...}` matches `/files/css/site.css` |
| `{$}` | the end of the path, after a trailing slash | `GET /{$}` matches only `/`, not `/anything` |

A pattern that ends in a slash, such as `/static/`, still matches the whole subtree, as it always did. That is why `GET /` on its own is a catch-all, and why you need `GET /{$}` for a handler that serves only the home page.

Wildcard values come from `r.PathValue("id")`. They are always strings, so parse and validate them yourself. Path segments are unescaped before matching, so `/files/a%2Fb` gives `PathValue("path")` the value `a/b`. Keep that in mind if a wildcard ends up in a filesystem path.

## A worked example

This program builds a small item API with a logging middleware, then sends it requests with `httptest`, so you can run it with `go run .` and see every routing rule in the output without starting a server:

```go
package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Item struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type store struct {
	mu    sync.Mutex
	items map[int]Item
	next  int
}

func (s *store) get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "id must be a number", http.StatusBadRequest)
		return
	}
	s.mu.Lock()
	item, ok := s.items[id]
	s.mu.Unlock()
	if !ok {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (s *store) create(w http.ResponseWriter, r *http.Request) {
	var in Item
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil || in.Name == "" {
		http.Error(w, "body must be {\"name\": \"...\"}", http.StatusBadRequest)
		return
	}
	s.mu.Lock()
	s.next++
	in.ID = s.next
	s.items[in.ID] = in
	s.mu.Unlock()
	w.Header().Set("Location", "/items/"+strconv.Itoa(in.ID))
	writeJSON(w, http.StatusCreated, in)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// statusRecorder remembers the status code a handler wrote.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

// Unwrap lets http.ResponseController reach the real writer (Flush, deadlines).
func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

func logRequests(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			log.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"pattern", r.Pattern, // set by ServeMux (Go 1.23+)
				"status", rec.status,
				"took", time.Since(start).Round(time.Microsecond),
			)
		})
	}
}

func requireJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.Header.Get("Content-Type"), "application/json") {
			http.Error(w, "Content-Type must be application/json", http.StatusUnsupportedMediaType)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func newMux(s *store) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /items/{id}", s.get)
	mux.Handle("POST /items", requireJSON(http.HandlerFunc(s.create)))
	mux.HandleFunc("GET /files/{path...}", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "file %q\n", r.PathValue("path"))
	})
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "home")
	})
	return mux
}

func main() {
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey || a.Key == "took" {
				return slog.Attr{} // keep the output below short and stable
			}
			return a
		},
	}))
	s := &store{items: map[int]Item{}}
	handler := logRequests(log)(newMux(s))

	do := func(method, target, body string) {
		req := httptest.NewRequest(method, target, strings.NewReader(body))
		if body != "" {
			req.Header.Set("Content-Type", "application/json")
		}
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		fmt.Printf("%s %s -> %d %s", method, target, rec.Code, rec.Body.String())
		if allow := rec.Header().Get("Allow"); allow != "" {
			fmt.Printf("   Allow: %s\n", allow)
		}
	}

	do("POST", "/items", `{"name":"lamp"}`)
	do("GET", "/items/1", "")
	do("GET", "/items/abc", "")
	do("DELETE", "/items/1", "")
	do("GET", "/files/css/site.css", "")
	do("GET", "/files/a%2Fb", "")
	do("GET", "/", "")
	do("GET", "/nope", "")
}
```

The output, one log line from the middleware and one line from `do` per request:

```text
level=INFO msg=request method=POST path=/items pattern="POST /items" status=201
POST /items -> 201 {"id":1,"name":"lamp"}
level=INFO msg=request method=GET path=/items/1 pattern="GET /items/{id}" status=200
GET /items/1 -> 200 {"id":1,"name":"lamp"}
level=INFO msg=request method=GET path=/items/abc pattern="GET /items/{id}" status=400
GET /items/abc -> 400 id must be a number
level=INFO msg=request method=DELETE path=/items/1 pattern="" status=405
DELETE /items/1 -> 405 Method Not Allowed
   Allow: GET, HEAD
level=INFO msg=request method=GET path=/files/css/site.css pattern="GET /files/{path...}" status=200
GET /files/css/site.css -> 200 file "css/site.css"
level=INFO msg=request method=GET path=/files/a/b pattern="GET /files/{path...}" status=200
GET /files/a%2Fb -> 200 file "a/b"
level=INFO msg=request method=GET path=/ pattern="GET /{$}" status=200
GET / -> 200 home
level=INFO msg=request method=GET path=/nope pattern="" status=404
GET /nope -> 404 404 page not found
```

A few things to notice:

- `DELETE /items/1` matched a path that exists for another method, so the mux answered `405 Method Not Allowed` and set `Allow: GET, HEAD`. You didn't write that.
- `/items/abc` matched the route; the wildcard does no type checking. The handler returned 400.
- `r.Pattern` is the pattern that matched, read after the handler ran. Use it, not `r.URL.Path`, as the route label in metrics, or every item ID becomes its own time series.

To serve it for real, replace the `do` calls with `http.ListenAndServe(":8080", handler)`, or better, an `http.Server` with timeouts.

## Which pattern wins

When more than one pattern matches a request, the **most specific** one wins. A pattern is more specific than another if it matches a strict subset of that pattern's requests. With these registered:

```go
mux.Handle("GET /items/{id}", itemByID)
mux.Handle("GET /items/new", newItemForm)
mux.Handle("/items/", itemsSubtree)
```

- `/items/new` goes to `newItemForm`: a literal segment beats a wildcard.
- `/items/42` goes to `itemByID`.
- `/items/42/edit` goes to `itemsSubtree`: `{id}` matches only one segment.

Registration order doesn't matter, unlike in many routers. If two patterns overlap and neither is more specific, `Handle` panics when you register the second one, so the conflict shows up the first time the program starts rather than as a wrong response in production:

```go
mux.Handle("GET /posts/{id}", a)
mux.Handle("GET /{resource}/latest", b) // panics
```

The panic message explains it: both patterns match `/posts/latest`, but each also matches paths the other doesn't. Conflicts are checked pair by pair, so registering a third pattern such as `GET /posts/latest` doesn't help; it still panics. Change one of the two patterns, for example to `GET /latest/{resource}`, or restructure the URLs.

The precedence rules also explain a common surprise. A pattern without a method, like `/items/` above, matches every method, so once it is registered, `DELETE /items/42/edit` goes to `itemsSubtree` instead of getting a 405. If you want automatic 405s, give every pattern a method.

## Trailing slashes and redirects

If you register `GET /docs/` and a request comes in for `/docs`, the mux redirects to `/docs/`. Since Go 1.26 that redirect is `307 Temporary Redirect`. Earlier versions sent `301 Moved Permanently`, which browsers cache. If you want `/docs` to be its own page, register it explicitly.

## Middleware without a framework

The middleware shape in Go is a function from handler to handler:

```go
type Middleware func(http.Handler) http.Handler
```

`requireJSON` above is one; `logRequests(log)` is a function that returns one, which is how you give middleware configuration. To apply several in a readable order, a small helper is enough:

```go
// Chain applies middleware so that the first one listed runs first.
func Chain(h http.Handler, mws ...func(http.Handler) http.Handler) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

handler := Chain(mux, logRequests(log), recoverPanics, requireAuth)
```

You can apply middleware in two places, and both are useful:

- **Around the whole mux**, for things every request needs: logging, panic recovery, request IDs.
- **Around a single route**, for things only some routes need, like `requireJSON` on `POST /items` above.

For a group of routes under a prefix, mount a second mux:

```go
api := http.NewServeMux()
api.HandleFunc("GET /users/{id}", getUser)

root := http.NewServeMux()
root.Handle("/api/", http.StripPrefix("/api", requireAuth(api)))
```

The inner mux sees `/users/7`, and `requireAuth` wraps only the API.

Two details in the logging middleware are worth copying. It defaults `status` to 200, because a handler that never calls `WriteHeader` sends 200 implicitly. And it has an `Unwrap` method: `http.ResponseController`, which handlers use to flush or set per-request deadlines, looks for `Unwrap` to get past wrappers like this one. Without it, a streaming handler behind your logger can't flush.

## Gotchas

- **Old behaviour switch.** The `GODEBUG` setting `httpmuxgo121=1` restores the pre-1.22 matching, where braces and methods were treated as literal text. It's there for migration; don't leave it on.
- **The space matters.** The method must be followed by a space or tab. `"GET/items"` is parsed as host `GET` and path `/items`, so it registers without error and then never matches a normal request.
- **No regex constraints.** `{id}` matches any segment. If you need "digits only", check in the handler, as `get` does with `strconv.Atoi`.
- **Custom 404 and 405 bodies.** `ServeMux` writes its own plain-text responses. If you need JSON errors everywhere, wrap the mux and check the status in a recorder, or register a `/` catch-all for 404s (which also removes the automatic 405s, as described above).
- **When a router still helps.** If you want per-group middleware declared inline, named routes, or URL generation from route names, chi and similar routers still add something. For a JSON API with a few dozen routes, the standard mux is enough.

## Further reading

- [`http.ServeMux` documentation](https://pkg.go.dev/net/http#ServeMux), including the full precedence rules
- [Routing Enhancements for Go 1.22](https://go.dev/blog/routing-enhancements) (Go blog)
- [`http.ResponseController`](https://pkg.go.dev/net/http#ResponseController)
- [`net/http/httptest`](https://pkg.go.dev/net/http/httptest)
