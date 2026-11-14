---
description: "Swift performance tips that hold up: build with -O and whole-module optimization, cut dynamic dispatch, use copy-on-write and inout well, and measure first."
imgSrc: /imgs/2023/1031426508.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-03T01:10:23.000Z'
lastUpdated: 2026-11-14
tags:
  - swift
title: "Swift performance tips: build settings, dispatch, copy-on-write and inlining"
---

Most Swift performance problems come from a few places: debug builds, dynamic dispatch the optimizer can't see through, unexpected copies of collections, and reference counting. This post goes through the techniques that address those, based on the Swift project's own [optimization tips](https://github.com/swiftlang/swift/blob/main/docs/OptimizationTips.rst). Before changing code, profile a release build with Instruments (Time Profiler) so you know where the time actually goes.

## Measure an optimized build

Debug builds use `-Onone`, which keeps every function call, retain and release so the debugger works. Timing a debug build tells you little about release performance.

- Xcode: the Release configuration uses `-O` by default. You can also pick `-Osize` to trade some speed for smaller code.
- SwiftPM: `swift build -c release` and `swift test -c release`.
- Whole module optimization (WMO) compiles the module as one unit, which lets the optimizer inline, specialize generics and devirtualize across files. Xcode's Release configuration and `swift build -c release` already enable it.

## Reduce dynamic dispatch

Calls to class methods and properties go through a vtable unless the compiler can prove there are no overrides. Tell it:

```swift
final class Particle {           // no subclass can override anything
    var x = 0.0
    var velocity = 1.0

    func step(dt: Double) {
        x += velocity * dt       // direct access, can be inlined
    }
}

class Shape {
    private var cachedArea = 0.0 // private members can't be overridden from another file
    final func reset() { cachedArea = 0 }
}
```

`final` on a class or member, and `private`/`fileprivate` on members, let the compiler call the implementation directly. With WMO, `internal` members get the same treatment, because the compiler can see every subclass in the module.

If a protocol is only ever adopted by classes, constrain it with `AnyObject`. That lets the compiler use cheaper reference-counting for values of that protocol type.

```swift
protocol Renderer: AnyObject {
    func draw()
}
```

## Prefer structs, but know what they cost

Structs and enums are stored inline and don't need heap allocation or reference counting on their own. That only holds while their fields are also values: a struct that holds three `String`s and an `Array` still retains and releases those buffers whenever it's copied. Large structs with many reference-typed fields can end up doing more reference counting than a single class instance would.

## Work with copy-on-write, not against it

`Array`, `Dictionary`, `Set` and `String` share their storage between copies and only copy when a shared buffer is mutated. Two habits keep that from turning into accidental O(n) copies.

Mutate in place instead of building a new value and reassigning:

```swift
var values = [Int](repeating: 0, count: 1_000_000)

// Copies the whole array on every call
func incremented(_ a: [Int]) -> [Int] {
    var copy = a
    for i in copy.indices { copy[i] += 1 }
    return copy
}
values = incremented(values)

// Mutates the caller's buffer directly
func increment(_ a: inout [Int]) {
    for i in a.indices { a[i] += 1 }
}
increment(&values)
```

`inout` is not a pointer; semantically it's copy-in, copy-out. But because the caller gives up its access for the duration of the call, the array's buffer is uniquely referenced and the optimizer can mutate it in place.

Reserve capacity when you know the size up front, so appends don't repeatedly reallocate:

```swift
var squares: [Int] = []
squares.reserveCapacity(10_000)
for i in 0..<10_000 {
    squares.append(i * i)
}
```

For arrays of class instances that never bridge to `NSArray`, `ContiguousArray` avoids the bridging checks that `Array` has on Apple platforms.

## map, filter and loops

`map`, `filter` and `reduce` are not inherently faster than a `for` loop; in optimized builds they usually compile to similar code. Chaining them does allocate a new array at each step. If you're chaining several over a large collection and only need the result once, use `.lazy` or a single loop:

```swift
let numbers = Array(1...1_000_000)

// Two intermediate arrays
let a = numbers.filter { $0 % 3 == 0 }.map { $0 * 2 }.reduce(0, +)

// No intermediate arrays
let b = numbers.lazy.filter { $0 % 3 == 0 }.map { $0 * 2 }.reduce(0, +)
```

## Lazy properties

A `lazy var` defers expensive setup until first use. In a struct, reading a lazy property mutates `self`, so any getter that touches it must be `mutating`, and you can't read it from a `let` instance. For shared caches, a class is often simpler:

```swift
struct ExpensiveObject {
    let value: Int
    init(value: Int) {
        print("ExpensiveObject initialized")
        self.value = value
    }
}

final class Container {
    lazy var expensiveObject = ExpensiveObject(value: 42)

    var doubled: Int {
        expensiveObject.value * 2 // initializes on first access
    }
}

let c = Container()
print(c.doubled) // prints "ExpensiveObject initialized", then 84
```

Note that a computed property like `doubled` runs every time it is read. It's a convenience, not a cache.

## Inlining attributes

The optimizer already inlines small functions inside a module, so you rarely need these:

- `@inlinable` publishes a function's body as part of a module's interface, so other modules can inline and specialize it. It's mainly for library authors, and it's a commitment: changing an `@inlinable` body doesn't reach clients until they recompile.
- `@inline(__always)` and `@inline(never)` force or forbid inlining. Use them only after a profile shows a specific call matters.

```swift
public struct Vector2 {
    public var x: Double
    public var y: Double

    public init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }

    @inlinable
    public static func + (lhs: Vector2, rhs: Vector2) -> Vector2 {
        Vector2(x: lhs.x + rhs.x, y: lhs.y + rhs.y)
    }
}
```

Generic code has a similar issue across module boundaries: without `@inlinable` or WMO visibility, callers in another module go through an unspecialized version that passes values via witness tables.

## Things that don't affect speed

- `let` versus `var` for a local constant. Use `let` for clarity; the optimizer can tell when a `var` is never mutated. The exception is a `var` captured by an escaping closure, which has to be heap-boxed so both sides see changes; a captured `let` is just copied.
- Type inference versus explicit annotations. They compile to the same code. Very complex inferred expressions can slow down *compile* time, not run time.

## Further reading

- [Swift optimization tips](https://github.com/swiftlang/swift/blob/main/docs/OptimizationTips.rst)
- [Apple: Improving your app's performance](https://developer.apple.com/documentation/xcode/improving-your-app-s-performance)
