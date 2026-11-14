---
tags: ['go']
title: "Wrapping up the Go series: recap and where to learn next"
description: "A recap of the Go concepts covered in this series, some habits worth keeping as you write more Go, and the official and community resources to learn from next."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3469553751.webp
---
This is the last chapter of the series. It recaps what the earlier chapters covered and points to the resources worth using next.

## Recap

1. **Variables and types.** Go is statically typed, with built-in integer, floating-point, boolean and string types, and type inference via `:=`. Conversions between types are always explicit.
2. **Control flow.** `if`, `switch` and a single loop keyword, `for`, which also covers "while" and infinite loops.
3. **Functions.** Functions can return multiple values, which is how Go returns a result and an `error` together.
4. **Packages.** Code is organised into packages and modules. The standard library covers HTTP, JSON, file I/O, testing and more without third-party dependencies.
5. **Pointers.** Go passes everything by value. A pointer lets a function modify the caller's variable or avoid copying a large struct.
6. **Concurrency.** Goroutines run functions concurrently, and channels pass values between them.

## Habits worth keeping

- **Keep it plain.** Idiomatic Go favours obvious code over clever code. If a reviewer has to stop and decode a line, rewrite it.
- **Handle every error.** Check `err` where it's returned and add context with `fmt.Errorf("reading config: %w", err)` rather than discarding it.
- **Use concurrency where it helps.** Goroutines suit I/O-bound and independent work. They add complexity, so don't reach for them by default, and run your tests with `go test -race` once you do.
- **Let the tools do the work.** Run `go fmt` and `go vet` on everything. Formatting arguments disappear when everyone uses the same formatter.
- **Ask for help.** Stack Overflow, the [Go Forum](https://forum.golangbridge.org/) and the [golang-nuts mailing list](https://groups.google.com/g/golang-nuts) are all active.

## Where to learn next

- [Official Go documentation](https://go.dev/doc/): the tutorials, [Effective Go](https://go.dev/doc/effective_go), the [language specification](https://go.dev/ref/spec) and the [standard library reference](https://pkg.go.dev/std).
- [A Tour of Go](https://go.dev/tour/): an interactive walk through the language in the browser.
- [Go by Example](https://gobyexample.com/): short annotated programs, from basic syntax to goroutines, timers and rate limiting.
- *The Go Programming Language* by Alan A. A. Donovan and Brian W. Kernighan (2015): a thorough book-length introduction. It predates modules and generics, so pair it with the official docs for those.
- [Gophercises](https://gophercises.com/): free coding exercises with video walkthroughs of the solutions.

## References
- https://github.com/FriendlyUser/bluey-wordpress-theme
