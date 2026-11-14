---
description: How Swift optionals represent missing values, and how to unwrap them safely with if let, guard let, optional chaining, the ?? operator and map.
imgSrc: /imgs/2023/1312348161.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-05-21T21:04:55.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift optionals: if let, guard let, optional chaining and ??"
---

An optional in Swift is a value that might be missing. A `String?` holds either a `String` or `nil`, while a plain `String` can never be `nil`. The compiler won't let you use a `String?` where a `String` is expected until you've dealt with the `nil` case, which removes a whole class of null-reference crashes and makes "this might be missing" part of the type instead of a comment.

Under the hood, `String?` is shorthand for `Optional<String>`, a generic enum with two cases: `.none` (written `nil`) and `.some(wrapped)`.

## Declaring optionals

Add `?` after the type:

```swift
var nickname: String?        // starts as nil
var age: Int? = 34
age = nil                    // fine, the type allows it
```

Many standard library APIs return optionals when a result may not exist:

```swift
let number = Int("42")       // Int? — the string might not be a number
let first = [1, 2, 3].first  // Int? — the array might be empty
```

## Unwrapping

### Optional binding with `if let`

`if let` unwraps the value into a new constant and runs the block only when it isn't `nil`:

```swift
let input = "42"

if let number = Int(input) {
    print("Parsed \(number)")
} else {
    print("\(input) is not a number")
}
```

Since Swift 5.7 you can drop the repeated name when you unwrap a variable into a constant of the same name:

```swift
var nickname: String? = "Dee"

if let nickname {
    print("Hi, \(nickname)")
}
```

You can bind several values at once and add conditions, separated by commas. The block runs only if every binding succeeds and every condition is true:

```swift
if let width = Int("1920"), let height = Int("1080"), width > height {
    print("Landscape: \(width)x\(height)")
}
```

### Early exit with `guard let`

`guard let` is the inverse: it handles the `nil` case first and must exit the scope (`return`, `throw`, `break` or `continue`). The unwrapped value stays available for the rest of the function, which keeps the happy path unindented:

```swift
func greet(_ name: String?) {
    guard let name else {
        print("No name given")
        return
    }
    print("Hello, \(name)")
}
```

### Force unwrapping with `!`

`value!` unwraps and crashes at runtime if the value is `nil`:

```swift
let url = URL(string: "https://www.swift.org")!
```

Use it only when `nil` would be a programming error you want to catch immediately, as with a hard-coded URL literal above. For data that comes from users, the network or files, use one of the safe forms instead.

## Working with optionals without unwrapping

### Optional chaining

`?.` calls a method or reads a property only if the value isn't `nil`. If any link in the chain is `nil`, the whole expression evaluates to `nil`, and the result is always optional:

```swift
class Pet {
    var name: String
    init(name: String) {
        self.name = name
    }
}

class Person {
    var pet: Pet?
}

let person = Person()
let petName = person.pet?.name   // String?, nil here because person has no pet

person.pet = Pet(name: "Mochi")
print(person.pet?.name ?? "no pet") // "Mochi"
```

### The nil-coalescing operator `??`

`??` supplies a default when the left side is `nil`, and its result is non-optional:

```swift
let stringOptional: String? = nil
let unwrappedString = stringOptional ?? "Default String" // "Default String"
```

The right side is only evaluated if it's needed, so it's fine to put a function call there.

### `map` and `flatMap`

`map` transforms the wrapped value if there is one and passes `nil` through otherwise. `flatMap` does the same for a transform that itself returns an optional, without producing a nested `Int??`:

```swift
let input: String? = "21"

let length = input.map { $0.count }          // Int? = 2
let doubled = input.flatMap { Int($0) }.map { $0 * 2 } // Int? = 42
```

## Implicitly unwrapped optionals

A type written with `!` instead of `?`, such as `String!`, is an optional that Swift force-unwraps automatically wherever a non-optional is needed. You mostly see it in `@IBOutlet` properties, which are `nil` until the storyboard loads. It crashes like `!` when accessed while `nil`, so prefer a regular optional or a non-optional with an initial value in your own code.

## Gotchas

- `if let x = x` and `if let x` create a new constant. Changing it doesn't change the original variable. Use `if var` if you need a mutable copy.
- Comparing an optional with `==` works without unwrapping (`age == 34` is valid for `Int?`), but `<` and `>` don't. Unwrap first.
- A long chain of `!` or `as!` is a code smell. If the value really can't be `nil`, consider making the property non-optional instead.

## Further reading

- [The Swift Programming Language: The Basics (Optionals)](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/)
- [Optional chaining](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/)
