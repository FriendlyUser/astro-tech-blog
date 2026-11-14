---
description: Functional programming in Swift with closures, map/filter/reduce, function
  types, value-type immutability, pattern matching, and recursion, with runnable examples.
imgSrc: /imgs/2023/2575289368.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-12-22T09:17:57.000Z'
lastUpdated: 2026-11-14
tags: ['swift']
title: Functional programming in Swift with closures, map/filter/reduce, and value types
---

Swift isn't a pure functional language, but it has first-class functions, closures, value types, and exhaustive pattern matching. Used together, they let you write code that transforms data instead of mutating it in place, which tends to be easier to test. This post walks through those features with small examples you can paste into a playground.

## Functional programming in brief

The core idea is to build programs out of functions that return new values rather than changing shared state. Functions are values: you can store them in variables, pass them as arguments, and return them from other functions. Code written this way has fewer hidden dependencies, because a function's result depends only on its inputs.

## Higher-order functions

A higher-order function takes a function as an argument, returns one, or both. In Swift you'll mostly meet them through closures and the standard library's collection methods.

### Closures

A closure is an unnamed function that can capture values from the scope where it's defined. `map` takes a closure and applies it to every element:

```swift
let numbers = [1, 2, 3, 4, 5]
let doubled = numbers.map { $0 * 2 }
print(doubled) // [2, 4, 6, 8, 10]
```

`{ $0 * 2 }` is shorthand for `{ (number: Int) -> Int in return number * 2 }`. Swift infers the parameter and return types from `map`'s signature.

`filter` and `reduce` round out the usual trio:

```swift
let numbers = [1, 2, 3, 4, 5, 6]
let sumOfEvenSquares = numbers
    .filter { $0 % 2 == 0 }
    .map { $0 * $0 }
    .reduce(0, +)
print(sumOfEvenSquares) // 4 + 16 + 36 = 56
```

`reduce(0, +)` passes the `+` operator as a function, which works because operators are functions in Swift. `compactMap` is also worth knowing: it maps and drops `nil` results, as in `["1", "x", "3"].compactMap { Int($0) }` giving `[1, 3]`.

Each step allocates a new array. For long chains over large collections, `numbers.lazy.filter { ... }.map { ... }` avoids the intermediate arrays.

### Function types

A function type such as `(Int) -> Int` can be named with a `typealias` and used like any other type:

```swift
typealias IntToIntFunction = (Int) -> Int

let square: IntToIntFunction = { $0 * $0 }

func applyTwice(_ f: IntToIntFunction, to value: Int) -> Int {
    f(f(value))
}

print(square(4))                       // 16
print(applyTwice(square, to: 3))       // 81
```

`applyTwice` is a higher-order function: it takes `square` as an argument and calls it twice.

## Immutability

Swift encourages immutability in two ways: `let` constants, and value types (`struct`, `enum`, tuples, and the standard collections) that are copied on assignment.

```swift
struct Point {
    var x: Int
    var y: Int
}

let p1 = Point(x: 2, y: 3)
// p1.x = 4 // error: cannot assign to property: 'p1' is a 'let' constant

var p2 = p1   // p2 is an independent copy
p2.x = 10
print(p1.x, p2.x) // 2 10
```

Because `Point` is a struct, changing `p2` never affects `p1`. With a `class`, both names would refer to the same object. Collections use copy-on-write, so the copy is cheap until one side is actually modified.

## Pattern matching

`switch` statements in Swift must be exhaustive, and they can match on enum cases, tuples, ranges, and associated values. That makes them a good fit for modelling states as data:

```swift
enum TrafficLight {
    case red, yellow, green
}

let currentLight = TrafficLight.red

switch currentLight {
case .red:
    print("Stop")
case .yellow:
    print("Prepare to stop")
case .green:
    print("Go")
}
// Stop
```

If you add a new case to `TrafficLight`, every `switch` that doesn't handle it stops compiling, which is the main practical benefit. Pattern matching also works in `if case`, `guard case`, and `for case` statements.

## Recursion

Recursion replaces a loop with a function that calls itself on a smaller input until it reaches a base case:

```swift
func factorial(_ number: Int) -> Int {
    precondition(number >= 0, "factorial is undefined for negative numbers")
    return number == 0 ? 1 : number * factorial(number - 1)
}

print(factorial(5)) // 120
```

Two caveats: Swift doesn't guarantee tail-call optimization, so very deep recursion can overflow the stack, and `Int` overflow traps at runtime (here, past `factorial(20)` on 64-bit platforms). For simple accumulations, `(1...5).reduce(1, *)` does the same job without recursion.

## When to stop

Not everything has to be a chain of closures. A `for` loop with a mutable accumulator is often clearer than a three-level nested `reduce`, and SwiftUI and UIKit are built around reference types and mutation anyway. Use the functional style where it makes data transformations easier to read and test.

## Further reading

- [The Swift Programming Language: Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/)
- [Structures and Classes](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/)
- [Patterns](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/patterns/)
