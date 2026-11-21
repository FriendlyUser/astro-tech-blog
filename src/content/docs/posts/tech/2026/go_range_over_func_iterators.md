---
title: "Iterators in Go: range over functions and the iter package"
description: "Write Go iterators with iter.Seq and Seq2: generators, tree walks, early break and the yield contract, slices.Collect and maps.Keys, and merging with iter.Pull."
tags: ["Go", "Iterators", "iter", "Generics", "Standard Library"]
pubDate: "2026-06-07T16:00:00.000Z"
imgSrc: "/imgs/2026/go_range_over_func_iterators.webp"
imgAlt: "A pipeline of numbered beads flowing from a Fib generator through Filter and Take stages into a collected slice"
---

Since Go 1.23, a `for ... range` loop can range over a function. That gives Go a standard iterator shape: a function that calls `yield` once per value. The `iter` package names the types, and `slices`, `maps` and `strings` return and accept them. Use iterators when the caller should be able to loop over something without you building a slice first: an infinite or lazy sequence, a tree, rows from a file, or the keys of a container type that shouldn't expose its internals.

Examples use Go 1.26 and were run on the Go playground.

## The two types

```go
package iter

type Seq[V any] func(yield func(V) bool)
type Seq2[K, V any] func(yield func(K, V) bool)
```

A `Seq` yields one value per step and a `Seq2` yields two, usually an index or key with a value, or a value with an error. You don't call these functions yourself; you range over them:

```go
for v := range seq { ... }       // iter.Seq[V]
for k, v := range seq2 { ... }   // iter.Seq2[K, V]
```

The compiler turns the loop body into the `yield` function. Each call to `yield` runs the body once. `yield` returns `true` to ask for more, and `false` when the loop has ended early because of `break`, `return` or a `goto` out of the loop.

## Writing a generator

The simplest iterator never ends on its own:

```go
// Fib yields Fibonacci numbers forever. The caller decides when to stop.
func Fib() iter.Seq[int] {
	return func(yield func(int) bool) {
		a, b := 0, 1
		for {
			if !yield(a) {
				return
			}
			a, b = b, a+b
		}
	}
}
```

The `if !yield(a) { return }` check is the whole contract. When the caller breaks, `yield` returns `false` and the iterator must stop. If it ignores that and calls `yield` again, the program panics:

```text
panic: runtime error: range function continued iteration after function for loop body returned false
```

So every `yield` call in an iterator needs its result checked. In a recursive iterator, the `false` has to travel all the way up. A binary search tree shows the pattern:

```go
type Tree[K cmp.Ordered] struct {
	Left, Right *Tree[K]
	Key         K
}

func (t *Tree[K]) Insert(k K) *Tree[K] {
	if t == nil {
		return &Tree[K]{Key: k}
	}
	if k < t.Key {
		t.Left = t.Left.Insert(k)
	} else {
		t.Right = t.Right.Insert(k)
	}
	return t
}

// All yields keys in order. push returns false once the consumer stops,
// and that false is passed all the way up the recursion.
func (t *Tree[K]) All() iter.Seq[K] {
	return func(yield func(K) bool) {
		t.push(yield)
	}
}

func (t *Tree[K]) push(yield func(K) bool) bool {
	if t == nil {
		return true
	}
	return t.Left.push(yield) && yield(t.Key) && t.Right.push(yield)
}
```

The `&&` chain short-circuits: once any `yield` returns `false`, nothing to its right runs, and each level of the recursion returns `false` to its parent. This is the case where iterators beat the alternatives most clearly. Before Go 1.23 you would build a slice of every key, use a callback with its own stop protocol, or use a goroutine and a channel, which leaks if the consumer stops reading.

## Cleanup with defer

Because the iterator is an ordinary function call, `defer` inside it runs when the loop ends, including on early `break`. That makes resource-owning iterators safe:

```go
// FileLines yields each line of a file. The file is closed when the loop ends,
// including when the caller breaks out early.
func FileLines(path string) iter.Seq2[string, error] {
	return func(yield func(string, error) bool) {
		f, err := os.Open(path)
		if err != nil {
			yield("", err)
			return
		}
		defer f.Close()

		sc := bufio.NewScanner(f)
		for sc.Scan() {
			if !yield(sc.Text(), nil) {
				return
			}
		}
		if err := sc.Err(); err != nil {
			yield("", err)
		}
	}
}
```

`Seq2[string, error]` is the common way to report errors from an iterator. The caller checks `err` on each step:

```go
for line, err := range FileLines("app.log") {
	if err != nil {
		return err
	}
	if strings.HasPrefix(line, "ERROR") {
		fmt.Println(line)
		break // f.Close still runs
	}
}
```

## Adapters: Filter and Take

The standard library doesn't include `Filter` or `Map` for iterators, but they are short to write, and they compose without building intermediate slices:

```go
func Filter[V any](seq iter.Seq[V], keep func(V) bool) iter.Seq[V] {
	return func(yield func(V) bool) {
		for v := range seq {
			if keep(v) && !yield(v) {
				return
			}
		}
	}
}

func Take[V any](seq iter.Seq[V], n int) iter.Seq[V] {
	return func(yield func(V) bool) {
		if n <= 0 {
			return
		}
		i := 0
		for v := range seq {
			if !yield(v) {
				return
			}
			i++
			if i == n {
				return
			}
		}
	}
}
```

`Take(Filter(Fib(), isEven), 5)` produces five values and stops `Fib`, even though `Fib` would run forever. Returning from the `range` loop inside `Take` makes `Fib`'s `yield` return `false`.

## What the standard library gives you

