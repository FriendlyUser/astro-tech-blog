---
title: Plotting ASCII line graphs in Go with asciigraph
pubDate: "2023-04-26T15:32:49.017Z"
lastUpdated: 2026-11-14
description: How to draw line graphs in the terminal from Go with the asciigraph package, and how to set height, width, captions, colours and multiple series.
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1519800630.webp
---

[asciigraph](https://github.com/guptarohit/asciigraph) draws line graphs out of box-drawing characters, so you can print a chart straight to a terminal, a log file or a CI job's output. It has no dependencies outside the standard library and one main function: `Plot`.

## Install

Inside a Go module:

```sh
go mod init example.com/graphs
go get github.com/guptarohit/asciigraph
```

## A basic graph

`asciigraph.Plot` takes a `[]float64` and returns the graph as a string:

```go
package main

import (
	"fmt"

	"github.com/guptarohit/asciigraph"
)

func main() {
	data := []float64{3, 4, 9, 6, 2, 4, 5, 8, 5}

	graph := asciigraph.Plot(data)

	fmt.Println(graph)
}
```

With no options, one column is drawn per data point and the height follows the range of the data, with the y-axis labelled from the minimum (2) to the maximum (9).

## Options

`Plot` takes options as variadic functional arguments, not a config struct. The common ones:

- `asciigraph.Height(n)` sets the number of rows.
- `asciigraph.Width(n)` sets the number of columns. A positive width interpolates the data across that many columns; zero or less goes back to one column per point.
- `asciigraph.Caption("...")` prints a caption under the graph.
- `asciigraph.Precision(n)` sets the decimal places on the y-axis labels.
- `asciigraph.LowerBound(x)` / `asciigraph.UpperBound(x)` fix the y-axis range instead of fitting it to the data.

```go
package main

import (
	"fmt"

	"github.com/guptarohit/asciigraph"
)

func main() {
	data := []float64{3, 4, 9, 6, 2, 4, 5, 8, 5}

	graph := asciigraph.Plot(data,
		asciigraph.Height(10),
		asciigraph.Width(50),
		asciigraph.Caption("Sample Graph"),
		asciigraph.Precision(0),
	)

	fmt.Println(graph)
}
```

## Several series

`PlotMany` takes a `[][]float64` and accepts the same options, plus per-series colours and legends:

```go
package main

import (
	"fmt"

	"github.com/guptarohit/asciigraph"
)

func main() {
	data := [][]float64{
		{3, 4, 9, 6, 2, 4, 5, 8, 5},
		{5, 6, 4, 3, 5, 7, 6, 4, 3},
	}

	graph := asciigraph.PlotMany(data,
		asciigraph.Height(8),
		asciigraph.SeriesColors(asciigraph.Red, asciigraph.Blue),
		asciigraph.SeriesLegends("cpu", "mem"),
	)

	fmt.Println(graph)
}
```

Colours are ANSI escape codes, so they show up in a terminal but turn into noise if you write the output to a file or a log viewer that doesn't render them.

## Gotchas

- The graph is only as wide as your terminal. Long series wrap and become unreadable; use `Width` to squeeze them down.
- The output uses Unicode box-drawing characters. Make sure your terminal font and encoding (UTF-8) support them, or you'll see `?` in place of the lines.

The full option list is in the [package docs](https://pkg.go.dev/github.com/guptarohit/asciigraph) and the [GitHub README](https://github.com/guptarohit/asciigraph).
