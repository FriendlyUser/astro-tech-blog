---
description: "A tour of Swift's standard library: integer and floating-point types, String and Character, Array, Set and Dictionary, and sorted, filter, map and reduce."
imgSrc: /imgs/2023/117117315.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-07-12T16:20:28.000Z'
lastUpdated: 2026-11-14
tags:
  - swift
title: "Swift standard library basics: numbers, strings, collections and algorithms"
---

The Swift standard library is the set of types and functions every Swift program gets without an import: numbers, strings, optionals, collections, and the algorithms that work on them. It is separate from Foundation, which adds things like `Date`, `URL` and `JSONDecoder` and has to be imported. This post covers the parts you use every day.

## Basic types

- **Integers**: `Int` and `UInt` are the platform word size (64 bits on Macs, iPhones and other 64-bit targets; 32 bits on Apple Watch's `arm64_32`). Fixed-width types are `Int8`, `Int16`, `Int32`, `Int64` and the matching `UInt` types. Use `Int` unless you need a specific size. Overflow traps at runtime instead of wrapping; use `&+`, `&-` and `&*` when you want wrapping arithmetic.
- **Floating point**: `Float` is 32-bit and `Double` is 64-bit. A literal like `3.14` is inferred as `Double`.
- **`Bool`**: `true` or `false`. Swift does not convert integers to `Bool`, so `if 1 { }` doesn't compile.
- **`Character`**: one extended grapheme cluster, which is what a user sees as a single character. `"é"` and `"🇨🇦"` are each one `Character`, even though they are made of more than one Unicode scalar.
- **`String`**: a Unicode-correct sequence of `Character` values. Because characters have variable width, you can't index a string with an `Int`; you use `String.Index`.

```swift
let flag = "🇨🇦"
print(flag.count)                // 1 (one Character)
print(flag.unicodeScalars.count) // 2 (two regional indicator scalars)

let greeting = "Hello, Swift"
let comma = greeting.firstIndex(of: ",")!
let hello = greeting[..<comma]   // Substring "Hello"
print(String(hello))
```

Slicing a `String` gives you a `Substring`, which shares storage with the original. Convert it with `String(...)` if you keep it around, so the original string's memory can be released.

## Collections

`Array`, `Set` and `Dictionary` are all value types with copy-on-write storage: assigning one to another variable is cheap, and the buffer is only copied when one of the copies is mutated. Whether a collection can be changed depends on whether you declare it with `let` or `var`.

### Array

An ordered, zero-indexed collection. Indexing out of bounds is a runtime trap, not an optional.

```swift
var numbers = [1, 2, 3, 4, 5]
numbers.append(6)          // [1, 2, 3, 4, 5, 6]
numbers.insert(0, at: 0)   // [0, 1, 2, 3, 4, 5, 6]
print(numbers.first ?? -1) // 0; first and last return optionals
```

### Set

An unordered collection of unique `Hashable` elements, with fast membership checks and set algebra.

```swift
var colors: Set<String> = ["red", "green", "blue"]
colors.insert("yellow")
let warm: Set = ["red", "orange", "yellow"]
print(colors.intersection(warm)) // ["red", "yellow"] in some order
```

### Dictionary

An unordered collection of key-value pairs with unique `Hashable` keys. Subscripting returns an optional, because the key might not be there.

```swift
var ages: [String: Int] = ["Alice": 30, "Bob": 25, "Charlie": 22]
ages["David"] = 28
print(ages["Eve"] ?? 0)          // 0, key not present
print(ages["Zoe", default: 0])   // 0, using the default subscript
ages["Bob"] = nil                // removes "Bob"
```

## Algorithms on sequences

Most algorithms are defined on the `Sequence` and `Collection` protocols, so they work on arrays, sets, dictionaries, ranges and strings alike.

```swift
let numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5]

let ascending = numbers.sorted()          // [1, 1, 2, 3, 4, 5, 5, 6, 9]
let descending = numbers.sorted(by: >)    // [9, 6, 5, 5, 4, 3, 2, 1, 1]
let evens = numbers.filter { $0 % 2 == 0 } // [4, 2, 6]
let squares = numbers.map { $0 * $0 }      // [9, 1, 16, 1, 25, 81, 4, 36, 25]
let total = numbers.reduce(0, +)           // 36
let firstBig = numbers.first { $0 > 4 }    // Optional(5)
```

`sorted()` returns a new array; `sort()` sorts a `var` array in place. `compactMap` is `map` that drops `nil` results, which is handy for parsing:

```swift
let raw = ["1", "two", "3"]
let parsed = raw.compactMap { Int($0) } // [1, 3]
```

## Gotchas

- `map`, `filter` and friends on an `Array` are eager and allocate a new array each time. For long chains over large data, use `.lazy` to avoid the intermediate arrays.
- `Dictionary` and `Set` iteration order is not stable between runs, so don't rely on it in tests or output.
- `String.count` is O(n) because it has to walk grapheme clusters. Use `isEmpty` instead of `count == 0`.

## Further reading

- [Swift standard library reference](https://developer.apple.com/documentation/swift)
- [The Swift Programming Language: Collection Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/collectiontypes/)
- [The Swift Programming Language: Strings and Characters](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/)