Go 1.23 added iterator functions to `slices` and `maps`, and 1.24 added more to `strings` and `bytes`:

| Function | Returns / does |
|---|---|
| `slices.All(s)` | `Seq2[int, E]` of index and value |
| `slices.Values(s)` | `Seq[E]` of values |
| `slices.Backward(s)` | `Seq2[int, E]` from the end |
| `slices.Collect(seq)` | a new slice from any `Seq` |
| `slices.Sorted(seq)` | a new sorted slice from any `Seq` of ordered values |
| `slices.Chunk(s, n)` | `Seq` of sub-slices of up to `n` elements |
| `maps.Keys(m)`, `maps.Values(m)`, `maps.All(m)` | iterators over a map (in unspecified order) |
| `maps.Collect(seq2)` | a new map from a `Seq2` |
| `strings.Lines(s)` | `Seq[string]` of lines, each keeping its `\n` (Go 1.24) |
| `strings.SplitSeq`, `strings.FieldsSeq` | lazy versions of `Split` and `Fields` (Go 1.24) |

`maps.Keys` is the one that catches people porting old code. It returns an iterator, not a slice. `slices.Sorted(maps.Keys(m))` is the idiomatic way to get sorted keys now.

## Pull iterators: iter.Pull

A range loop is push-style: the iterator drives, and your loop body is called. Sometimes you need to step through two sequences at your own pace, for example to merge two sorted streams. `iter.Pull` converts a push iterator into a `next` function:

```go
// Merge combines two sorted sequences into one sorted sequence, using iter.Pull
// to step through both at its own pace.
func Merge[V cmp.Ordered](a, b iter.Seq[V]) iter.Seq[V] {
	return func(yield func(V) bool) {
		nextA, stopA := iter.Pull(a)
		defer stopA()
		nextB, stopB := iter.Pull(b)
		defer stopB()

		va, okA := nextA()
		vb, okB := nextB()
		for okA || okB {
			if okA && (!okB || va <= vb) {
				if !yield(va) {
					return
				}
				va, okA = nextA()
			} else {
				if !yield(vb) {
					return
				}
				vb, okB = nextB()
			}
		}
	}
}
```

`next` returns the next value and `true`, or the zero value and `false` once the sequence is done. Always call `stop` (a `defer` is easiest): it tells the underlying iterator to finish, which runs its deferred cleanup. `iter.Pull` costs more than a range loop, because the runtime runs the iterator as a separate coroutine and switches to it on each `next`. Use it when you need two sequences in lockstep, not as the default.

## Putting it together

With `Fib`, `Tree`, `Filter`, `Take` and `Merge` from above in the same `main.go`:

```go
package main

import (
	"cmp"
	"fmt"
	"iter"
	"maps"
	"slices"
	"strings"
)

func main() {
	for i, f := range slices.All(slices.Collect(Take(Fib(), 8))) {
		fmt.Print(i, ":", f, " ")
	}
	fmt.Println()

	evenFibs := Take(Filter(Fib(), func(n int) bool { return n%2 == 0 }), 5)
	fmt.Println("even:", slices.Collect(evenFibs))

	var root *Tree[string]
	for _, w := range strings.Fields("pear fig apple kiwi banana cherry") {
		root = root.Insert(w)
	}
	for w := range root.All() {
		if w > "c" {
			break // push sees yield return false and unwinds
		}
		fmt.Print(w, " ")
	}
	fmt.Println()

	odds := slices.Values([]int{1, 5, 9, 13})
	evens := slices.Values([]int{2, 4, 6, 20})
	fmt.Println("merged:", slices.Collect(Merge(odds, evens)))

	stock := map[string]int{"fig": 3, "apple": 12, "kiwi": 0}
	fmt.Println("keys:", slices.Sorted(maps.Keys(stock)))

	for line := range strings.Lines("first\nsecond\n") {
		fmt.Printf("%q ", line)
	}
	fmt.Println()
}
```

Output:

```text
0:0 1:1 2:1 3:2 4:3 5:5 6:8 7:13 
even: [0 2 8 34 144]
apple banana 
merged: [1 2 4 5 6 9 13 20]
keys: [apple fig kiwi]
"first\n" "second\n" 
```

## Gotchas

- **Check every `yield`.** Ignoring a `false` panics at run time, and only on the path where a caller breaks early, so it can survive tests that always loop to the end. Add a test that breaks after the first value.
- **Single-use or reusable?** `Fib()` returns a fresh sequence each time you call it. An iterator that reads from a file or a network stream can usually be ranged over only once. Say which in the doc comment.
- **Don't return an iterator when a slice is what callers want.** If every caller does `slices.Collect(x.All())`, return the slice. Iterators pay off for lazy, large, infinite or resource-backed sequences, and for hiding a container's internals.
- **Map order is still random.** `maps.Keys` and `maps.All` iterate in unspecified order, like ranging over the map directly. Sort if the order matters.
- **Mutating while iterating.** Ranging over `slices.All(s)` while appending to `s` behaves like the equivalent `for i := range s` loop. For your own containers, decide and document what happens if the container changes mid-iteration.
- **Go version.** Range-over-func needs `go 1.23` or later in `go.mod`. With an older `go` line, the compiler rejects the loop even on a newer toolchain.

## Further reading

- [`iter` package documentation](https://pkg.go.dev/iter), which defines the iterator conventions
- [Range Over Function Types](https://go.dev/blog/range-functions) (Go blog)
- [For statements with range clause](https://go.dev/ref/spec#For_range) in the language spec
- [`slices`](https://pkg.go.dev/slices) and [`maps`](https://pkg.go.dev/maps) package docs
