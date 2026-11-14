---
title: "Swift closures: syntax, capturing values, escaping and autoclosures"
pubDate: "2025-04-11T21:26:55.000Z"
lastUpdated: 2026-11-14
description: "How Swift closures work: the short syntax forms, trailing closures, how values are captured, @escaping, retain cycles with [weak self], and @autoclosure."
tags: ["swift"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3613662819.webp
---

A closure in Swift is a block of code you can store in a variable or pass to a function, like a lambda in other languages or a block in Objective-C. Functions are closures too: a global function is a named closure that captures nothing, a nested function can capture values from the function around it, and a closure expression is the unnamed `{ ... in ... }` form.

## Syntax, from long to short

The full form spells out parameter and return types:

```swift
let add = { (a: Int, b: Int) -> Int in
    return a + b
}
print(add(3, 5)) // 8
```

When the type is known from context, Swift infers the parameter and return types:

```swift
let add: (Int, Int) -> Int = { a, b in
    return a + b
}
```

A single-expression body returns its value implicitly:

```swift
let add: (Int, Int) -> Int = { a, b in a + b }
```

And you can drop the parameter names and use `$0`, `$1`, and so on:

```swift
let add: (Int, Int) -> Int = { $0 + $1 }
```

Operators are functions too, so `let add: (Int, Int) -> Int = (+)` also works.

## Trailing closures

If the last argument of a call is a closure, you can write it after the parentheses. If it's the only argument, you can drop the parentheses entirely:

```swift
func performOperation(_ a: Int, _ b: Int, operation: (Int, Int) -> Int) -> Int {
    operation(a, b)
}

let product = performOperation(10, 5) { a, b in a * b }
print(product) // 50

let numbers = [5, 3, 8, 1]
let sorted = numbers.sorted { $0 > $1 }
print(sorted) // [8, 5, 3, 1]
```

A call can also take several trailing closures. The first is unlabelled and the rest use their argument labels, which is common in SwiftUI APIs.

## Capturing values

A closure keeps access to the variables it uses from the surrounding scope, even after that scope has returned:

```swift
func makeIncrementer(by amount: Int) -> () -> Int {
    var total = 0
    return {
        total += amount
        return total
    }
}

let incrementByTwo = makeIncrementer(by: 2)
print(incrementByTwo()) // 2
print(incrementByTwo()) // 4

let incrementByTen = makeIncrementer(by: 10)
print(incrementByTen()) // 10
print(incrementByTwo()) // 6
```

Each call to `makeIncrementer` creates a new `total`, so the two incrementers don't share state. Closures are reference types: if you assign `incrementByTwo` to another constant, both names refer to the same closure and the same `total`.

## Escaping closures and retain cycles

A closure parameter is non-escaping by default: the compiler knows it won't be called after the function returns. If the function stores the closure or calls it later (a completion handler, for example), mark the parameter `@escaping`:

```swift
final class Downloader {
    private var completionHandlers: [(String) -> Void] = []

    func fetch(completion: @escaping (String) -> Void) {
        completionHandlers.append(completion)
    }

    func finish(with result: String) {
        completionHandlers.forEach { $0(result) }
        completionHandlers.removeAll()
    }
}
```

Swift's automatic reference counting does not prevent leaks here. Closures capture strongly by default, so an object that stores a closure which uses `self` creates a strong reference cycle and neither is ever freed. Break it with a capture list:

```swift
final class ProfileViewModel {
    private let downloader = Downloader()
    private(set) var name = ""

    func load() {
        downloader.fetch { [weak self] result in
            guard let self else { return }
            self.name = result
        }
    }
}
```

In an escaping closure, Swift makes you write `self.` explicitly when you refer to a class instance's members, unless `self` appears in the capture list. That makes the capture visible at the call site.

For new asynchronous code, `async`/`await` usually replaces completion-handler closures, but escaping closures are still everywhere in existing APIs.

## Autoclosures

`@autoclosure` wraps an argument expression in a closure automatically, so the caller writes a plain expression but the function decides whether and when to evaluate it. The standard library uses this for `assert` and the `&&` / `||` operators. A logging function can use it to skip building a message that won't be printed:

```swift
struct DebugLogger {
    var isEnabled: Bool

    func log(_ message: @autoclosure () -> String) {
        if isEnabled {
            print(message())
        }
    }
}

func expensiveDescription() -> String {
    print("building description...")
    return "state dump"
}

var logger = DebugLogger(isEnabled: false)
logger.log("State: \(expensiveDescription())") // prints nothing; the string is never built
logger.isEnabled = true
logger.log("State: \(expensiveDescription())") // builds and prints it
```

Use autoclosures sparingly. The call site looks like it evaluates the argument immediately, so delayed evaluation can surprise readers.

## Where you'll use closures

- Collection methods: `map`, `filter`, `reduce`, `sorted(by:)`, `first(where:)`.
- Callbacks and completion handlers in UIKit and older Foundation APIs.
- SwiftUI view builders and button actions.

```swift
let numbers = Array(1...10)
let evenSquares = numbers.filter { $0 % 2 == 0 }.map { $0 * $0 }
print(evenSquares) // [4, 16, 36, 64, 100]
```

## Further reading

- [Closures, The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/)
- [Automatic Reference Counting: strong reference cycles for closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/#Strong-Reference-Cycles-for-Closures)
