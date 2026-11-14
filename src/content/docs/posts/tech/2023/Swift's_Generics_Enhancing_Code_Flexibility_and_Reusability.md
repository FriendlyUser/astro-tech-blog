---
description: How to write generic functions and types in Swift, constrain them with protocols and where clauses, and what generics cost at runtime.
imgSrc: /imgs/2023/4252050732.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-16T13:30:07.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift generics: generic functions, generic types and constraints"
---

Generics let you write one function or type that works with many types while the compiler still checks every call. Instead of writing `swapInts`, `swapStrings` and so on, you write one `swap` with a type parameter, and the compiler fills in the concrete type at each call site.

The standard library uses them everywhere: `Array<Element>`, `Dictionary<Key, Value>`, `Set<Element>` and `Optional<Wrapped>` are all generic types.

## Generic functions

Put a type parameter in angle brackets after the function name. `T` is a placeholder that the compiler infers from the arguments:

```swift
func swapValues<T>(_ a: inout T, _ b: inout T) {
    let temporaryA = a
    a = b
    b = temporaryA
}

var number1 = 5
var number2 = 10
swapValues(&number1, &number2)
print("number1: \(number1), number2: \(number2)") // number1: 10, number2: 5
```

Both arguments must be the same type, so `swapValues(&number1, &someString)` is a compile error. In real code, use the standard library's `swap(_:_:)`, which does the same thing.

## Generic types

Structs, classes and enums can take type parameters too. Here is a generic stack:

```swift
struct Stack<Element> {
    private var elements: [Element] = []

    mutating func push(_ element: Element) {
        elements.append(element)
    }

    mutating func pop() -> Element? {
        elements.popLast()
    }

    func peek() -> Element? {
        elements.last
    }
}

var intStack = Stack<Int>()
intStack.push(1)
intStack.push(2)
print(intStack.pop() ?? -1) // 2

var stringStack = Stack<String>()
stringStack.push("Hello")
stringStack.push("World")
print(stringStack.pop() ?? "empty") // World
```

Each specialisation is its own type: a `Stack<Int>` only accepts `Int`s. You can leave out the type argument when the compiler can infer it from context, as in `var s: Stack<Double> = Stack()`.

## Type constraints

An unconstrained `T` can only be moved around, not added or compared, because the compiler knows nothing about it. A constraint says which protocol `T` must conform to, which unlocks that protocol's operations:

```swift
func sum<T: Numeric>(_ a: T, _ b: T) -> T {
    a + b
}

print(sum(5, 10))       // 15
print(sum(3.14, 2.71))  // 5.85
// sum("Hello", "World")
// compile error: 'String' does not conform to 'Numeric'
```

For more than one requirement, or requirements on associated types, use a `where` clause:

```swift
func allEqual<C: Collection>(_ items: C) -> Bool where C.Element: Equatable {
    guard let first = items.first else { return true }
    return items.allSatisfy { $0 == first }
}

print(allEqual([1, 1, 1]))    // true
print(allEqual(["a", "b"]))   // false
```

Since Swift 5.7 you can also write a constrained parameter without naming the type parameter, using `some`:

```swift
func describe(_ value: some CustomStringConvertible) -> String {
    "Value: \(value.description)"
}
```

This is equivalent to `func describe<T: CustomStringConvertible>(_ value: T)`.

## What generics cost at runtime

Swift does not have to generate a separate copy of a generic function for every type. By default, generic code is compiled once and receives the concrete type's metadata and protocol witness tables at runtime, which is how generics work across module boundaries. When the optimizer can see the function body and the concrete types (same module, `@inlinable`, or whole-module optimization), it specialises the function for those types and removes that indirection. So generic code is often as fast as a hand-written version, but not always; if a hot generic function sits in another module, check whether it's being specialised.

## Further reading

- [Generics in The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/)
- [Opaque and boxed protocol types (`some` and `any`)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)
