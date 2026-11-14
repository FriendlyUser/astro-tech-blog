---
tags: ['go']
title: "Go functions, packages, and exported names"
description: "Writing Go functions with multiple return values, splitting code into packages inside a module, and controlling visibility with capitalised names."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3893879687.webp
---
Functions and packages are how Go code is split up: functions for individual tasks, packages for groups of related functions and types. This post covers declaring functions, returning multiple values, and creating a package of your own inside a module.

## Functions

A function is declared with `func`, its name, its parameters, and its return type:

```go
func add(a, b int) int {
	return a + b
}
```

`a, b int` is shorthand for `a int, b int`. Call it with `sum := add(2, 3)`.

### Multiple return values

Functions can return more than one value:

```go
func swap(x, y string) (string, string) {
	return y, x
}
```

```go
a, b := swap("hello", "world")
fmt.Println(a, b) // world hello
```

The most common use is returning a result together with an error, which the caller checks:

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	n, err := strconv.Atoi("42x")
	if err != nil {
		fmt.Println("parse failed:", err)
		return
	}
	fmt.Println(n)
}
```

Use `_` to ignore a return value you don't need: `_, b := swap("hello", "world")`.

## Packages and modules

A package is a directory of `.go` files that all start with the same `package` clause. Every file in the directory belongs to that one package; a nested directory is a separate package, not a "sub-package" with special access.

A module is a tree of packages with a `go.mod` file at the root. The module path in `go.mod` is the prefix for every import path inside it. Here's a small module with one package besides `main`:

```text
hello/
  go.mod
  main.go
  mathutil/
    mathutil.go
```

Create `go.mod` from inside `hello/`:

```bash
go mod init example.com/hello
```

`mathutil/mathutil.go`:

```go
package mathutil

// Add returns the sum of a and b.
func Add(a, b int) int {
	return a + b
}

// Max returns the larger of a and b.
func Max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

// double is unexported: only code in package mathutil can call it.
func double(x int) int {
	return x * 2
}
```

`main.go`:

```go
package main

import (
	"fmt"

	"example.com/hello/mathutil"
)

func main() {
	fmt.Println(mathutil.Add(3, 5))  // 8
	fmt.Println(mathutil.Max(5, 10)) // 10
	// mathutil.double(2) would not compile: double is unexported.
}
```

Run it with `go run .`. The import path is the module path plus the directory (`example.com/hello/mathutil`), and you refer to the package by its name (`mathutil`). The module path doesn't have to be a real URL until you publish the module; if you push it to GitHub, use the repository path (for example `github.com/you/hello`) so `go get` can find it.

Since Go 1.21, `min` and `max` are built-in functions, so in real code you'd use `max(5, 10)` rather than writing your own `Max`.

## Exported names

Visibility in Go is controlled by the first letter of a name. Functions, types, variables, constants, and struct fields that start with an uppercase letter (`Add`, `Max`) are exported and usable from other packages. Lowercase names (`double`) are visible only within their own package.

Export only what callers need. A small exported surface is easier to document and lets you change the internals without breaking other code.

## Organising a larger project

- Name packages after what they provide (`http`, `auth`, `storage`), in short lowercase words. Avoid catch-all names like `utils` or `common`.
- Put packages that other modules shouldn't import under an `internal/` directory; the Go toolchain refuses imports of `internal` packages from outside the parent tree.
- Use interfaces at the boundaries where you need to swap implementations (for example, a fake database in tests), not everywhere by default.
- Write a doc comment starting with the name for every exported identifier; `go doc` and pkg.go.dev display them.
- Run `gofmt` (or `goimports`, from `golang.org/x/tools`, which also fixes import lists) and `go vet` on every change. Use `go mod tidy` to keep `go.mod` in sync with your imports.

## Further reading

- [How to Write Go Code](https://go.dev/doc/code)
- [Organizing a Go module](https://go.dev/doc/modules/layout)
- [Effective Go: Names](https://go.dev/doc/effective_go#names)
