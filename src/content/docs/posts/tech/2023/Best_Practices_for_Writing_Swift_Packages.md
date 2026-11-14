---
description: "Practical conventions for Swift packages: naming, layout, access control including package, DocC comments, tests, semantic versioning and a clean Package.swift."
imgSrc: /imgs/2023/1900267581.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-16T15:57:18.000Z'
lastUpdated: 2026-11-14
tags:
  - swift
  - testing
title: "Swift package conventions: layout, access control, tests and versioning"
---

A Swift package is a directory with a `Package.swift` manifest that Swift Package Manager (SwiftPM) and Xcode can build, test and pull in as a dependency. These are the conventions that make a package easy to depend on and easy to maintain.

## Naming

Module and product names become `import` statements, so use UpperCamelCase names that say what the code does: `NetworkClient`, `DateParsing`. The repository name is separate and often lowercase with hyphens, as in Apple's `swift-algorithms` repository, which ships the `Algorithms` module. Avoid generic names like `Utils` that are likely to collide with another dependency's module.

## Layout

SwiftPM finds targets by convention: sources in `Sources/<TargetName>`, tests in `Tests/<TestTargetName>`. Splitting code into several targets keeps compile times down and lets you keep helper code out of the public product.

```text
MyPackage
├── Package.swift
├── Sources
│   ├── MyPackage
│   │   ├── Models
│   │   └── Networking
│   └── MyPackageSupport
└── Tests
    ├── MyPackageTests
    └── MyPackageSupportTests
```

## Access control

Swift has six access levels, from least to most restrictive:

1. `open`: visible outside the module and can be subclassed or overridden there
2. `public`: visible outside the module, but not subclassable or overridable there
3. `package`: visible to other modules in the same package only (Swift 5.9 and later)
4. `internal`: the default; visible within the module
5. `fileprivate`: visible within the source file
6. `private`: visible within the enclosing declaration (and its extensions in the same file)

Anything `public` is part of your API and covered by your version promises, so make the public surface as small as you can. `package` is the level to use when `MyPackageSupport` needs to share helpers with `MyPackage` without exposing them to users of the package.

## Documentation comments

Write `///` comments in Markdown. Xcode shows them in Quick Help, and DocC builds them into a documentation site.

````swift
/// A point in a two-dimensional coordinate system.
///
/// ```swift
/// let point = Point(x: 3, y: 4)
/// print(point.distanceFromOrigin()) // Prints "5.0"
/// ```
public struct Point {
    public let x: Double
    public let y: Double

    public init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }

    /// Returns the distance between this point and the origin.
    public func distanceFromOrigin() -> Double {
        (x * x + y * y).squareRoot()
    }
}
````

Two fixes compared to the earlier version of this example. A `public` struct needs an explicit `public init`, because the memberwise initializer Swift generates is `internal` and other modules can't call it. And `squareRoot()` is in the standard library, while the free function `sqrt` needs `import Foundation`.

## Tests

Test the public API the way a consumer would. With XCTest:

```swift
import XCTest
@testable import MyPackage

final class PointTests: XCTestCase {
    func testDistanceFromOrigin() {
        let point = Point(x: 3, y: 4)
        XCTAssertEqual(point.distanceFromOrigin(), 5.0, accuracy: 0.001)
    }
}
```

Run them with `swift test`. Toolchains from Swift 6 on also ship Swift Testing (`import Testing`, `@Test`, `#expect`), which can sit in the same test target as XCTest tests. Drop `@testable` from at least some tests so you catch symbols you forgot to make public.

## Semantic versioning

SwiftPM resolves dependencies from Git tags and assumes [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

- MAJOR for incompatible API changes
- MINOR for backward-compatible additions
- PATCH for backward-compatible fixes

A dependency declared with `from: "1.2.0"` accepts anything up to, but not including, `2.0.0`. Removing or renaming a public symbol in a minor release breaks everyone who used that rule. Versions below 1.0.0 make no stability promise, so treat each `0.x` minor bump as potentially breaking.

## Package.swift

Keep the manifest declarative and minimal: products, dependencies, targets, and only the platforms you actually support. The first line sets the minimum SwiftPM version needed to read the manifest. 5.9 is the first that understands `package` access.

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyPackage",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v13),
        .watchOS(.v6),
        .tvOS(.v13),
    ],
    products: [
        .library(name: "MyPackage", targets: ["MyPackage"]),
    ],
    dependencies: [
        .package(url: "https://github.com/apple/swift-algorithms", from: "1.2.0"),
    ],
    targets: [
        .target(
            name: "MyPackage",
            dependencies: [
                "MyPackageSupport",
                .product(name: "Algorithms", package: "swift-algorithms"),
            ]
        ),
        .target(name: "MyPackageSupport"),
        .testTarget(name: "MyPackageTests", dependencies: ["MyPackage"]),
        .testTarget(name: "MyPackageSupportTests", dependencies: ["MyPackageSupport"]),
    ]
)
```

`swift-algorithms` 1.2.1 is the current release; `from: "1.2.0"` picks it up. Commit `Package.resolved` for apps, but libraries usually leave it out, because consumers resolve versions themselves.

## Further reading

- [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/)
- [SE-0386: the `package` access modifier](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0386-package-access-modifier.md)
- [DocC documentation](https://www.swift.org/documentation/docc/)
