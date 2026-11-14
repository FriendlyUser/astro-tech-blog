---
description: "Swift basics for newcomers: let and var, type inference, the core value types, optionals, if, switch, loops and functions with argument labels."
imgSrc: /imgs/2023/590655340.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-07T16:27:41.000Z'
lastUpdated: 2026-11-14
tags:
  - swift
title: "Swift basics: variables, types, control flow and functions"
---

Swift is Apple's general-purpose language, announced at WWDC 2014 as a replacement for Objective-C. It's the main language for iOS and macOS apps, and it also runs on Linux and Windows for server and command-line work. This post covers the parts of the language you need before anything else: variables, types, optionals, control flow and functions.

To try the examples, use an Xcode playground, or install a toolchain from [swift.org](https://www.swift.org/install/), save the code to `main.swift`, and run `swift main.swift`.

## Variables and constants

`var` declares a variable you can change; `let` declares a constant. Use `let` by default and switch to `var` only when you need to mutate.

```swift
var score = 42
score = 50

let maxScore = 100
// maxScore = 120 // compile-time error: cannot assign to value: 'maxScore' is a 'let' constant
```

## Types and type inference

Swift is statically typed, but it infers types from initial values, so you rarely write them out:

```swift
let count = 42             // Int
let ratio = 3.14           // Double (floating-point literals default to Double)
let precise: Float = 3.14  // Float only if you ask for it
let isReady = true         // Bool
let name = "Swift"         // String
```

The common built-in types are:

- `Int` for whole numbers (also `Int8` through `Int64`, and unsigned `UInt` variants)
- `Double` (64-bit) and `Float` (32-bit) for floating point
- `Bool` for `true`/`false`
- `String` and `Character` for text

Swift never converts between numeric types implicitly. Mixing them is a compile error until you convert one side:

```swift
let items = 3
let price = 2.5
let total = Double(items) * price // 7.5
```

## Optionals

A value that might be missing has an optional type, written with `?`. You must unwrap it before use, which is how Swift avoids null-pointer crashes.

```swift
let input = "42"
let parsed = Int(input)  // Int? because the string might not be a number

if let number = parsed {
    print("Got \(number)")
} else {
    print("Not a number")
}

let fallback = Int("abc") ?? 0 // 0, using the nil-coalescing operator
```

## Control flow

### if and else

Conditions must be `Bool`; there are no "truthy" integers.

```swift
let temperature = 22 // Celsius

if temperature < 10 {
    print("It's cold outside!")
} else if temperature > 28 {
    print("It's hot outside!")
} else {
    print("The weather is just right.")
}
```

### switch

`switch` must be exhaustive, and cases don't fall through, so there's no `break` to forget. A case can match several values, ranges or patterns.

```swift
let dayOfWeek = "Tuesday"

switch dayOfWeek {
case "Monday":
    print("Start of the week.")
case "Tuesday", "Wednesday", "Thursday":
    print("Midweek.")
case "Friday":
    print("Almost the weekend!")
case "Saturday", "Sunday":
    print("Weekend!")
default:
    print("Not a day.")
}

let age = 17
switch age {
case 0..<13: print("Child")
case 13..<18: print("Teen")
default: print("Adult")
}
```

### for-in

`for-in` iterates over arrays, dictionaries, ranges and any other sequence. `1...5` includes 5; `1..<5` stops at 4.

```swift
let numbers = [1, 2, 3, 4, 5]
for number in numbers {
    print(number)
}

for index in 1...5 {
    print(index)
}

for (i, n) in numbers.enumerated() {
    print("numbers[\(i)] = \(n)")
}
```

### while

```swift
var counter = 5
while counter > 0 {
    print(counter)
    counter -= 1
}
```

## Functions

Functions are declared with `func`. Parameters have argument labels that callers write at the call site; use `_` to omit a label, or give a separate external name.

```swift
func greet(name: String) {
    print("Hello, \(name)!")
}
greet(name: "Swift") // Hello, Swift!

func add(_ a: Int, _ b: Int) -> Int {
    a + b // single-expression bodies can omit return
}
let sum = add(3, 5) // 8

func move(from start: Int, by offset: Int = 1) -> Int {
    start + offset
}
print(move(from: 10))        // 11, using the default value
print(move(from: 10, by: 5)) // 15
```

## Where to go next

The next topics worth learning are structs and classes (and why Swift prefers structs), enums with associated values, protocols, closures, error handling with `throws`, and `async`/`await`. The official book covers all of them in order.

- [The Swift Programming Language (the official book)](https://docs.swift.org/swift-book/)
- [Swift documentation on swift.org](https://www.swift.org/documentation/)
- [Apple's Swift resources](https://developer.apple.com/swift/)
