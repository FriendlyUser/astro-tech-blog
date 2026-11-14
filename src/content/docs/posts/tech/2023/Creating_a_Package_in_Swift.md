---
description: "Create a Swift library with swift package init, understand the Package.swift manifest, add a dependency, build and test it, and publish versions with Git tags."
imgSrc: /imgs/2023/4161054396.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-15T13:22:30.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Creating, testing and publishing a Swift package with SwiftPM"
---

A Swift package is a folder of source files plus a `Package.swift` manifest that describes what it builds and what it depends on. The Swift Package Manager (SwiftPM) ships with the Swift toolchain, so you can create, build and test packages from the command line on macOS, Linux or Windows, and Xcode opens them directly.

## Create the package

Install a toolchain from [swift.org](https://www.swift.org/install/) (or install Xcode on macOS). `swift package init` creates the package in the current directory and names it after the folder:

```bash
mkdir MyPackage
cd MyPackage
swift package init --type library
```

Use `--type executable` for a command-line tool instead. The library template creates:

```text
MyPackage
├── .gitignore
├── Package.swift
├── Sources
│   └── MyPackage
│       └── MyPackage.swift
└── Tests
    └── MyPackageTests
        └── MyPackageTests.swift
```

Depending on your toolchain version, the generated test uses Swift Testing (`import Testing`) or XCTest; `swift package init --help` lists the flags for choosing.

## The manifest

Here's a manifest for the library with platform minimums added:

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyPackage",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v13),
    ],
    products: [
        .library(name: "MyPackage", targets: ["MyPackage"]),
    ],
    dependencies: [],
    targets: [
        .target(name: "MyPackage"),
        .testTarget(name: "MyPackageTests", dependencies: ["MyPackage"]),
    ]
)
```

- The `swift-tools-version` comment on the first line is required. It sets the minimum SwiftPM version that can read the manifest and which manifest APIs are available.
- `platforms` sets minimum deployment targets for Apple platforms. Leave it out to use SwiftPM's defaults.
- `products` are what other packages can import. A target that isn't in a product is internal to the package.
- `targets` are modules. By convention a target's sources live in `Sources/<TargetName>` and a test target's in `Tests/<TargetName>`.

## Write some code and a test

Other modules can only see declarations marked `public`, including the initialiser, which isn't public by default:

```swift
// Sources/MyPackage/MyPackage.swift
public struct Greeter {
    public init() {}

    public func greet(_ name: String) -> String {
        "Hello, \(name)!"
    }
}
```

A test using Swift Testing (Swift 6 toolchain or Xcode 16 and later):

```swift
// Tests/MyPackageTests/MyPackageTests.swift
import Testing
@testable import MyPackage

@Test func greeting() {
    #expect(Greeter().greet("Swift") == "Hello, Swift!")
}
```

`@testable import` lets tests reach `internal` declarations as well as public ones.

## Add a dependency

Add the package URL and a version requirement to `dependencies`, then name the product in the target that uses it. For Alamofire:

```swift
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.12.2"),
],
targets: [
    .target(
        name: "MyPackage",
        dependencies: [
            .product(name: "Alamofire", package: "Alamofire"),
        ]
    ),
    .testTarget(name: "MyPackageTests", dependencies: ["MyPackage"]),
]
```

`from: "5.12.2"` means "5.12.2 or any later 5.x release". 5.12.2 was the latest Alamofire release when this post was updated. SwiftPM records the exact resolved versions in `Package.resolved`. Packages that depend on yours ignore that file and resolve their own versions, so the `from:` range is what matters for consumers.

## Build and test

```bash
swift build
swift test
```

`swift build` fetches dependencies on first run and compiles everything into `.build/`. `swift test` builds the test targets and runs them. In Xcode, open the package folder and use **Product > Test**.

## Publish it

SwiftPM installs packages straight from Git, so publishing means pushing to a public repository (GitHub, GitLab, Bitbucket and so on) and tagging releases with semantic version numbers:

```bash
git tag 1.0.0
git push origin 1.0.0
```

Other packages can then depend on yours with `.package(url: "https://github.com/<you>/MyPackage.git", from: "1.0.0")`. Without a version tag, consumers can only depend on a branch or commit. Optionally, submit the package to the [Swift Package Index](https://swiftpackageindex.com/) so people can find it and see which platforms it builds on.

## Further reading

- [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/)
- [PackageDescription API reference](https://developer.apple.com/documentation/packagedescription)
