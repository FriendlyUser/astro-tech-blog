---
description: Create a Swift package from the command line, add a dependency such as Alamofire to Package.swift, and update, pin or remove dependencies with SwiftPM.
imgSrc: /imgs/2023/3867963691.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-26T13:34:45.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: 'Swift Package Manager basics: creating a package and managing dependencies'
---

Swift Package Manager (SwiftPM) is the build tool and dependency manager that ships with Swift. It is built into Xcode and the `swift` command-line tool, and it is the default way to share Swift code now that CocoaPods' Trunk repository is going read-only (on 2 December 2026). This post creates a library package, adds a dependency, and covers updating and removing it.

## Key concepts

- **Package**: a directory with a `Package.swift` manifest at its root, plus sources and tests.
- **Target**: a module, a set of source files compiled together. Regular targets, executable targets, test targets, plugins and macros are all targets.
- **Product**: what a package exposes to others, either a library or an executable, built from one or more targets.
- **Dependency**: another package, declared in the manifest with a URL (or local path) and a version requirement. A target then depends on one of that package's products.

## Creating a package

```bash
mkdir MyPackage
cd MyPackage
swift package init
```

`swift package init` creates a library package by default. Use `--type executable` for a command-line program, or `--type tool` for one that uses `swift-argument-parser`. The result looks like this:

```text
MyPackage
├── Package.swift
├── Sources
│   └── MyPackage
│       └── MyPackage.swift
└── Tests
    └── MyPackageTests
        └── MyPackageTests.swift
```

Recent toolchains generate tests using Swift Testing (`import Testing`, `@Test`) rather than XCTest. The manifest looks like this (the generator adds explanatory comments, removed here):

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyPackage",
    products: [
        .library(
            name: "MyPackage",
            targets: ["MyPackage"]
        ),
    ],
    targets: [
        .target(
            name: "MyPackage"
        ),
        .testTarget(
            name: "MyPackageTests",
            dependencies: ["MyPackage"]
        ),
    ]
)
```

The first line is not a plain comment: `swift-tools-version` sets the minimum Swift version that can read the manifest and which `PackageDescription` APIs it may use. `swift package init` writes the version of the toolchain you ran it with.

Check that everything works:

```bash
swift build
swift test
```

## Adding a dependency

A dependency is declared in two places: the package-level `dependencies` array says where to fetch the package and which versions are allowed, and each target that uses it lists one of the package's products. Here is the manifest with [Alamofire](https://github.com/Alamofire/Alamofire) added:

```swift
// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "MyPackage",
    platforms: [.macOS(.v12), .iOS(.v15)],
    products: [
        .library(
            name: "MyPackage",
            targets: ["MyPackage"]
        ),
    ],
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
        .testTarget(
            name: "MyPackageTests",
            dependencies: ["MyPackage"]
        ),
    ]
)
```

A few details:

- `from: "5.12.2"` means "5.12.2 or newer, below 6.0.0". Use `.upToNextMinor(from:)` for a tighter range, `exact:` to pin one version, or `branch:`/`revision:` for unreleased code.
- `package:` in `.product(name:package:)` is the package's identity, which is the last path component of the URL without `.git`.
- `platforms` is there because the manifest Alamofire 5.12 uses with the newest Swift tools version declares a minimum of macOS 12 and iOS 15. If your package's minimum is lower than a dependency's, SwiftPM refuses to build it, so set yours at least as high.

Recent toolchains can make the same edits from the command line. Run `swift package add-dependency --help` to check that your version has it:

```bash
swift package add-dependency https://github.com/Alamofire/Alamofire.git --from 5.12.2
swift package add-target-dependency Alamofire MyPackage --package Alamofire
```

Then `swift build` resolves the dependency, clones it, and writes the exact versions it chose to `Package.resolved`.

In an Xcode app project, which has no `Package.swift`, use **File > Add Package Dependencies…** instead and pick the target to link the product to.

## Updating and removing dependencies

SwiftPM does not move to a newer version on its own once `Package.resolved` exists:

- `swift package update` re-resolves every dependency to the newest version allowed by the manifest and rewrites `Package.resolved`. Pass a package name (`swift package update Alamofire`) to update just one.
- To allow a new major version, change the requirement in `Package.swift` (for example to `from: "6.0.0"`), then run `swift package update`.
- `swift package resolve` resolves without updating, using the pinned versions where it can.
- `swift package show-dependencies` prints the resolved dependency tree.

To remove a dependency, delete its `.package(...)` entry and every `.product(...)` that refers to it, then run `swift package update` so `Package.resolved` drops it.

## Gotchas

- Commit `Package.resolved` for apps and executables, so every machine and CI run builds the same versions. Libraries often leave it out, because consumers resolve versions themselves.
- If resolution gets stuck after editing the manifest, `swift package reset` clears the `.build` directory's checkouts and state.
- Version tags must be full semantic versions (`1.2.0`, not `1.2`), or SwiftPM ignores them.

## Further reading

- [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/)
- [PackageDescription API reference](https://developer.apple.com/documentation/packagedescription)
