---
title: "Running concurrent tasks in Go: WaitGroup, errgroup and context cancellation"
pubDate: "2023-05-26T15:32:48.968Z"
lastUpdated: 2026-11-14
description: "Start tasks as goroutines, wait for them with sync.WaitGroup, collect errors with errgroup and cancel the rest through a context.Context."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1400635341.webp
---

:::caution
An earlier version of this post described a `Task` type with `task.New`, `Run`, `Wait`, `Error` and `RunWithContext`, imported from `github.com/your_package/task`. No such package exists, and Go has no built-in `Task` type. This revision shows the standard tools that do that job: goroutines, `sync.WaitGroup`, `golang.org/x/sync/errgroup` and `context`.
:::

In Go, a "task" is just a function you run in a goroutine. What you usually need on top of that is a way to wait for tasks to finish, collect their errors, and stop the rest when one fails or the caller gives up. The standard library and `golang.org/x/sync` cover all three.

## Starting a goroutine

The `go` keyword runs a function call concurrently. The catch is that `main` doesn't wait for it:

```go
package main

import "fmt"

func printHello() {
	fmt.Println("Hello from goroutine")
}

func main() {
	go printHello()
	fmt.Println("main function")
	// main returns here, and the program exits,
	// usually before printHello has had a chance to run.
}
```

When `main` returns the program exits and any running goroutines are killed. You need something to wait on.

## Waiting with sync.WaitGroup

A `WaitGroup` counts running tasks. `WaitGroup.Go`, added in Go 1.25, starts a function in a goroutine and adds it to the group; `Wait` blocks until every such function has returned.

```go
package main

import (
	"fmt"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	for i := 1; i <= 3; i++ {
		wg.Go(func() {
			fmt.Println("task", i, "done")
		})
	}
	wg.Wait()
	fmt.Println("all tasks completed")
}
```

The three "done" lines appear in any order, but always before "all tasks completed". Since Go 1.22, each loop iteration has its own `i`, so capturing it in the closure is safe.

On Go versions before 1.25, write the same thing with `Add` and `Done`:

```go
wg.Add(1)
go func() {
	defer wg.Done()
	fmt.Println("task", i, "done")
}()
```

## Collecting errors with errgroup

A `WaitGroup` doesn't carry errors. [`errgroup`](https://pkg.go.dev/golang.org/x/sync/errgroup) is the same idea for functions that return `error`: `Wait` returns the first non-nil error.

```bash
go get golang.org/x/sync
```

```go
package main

import (
	"errors"
	"fmt"

	"golang.org/x/sync/errgroup"
)

func main() {
	var g errgroup.Group

	g.Go(func() error {
		fmt.Println("task 1 ok")
		return nil
	})
	g.Go(func() error {
		return errors.New("task 2 failed")
	})

	if err := g.Wait(); err != nil {
		fmt.Println("error:", err)
	}
}
```

`g.SetLimit(n)` caps how many of the group's functions run at once, which is handy when each task opens a connection or a file.

## Cancelling the remaining tasks

Goroutines can't be killed from outside. Cancellation in Go is cooperative: you pass a `context.Context`, and the task checks `ctx.Done()` and returns when it is closed.

`errgroup.WithContext` ties the two together. It returns a group and a derived context that is cancelled as soon as any task returns an error (or when `Wait` returns). The other tasks see the cancellation and stop.

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"time"

	"golang.org/x/sync/errgroup"
)

func worker(ctx context.Context, id int) error {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("worker %d stopping: %v\n", id, ctx.Err())
			return ctx.Err()
		case <-time.After(500 * time.Millisecond):
			fmt.Printf("worker %d working\n", id)
		}
	}
}

func main() {
	// Give the whole job at most 5 seconds.
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	g, ctx := errgroup.WithContext(ctx)

	g.Go(func() error { return worker(ctx, 1) })
	g.Go(func() error { return worker(ctx, 2) })
	g.Go(func() error {
		time.Sleep(2 * time.Second)
		return errors.New("task 3 failed")
	})

	if err := g.Wait(); err != nil {
		fmt.Println("first error:", err)
	}
}
```

After about two seconds task 3 fails, the group's context is cancelled, both workers print "stopping: context canceled", and `Wait` returns `task 3 failed`. If nothing failed, the 5-second timeout would cancel the workers instead. To cancel from your own code, use `context.WithCancel` and call the `cancel` function.

## Gotchas

- `errgroup.Wait` returns only the first error. If you need all of them, collect them yourself (for example into a slice guarded by a mutex) and combine them with `errors.Join`.
- A task that never checks `ctx.Done()` (a tight CPU loop, or a blocking call that doesn't take a context) won't stop when cancelled. Pass the context down to `http.NewRequestWithContext`, `db.QueryContext` and similar.
- A panic in any goroutine crashes the whole program; neither `WaitGroup` nor `errgroup` recovers it for you.
- Run tests with `go test -race` to catch tasks that write shared variables without synchronisation.

## Further reading

- [sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup)
- [errgroup](https://pkg.go.dev/golang.org/x/sync/errgroup)
- [Go Concurrency Patterns: Context](https://go.dev/blog/context)
