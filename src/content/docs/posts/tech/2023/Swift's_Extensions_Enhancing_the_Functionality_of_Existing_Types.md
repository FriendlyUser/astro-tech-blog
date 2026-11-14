---
description: How Swift extensions add methods, computed properties, initializers and protocol conformances to existing types, plus what they can't do.
imgSrc: /imgs/2023/2966567085.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-15T23:38:52.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift extensions: adding methods, properties and protocol conformances to existing types"
---

An extension adds functionality to a type you already have, including types you don't own like `String` or `Double`, without subclassing it or editing its source. Extensions work on classes, structs, enums and protocols, and they're used constantly in Swift code: to add helpers, to add protocol conformances, and to split a large type into readable sections.

An extension can add:

- methods (instance and static) and subscripts
- computed properties
- initializers
- protocol conformances
- nested types

## Adding a method

```swift
extension String {
    func isPalindrome() -> Bool {
        let normalized = self.lowercased().filter { $0.isLetter }
        return normalized == String(normalized.reversed())
    }
}

"A man, a plan, a canal: Panama".isPalindrome() // true
```

The new method is available on every `String` in the module (and in other modules that import it, if you mark it `public`).

## Adding computed properties

Extensions can add computed properties but not stored ones, because they can't change a type's memory layout.

```swift
extension Double {
    var celsiusToFahrenheit: Double {
        self * 9 / 5 + 32
    }

    var fahrenheitToCelsius: Double {
        (self - 32) * 5 / 9
    }
}

let fahrenheit = 100.0.celsiusToFahrenheit // 212.0
```

## Adding initializers

If you add an initializer to a struct in an extension, the struct keeps its synthesized memberwise initializer. Declaring the same initializer inside the struct body would remove it.

```swift
struct Person {
    let firstName: String
    let lastName: String
}

extension Person {
    init(fullName: String) {
        let parts = fullName.split(separator: " ", maxSplits: 1).map(String.init)
        self.init(firstName: parts.first ?? "", lastName: parts.count > 1 ? parts[1] : "")
    }
}

let a = Person(firstName: "Ada", lastName: "Lovelace") // memberwise init still works
let b = Person(fullName: "Grace Hopper")
```

For classes, extensions can add convenience initializers but not designated initializers or deinitializers.

## Conforming to a protocol

Adding a conformance in an extension keeps that code in one place. Conforming `Person` to the standard library's `Comparable` makes `sorted()`, `min()` and `max()` work on arrays of people:

```swift
extension Person: Comparable {
    static func < (lhs: Person, rhs: Person) -> Bool {
        (lhs.lastName, lhs.firstName) < (rhs.lastName, rhs.firstName)
    }
}

let people = [
    Person(firstName: "Grace", lastName: "Hopper"),
    Person(firstName: "Ada", lastName: "Lovelace"),
    Person(firstName: "Alan", lastName: "Hopper"),
]
let sortedPeople = people.sorted() // Alan Hopper, Grace Hopper, Ada Lovelace
```

`Comparable` also requires `Equatable`. The compiler synthesizes `==` here because all the stored properties are `Equatable` and the extension is in the same file as the struct. Comparing tuples gives last-name-then-first-name ordering in one line.

## Constrained and protocol extensions

A `where` clause limits an extension to types that meet a constraint:

```swift
extension Array where Element: Numeric {
    func sum() -> Element {
        reduce(0, +)
    }
}

[1, 2, 3].sum()       // 6
[1.5, 2.5].sum()      // 4.0
// ["a", "b"].sum()   // doesn't compile: String isn't Numeric
```

Extending a protocol gives every conforming type a default implementation. This is how much of the standard library is built: `filter`, `reduce` and `contains` are implemented in extensions on `Sequence` rather than separately on each collection type.

## What extensions can't do

- Add stored properties. If you need per-instance state on a type you don't own, wrap it in your own type instead.
- Override existing methods. Redeclaring a method in the same module is a compile error. For a type from another module, a same-named method in your extension only shadows the original in code that sees your extension; it isn't dynamically dispatched like an override, so avoid doing it.
- Add designated initializers or deinitializers to classes.

Also watch for name collisions. If two modules add a method with the same name to `String`, calls become ambiguous. A short, specific name, or a wrapper type, avoids this in shared libraries.

## Further reading

- [The Swift Programming Language: Extensions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/extensions/)
- [The Swift Programming Language: Protocols (protocol extensions)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)
