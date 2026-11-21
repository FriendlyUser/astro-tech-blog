---
title: "Go generics in practice: constraints, generic types and when to skip them"
description: "Go 1.25 type parameters: constraints with ~ and unions, cmp.Ordered, a generic Set, Map and Filter helpers, slices and maps, and when an interface is simpler."
tags: ["Go", "Generics", "Type Parameters", "Standard Library", "Go 1.25"]
pubDate: "2026-01-19T16:00:00.000Z"
imgSrc: "/imgs/2026/go_generics_in_practice.webp"
imgAlt: "A diagram of int, float64 and a named Celsius type flowing through a ~int | ~float64 union constraint into a generic Sum function"
---

Generics let a Go function or type take type parameters, so you can write `Sum`, `Set` or `Map` once and use it with any element type that meets a constraint. They arrived in Go 1.18, and since then the standard library has grown `slices`, `maps`, `cmp` and `iter` packages built on them. This post covers the parts you use day to day: writing constraints, building a generic type, the helpers you get for free, and the cases where a plain interface is the better tool.

Examples were written against Go 1.25 and run on the Go playground.

## Type parameters and constraints

A type parameter list goes in square brackets after the function name. Each parameter has a constraint, which is an interface:

```go
func MaxOf[T cmp.Ordered](first T, rest ...T) T {
	m := first
	for _, v := range rest {
		if v > m {
			m = v
		}
	}
	return m
}
```

`cmp.Ordered` (Go 1.21) is the set of types that support `<`, `<=`, `>` and `>=`: the integer, float and string types, plus named types built on them. Inside `MaxOf`, the compiler only lets you do what every type in that set supports, which is why `v > m` compiles here and would not with `T any`.

