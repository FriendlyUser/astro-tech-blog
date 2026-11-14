---
tags: ['go']
title: "Web development in Go: net/http routing and html/template"
description: "Build a small web server with Go's standard library: register handlers, route by method and path wildcard, and render HTML safely with html/template."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1648720574.webp
---
Go's standard library is enough to build a working web server: `net/http` handles requests and routing, and `html/template` renders HTML. This post builds a simple server, adds method-aware routes, and renders a page from a template.

## A minimal web server

```go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintf(w, "Hello, %s!", r.URL.Path[1:])
}

func main() {
	http.HandleFunc("/", handler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Run it with `go run .` and open `http://localhost:8080/Gopher` to see `Hello, Gopher!`.

- `http.HandleFunc` registers `handler` on the default `ServeMux`. The pattern `/` matches every path that no more specific pattern claims.
- `http.ListenAndServe` blocks while serving and only returns on error (for example, when the port is already in use). Wrapping it in `log.Fatal` makes that error visible instead of the program silently exiting.
- A handler gets an `http.ResponseWriter` to write the response and an `*http.Request` with the method, URL, headers and body.
- If you don't set `Content-Type`, Go guesses it from the first 512 bytes written (`http.DetectContentType`). Setting it explicitly is safer when the response contains user input.

## Routing by method and path

Since Go 1.22, `ServeMux` patterns can include an HTTP method and path wildcards. The value of a wildcard is read with `r.PathValue`:

```go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /hello", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello, World!")
	})

	mux.HandleFunc("GET /hello/{name}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		fmt.Fprintf(w, "Hello, %s!", r.PathValue("name"))
	})

	log.Fatal(http.ListenAndServe(":8080", mux))
}
```

With method patterns, the mux does the checks you'd otherwise write by hand: a `POST /hello` gets `405 Method Not Allowed` (with an `Allow` header), and a path with no matching pattern gets `404 Not Found`. A `GET` pattern also matches `HEAD` requests.

On Go versions before 1.22 you'd compare `r.Method` against `http.MethodGet` and parse `r.URL.Path` yourself, or use a router such as chi or gorilla/mux.

## Rendering HTML with templates

`html/template` fills in a template with data and escapes values for the context they appear in (HTML text, attributes, URLs, JavaScript), which protects against cross-site scripting. Use it instead of `text/template` for anything that ends up in a browser.

Create `template.html` next to your code:

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>{{.Name}}</h1>
    <p>Age: {{.Age}}</p>
  </body>
</html>
```

Then render it:

```go
package main

import (
	"html/template"
	"log"
	"net/http"
)

type Person struct {
	Name string
	Age  int
}

// Parse once at startup. template.Must panics if the file is missing or invalid,
// which is what you want for a template the server can't run without.
var tmpl = template.Must(template.ParseFiles("template.html"))

func handler(w http.ResponseWriter, r *http.Request) {
	p := Person{Name: "Alice", Age: 30}
	if err := tmpl.Execute(w, p); err != nil {
		log.Println("render:", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
	}
}

func main() {
	http.HandleFunc("GET /", handler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Templates can only read exported fields, which is why `Name` and `Age` are capitalised. If `Execute` fails partway, some HTML may already have been sent, so the `http.Error` call can't always replace it; for pages where that matters, render into a `bytes.Buffer` first and copy it to `w` only on success.

## Before you deploy

- `http.ListenAndServe` uses a server with no timeouts. For anything public, create an `http.Server` with `ReadHeaderTimeout`, `ReadTimeout` and `WriteTimeout` set and call its `ListenAndServe`.
- Use `http.FileServer` (or `http.FileServerFS` with `embed`) for static assets rather than reading files in a handler.

## Further reading

- [`net/http` package](https://pkg.go.dev/net/http)
- [`html/template` package](https://pkg.go.dev/html/template)
- [Writing Web Applications](https://go.dev/doc/articles/wiki/) (official tutorial)
- [Routing enhancements for Go 1.22](https://go.dev/blog/routing-enhancements)

## References

- https://github.com/FriendlyUser/bluey-wordpress-theme
