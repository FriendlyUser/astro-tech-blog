---
title: Coloring Go terminal output with the chalk package
pubDate: "2023-05-26T15:32:49.038Z"
lastUpdated: 2026-11-14
description: "How to color and style terminal text in Go with ttacon/chalk: basic colors, text styles, reusable styles, and its limits compared with fatih/color."
tags: ["go", "chalk"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1144941208.png
---

:::caution
`github.com/ttacon/chalk` hasn't been updated since 2019. It still compiles, but it only supports the eight basic ANSI colors and never checks whether output is a terminal. For new code, consider [fatih/color](https://github.com/fatih/color), which disables color when output isn't a terminal and honours `NO_COLOR`, or [Lip Gloss](https://github.com/charmbracelet/lipgloss) for layouts and 256/true color.
:::

[chalk](https://github.com/ttacon/chalk) is a tiny Go package (one source file, standard library only) that wraps strings in ANSI escape codes. It gives you the eight standard colors as foreground or background, a handful of text styles such as bold and underline, and a way to combine them into a reusable style.

## Install

```bash
go get github.com/ttacon/chalk
```

## Colors and text styles

The colors are `Black`, `Red`, `Green`, `Yellow`, `Blue`, `Magenta`, `Cyan` and `White`. The text styles are `Bold`, `Dim`, `Italic`, `Underline`, `Inverse`, `Hidden` and `Strikethrough`.

```go
package main

import (
	"fmt"

	"github.com/ttacon/chalk"
)

func main() {
	// Color one phrase; the color is reset afterwards.
	fmt.Println(chalk.Green.Color("Hello, World!"))

	// Apply a text style to one phrase.
	fmt.Println(chalk.Bold.TextStyle("Bold text"))
	fmt.Println(chalk.Underline.TextStyle("Underlined text"))

	// Colors are also fmt.Stringers, so you can switch color mid-line.
	// Remember to finish with chalk.Reset.
	fmt.Println(chalk.Red, "Red,", chalk.Cyan, "then cyan", chalk.Reset)
}
```

`Color` and `TextStyle` wrap the string and reset afterwards. Printing a color value on its own (as in the last line) just switches the color, so the terminal stays that color until you print `chalk.Reset`.

## Combining color, background and style

`NewStyle` on a color creates a `Style` with that foreground. `WithBackground`, `WithForeground` and `WithTextStyle` set a field and return the style so you can chain them, and `Style(string)` applies it:

```go
package main

import (
	"fmt"

	"github.com/ttacon/chalk"
)

func main() {
	warning := chalk.Yellow.NewStyle().
		WithBackground(chalk.Black).
		WithTextStyle(chalk.Bold)

	fmt.Println(warning.Style("Disk usage above 90%"))

	// Style is a method value, so you can keep it as a plain func.
	errorText := chalk.White.NewStyle().
		WithBackground(chalk.Red).
		WithTextStyle(chalk.Underline).
		Style

	fmt.Println(errorText("Build failed"))
}
```

Three things about `Style` that aren't obvious from the API:

- The `With...` methods modify the style in place and return the same pointer; they don't make a copy. Build a separate style for each look rather than deriving one from another.
- A style always sets a background. If you never call `WithBackground`, the zero value is `chalk.Black`, so text gets a black background rather than the terminal's default.
- A style holds one text style. Calling `WithTextStyle` twice replaces the first, so you can't have bold and underline together, and there is no method to merge two styles.

## Gotchas

- **No terminal detection.** chalk always writes escape codes, so redirecting output to a file or another program leaves `\x1b[...m` sequences in it. If your tool's output is likely to be piped, check `term.IsTerminal(int(os.Stdout.Fd()))` from `golang.org/x/term` before styling, or use a library that does this for you.
- **Eight colors only.** There's no 256-color or true-color (hex) support. Most terminals map the basic colors to their own theme, so "green" may not look the same everywhere.
- **Don't rely on color alone.** Pair colors with a word or symbol (`ERROR`, `WARN`, `✓`) so the output still makes sense to colorblind users and in logs where color is stripped.

## Further reading

- [chalk on GitHub](https://github.com/ttacon/chalk)
- [chalk package docs](https://pkg.go.dev/github.com/ttacon/chalk)
