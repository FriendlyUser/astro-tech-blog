---
tags: ['go']
title: "Go basics: variables, constants, types, operators and control flow"
description: "The building blocks of a Go program: package layout, variables and constants, basic types and conversions, operators, and if, switch and for, with runnable examples."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/454515535.png
---

This chapter covers the pieces every Go program is made of: how a program is laid out, variables and constants, the basic types, operators, and control flow. Each example is a complete program. Save it as `main.go` and run it with `go run main.go`, or paste it into the [Go Playground](https://go.dev/play/).

## Program structure

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, World!")
}
```

Every Go file starts with a `package` clause. Files in the same directory belong to the same package. An executable program needs `package main` with a `func main()`, which is where execution starts. `import` brings in other packages, here `fmt` from the standard library.

The compiler is strict about two things beginners hit straight away: an unused import and an unused local variable are both compile errors, not warnings.

## Variables and constants

```go
package main

import "fmt"

const pi = 3.14159 // untyped constant

const (
	monday  = "Monday"
	tuesday = "Tuesday"
)

type Level int

const (
	Low    Level = iota // 0
	Medium              // 1
	High                // 2
)

func main() {
	var message string = "Hello, World!"
	var x, y int = 10, 20

	var count int   // zero value: 0
	var name string // zero value: "" (empty string)

	greeting := "hi" // short declaration, type inferred as string

	fmt.Println(message, x, y, count, name, greeting)
	fmt.Println(pi*2, monday, tuesday, High)
}
```

- `var name type = value` declares a variable. You can drop the type if there's a value (`var x = 10`) or drop the value to get the type's zero value: `0` for numbers, `""` for strings, `false` for bools, `nil` for pointers, slices, maps, channels, functions and interfaces.
- `:=` declares and initialises in one step, with the type inferred. It only works inside functions; package-level variables need `var`.
- `const` values must be known at compile time, so `const now = time.Now()` doesn't compile. A constant without an explicit type, like `pi`, is *untyped*: it takes a type from where it's used, and defaults to `float64` when assigned to a variable without a type.
- `iota` counts up from 0 within a `const` block and is the usual way to define enum-like values.

## Basic types

| Type | Notes |
| --- | --- |
| `int`, `uint` | 32 or 64 bits depending on the platform (64 on amd64 and arm64). `uint` holds only non-negative values. |
| `int8` … `int64`, `uint8` … `uint64` | Fixed-size integers. `byte` is an alias for `uint8`, `rune` for `int32`. |
| `float32`, `float64` | IEEE 754 floating point. `float64` is the default for floating-point literals. |
| `complex64`, `complex128` | Complex numbers. |
| `bool` | `true` or `false`. |
| `string` | An immutable sequence of bytes, conventionally UTF-8. |

Arrays, slices, maps and structs build on these and come later in the series.

Go never converts between numeric types implicitly, even from `int32` to `int64`. You write the conversion yourself:

```go
package main

import "fmt"

func main() {
	var a int32 = 10
	var b int64 = int64(a) // required: no implicit widening
	var f float64 = float64(b) / 4

	s := "héllo"

	fmt.Println(b, f)           // 10 2.5
	fmt.Println(len(s))         // 6: len counts bytes, and é is 2 bytes in UTF-8
	fmt.Println(len([]rune(s))) // 5: number of characters (code points)
}
```

## Operators

```go
package main

import "fmt"

func main() {
	x, y := 7, 2

	// Arithmetic: integer division truncates toward zero.
	fmt.Println(x/y, x%y, -x/y, -x%y)    // 3 1 -3 -1
	fmt.Println(float64(x) / float64(y)) // 3.5

	// Comparison and logical operators produce bool.
	// && and || short-circuit.
	fmt.Println(x > y && y > 0, x == y || !(x > 0)) // true false

	// Assignment operators; ++ and -- are statements, not expressions.
	x += 5
	x++
	fmt.Println(x) // 13

	// Bitwise operators.
	var a uint8 = 0b00001010
	var b uint8 = 0b00000101
	fmt.Printf("%08b %08b %08b %08b\n", a&b, a|b, a^b, a&^0b00000010)
	// 00000000 00001111 00001111 00001000
	fmt.Println(a<<1, a>>1) // 20 5
}
```

- Arithmetic: `+ - * / %`. `+` also concatenates strings. The sign of `%` follows the left operand.
- Comparison: `== != < > <= >=`.
- Logical: `&& || !`.
- Assignment: `= += -= *= /= %=` and the bitwise forms (`&=`, `<<=`, …). `x++` can't be used as a value, so `y := x++` doesn't compile.
- Bitwise: `&` (AND), `|` (OR), `^` (XOR as a binary operator, bitwise NOT as a unary one), `&^` (AND NOT, clears bits), `<<` and `>>` (shifts).

## Control flow

Go has `if`, `switch` and a single loop keyword, `for`, which covers the jobs of `while` and infinite loops in other languages.

```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	// if can start with a short statement; n and err are scoped to the if/else.
	if n, err := strconv.Atoi("42"); err != nil {
		fmt.Println("not a number:", err)
	} else if n > 5 {
		fmt.Println(n, "is greater than 5")
	} else {
		fmt.Println(n, "is 5 or less")
	}

	// switch cases don't fall through, so no break is needed.
	switch day := "Sat"; day {
	case "Sat", "Sun":
		fmt.Println("weekend")
	default:
		fmt.Println("weekday")
	}

	// Classic three-part for loop.
	for i := 0; i < 3; i++ {
		fmt.Println("i =", i)
	}

	// Condition-only for: Go's "while".
	j := 0
	for j < 3 {
		j++
	}
	fmt.Println("j =", j)

	// range over a string yields byte index and rune.
	for i, r := range "go!" {
		fmt.Println(i, string(r))
	}

	// range over an integer (Go 1.22+): 0, 1, 2.
	for k := range 3 {
		fmt.Println("k =", k)
	}

	// Infinite loop, exited with break.
	count := 0
	for {
		count++
		if count == 3 {
			break
		}
	}
	fmt.Println("count =", count)
}
```

`range` also works over arrays, slices, maps and channels. `continue` skips to the next iteration, and labelled `break`/`continue` let you leave an outer loop from inside an inner one.

## Gotchas

- Braces are mandatory on `if` and `for`, and the opening brace must be on the same line. Go inserts semicolons at line ends, so a brace on the next line is a syntax error.
- Unused variables and imports stop compilation. Use `_` to discard a value you don't need, as in `_, err := f()`.
- `len` on a string counts bytes, not characters.
- Integer overflow wraps around silently, and dividing an integer by a constant zero is a compile error, while dividing by a zero variable panics at runtime.

## Further reading

- [A Tour of Go](https://go.dev/tour/)
- [The Go language specification](https://go.dev/ref/spec)
- [Effective Go](https://go.dev/doc/effective_go)
