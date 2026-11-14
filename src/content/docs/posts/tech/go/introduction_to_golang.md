---
tags: ['csharp', 'dotnet', 'go']
title: "Introduction to Go: where it came from, the basics, and a first web server"
description: "A short history of Go, why teams pick it, and the basics: structs, arrays and slices, building a binary, a net/http server, and go doc."
pubDate: Fri, 17 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.webp"
---

Go (often called Golang, after its old website golang.org) is a compiled, statically typed
language created at Google by Robert Griesemer, Rob Pike and Ken Thompson. It was announced
in November 2009, and Go 1.0, the first stable release with a compatibility promise, shipped
in March 2012.

The goal was a language that suits large codebases and large teams: fast builds, a small
language that's quick to read, and concurrency built in. According to the
[Go FAQ](https://go.dev/doc/faq#ancestors), its syntax comes mostly from C, its declarations
and packages owe a lot to Pascal, Modula and Oberon, and its concurrency model comes from
Tony Hoare's CSP via languages such as Newsqueak and Limbo.

Go is now used widely for network services, command-line tools and cloud infrastructure
(Docker, Kubernetes and Terraform are written in it). It's developed in the open by a team
at Google together with outside contributors.

## Why people pick Go

- **Fast builds and a single binary.** `go build` produces one statically linked executable
  (when cgo isn't involved), which makes deployment simple.
- **Concurrency in the language.** Goroutines are cheap to start, and channels plus the
  `sync` package cover most coordination needs.
- **A small language.** There are few features and one standard formatter (`gofmt`), so
  codebases tend to look alike.
- **Memory safety.** Garbage collection and bounds-checked slices rule out use-after-free
  and buffer overflows in ordinary Go code. You can still leak memory, for example by keeping
  references alive or leaving goroutines blocked forever.
- **Static typing.** Type errors are caught at compile time.
- **A useful standard library.** HTTP clients and servers, JSON, crypto, compression and
  testing all ship with the toolchain.
- **Easy cross-compilation.** Set `GOOS` and `GOARCH` (for example
  `GOOS=windows GOARCH=amd64 go build`) to build for another platform.

## Structs

A struct groups named fields of different types:

```go
type Employee struct {
	Name   string
	Age    int
	Salary float64
}
```

Create one with a struct literal and read fields with dot notation:

```go
employee := Employee{
	Name:   "John Doe",
	Age:    32,
	Salary: 50000.0,
}

fmt.Println("Name:", employee.Name)
fmt.Println("Age:", employee.Age)
fmt.Println("Salary:", employee.Salary)
```

Fields starting with an upper-case letter are exported (visible outside the package);
lower-case fields are private to the package.

## Arrays and slices

An array has a fixed length that's part of its type, so `[5]int` and `[6]int` are different
types:

```go
var numbers [5]int                // five zeroes
primes := [5]int{2, 3, 5, 7, 11}

fmt.Println("First element:", primes[0])
fmt.Println("Last element:", primes[len(primes)-1])
```

In practice you'll mostly use **slices**, which are Go's dynamically sized lists. A slice is
a view onto an underlying array, and `append` allocates a bigger array when it runs out of
room:

```go
names := []string{"ada", "grace"}
names = append(names, "linus")
fmt.Println(len(names), names) // 3 [ada grace linus]

buf := make([]byte, 0, 1024) // length 0, capacity 1024
```

## Building an executable

Create a module and a `main.go`:

```bash
mkdir hello && cd hello
go mod init example.com/hello
```

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

Then build and run it:

```bash
go build      # produces ./hello (hello.exe on Windows), named after the module
./hello
```

```text
Hello, World!
```

`go run .` compiles and runs in one step without leaving a binary behind, which is handy
while iterating.

## A first web server

You don't need a framework to serve HTTP in Go. The standard library's `net/http` package
includes a production-ready server, and since Go 1.22 its router supports HTTP methods and
path wildcards in patterns:

```go
package main

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello, World!")
	})

	http.HandleFunc("GET /hello/{name}", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, %s!", r.PathValue("name"))
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

`ListenAndServe` blocks while the server runs and only returns on error, so wrapping it in
`log.Fatal` makes sure a failure (such as the port already being in use) isn't silently
ignored. Try `curl localhost:8080/hello/gopher`.

Frameworks such as Gin and Echo add things like middleware chains and request binding on
top of `net/http`; many projects get by with the standard library alone. Either way, a real
application still needs timeouts, logging, error handling and authentication.

## Reading documentation with go doc

The `go doc` command prints documentation for packages and symbols from the terminal:

```bash
go doc fmt
go doc fmt.Println
go doc net/http.Request
```

It works for the standard library and for any package in your module or its dependencies.
For browsing in a web page, [pkg.go.dev](https://pkg.go.dev) hosts the docs for public
modules. (The older `godoc` command is no longer shipped with Go; it's a separate install
from `golang.org/x/tools`, and `go doc` covers the terminal use case.)

## Next steps

- [A Tour of Go](https://go.dev/tour/) for an interactive walkthrough of the language
- [Effective Go](https://go.dev/doc/effective_go) for idiomatic style
- [Tutorial: Get started with Go](https://go.dev/doc/tutorial/getting-started)
