---
tags: ['go']
title: "Why Go: where it came from, what it's good at, and how to install it"
description: "Go's origins at Google, the language features that matter day to day, the jobs it suits and doesn't, and installing it on Windows, macOS and Linux."
pubDate: Fri, 14 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4225416985.png
---
Go (often called Golang, after its old golang.org domain) is a statically typed, compiled, garbage-collected language from Google. It was built for servers, network services and command-line tools: places where fast builds, simple deployment and easy concurrency matter more than squeezing out every last bit of performance.

## Where Go came from

Robert Griesemer, Rob Pike and Ken Thompson started designing Go at Google in September 2007. It was announced as an open-source project in November 2009, and Go 1.0 shipped in March 2012 with a compatibility promise: code written for Go 1 keeps compiling on later 1.x releases.

The motivation, according to the [Go FAQ](https://go.dev/doc/faq), was frustration with slow builds, tangled dependencies and the complexity of the languages in use at Google, combined with the arrival of multicore machines and networked systems that those languages handled awkwardly.

Go's syntax is mostly from the C family. Declarations and packages borrow from Pascal, Modula and Oberon, and goroutines and channels come from languages based on Tony Hoare's CSP, such as Newsqueak and Limbo. Go is BSD-licensed and developed in the open, with contributors from inside and outside Google. Generics were the biggest addition since 1.0 and arrived in Go 1.18 (2022).

## Features that shape how you write Go

- **Static typing with inference.** Every variable has a compile-time type, but `x := 10` lets the compiler work it out.
- **A small language.** There are 25 keywords and one loop construct (`for`). There are no classes or inheritance; you use structs, methods, and interfaces that types satisfy implicitly.
- **Garbage collection.** The collector is concurrent and tuned for short pauses, so you don't free memory by hand.
- **Concurrency built in.** Goroutines are cheap, runtime-scheduled functions; channels pass values between them.
- **Errors are values.** Functions return an `error` alongside their result instead of throwing exceptions.
- **Tooling in the box.** `go build`, `go test`, `go fmt`, `go vet` and module management all ship with the standard distribution.
- **Easy cross-compilation.** Set `GOOS` and `GOARCH` and build for another platform from your machine:

```bash
GOOS=windows GOARCH=amd64 go build -o hello.exe .
```

Here is what the concurrency support looks like in practice. Three simulated network calls run at the same time, so the program takes about 300 ms instead of 600 ms:

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

func fetch(name string, delay time.Duration) string {
	time.Sleep(delay) // stand-in for a network call
	return name + " done"
}

func main() {
	jobs := map[string]time.Duration{
		"a": 300 * time.Millisecond,
		"b": 100 * time.Millisecond,
		"c": 200 * time.Millisecond,
	}

	results := make(chan string, len(jobs))
	var wg sync.WaitGroup

	start := time.Now()
	for name, d := range jobs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results <- fetch(name, d)
		}()
	}
	wg.Wait()
	close(results)

	for r := range results {
		fmt.Println(r) // b, c, a: in order of completion
	}
	fmt.Println("took", time.Since(start).Round(time.Millisecond*100))
}
```

Capturing `name` and `d` inside the goroutine is safe because Go 1.22 made loop variables per-iteration. On older versions you had to pass them in as arguments.

## Performance

Go compiles to native machine code, so CPU-bound code is usually much faster than the same code in CPython or Ruby. It is generally slower than well-tuned C, C++ or Rust: garbage collection and bounds checks cost something, and the compiler favours fast compile times over aggressive optimisation. Against Java and C# it lands in the same range, and which one wins depends on the workload.

Where Go stands out is deployment. A build produces one binary with the runtime included, so there is no interpreter or VM to install on the target machine. That, plus fast startup, is a large part of why it is popular for containers and CLIs.

## What Go is good for

- **HTTP servers and APIs.** `net/http` in the standard library is production-ready on its own.
- **Network services and microservices.** Proxies, RPC services and other programs that juggle many connections suit goroutines well.
- **Command-line tools.** A single binary is easy to distribute.
- **Cloud and infrastructure software.** Docker, Kubernetes, Terraform and Prometheus are all written in Go.

It is a weaker fit for operating system kernels, drivers and hard real-time systems (the garbage collector and runtime get in the way), for machine learning (the ecosystem lives in Python), and for desktop GUI apps, where the options are limited.

## Installing Go

Download the installer or archive for your platform from [go.dev/dl](https://go.dev/dl/).

### Windows

Run the `.msi` installer. It installs Go under `Program Files` and adds its `bin` directory to your `PATH`. Open a new terminal and check:

```powershell
go version
```

### macOS

Run the `.pkg` installer. It installs Go to `/usr/local/go` and adds `/usr/local/go/bin` to your `PATH`. Open a new Terminal window and run `go version`. Homebrew (`brew install go`) also works.

### Linux

Remove any previous install first, because extracting over an old `/usr/local/go` leaves a broken tree. Replace the filename with the archive you downloaded:

```bash
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.X.Y.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile
source ~/.profile
go version
```

Distribution packages (`apt install golang`, for example) often lag several releases behind, so the official archive is usually the better choice.

## Further reading

- [Official install instructions](https://go.dev/doc/install)
- [Go FAQ](https://go.dev/doc/faq), including the design history
- [A Tour of Go](https://go.dev/tour/)

## References
- https://github.com/FriendlyUser/bluey-wordpress-theme
