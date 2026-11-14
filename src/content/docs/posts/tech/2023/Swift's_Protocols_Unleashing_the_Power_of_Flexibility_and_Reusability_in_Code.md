---
description: How to define and adopt Swift protocols, add default implementations with extensions, use associated types, inheritance and composition, and choose between some and any.
imgSrc: /imgs/2023/1666734888.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-05-14T00:11:20.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift protocols: requirements, extensions, associated types and composition"
---

A protocol lists the methods and properties a type must provide. Classes, structs and enums can all conform, which is the main difference from Java or TypeScript interfaces: in Swift, value types use protocols as much as classes do. Protocols plus extensions are also how Swift shares behaviour between types without inheritance.

## Defining a protocol

A protocol declares requirements without implementing them:

```swift
protocol Describable {
    func describe() -> String
}

protocol Vehicle {
    var numberOfWheels: Int { get }
    var name: String { get set }
}
```

Property requirements are always declared with `var` and say whether they need to be readable (`{ get }`) or readable and writable (`{ get set }`). A `{ get }` requirement can be satisfied by a `let`, a `var` or a computed property; `{ get set }` needs something settable. Methods that change a struct's state must be marked `mutating` in the protocol.

## Conforming to a protocol

List protocols after the type name, separated by commas:

```swift
struct Bicycle: Vehicle {
    let numberOfWheels = 2
    var name = "Bicycle"
}

struct Airplane: Vehicle, Describable {
    let numberOfWheels = 3
    var name = "Airplane"

    func describe() -> String {
        "\(name) with \(numberOfWheels) wheels"
    }
}
```

The compiler rejects the conformance if any requirement is missing. A common style is to add each conformance in its own extension, e.g. `extension Bicycle: Describable { ... }`, which also lets you make types you don't own conform.

## Default implementations

A protocol extension can implement requirements, so conforming types only write what differs:

```swift
extension Describable {
    func describe() -> String {
        "An instance of \(type(of: self))"
    }
}

extension Bicycle: Describable {}

print(Bicycle().describe())   // An instance of Bicycle
print(Airplane().describe())  // Airplane with 3 wheels
```

One gotcha: a method that's only in the extension, and not declared in the protocol, is dispatched statically. If a type "overrides" it, the type's version is ignored when the value is used through the protocol. Declare the method in the protocol if conforming types should be able to customise it.

## Associated types

An associated type is a placeholder that each conforming type fills in, like a generic parameter for the protocol:

```swift
protocol Container {
    associatedtype Item
    mutating func add(_ item: Item)
    var count: Int { get }
}

struct IntBag: Container {
    private var items: [Int] = []

    mutating func add(_ item: Int) {   // Item is inferred as Int
        items.append(item)
    }

    var count: Int { items.count }
}
```

`Sequence` (with `Element`) and `Collection` in the standard library work this way.

## Inheritance and composition

A protocol can inherit from others and add its own requirements:

```swift
protocol ElectricVehicle: Vehicle {
    var batteryCapacityKWh: Int { get }
}
```

Use `&` to require several protocols at once without declaring a new one:

```swift
func travel(in vehicle: some Vehicle & Describable) {
    print("Travelling in: \(vehicle.describe())")
}

travel(in: Airplane())   // Travelling in: Airplane with 3 wheels
```

## `some` versus `any`

When a protocol is used as a type, Swift (5.6 and later) lets you say which kind you mean:

- `some Vehicle` is one specific concrete type that the compiler knows. It's the same as a generic parameter, with no extra cost.
- `any Vehicle` is a box that can hold a value of any conforming type, and the type can differ from value to value. Use it for heterogeneous collections:

```swift
let fleet: [any Vehicle] = [Bicycle(), Airplane()]
let totalWheels = fleet.reduce(0) { $0 + $1.numberOfWheels }   // 5
```

Prefer `some` (or a generic) unless you need to mix types. Since Swift 5.7, protocols with associated types such as `Container` can also be used as `any Container`; before that they could only be used as generic constraints.

## Further reading

- [Protocols in The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)
- [Opaque and boxed protocol types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)
