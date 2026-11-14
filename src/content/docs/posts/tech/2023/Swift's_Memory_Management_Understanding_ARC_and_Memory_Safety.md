---
description: How Automatic Reference Counting frees Swift class instances, how to break reference cycles with weak and unowned, and what exclusive access and actors protect against.
imgSrc: /imgs/2023/music-album.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-03-24T02:51:50.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift memory management: ARC, reference cycles and exclusive access"
---

Swift has no tracing garbage collector. Class instances are freed by Automatic Reference Counting (ARC): the compiler inserts retain and release calls, and an instance is deallocated as soon as its last strong reference goes away. Value types (structs, enums) aren't reference counted at all; they're copied. ARC is deterministic and cheap, but it can't detect cycles, so that part is your job.

## How ARC works

Each class instance keeps a count of strong references to it. Assigning the instance to a variable, property or constant adds one; that reference going away (reassigned, set to `nil`, or out of scope) removes one. At zero, `deinit` runs and the memory is freed.

```swift
class Person {
    let name: String
    var apartment: Apartment?

    init(name: String) {
        self.name = name
    }

    deinit {
        print("\(name) is being deallocated")
    }
}

var person1: Person? = Person(name: "Alice")  // 1 strong reference
var person2: Person? = person1                // 2

person1 = nil  // 1
person2 = nil  // 0, prints "Alice is being deallocated"
```

## Reference cycles

If two instances hold strong references to each other, neither count ever reaches zero and both leak. Add an `Apartment` with a `tenant` property:

```swift
class Apartment {
    let unit: String
    weak var tenant: Person?   // weak breaks the cycle

    init(unit: String) {
        self.unit = unit
    }

    deinit {
        print("Apartment \(unit) is being deallocated")
    }
}

var john: Person? = Person(name: "John")
var unit4A: Apartment? = Apartment(unit: "4A")

john!.apartment = unit4A
unit4A!.tenant = john

john = nil    // prints "John is being deallocated"
unit4A = nil  // prints "Apartment 4A is being deallocated"
```

Without `weak`, setting both variables to `nil` would print nothing: the two objects keep each other alive.

### weak

A `weak` reference doesn't add to the count. When the instance is deallocated, ARC sets the weak reference to `nil`, so it must be an optional `var`. Use it when the other object can go away first (a tenant can move out; a view controller's delegate can be released).

### unowned

An `unowned` reference also doesn't add to the count, but it isn't set to `nil`. Use it when the referenced object always lives at least as long as the referencing one. Accessing an `unowned` reference after the object is gone is a guaranteed runtime crash, not undefined behaviour:

```swift
class Customer {
    let name: String
    var card: CreditCard?

    init(name: String) {
        self.name = name
    }

    deinit {
        print("\(name) is being deallocated")
    }
}

class CreditCard {
    let number: UInt64
    unowned let customer: Customer  // a card never outlives its customer

    init(number: UInt64, customer: Customer) {
        self.number = number
        self.customer = customer
    }

    deinit {
        print("Card #\(number) is being deallocated")
    }
}

var alice: Customer? = Customer(name: "Alice")
alice!.card = CreditCard(number: 1234_5678_9012_3456, customer: alice!)
alice = nil
// Alice is being deallocated
// Card #1234567890123456 is being deallocated
```

### Closures

Closures are reference types too. A closure stored on an object that captures `self` strongly is the most common cycle in app code. Break it with a capture list:

```swift
class Downloader {
    var onFinish: (() -> Void)?
    var fileName = "report.pdf"

    func start() {
        onFinish = { [weak self] in
            guard let self else { return }
            print("Finished \(self.fileName)")
        }
    }
}
```

Xcode's Memory Graph debugger and Instruments' Leaks tool will show cycles you missed.

## Memory safety

ARC stops you from using freed objects. Swift also has rules that stop other classes of memory bugs.

### Value semantics

Structs, enums, and the standard library's `Array`, `Dictionary`, `Set` and `String` are value types. Assigning one or passing it to a function gives the receiver its own logical copy, so a change in one place can't show up somewhere else. The collections use copy-on-write: the storage is shared until one side mutates it, so copies are cheap until then.

### Exclusive access

Swift doesn't allow a variable to be modified while something else is reading or writing it. The classic case is an `inout` argument that overlaps with another access to the same variable:

```swift
var stepSize = 1

func increment(_ number: inout Int) {
    number += stepSize   // reads stepSize while it's being written via `number`
}

increment(&stepSize)
// Runtime error: simultaneous accesses to stepSize
```

The compiler catches violations it can see statically (such as passing the same variable to two `inout` parameters) and inserts runtime checks for the rest. Since Swift 5 those runtime checks are on in release builds as well as debug.

Exclusivity enforcement is about overlapping accesses, mostly within a single thread. It does not detect data races between threads. For that, use Thread Sanitizer or the compile-time data race checking in the Swift 6 language mode.

## Sharing state between threads

The traditional approach is a serial `DispatchQueue` (from Grand Central Dispatch, part of Apple's Dispatch library rather than the Swift language) guarding the state:

```swift
import Dispatch

final class Counter {
    private var count = 0
    private let queue = DispatchQueue(label: "com.example.counter")

    func increment() {
        queue.sync { count += 1 }
    }

    func value() -> Int {
        queue.sync { count }
    }
}

let counter = Counter()
counter.increment()
print(counter.value()) // 1
```

With Swift concurrency (Swift 5.5 and later), an `actor` does the same job and the compiler enforces it: code outside the actor must `await` to touch its state.

```swift
actor SafeCounter {
    private var count = 0

    func increment() { count += 1 }
    func value() -> Int { count }
}

let safeCounter = SafeCounter()
await safeCounter.increment()
print(await safeCounter.value()) // 1
```

(Top-level `await` works in a `main.swift` file or a script; elsewhere, call these from an `async` function or a `Task`.)

## Further reading

- [Automatic Reference Counting](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/)
- [Memory Safety](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/memorysafety/)
- [Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
