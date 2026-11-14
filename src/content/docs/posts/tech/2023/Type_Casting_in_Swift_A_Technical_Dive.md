---
description: "How Swift's is, as, as? and as! operators work: upcasting, conditional and forced downcasting, casting in switch statements, and casting from Any and to protocols."
imgSrc: /imgs/2023/2844566079.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-06T15:34:03.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Type casting in Swift: is, as, as? and as!"
---

Type casting in Swift doesn't change what an object *is*. It changes the static type the compiler uses for a value, so you can treat a `Dog` as an `Animal` or check whether an `Animal` is really a `Dog`. Swift has four operators for this:

| Operator | What it does | Fails how |
| --- | --- | --- |
| `is` | Checks whether a value is of a type (or conforms to a protocol) | Returns `false` |
| `as` | Upcast or bridge that the compiler can prove will succeed | Compile error |
| `as?` | Conditional downcast | Returns `nil` |
| `as!` | Forced downcast | Crashes at runtime |

All the examples below use this class hierarchy:

```swift
class Animal {
    func speak() { print("...") }
}

class Dog: Animal {
    override func speak() { print("Woof!") }
    func fetch() { print("Fetching the ball") }
}

class Cat: Animal {
    override func speak() { print("Meow!") }
}
```

## Upcasting with `as`

Treating a subclass instance as its superclass always succeeds, so Swift does it implicitly. `as` just makes it explicit:

```swift
let dog = Dog()
let animal: Animal = dog        // implicit upcast
let sameAnimal = dog as Animal  // explicit, same result

animal.speak()  // Woof!
// animal.fetch()  // error: value of type 'Animal' has no member 'fetch'
```

The object is still a `Dog`, so `speak()` dispatches to `Dog`'s override. What changes is what the compiler lets you call: through an `Animal` reference you can only use `Animal`'s API.

## Downcasting with `as?` and `as!`

Going the other way can fail, because an `Animal` reference might point to a `Cat`. That's why there are two downcast operators.

`as?` returns an optional, and you usually unwrap it with `if let` or `guard let`:

```swift
let pet: Animal = Dog()

if let dog = pet as? Dog {
    dog.fetch()  // Fetching the ball
} else {
    print("Not a dog")
}
```

`as!` force-unwraps the result and crashes if the cast fails:

```swift
(pet as! Dog).fetch()  // fine, pet really is a Dog
_ = pet as! Cat        // runtime crash: "Could not cast value of type ...Dog to ...Cat"
```

Use `as!` only when a failed cast means a programming error, such as dequeuing a table view cell you registered with a specific class. Otherwise prefer `as?`.

## Checking types with `is`

`is` answers yes or no without giving you a cast value:

```swift
let animals: [Animal] = [Dog(), Cat(), Dog()]
let dogCount = animals.filter { $0 is Dog }.count
print(dogCount)  // 2
```

If you need the cast value, as you usually do, combine the check and the cast in a `switch`:

```swift
for animal in animals {
    switch animal {
    case let dog as Dog:
        dog.fetch()
    case is Cat:
        print("Found a cat")
    default:
        print("Some other animal")
    }
}
```

The `default` case is required because the array could also contain a plain `Animal`.

## Casting from `Any` and to protocols

The same operators work with `Any` and with protocol types, not just class hierarchies. This comes up when dealing with heterogeneous data, such as decoded JSON or `userInfo` dictionaries:

```swift
let values: [Any] = [42, "hello", 3.14, Dog()]

for value in values {
    switch value {
    case let n as Int:    print("Int: \(n)")
    case let s as String: print("String: \(s)")
    case let d as Double: print("Double: \(d)")
    case let a as Animal: a.speak()
    default:              print("Something else")
    }
}
```

To check protocol conformance at runtime, cast to the protocol type:

```swift
protocol Fetcher {
    func fetch()
}

extension Dog: Fetcher {}  // Dog already has fetch()

if let fetcher = pet as? Fetcher {
    fetcher.fetch()
}
```

## Gotchas

- **Casting is not conversion.** `let i = 3; i as? Double` always fails (and the compiler warns about it). To convert numbers, use initialisers like `Double(i)`.
- **Prefer polymorphism to type switches.** If you keep writing `if x is Dog … else if x is Cat`, the behaviour probably belongs in an overridden method or a protocol requirement.
- **`as` on literals sets their type.** `let x = 3 as Double` is not a cast at runtime; it tells the compiler to type the literal as `Double`.

## Further reading

- [Type Casting, The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/typecasting/)
