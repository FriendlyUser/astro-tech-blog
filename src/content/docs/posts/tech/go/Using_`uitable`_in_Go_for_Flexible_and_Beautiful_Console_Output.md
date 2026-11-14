---
title: Printing aligned tables in Go terminal output with uitable
pubDate: "2023-05-30T19:37:45.987Z"
lastUpdated: 2026-11-14
description: "Use gosuri/uitable to print aligned columns in a Go CLI: building rows, right-aligning numbers, and truncating or wrapping long cells."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

[`uitable`](https://github.com/gosuri/uitable) prints rows of values as aligned columns in the terminal. It measures each column's widest cell, pads the rest to match, and can truncate or wrap long cells. There are no borders or box-drawing characters; if you want those, look at a heavier package such as `go-pretty`.

The API is small: `New()`, `AddRow()`, `RightAlign()`, and the `MaxColWidth`, `Wrap` and `Separator` fields. The latest tag is v0.0.4 (2019).

## Install

Inside a Go module:

```sh
go get github.com/gosuri/uitable
```

## A basic table

```go
package main

import (
	"fmt"

	"github.com/gosuri/uitable"
)

type item struct {
	Name  string
	Qty   int
	Price float64
}

func main() {
	items := []item{
		{"Keyboard", 2, 49.99},
		{"Monitor", 1, 189.5},
		{"USB-C cable", 10, 7.25},
	}

	table := uitable.New()
	table.Separator = "  " // the default is a tab
	table.RightAlign(1)    // QTY
	table.RightAlign(2)    // PRICE

	table.AddRow("ITEM", "QTY", "PRICE")
	for _, it := range items {
		table.AddRow(it.Name, it.Qty, fmt.Sprintf("%.2f", it.Price))
	}

	fmt.Println(table)
}
```

Output:

```text
ITEM         QTY   PRICE
Keyboard       2   49.99
Monitor        1  189.50
USB-C cable   10    7.25
```

Some details:

- `AddRow` takes `...interface{}` and formats each value with `%v`. There is no per-column formatter, so format numbers yourself before adding them, as with the price above.
- `RightAlign` takes a zero-based column index.
- `*Table` implements `String()`, so `fmt.Println(table)` works. `table.Bytes()` gives you a `[]byte` if you're writing to an `io.Writer`.
- The default separator is a tab (`uitable.Separator = "\t"`), which makes the column gaps depend on your terminal's tab stops. Setting `Separator` to spaces gives predictable output.

## Long values: truncate or wrap

Set `MaxColWidth` to cap how wide any column can get. By default, longer cells are cut and end in `...`:

```go
table := uitable.New()
table.MaxColWidth = 30
table.AddRow("NAME", "BIO")
table.AddRow("Ada Lovelace", "Mathematician and writer, known for her work on Babbage's Analytical Engine.")
fmt.Println(table)
```

Set `Wrap` to `true` to break long cells across several lines instead. The other cells in that row are padded so the columns stay aligned:

```go
table.Wrap = true
```

Wrapping works on word boundaries, and it is the better choice for descriptive text; truncation suits IDs and paths where the first part is enough.

## When not to use it

`uitable` only lays out text; it doesn't sort, page, or draw borders, and it hasn't seen a release since 2019. For simple aligned output, the standard library's [`text/tabwriter`](https://pkg.go.dev/text/tabwriter) does the same job with no dependency.

## Further reading

- [uitable on GitHub](https://github.com/gosuri/uitable)
- [API reference on pkg.go.dev](https://pkg.go.dev/github.com/gosuri/uitable)
