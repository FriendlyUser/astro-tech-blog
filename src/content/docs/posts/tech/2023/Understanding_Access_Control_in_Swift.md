---
description: "Swift's six access levels (private, fileprivate, internal, package, public, open), what each one allows, and the defaults and rules that trip people up."
imgSrc: /imgs/2023/549017699.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-03-28T21:42:20.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Access control in Swift: private, fileprivate, internal, package, public and open"
---

Swift's access control decides which code can see a declaration: the same type, the same file, the same module, the same package, or anyone who imports the module. It's how a framework hides its implementation and exposes a small public API, and inside an app it stops one file from reaching into another type's internals.

## The six levels

From most to least restrictive:

| Level | Visible to |
| --- | --- |
| `private` | The enclosing declaration, plus extensions of it in the same file |
| `fileprivate` | The whole source file |
| `internal` (default) | The whole module |
| `package` | Every module in the same Swift package (Swift 5.9+) |
| `public` | Any module that imports it, but it can't be subclassed or overridden outside the module |
| `open` | Any module that imports it, and classes and members can be subclassed and overridden there |

A "module" is one build target: an app, a framework, or a SwiftPM target.

### private

`private` limits access to the enclosing type and its extensions in the same file. Extensions have been included since Swift 4. Before that, `private` meant the declaration's scope only.

```swift
class Counter {
    private var count = 0

    func increment() {
        count += 1  // OK: inside Counter
    }
}

extension Counter {
    func reset() {
        count = 0   // OK: extension of Counter in the same file
    }
}

let counter = Counter()
counter.increment()
// counter.count  // error: 'count' is inaccessible due to 'private' protection level
```

A common variant is `private(set)`. It makes the setter private but leaves the getter at the declaration's level:

```swift
class Counter {
    private(set) var count = 0  // anyone can read count; only Counter can change it
}
```

### fileprivate

`fileprivate` opens access to everything in the same source file, including other types:

```swift
class Engine {
    fileprivate var temperature = 90
}

class Dashboard {
    func showTemperature(of engine: Engine) {
        print(engine.temperature)  // OK: same file
    }
}
```

Use it when two closely related types in one file need to share details. If you reach for it often, the types may belong together.

### internal

`internal` is the default. If you don't write an access modifier, the declaration is visible throughout its module and invisible outside it. For app code, that's usually all you need.

```swift
// Module: Networking
public class APIClient {
    public init() {}

    var retryCount = 3        // internal by default

    public func fetch() { /* ... */ }
}
```

```swift
// Module: App
import Networking

let client = APIClient()
client.fetch()        // OK: public
// client.retryCount  // error: 'retryCount' is inaccessible due to 'internal' protection level
```

Note that the class needs a `public init()`. A type's default initialiser is `internal`, so without it the App module could see `APIClient` but not create one.

### package

`package`, added in Swift 5.9 ([SE-0386](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0386-package-access-modifier.md)), sits between `internal` and `public`. It makes a declaration visible to other targets in the same Swift package but not to clients of the package. Before it existed, sharing helpers between targets meant making them `public` and hoping nobody used them.

```swift
// Target: Core (in package MyLibrary)
import Foundation

package func makeRequestID() -> String { UUID().uuidString }
```

```swift
// Target: Networking (same package)
import Core

let id = makeRequestID()  // OK: same package
```

SwiftPM passes the package name to the compiler automatically. If you build outside SwiftPM, you set it with the `-package-name` flag.

### public

`public` makes a declaration usable from other modules. For classes, it doesn't allow subclassing or overriding outside the defining module:

```swift
// Module: UIKitLite
public class Button {
    public init() {}
    public func tap() { print("tapped") }
}
```

```swift
// Module: App
import UIKitLite

let button = Button()
button.tap()  // OK

// class FancyButton: Button {}
// error: cannot inherit from non-open class 'Button' outside of its defining module
```

### open

`open` applies only to classes and overridable class members. It's `public` plus permission to subclass and override from other modules. Each member must opt in separately:

```swift
// Module: UIKitLite
open class View {
    public init() {}

    open func draw() { print("View.draw") }   // can be overridden anywhere
    public func layout() { print("layout") }  // callable anywhere, overridable only here
}
```

```swift
// Module: App
import UIKitLite

class ChartView: View {
    override func draw() { print("ChartView.draw") }  // OK: draw() is open
    // override func layout() {}
    // error: overriding non-open instance method outside of its defining module
}

ChartView().draw()  // ChartView.draw
```

## Rules that trip people up

- **Members of a public type are internal by default.** Marking a type `public` doesn't make its properties, methods or initialiser public; you mark each one.
- **Nothing can be more visible than the types it uses.** A `public` function can't take or return an `internal` type, and a `public` property can't have a `private` type. The compiler reports these errors.
- **Overrides can widen access.** A subclass may make an overridden member more accessible than the superclass version.
- **Tests:** `@testable import MyModule` lets a test target see `internal` declarations, as long as the module was built with testing enabled (Xcode and SwiftPM do this for debug builds by default).
- **Imports have access levels too.** Since Swift 6.0 ([SE-0409](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0409-access-level-on-imports.md)) you can write `internal import Foo` so a dependency doesn't leak into your module's public interface.

## Further reading

- [Access Control, The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/)
