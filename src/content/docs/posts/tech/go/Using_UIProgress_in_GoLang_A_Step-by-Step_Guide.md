---
title: Progress bars in Go terminal apps with uiprogress
pubDate: "2023-05-26T15:32:49.062Z"
lastUpdated: 2026-11-14
description: "How to render one or several progress bars in a Go command-line program with gosuri/uiprogress, including custom decorators and bar characters."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1411559119.png
---

[`uiprogress`](https://github.com/gosuri/uiprogress) is a small Go package that draws progress bars in the terminal. It redraws the bars on a timer (every 10 ms by default) using [`uilive`](https://github.com/gosuri/uilive), so you only call `Incr()` or `Set()` and the package handles the rendering. It is a good fit for CLI tools that download files, process batches, or run several jobs at once.

The package is small and stable rather than actively developed: the only tagged release is v0.0.1 (2017).

## Install

Inside a Go module:

```sh
go get github.com/gosuri/uiprogress
```

## A basic progress bar

```go
package main

import (
	"time"

	"github.com/gosuri/uiprogress"
)

func main() {
	uiprogress.Start()       // start the render loop
	defer uiprogress.Stop()  // draw the final state and stop rendering

	bar := uiprogress.AddBar(100)
	bar.Width = 50
	bar.AppendCompleted() // show "NN%" after the bar
	bar.PrependElapsed()  // show elapsed time before the bar

	for bar.Incr() {
		time.Sleep(20 * time.Millisecond)
	}
}
```

`Incr()` returns `false` once the bar reaches its total, so the loop ends on its own. Do the work in the main goroutine (or wait for it); if `main` returns straight after `Start()`, the program exits before anything is drawn.

If you know the absolute position rather than incrementing by one, use `bar.Set(n)`. It returns `uiprogress.ErrMaxCurrentReached` if `n` is above the total.

## Customizing the bar

### Characters

`Fill`, `Head`, `Empty`, `LeftEnd` and `RightEnd` are `byte` fields on the bar (defaults `=`, `>`, `-`, `[`, `]`):

```go
bar.Fill = '#'
bar.Head = '#'
bar.Empty = '.'
```

Because they are bytes, you can't use multi-byte characters such as `█`.

### Decorators

Text before and after the bar comes from decorator functions of type `uiprogress.DecoratorFunc`, which is `func(b *uiprogress.Bar) string`. Add them with `PrependFunc` and `AppendFunc` (this snippet also needs `fmt` imported):

```go
steps := []string{"downloading", "unpacking", "compiling", "installing"}
bar := uiprogress.AddBar(len(steps))

bar.PrependFunc(func(b *uiprogress.Bar) string {
	if b.Current() == 0 {
		return "starting"
	}
	return steps[b.Current()-1]
})
bar.AppendFunc(func(b *uiprogress.Bar) string {
	return fmt.Sprintf("%d/%d", b.Current(), b.Total)
})
```

Other helpers on `Bar`: `CompletedPercent()`, `CompletedPercentString()` and `TimeElapsedString()`.

## Multiple bars

Each call to `AddBar` adds another line. Run the work for each bar in its own goroutine and wait for all of them before stopping:

```go
package main

import (
	"sync"
	"time"

	"github.com/gosuri/uiprogress"
)

func main() {
	uiprogress.Start()

	var wg sync.WaitGroup
	for _, total := range []int{20, 40, 60} {
		bar := uiprogress.AddBar(total).AppendCompleted().PrependElapsed()
		wg.Add(1)
		go func() {
			defer wg.Done()
			for bar.Incr() {
				time.Sleep(50 * time.Millisecond)
			}
		}()
	}

	wg.Wait()
	uiprogress.Stop()
}
```

`AppendCompleted` and `PrependElapsed` return the bar, so they chain.

## Gotchas

- The package-level functions (`Start`, `AddBar`, `Stop`) use a single default `Progress`. If you need separate groups of bars or a different output, create one with `uiprogress.New()` and call `SetOut` or `SetRefreshInterval` on it.
- Anything else you print to stdout while bars are rendering will be overwritten or garbled. Use `Progress.Bypass()` to get a writer that prints above the bars.

## Further reading

- [uiprogress on GitHub](https://github.com/gosuri/uiprogress)
- [API reference on pkg.go.dev](https://pkg.go.dev/github.com/gosuri/uiprogress)
