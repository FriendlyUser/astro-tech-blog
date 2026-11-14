---
title: "Styling Go terminal output with Lip Gloss: colors, padding and layouts"
pubDate: "2023-05-30T19:37:46.077Z"
lastUpdated: 2026-11-14
description: "How to style and lay out terminal output in Go with Charm's Lip Gloss v2: colors, bold text, fixed-width bars and stacking blocks to fit the terminal width."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

Lip Gloss is a Go library from Charm for styling terminal text. You describe a style once (colors, bold, padding, borders, width, alignment) and call `Render` on strings to get ANSI-styled output. It is the styling layer used by Bubble Tea apps, but it works fine in a plain CLI too.

The examples below use Lip Gloss v2 (v2.1.0 at the time of writing). The original version of this post targeted v1; the differences are noted at the end.

## Install

```bash
go get charm.land/lipgloss/v2
```

v2 lives under the `charm.land` vanity import path, not `github.com/charmbracelet/lipgloss`.

## Styling text

A style is a value you build with chained methods, then apply with `Render`:

```go
package main

import "charm.land/lipgloss/v2"

func main() {
	style := lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("46")). // ANSI 256: bright green
		Background(lipgloss.Color("0"))   // ANSI 16: black

	lipgloss.Println(style.Render("Hello, World!"))
}
```

`lipgloss.Color` accepts ANSI 16 codes (`"5"`), ANSI 256 codes (`"201"`) or hex true color (`"#0000FF"`). Print with `lipgloss.Println` (or `Print`, `Printf`, `Fprint`, and so on) rather than `fmt.Println`: the Lip Gloss writers downsample colors to what the terminal supports and strip escape codes entirely when output isn't a TTY, so piping to a file doesn't fill it with `\x1b[...]` noise.

## A header, body and footer that fit the terminal

Lip Gloss doesn't detect the terminal size itself. Get it from `golang.org/x/term` (`go get golang.org/x/term`), fall back to a fixed width when stdout isn't a terminal, and stack the blocks with `JoinVertical`:

```go
package main

import (
	"os"

	"charm.land/lipgloss/v2"
	"golang.org/x/term"
)

func main() {
	width, _, err := term.GetSize(int(os.Stdout.Fd()))
	if err != nil {
		width = 80 // not a terminal, e.g. output piped to a file
	}

	bar := lipgloss.NewStyle().
		Foreground(lipgloss.Color("15")).
		Bold(true).
		Width(width).
		Align(lipgloss.Center)

	header := bar.Background(lipgloss.Color("4")).Render("Lip Gloss in Go")
	footer := bar.Background(lipgloss.Color("1")).Render("Press q to quit")

	body := lipgloss.NewStyle().
		Padding(1, 2).
		Width(width).
		Render("Width wraps long text to the given number of cells, so this paragraph folds at the edge of the terminal instead of overflowing it.")

	lipgloss.Println(lipgloss.JoinVertical(lipgloss.Left, header, body, footer))
}
```

A few things worth knowing from this example:

- Styles are values. `bar.Background(...)` returns a modified copy, so `header` and `footer` share the base settings without affecting each other.
- `Width` sets a minimum width and wraps text that is longer. Combined with `Align(lipgloss.Center)` it gives you full-width centered bars.
- `JoinVertical` and `JoinHorizontal` combine already-rendered blocks; `Place`, `PlaceHorizontal` and `PlaceVertical` position a block inside a larger area.
- In a Bubble Tea program, don't call `term.GetSize` yourself: use the width from `tea.WindowSizeMsg`, which also updates when the window is resized.

## Coming from v1

If you have v1 code (`github.com/charmbracelet/lipgloss`), the style API (`NewStyle`, `Bold`, `Foreground`, `Width`, `Render`) looks the same, but v2 changes how colors and terminal detection work. The v1 `Renderer` is gone: `Render` always emits full-color ANSI, and downsampling happens when you print through `lipgloss.Println` and friends (Bubble Tea v2 does this for you). `lipgloss.Color` now returns a standard `color.Color`, and v1's `AdaptiveColor` moved to a `compat` package, with `lipgloss.LightDark` as the recommended replacement. Read the upgrade guide before switching.

Note also that there is no `lipgloss.TerminalSize` function in either version; use `golang.org/x/term` as shown above.

## Further reading

- [Lip Gloss README](https://github.com/charmbracelet/lipgloss)
- [v1 to v2 upgrade guide](https://github.com/charmbracelet/lipgloss/blob/main/UPGRADE_GUIDE_V2.md)
- [Package docs on pkg.go.dev](https://pkg.go.dev/charm.land/lipgloss/v2)
