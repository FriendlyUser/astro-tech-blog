---
description: How Swift enums work, covering basic cases, associated values, raw values, switch pattern matching, CaseIterable, and adding methods to an enum.
imgSrc: /imgs/2023/872471039.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-05-27T17:08:22.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: 'Swift enums: cases, associated values, raw values, and switch'
---

An enum in Swift defines a type with a fixed set of cases. Because the compiler knows every case, it can check that a `switch` handles all of them. That makes enums a good fit for state, options, and results that can only take a few shapes. Swift enums can also carry data (associated values), map to a backing value (raw values), and have methods and computed properties.

## Basic syntax

Declare an enum with the `enum` keyword. By convention the type name is UpperCamelCase and the cases are lowerCamelCase:

```swift
enum CompassDirection {
    case north
    case south
    case east
    case west
}
```

Several cases can share one line: `case north, south, east, west`.

Refer to a case through its type. Once Swift knows the type, you can drop the type name and write just the leading dot:

```swift
var direction = CompassDirection.north
direction = .west
```

Unlike C enums, these cases are not integers in disguise. `CompassDirection.north` is a value of type `CompassDirection`, not `0`.

## Associated values

A case can carry extra data, and each case can carry different types. This example comes from the Swift book:

```swift
enum Barcode {
    case upc(Int, Int, Int, Int)
    case qrCode(String)
}

let productBarcode = Barcode.upc(8, 85909, 51226, 3)
let qrCode = Barcode.qrCode("ABCDEFGHIJKLMNOP")
```

A `Barcode` value holds either four `Int`s or one `String`, never both. The data is supplied when the value is created, so two `.qrCode` values can hold different strings.

## Pattern matching with switch

Use `switch` to branch on the case and bind its associated values:

```swift
func printBarcodeInfo(_ barcode: Barcode) {
    switch barcode {
    case .upc(let numberSystem, let manufacturer, let product, let check):
        print("UPC: \(numberSystem), \(manufacturer), \(product), \(check)")
    case .qrCode(let code):
        print("QR code: \(code)")
    }
}

printBarcodeInfo(productBarcode) // UPC: 8, 85909, 51226, 3
printBarcodeInfo(qrCode)         // QR code: ABCDEFGHIJKLMNOP
```

If every binding is a constant, you can put a single `let` before the case name: `case let .upc(numberSystem, manufacturer, product, check):`.

The `switch` must be exhaustive. If you add a case to `Barcode` later, every `switch` without a `default` stops compiling until it handles the new case.

To check for a single case without a full `switch`, use `if case`:

```swift
if case .qrCode(let code) = qrCode {
    print("Scanned \(code)")
}
```

## Raw values

Raw values are a different feature from associated values. A raw value is a fixed value attached to each case when you declare the enum, and it is the same for every instance of that case. To use raw values, declare a raw type after the enum name. The raw type can be a string, a character, or any integer or floating-point type.

For `Int` and `String` raw types, Swift fills in values you leave out. Integer values count up from the previous case, starting at 0 if the first case has no value. String values default to the case name.

```swift
enum Planet: Int {
    case mercury = 1, venus, earth, mars, jupiter, saturn, uranus, neptune
}

enum Direction: String {
    case north, south, east, west
}

print(Planet.earth.rawValue)    // 3
print(Direction.west.rawValue)  // west
```

Going from a raw value back to a case uses the `init?(rawValue:)` initializer. It is failable because not every raw value matches a case:

```swift
if let planet = Planet(rawValue: 3) {
    print("Planet with raw value 3 is \(planet).") // Planet with raw value 3 is earth.
}

print(Planet(rawValue: 11) as Any) // nil
```

An enum can't have both a raw type and cases with associated values. The compiler rejects that combination.

## Listing every case and adding behaviour

Add `CaseIterable` to get a compiler-generated `allCases` collection. This only works automatically when no case has associated values:

```swift
enum Beverage: CaseIterable {
    case coffee, tea, juice
}

print(Beverage.allCases.count) // 3
```

Enums can also have computed properties, methods, and protocol conformances, often added in an extension:

```swift
extension CompassDirection {
    var opposite: CompassDirection {
        switch self {
        case .north: return .south
        case .south: return .north
        case .east: return .west
        case .west: return .east
        }
    }
}

print(CompassDirection.east.opposite) // west
```

If a method needs to change the value, mark it `mutating` and assign to `self`.

## Gotchas

- **Avoid `default` in switches over your own enums.** A `default` stops the compiler from telling you about cases you add later.
- **Enums from other modules can gain cases.** System framework enums (and C enums imported into Swift) may add cases in future SDKs. Switch over them with `@unknown default:`, which still gives you a warning when you miss a case that is known at compile time.
- **Recursive enums need `indirect`.** A case that contains the enum itself, such as an expression tree, must be marked `indirect case` (or the whole enum `indirect enum`).

## Further reading

- [Enumerations, *The Swift Programming Language*](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)
- [Patterns, *The Swift Programming Language*](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/patterns/)
