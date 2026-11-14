---
title: "Dictionaries in Go: creating, reading, deleting and iterating over maps"
pubDate: "2023-05-30T19:37:46.314Z"
lastUpdated: 2026-11-14
description: "How Go's built-in map type works as a dictionary: creating maps, adding and reading keys, the comma-ok check, deleting, iterating in sorted order, and common gotchas."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

Go doesn't have a type called "dictionary"; its built-in `map` type fills that role. A `map[K]V` stores values of type `V` under unique keys of type `K`, where `K` can be any comparable type (strings, numbers, booleans, pointers, structs of comparable fields, and so on). Lookups, inserts and deletes are average constant time because maps are hash tables.

## Creating a map

Use a map literal when you know some entries up front, or `make` for an empty map:

```go
package main

import "fmt"

func main() {
	stock := map[string]int{
		"apple":  5,
		"banana": 8,
	}

	empty := make(map[string]int)
	sized := make(map[string]int, 100) // hint: room for ~100 entries before growing

	fmt.Println(stock, empty, sized, len(stock))
}
```

`len(m)` returns the number of entries. `fmt` prints maps with keys sorted, so the output is stable: `map[apple:5 banana:8] map[] map[] 2`.

Don't declare a map with `var m map[string]int` and then write to it. That gives you a nil map: reading from it is fine (you get zero values), but assigning to it panics with `assignment to entry in nil map`.

## Adding, updating and reading values

Assignment adds a key or overwrites its value. Reading a missing key returns the zero value of the value type:

```go
package main

import "fmt"

func main() {
	stock := make(map[string]int)
	stock["apple"] = 5
	stock["banana"] = 8
	stock["apple"] += 1 // update in place

	fmt.Println("apple:", stock["apple"])   // apple: 6
	fmt.Println("orange:", stock["orange"]) // orange: 0
}
```

## Checking whether a key exists

Because a missing key and a key stored with the zero value both read as `0`, use the two-value "comma ok" form when the difference matters:

```go
package main

import "fmt"

func main() {
	stock := map[string]int{"apple": 5, "pear": 0}

	for _, fruit := range []string{"apple", "pear", "orange"} {
		if n, ok := stock[fruit]; ok {
			fmt.Printf("%s: %d in stock\n", fruit, n)
		} else {
			fmt.Printf("%s: not tracked\n", fruit)
		}
	}
}
```

`pear` is found with a count of 0; `orange` reports "not tracked".

## Deleting keys

`delete(m, key)` removes an entry. Deleting a key that isn't there is a no-op, not an error. Since Go 1.21, `clear(m)` removes every entry.

```go
package main

import "fmt"

func main() {
	stock := map[string]int{"apple": 5, "banana": 8}

	delete(stock, "apple")
	delete(stock, "orange") // no-op
	fmt.Println(stock)      // map[banana:8]

	clear(stock)
	fmt.Println(len(stock)) // 0
}
```

## Iterating

`for key, value := range m` visits every entry. The order is unspecified and deliberately varies between runs, so never depend on it. When you need a stable order, sort the keys first. With Go 1.23 or later, the standard `maps` and `slices` packages do this in one line:

```go
package main

import (
	"fmt"
	"maps"
	"slices"
)

func main() {
	stock := map[string]int{"orange": 12, "apple": 5, "banana": 8}

	// Random order
	for fruit, n := range stock {
		fmt.Printf("%s: %d\n", fruit, n)
	}

	// Sorted by key
	for _, fruit := range slices.Sorted(maps.Keys(stock)) {
		fmt.Printf("%s: %d\n", fruit, stock[fruit])
	}
}
```

It's safe to delete entries from a map while ranging over it.

## Gotchas

- **Maps are references.** Assigning a map to another variable or passing it to a function doesn't copy it; both names refer to the same data. Use `maps.Clone(m)` (Go 1.21+) for a shallow copy.
- **Not safe for concurrent writes.** Reading and writing the same map from multiple goroutines without a lock is a data race, and the runtime may crash with `concurrent map writes`. Protect it with a `sync.Mutex` or `sync.RWMutex`, or use `sync.Map` for the specific cases its docs describe.
- **You can't take the address of a map element**, so `&m["apple"]` doesn't compile, and with struct values `m["apple"].Count++` doesn't either. Read the struct, modify it, and assign it back, or store pointers.
- **Slices, maps and functions can't be keys**, because they aren't comparable.

## Further reading

- [Go maps in action](https://go.dev/blog/maps) (Go blog)
- [Map types in the language spec](https://go.dev/ref/spec#Map_types)
- [`maps` package](https://pkg.go.dev/maps)
