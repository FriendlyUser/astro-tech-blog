---
tags: ['go']
title: "Go pointers and garbage collection basics"
description: "How pointers work in Go (&, *, passing by pointer), how the compiler decides between stack and heap, and a small program that shows the garbage collector running."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3867963691.png
---
A pointer in Go holds the memory address of a value. You use pointers when a function needs to modify its caller's variable, or when copying a large struct on every call would be wasteful. Go has pointers but no pointer arithmetic (outside the `unsafe` package), and memory is freed by a garbage collector rather than by hand.

## Pointer syntax

`*T` is the type "pointer to T". `&x` takes the address of `x`, and `*p` reads or writes the value `p` points to (dereferencing).

```go
package main

import "fmt"

func main() {
	x := 5
	var p *int = &x // p holds the address of x

	fmt.Println(*p) // 5

	*p = 10        // write through the pointer
	fmt.Println(x) // 10
}
```

The zero value of a pointer is `nil`. Dereferencing a `nil` pointer panics at runtime, so check for `nil` when a pointer may not be set.

For struct pointers, Go dereferences automatically on field access: if `u` is a `*User`, `u.Name` means `(*u).Name`.

## Passing a pointer to a function

Go passes arguments by value, so a function receives a copy. To change the caller's variable, pass its address:

```go
package main

import "fmt"

func increment(x *int) {
	*x++
}

func main() {
	x := 0
	fmt.Println("x before increment:", x)
	increment(&x)
	fmt.Println("x after increment:", x) // 1
}
```

Passing a pointer also avoids copying a large struct. Slices, maps and channels already refer to shared underlying data, so you rarely need a pointer to one of those just to avoid a copy.

## Stack, heap and escape analysis

You never call `malloc` or `free` in Go. The compiler decides where each value lives: if it can prove a value isn't used after the function returns, the value goes on the stack and disappears with the stack frame. If the value "escapes" (for example, you return a pointer to it or store it in a package-level variable), it is allocated on the heap and the garbage collector frees it once nothing references it.

So `new(int)` or `&T{}` does not automatically mean a heap allocation. You can see the compiler's decisions with:

```bash
go build -gcflags=-m .
```

## The garbage collector

Go's collector is a concurrent mark-and-sweep collector: it runs alongside your goroutines, marks every object still reachable from goroutine stacks and globals, and reclaims the rest. It doesn't move objects and isn't generational. Two settings control it:

- `GOGC` (default 100) sets how much the heap may grow, relative to the live heap after the last collection, before the next cycle starts.
- `GOMEMLIMIT` (Go 1.19+) sets a soft memory limit the runtime tries to stay under.

This program allocates about 100 MB in 1 KB chunks. Assigning each chunk to a package-level variable forces it onto the heap; each new assignment makes the previous chunk unreachable, so the collector has work to do:

```go
package main

import (
	"fmt"
	"runtime"
)

var sink *[1024]byte

func main() {
	var before, after runtime.MemStats
	runtime.ReadMemStats(&before)

	for i := 0; i < 100_000; i++ {
		sink = new([1024]byte) // escapes to the heap via the package-level variable
	}

	runtime.ReadMemStats(&after)
	fmt.Println("GC cycles during loop:", after.NumGC-before.NumGC)
	fmt.Println("heap allocated (MB):", (after.TotalAlloc-before.TotalAlloc)/1024/1024)
}
```

Run it with `GODEBUG=gctrace=1 go run .` to print a line for each GC cycle, or with `GOGC=off` to see the cycle count drop to zero.

## Reducing GC work

- Allocate less: reuse buffers, and preallocate slices with `make([]T, 0, n)` when you know the size.
- Use `sync.Pool` to reuse short-lived objects (such as buffers) across requests instead of allocating new ones.
- Measure first: `go test -bench . -benchmem` and `pprof` heap profiles show where allocations actually happen.

## Further reading

- [A Guide to the Go Garbage Collector](https://go.dev/doc/gc-guide)
- [Go FAQ: stack or heap?](https://go.dev/doc/faq#stack_or_heap)
- [A Tour of Go: Pointers](https://go.dev/tour/moretypes/1)

## References
- https://github.com/FriendlyUser/bluey-wordpress-theme
