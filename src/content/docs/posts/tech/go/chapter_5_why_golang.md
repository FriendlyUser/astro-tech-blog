---
tags: ['go']
title: "Go arrays, slices, and maps: how they differ"
description: "Fixed-size arrays, slices that share a backing array, and maps, with runnable examples and the gotchas: aliasing, append reallocation, and nil maps."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1031426508.png
---
Go has three built-in collection types: arrays (fixed size), slices (a variable-length view onto an array), and maps (hash tables). In practice you'll use slices and maps almost all the time, but slices only make sense once you know how arrays work underneath them.

## Arrays

An array has a fixed length that is part of its type: `[5]int` and `[3]int` are different types.

```go
var arr [5]int             // five zeros
nums := [5]int{1, 2, 3, 4, 5}
nums[0] = 10               // index from 0
fmt.Println(len(nums))     // 5
```

Indexing past the end panics at runtime (or fails to compile if the index is a constant).

Arrays are values. Assigning one or passing it to a function copies every element:

```go
a := [3]int{1, 2, 3}
b := a
b[0] = 99
fmt.Println(a, b) // [1 2 3] [99 2 3]
```

Iterate with `range`, which yields the index and a copy of each element:

```go
for i, v := range nums {
	fmt.Println(i, v)
}
```

## Slices

A slice is a small header with three fields: a pointer into a backing array, a length (`len`), and a capacity (`cap`, the number of elements from the slice's start to the end of the backing array). Copying a slice copies the header, not the elements, so two slices can share the same data.

There are three common ways to create one:

```go
var s []int                 // nil slice, len 0
s2 := []int{1, 2, 3}        // literal; Go creates the backing array
s3 := make([]int, 0, 10)    // len 0, cap 10
```

You can also slice an existing array or slice with `a[start:end]`, which includes `start` and excludes `end`.

`append` adds elements and returns the updated slice. If there's room in the capacity, it writes into the existing backing array; if not, it allocates a bigger array and copies the elements over. Always assign the result back: `s = append(s, x)`.

This program shows both behaviours:

```go
package main

import "fmt"

func main() {
	arr := [5]int{1, 2, 3, 4, 5}
	s := arr[0:3] // [1 2 3], len 3, cap 5

	fmt.Println(len(s), cap(s)) // 3 5

	s[0] = 100
	fmt.Println(arr[0]) // 100: s shares arr's storage

	s = append(s, 6) // fits in capacity, so it overwrites arr[3]
	fmt.Println(arr) // [100 2 3 6 5]

	s = append(s, 7, 8) // exceeds capacity: new backing array
	s[0] = -1
	fmt.Println(arr[0], s[0]) // 100 -1
}
```

The aliasing is the usual source of slice bugs: appending to a sub-slice can overwrite data that another slice still uses. Use `copy`, or `slices.Clone` from the standard `slices` package (Go 1.21+), when you need an independent copy.

## Maps

A map stores key-value pairs. Keys must be comparable with `==`, so slices, maps, and functions can't be keys.

```go
package main

import "fmt"

func main() {
	m := make(map[string]int)
	m["one"] = 1
	m["two"] = 2
	m["three"] = 3

	delete(m, "two")

	if v, ok := m["one"]; ok {
		fmt.Println("one =", v)
	}

	fmt.Println(m["missing"]) // 0: a missing key returns the zero value

	for k, v := range m {
		fmt.Println(k, v)
	}
}
```

Things to watch for:

- **A nil map can be read but not written.** `var m map[string]int` declares a nil map; `m["one"] = 1` then panics with "assignment to entry in nil map". Create maps with `make` or a literal (`map[string]int{}`) before writing.
- **Use the two-value form to test membership.** `v, ok := m[k]` tells you whether the key exists; `m[k]` alone can't distinguish a missing key from a stored zero.
- **Iteration order is not specified.** `range` over a map can return keys in a different order each run. Sort the keys (for example with `slices.Sorted(maps.Keys(m))`, Go 1.23+) if you need a stable order. `fmt.Println(m)` does print keys sorted, which can hide this in quick tests.
- **Maps aren't safe for concurrent writes.** Guard them with a `sync.Mutex`, or use `sync.Map` for the specific cases its docs describe.

## Further reading

- [Go Slices: usage and internals](https://go.dev/blog/slices-intro)
- [Go maps in action](https://go.dev/blog/maps)
- [The Go spec: slice types](https://go.dev/ref/spec#Slice_types)
