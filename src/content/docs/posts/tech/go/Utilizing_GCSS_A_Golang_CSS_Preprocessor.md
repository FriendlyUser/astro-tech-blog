---
title: "GCSS: compiling indented CSS from Go"
pubDate: "2023-05-30T20:37:46.254Z"
lastUpdated: 2026-11-14
description: "GCSS syntax (variables, mixins, nesting, &) and how to compile it to CSS from Go code or the command line with yosssi/gcss."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

:::caution
GCSS has not had a commit on its main branch since 2014. It still compiles, but it is unmaintained and supports only a small subset of what Sass does. For new projects, consider [Dart Sass](https://sass-lang.com/dart-sass/) or plain CSS, which now has native nesting and custom properties.
:::

[GCSS](https://github.com/yosssi/gcss) is a CSS preprocessor written in pure Go. You write an indented, brace-free syntax and it outputs CSS. Because it is a Go package, you can compile stylesheets inside a Go web server or build tool without installing Node or Ruby.

## Install

The library, inside a Go module:

```sh
go get github.com/yosssi/gcss
```

The command-line compiler:

```sh
go install github.com/yosssi/gcss/cmd/gcss@latest
```

## Syntax

GCSS supports four features: variables, mixins, nested selectors, and `&` for the parent selector. Lines starting with `//` are comments and are dropped from the output. There are no loops, conditionals or arithmetic.

Indentation must be exactly two spaces per level; GCSS counts spaces and divides by two. Properties are written `name: value` with a space after the colon and no trailing semicolon.

### Nesting and `&`

```text
nav
  ul
    margin: 0
    padding: 0
a
  color: blue
  &:hover
    color: red
```

compiles to (GCSS emits it on one line; formatted here for reading):

```css
nav ul{margin:0;padding:0;}
a{color:blue;}
a:hover{color:red;}
```

### Variables

Variables are declared at the top level with a `$` prefix:

```text
$base-font: Helvetica, sans-serif
$main-color: #0074d9

body
  font-family: $base-font
  color: $main-color
```

### Mixins

A mixin is declared at the top level like a variable with parameters, and invoked inside a selector with the same `$name(...)` form:

```text
$border-radius($radius)
  -webkit-border-radius: $radius
  border-radius: $radius

.box
  $border-radius(10px)
```

Note that this is not Sass syntax: there is no `@mixin` or `@include`. Other at-rules such as `@media` or `@import` are passed through to the output.

Declare variables and mixins before the selectors that use them. GCSS compiles the file in a single pass, so a variable used before its declaration comes out as an empty value rather than an error.

## Compiling from Go

`gcss.Compile` reads GCSS from an `io.Reader` and writes CSS to an `io.Writer`. It returns the number of bytes written and an error:

```go
package main

import (
	"log"
	"os"

	"github.com/yosssi/gcss"
)

func main() {
	src, err := os.Open("style.gcss")
	if err != nil {
		log.Fatal(err)
	}
	defer src.Close()

	dst, err := os.Create("style.css")
	if err != nil {
		log.Fatal(err)
	}
	defer dst.Close()

	if _, err := gcss.Compile(dst, src); err != nil {
		log.Fatalf("compiling GCSS: %v", err)
	}
}
```

If you just want a `.css` file next to the source, `gcss.CompileFile` does the reading and writing for you and returns the output path:

```go
cssPath, err := gcss.CompileFile("style.gcss") // writes style.css
if err != nil {
	log.Fatal(err)
}
log.Println("wrote", cssPath)
```

## Compiling from the command line

```sh
# writes style.css next to style.gcss
gcss style.gcss

# or read stdin and write stdout
gcss < style.gcss > style.css
```

## Further reading

- [GCSS on GitHub](https://github.com/yosssi/gcss)
- [API reference on pkg.go.dev](https://pkg.go.dev/github.com/yosssi/gcss)
