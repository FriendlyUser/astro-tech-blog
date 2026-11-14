---
title: Updating terminal output in place in Go with uilive
pubDate: "2023-05-30T19:37:46.011Z"
lastUpdated: 2026-11-14
description: "Use gosuri/uilive to redraw lines in place in a Go CLI: a hand-rolled progress bar, multi-line status output, and printing logs above it."
tags: ["uilive", "go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

[`uilive`](https://github.com/gosuri/uilive) lets a Go program overwrite its previous terminal output instead of appending to it, which is what you want for progress counters, status lines, and spinners. It is the rendering layer underneath [`uiprogress`](https://github.com/gosuri/uiprogress).

`uilive.Writer` is an `io.Writer` that buffers whatever you write. On a timer (every millisecond by default) it erases the lines it printed last time and prints the buffer in their place.

## Install

Inside a Go module:

```sh
go get github.com/gosuri/uilive
```

## A progress bar that redraws in place

```go
package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/gosuri/uilive"
)

func renderBar(current, total, width int) string {
	filled := current * width / total
	return strings.Repeat("#", filled) + strings.Repeat("-", width-filled)
}

func main() {
	writer := uilive.New()
	writer.Start() // start the refresh loop

	const total = 10
	for i := 0; i <= total; i++ {
		pct := float64(i) / total * 100
		fmt.Fprintf(writer, "Progress: [%s] %3.0f%%\n", renderBar(i, total, 20), pct)
		time.Sleep(100 * time.Millisecond)
	}

	writer.Stop() // flush the last frame and stop the refresh loop
	fmt.Println("Task completed!")
}
```

Each `Fprintf` replaces the previous line rather than adding a new one. After `Stop()`, the last frame stays on screen and normal output continues below it.

## Several lines at once

The writer remembers how many lines it printed and erases all of them on the next refresh, so a frame can be more than one line. Write the whole frame in one call, though: the writer flushes every millisecond, and if a refresh lands between two separate writes, the first line will flicker or disappear.

```go
for i := 0; i <= 100; i++ {
	fmt.Fprintf(writer, "file1.zip  %3d%%\nfile2.zip  %3d%%\n", i, i/2)
	time.Sleep(50 * time.Millisecond)
}
```

You can also raise `writer.RefreshInterval` before calling `Start()` if you'd rather redraw less often.

## Printing lines that should stay

Anything printed with `fmt.Println` while the writer is running gets erased on the next refresh. To print a log line that stays above the live area, write through `writer.Bypass()`:

```go
fmt.Fprintln(writer.Bypass(), "downloaded file1.zip")
```

## Gotchas

- Only call `Stop()` once, and only after `Start()`.
- Lines wider than the terminal wrap, and `uilive` accounts for that when it can read the terminal width. If it can't (for example, output piped to a file), wrapped lines may not be cleared properly.
- `uilive` is low-level. If you want ready-made bars with percentages and elapsed time, use `uiprogress`, which is built on it.

## Further reading

- [uilive on GitHub](https://github.com/gosuri/uilive)
- [API reference on pkg.go.dev](https://pkg.go.dev/github.com/gosuri/uilive)
