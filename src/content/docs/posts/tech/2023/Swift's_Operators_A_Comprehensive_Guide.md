---
description: Swift's arithmetic, comparison, logical, bitwise, range and assignment operators, the overflow and nil-coalescing operators, and how to define a custom operator.
imgSrc: /imgs/2023/1460588698.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-21T05:13:03.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift operators: arithmetic, bitwise, ranges and custom operators"
---

Most of Swift's operators look like C's, but a few behave differently in ways that catch people out: integer overflow crashes instead of wrapping, `=` doesn't return a value, and there is no `++`. This post goes through each group with those differences called out.

## Arithmetic

`+`, `-`, `*`, `/` and `%` work as you'd expect, with a few rules:

```swift
let a = 10
let b = 3

let sum = a + b         // 13
let difference = a - b  // 7
let product = a * b     // 30
let quotient = a / b    // 3, integer division truncates toward zero
let remainder = a % b   // 1
let negative = -9 % 4   // -1, the sign follows the left operand

let negated = -a        // -10
let same = +a           // 10
```

- Both operands must be the same type. `a + 2.5` doesn't compile when `a` is an `Int`; convert explicitly with `Double(a) + 2.5`.
- `%` only works on integers. For floating-point remainders use `truncatingRemainder(dividingBy:)`.
- There is no `++` or `--`; they were removed in Swift 3. Use `+= 1`.

### Overflow

Integer arithmetic that overflows is a runtime error, not silent wraparound:

```swift
let big = Int8.max      // 127
// let boom = big + 1   // crashes at runtime (or a compile error, since this is a constant)
let wrapped = big &+ 1  // -128
```

The overflow operators `&+`, `&-` and `&*` wrap explicitly, which is what you want for things like hashing.

## Comparison

`==`, `!=`, `<`, `>`, `<=` and `>=` return a `Bool`. Your own types get `==` by conforming to `Equatable` and the ordering operators by conforming to `Comparable`. Tuples of up to six comparable elements can also be compared, element by element:

```swift
(1, "zebra") < (2, "apple")   // true, the first elements decide
```

For class instances, `===` and `!==` check whether two references point to the same object, which is different from `==`.

## Logical

`!`, `&&` and `||` work on `Bool` only; there's no truthiness for integers or optionals. `&&` and `||` short-circuit, so the right side isn't evaluated if the left side decides the result:

```swift
let items: [Int] = []
if !items.isEmpty && items[0] > 0 {   // items[0] never runs
    print("first item is positive")
}
```

## Bitwise

Bitwise operators work on the bits of integer types. Using a fixed-width unsigned type makes the results easy to read:

```swift
let i: UInt8 = 0b0000_1100
let j: UInt8 = 0b0000_1010

let bitwiseNot = ~i      // 0b1111_0011
let bitwiseAnd = i & j   // 0b0000_1000
let bitwiseOr  = i | j   // 0b0000_1110
let bitwiseXor = i ^ j   // 0b0000_0110
let leftShift  = i << 1  // 0b0001_1000
let rightShift = i >> 1  // 0b0000_0110
```

With a signed `Int`, `~12` is `-13` (two's complement), not `0b0011`. Right-shifting a negative signed integer fills with the sign bit.

## Ranges

```swift
let closed = 1...5      // 1, 2, 3, 4, 5
let halfOpen = 1..<5    // 1, 2, 3, 4

let names = ["Ana", "Ben", "Cy", "Dee"]
names[2...]             // ["Cy", "Dee"]
names[..<2]             // ["Ana", "Ben"]
```

The half-open range is the one you want for indices (`0..<array.count`). One-sided ranges (`2...`, `..<2`) are handy for slicing.

## Assignment

```swift
var k = 10
k += 5   // 15
k -= 3   // 12
k *= 2   // 24
k /= 4   // 6
```

Unlike C, `=` doesn't return a value, so `if x = y { ... }` is a compile error instead of a silent bug.

## Ternary and nil-coalescing

```swift
let score = 72
let grade = score >= 50 ? "pass" : "fail"   // "pass"

let nickname: String? = nil
let displayName = nickname ?? "Anonymous"    // "Anonymous"
```

`??` unwraps an optional or falls back to a default, and only evaluates the default if needed.

## Custom operators

You declare a new operator at file scope, give it a precedence group, then implement it as a function. Here is an exponentiation operator. Exponentiation should bind tighter than `*` and be right-associative (`2 ** 3 ** 2` means `2 ** (3 ** 2)`), so it gets its own precedence group:

```swift
import Foundation

precedencegroup ExponentiationPrecedence {
    higherThan: MultiplicationPrecedence
    associativity: right
}

infix operator **: ExponentiationPrecedence

func ** (base: Double, exponent: Double) -> Double {
    pow(base, exponent)
}

let l = 2.0 ** 3.0        // 8.0
let m = 2.0 * 2.0 ** 3.0  // 16.0
let n = 2.0 ** 3.0 ** 2.0 // 512.0
```

Use custom operators sparingly. Anyone reading the code has to look up what they do, and a well-named method is usually clearer. They earn their place in domains with established notation, like vector maths.

## Further reading

- [Basic Operators](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/basicoperators/)
- [Advanced Operators](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/)
- [Operator declarations in the standard library](https://developer.apple.com/documentation/swift/operator-declarations)
