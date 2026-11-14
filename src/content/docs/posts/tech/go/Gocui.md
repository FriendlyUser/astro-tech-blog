---
title: Building a terminal UI in Go with gocui
pubDate: "2023-05-30T19:37:46.109Z"
lastUpdated: 2026-11-14
description: Set up a gocui application in Go that draws a centred view, then add key bindings to quit. Includes notes on the maintained awesome-gocui fork.
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

[gocui](https://github.com/jroimartin/gocui) is a small Go library for console user interfaces. You describe the screen as a set of named, possibly overlapping views (rectangles you can write text into), and gocui redraws them and dispatches key and mouse events to handlers you register. It sits on top of termbox-go and doesn't provide ready-made widgets, so it suits tools where you want control over the layout rather than a form library.

The original repository changes rarely these days. [awesome-gocui/gocui](https://github.com/awesome-gocui/gocui) is a community-maintained fork with a slightly different API; see the note at the end if you use that one.

## Setup

You need Go installed ([download](https://go.dev/dl/)). Create a module and add the dependency:

```bash
mkdir hello-gocui && cd hello-gocui
go mod init hello-gocui
go get github.com/jroimartin/gocui
```

## A minimal application

Create `main.go`:

```go
package main

import (
	"fmt"
	"log"

	"github.com/jroimartin/gocui"
)

func main() {
	g, err := gocui.NewGui(gocui.OutputNormal)
	if err != nil {
		log.Panicln(err)
	}
	defer g.Close()

	g.SetManagerFunc(layout)

	if err := g.MainLoop(); err != nil && err != gocui.ErrQuit {
		log.Panicln(err)
	}
}

func layout(g *gocui.Gui) error {
	maxX, maxY := g.Size()
	if v, err := g.SetView("hello", maxX/2-7, maxY/2, maxX/2+7, maxY/2+2); err != nil {
		if err != gocui.ErrUnknownView {
			return err
		}
		fmt.Fprintln(v, "Hello, Gocui!")
	}
	return nil
}
```

`layout` is the manager function. gocui calls it on every redraw, including when the terminal is resized, which is why the view's coordinates are computed from `g.Size()` each time. `SetView` creates the view the first time and returns `gocui.ErrUnknownView` to signal that it's new; that is the place to write the initial content. On later calls it just moves and resizes the existing view, so the text isn't written twice.

Run it with:

```bash
go run .
```

"Hello, Gocui!" appears in a box in the middle of the terminal. There is no way to exit yet; that's next.

## Adding key bindings

Register bindings after `SetManagerFunc` and before `MainLoop`. An empty view name makes a binding global. Returning `gocui.ErrQuit` from a handler ends `MainLoop`.

```go
func main() {
	g, err := gocui.NewGui(gocui.OutputNormal)
	if err != nil {
		log.Panicln(err)
	}
	defer g.Close()

	g.SetManagerFunc(layout)

	if err := g.SetKeybinding("", gocui.KeyCtrlC, gocui.ModNone, quit); err != nil {
		log.Panicln(err)
	}
	if err := g.SetKeybinding("", 'q', gocui.ModNone, quit); err != nil {
		log.Panicln(err)
	}

	if err := g.MainLoop(); err != nil && err != gocui.ErrQuit {
		log.Panicln(err)
	}
}

func quit(g *gocui.Gui, v *gocui.View) error {
	return gocui.ErrQuit
}
```

Pressing `q` or `Ctrl+C` now exits and restores the terminal (that's what `defer g.Close()` is for).

A global binding on a plain rune like `q` gets in the way once you add an editable view (`v.Editable = true`), because typing a `q` into it would quit the app. In that case, bind `q` to the specific non-editable view names instead, and keep `Ctrl+C` global.

## Using the awesome-gocui fork

The fork changes a few signatures:

- `gocui.NewGui(gocui.OutputNormal, supportOverlaps)` takes a second `bool` argument.
- `g.SetView(name, x0, y0, x1, y1, overlaps)` takes an extra `byte` for overlap handling; pass `0` if you don't need it.
- Its README checks the new-view error with `errors.Is(err, gocui.ErrUnknownView)` rather than `==`.

Install it with `go get github.com/awesome-gocui/gocui` and change the import path; the rest of the example carries over.

## Further reading

- [gocui API reference](https://pkg.go.dev/github.com/jroimartin/gocui)
- [awesome-gocui API reference](https://pkg.go.dev/github.com/awesome-gocui/gocui)
- The `_examples` directory in the gocui repository has examples for mouse support, multiple views and editable input.