(For two or three values you don't need this at all: Go 1.21 added the built-in `min` and `max`.)

Three constraints cover most code:

- `any`: no requirements. You can store, copy and pass values, but not compare or add them.
- `comparable`: supports `==` and `!=`, which is what map keys need.
- `cmp.Ordered`: supports ordering, which is what sorting and min/max need.

### Writing your own: unions and `~`

A constraint interface can list types instead of (or as well as) methods. The `|` makes a union, and `~T` means "any type whose underlying type is T":

```go
type Number interface {
	~int | ~int32 | ~int64 | ~float32 | ~float64
}

func Sum[S ~[]E, E Number](s S) E {
	var total E
	for _, v := range s {
		total += v
	}
	return total
}
```

The tilde matters as soon as you have named types. With `type Celsius float64`, `Sum([]Celsius{21.5, 19})` works because `Celsius`'s underlying type is `float64`. Drop the tildes and the call fails, and the compiler tells you why:

```text
Celsius does not satisfy Strict (possibly missing ~ for float64 in Strict)
```

`Sum` also has two type parameters, `S ~[]E` and `E`. That is the pattern the `slices` package uses: it accepts named slice types (`type Readings []Celsius`) and returns the same named type where a function returns a slice, instead of quietly converting it to `[]Celsius`. You rarely need to spell out either parameter at the call site, because the compiler infers both from the argument.

A constraint that contains a union can only be used as a constraint. `var x Number` is a compile error ("cannot use type Number outside a type constraint: interface contains type constraints"). That is the main practical difference from ordinary interfaces.

## A generic type: Set

Go has no set type, and `map[T]struct{}` with helper functions is what most code uses. A generic type wraps it once:

```go
type Set[T comparable] struct {
	m map[T]struct{}
}

func NewSet[T comparable](items ...T) *Set[T] {
	s := &Set[T]{m: make(map[T]struct{}, len(items))}
	for _, v := range items {
		s.Add(v)
	}
	return s
}

func (s *Set[T]) Add(v T)          { s.m[v] = struct{}{} }
func (s *Set[T]) Has(v T) bool     { _, ok := s.m[v]; return ok }
func (s *Set[T]) Len() int         { return len(s.m) }
func (s *Set[T]) All() iter.Seq[T] { return maps.Keys(s.m) }
```

The constraint is `comparable` because `T` is used as a map key. The receiver is written `*Set[T]`, and methods use the type's parameter, but they cannot declare new ones. As of Go 1.25, `func (s *Set[T]) Map[U any](...)` is a syntax error ("method must have no type parameters"). Anything that needs a second type parameter becomes a top-level function:

```go
func Intersect[T comparable](a, b *Set[T]) *Set[T] {
	out := NewSet[T]()
	for v := range a.All() {
		if b.Has(v) {
			out.Add(v)
		}
	}
	return out
}
```

Note `NewSet[T]()`: with no arguments there is nothing to infer `T` from, so it must be written explicitly. Leave it off and you get "in call to NewSet, cannot infer T".

`All` returns an `iter.Seq[T]`, the iterator type added in Go 1.23. That lets callers `range` over the set and pass it to `slices.Sorted` or `slices.Collect` without the set exposing its map.

## Map and Filter

The standard library doesn't ship `Map` or `Filter` for slices, so most codebases write them once:

```go
func Map[T, U any](s []T, f func(T) U) []U {
	out := make([]U, 0, len(s))
	for _, v := range s {
		out = append(out, f(v))
	}
	return out
}

func Filter[T any](s []T, keep func(T) bool) []T {
	var out []T
	for _, v := range s {
		if keep(v) {
			out = append(out, v)
		}
	}
	return out
}
```

Both type parameters of `Map` are inferred from the slice and the function. A plain `for` loop is still the clearer choice when the body is more than one expression, or when you would chain three of these together. Go doesn't fuse them, so each call allocates a new slice.

## What the standard library already gives you

Before writing a helper, check `slices` and `maps` (both Go 1.21, with iterator functions added in 1.23):

| Need | Use |
|---|---|
| Sort, sort by key | `slices.Sort`, `slices.SortFunc` with `cmp.Compare` |
| Search a sorted slice | `slices.BinarySearch` |
| Contains / index | `slices.Contains`, `slices.Index`, `slices.IndexFunc` |
| Remove adjacent duplicates | `slices.Compact` (sort first for full de-duplication) |
| Min / max of a slice | `slices.Min`, `slices.Max` (panic on empty) |
| Copy a map | `maps.Clone` |
| Map keys in order | `slices.Sorted(maps.Keys(m))` |
| Iterator to slice | `slices.Collect` |

`maps.Keys` returns an iterator, not a slice. Wrap it in `slices.Collect` or `slices.Sorted` when you need a slice.

## The whole example

Put the pieces above (`Number`, `Sum`, `MaxOf`, `Map`, `Filter`, `Set` and `Intersect`) in one `main.go` with this header and `main`:

```go
package main

import (
	"cmp"
	"fmt"
	"iter"
	"maps"
	"slices"
	"strconv"
)

type Celsius float64

func main() {
	temps := []Celsius{21.5, 19.0, 23.25}
	fmt.Println("sum:", Sum(temps)) // works because of ~float64

	fmt.Println("max:", MaxOf(3, 9, 4), MaxOf("pear", "apple", "zucchini"))

	ids := []int{7, 3, 12, 3, 8}
	even := Filter(ids, func(n int) bool { return n%2 == 0 })
	labels := Map(even, func(n int) string { return "#" + strconv.Itoa(n) })
	fmt.Println("labels:", labels)

	admins := NewSet("ana", "bo", "chen")
	online := NewSet("bo", "chen", "dev")
	both := Intersect(admins, online)
	fmt.Println("online admins:", slices.Sorted(both.All()), both.Len())

	slices.Sort(ids)
	ids = slices.Compact(ids)
	i, found := slices.BinarySearch(ids, 8)
	fmt.Println("sorted unique:", ids, "index of 8:", i, found)
}
```

With a `go.mod` that says `go 1.25` (any version from 1.23 works, since `iter` is needed), `go run .` prints:

```text
sum: 63.75
max: 9 zucchini
labels: [#12 #8]
online admins: [bo chen] 2
sorted unique: [3 7 8 12] index of 8: 2 true
```

## When an interface is simpler

The question to ask is whether the function needs to know the concrete type, or only to call methods on it.

If it only calls methods, use an interface. This is generic-looking but pointless:

```go
func WriteAll[W io.Writer](w W, lines []string) error {
	for _, l := range lines {
		if _, err := io.WriteString(w, l+"\n"); err != nil {
			return err
		}
	}
	return nil
}
```

`func WriteAll(w io.Writer, lines []string) error` does exactly the same thing, reads better, and is what every caller expects. The Go blog post [When To Use Generics](https://go.dev/blog/when-generics) puts it as: if all you do with a value is call a method on it, use an interface type.

Generics earn their place when:

- the code is the same for every element type: containers, and functions over slices, maps and channels;
- you need to return the caller's type, not an interface (`MaxOf` returns `int` for ints, not `any`);
- you need operators such as `<`, `+` or `==`, which interfaces can't express.

If you find yourself writing a type switch on a type parameter (`switch any(v).(type)`), the implementations differ per type, and separate functions or an interface are usually clearer.

## Gotchas

- **Zero values.** There is no literal for "zero of T". Use `var zero T` and return that.
- **No generic methods** (as of Go 1.25). Write a function that takes the generic type as its first argument.
- **Union constraints aren't types.** You can't declare a variable or a slice element of type `Number`. Use `any` plus a type switch, or make the function generic.
- **Don't assume generics are faster.** The compiler shares one instantiation across types with the same memory layout and passes type information at run time, so calling methods through a type parameter is not automatically cheaper than calling them through an interface. Measure before converting code for speed.
- **Exported generic APIs are a commitment.** Changing a constraint is a breaking change for callers. Start with the narrowest constraint that works (`comparable` rather than `any` plus reflection, `cmp.Ordered` rather than your own list of types).

## Further reading

- [Tutorial: Getting started with generics](https://go.dev/doc/tutorial/generics)
- [An Introduction To Generics](https://go.dev/blog/intro-generics) (Go blog)
- [When To Use Generics](https://go.dev/blog/when-generics) (Go blog)
- [Type parameters in the language spec](https://go.dev/ref/spec#Type_parameter_declarations)
- [`slices`](https://pkg.go.dev/slices), [`maps`](https://pkg.go.dev/maps) and [`cmp`](https://pkg.go.dev/cmp) package docs
