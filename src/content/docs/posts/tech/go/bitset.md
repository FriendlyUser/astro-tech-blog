---
title: Storing large sets of integers in Go with the bitset package
pubDate: "2023-05-30T19:37:46.290Z"
lastUpdated: 2026-11-14
description: How to use the bits-and-blooms/bitset package in Go to set, test, count and iterate bits, and to take unions and intersections of sets.
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

:::caution
This post originally used `github.com/willf/bitset`. The package moved to [`github.com/bits-and-blooms/bitset`](https://github.com/bits-and-blooms/bitset); the old import path only serves old releases. The examples below use the new path.
:::

A bitset stores a set of non-negative integers as an array of bits: bit `i` is 1 if `i` is in the set. A set of integers below one million fits in about 125 KB (one million bits), far less than a `map[uint]bool` holding the same values, which pays for keys, values and hash buckets. Set operations such as union and intersection run a word (64 bits) at a time.

The trade-off: memory is proportional to the *largest* value in the set, not the number of values. If you store just the number 1,000,000,000, you pay for a billion bits. For sparse sets of large numbers, use a map or a compressed bitmap such as [Roaring](https://github.com/RoaringBitmap/roaring).

## Install

```bash
go get github.com/bits-and-blooms/bitset
```

## A worked example

```go
package main

import (
	"fmt"

	"github.com/bits-and-blooms/bitset"
)

func main() {
	// New takes an initial length in bits. Set grows the bitset if you go past it.
	b := bitset.New(100)

	// Set and Clear return the bitset, so calls can be chained.
	b.Set(1).Set(3).Set(42)
	b.Clear(42)

	fmt.Println(b.Test(3))  // true
	fmt.Println(b.Test(42)) // false
	fmt.Println(b.Count())  // 2

	// Union and Intersection return a new bitset and leave both inputs unchanged.
	a := bitset.New(100)
	a.Set(1).Set(2).Set(3)
	fmt.Println(a.Intersection(b)) // {1,3}
	fmt.Println(a.Union(b))        // {1,2,3}

	// Iterate over the set bits with NextSet.
	for i, ok := a.NextSet(0); ok; i, ok = a.NextSet(i + 1) {
		fmt.Println("bit", i, "is set")
	}
}
```

All indexes are `uint`, so untyped constants work as shown, but an `int` variable needs a conversion: `b.Set(uint(n))`.

## Set operations

| Operation | Returns a new bitset | Modifies the receiver |
| --- | --- | --- |
| AND | `Intersection` | `InPlaceIntersection` |
| OR | `Union` | `InPlaceUnion` |
| AND NOT | `Difference` | `InPlaceDifference` |
| XOR | `SymmetricDifference` | `InPlaceSymmetricDifference` |

Use the in-place versions in hot loops to avoid allocating a new bitset each time. There are also `IntersectionCardinality`, `UnionCardinality` and friends, which return just the count without building the result.

## Iterating with range (Go 1.23+)

Recent versions add `EachSet`, which returns an `iter.Seq[uint]`, so you can use a plain `range` loop:

```go
for i := range a.EachSet() {
	fmt.Println("bit", i, "is set")
}
```

## Further reading

- [Package docs on pkg.go.dev](https://pkg.go.dev/github.com/bits-and-blooms/bitset)
- [Source and README](https://github.com/bits-and-blooms/bitset)
