---
description: Create a Swift package with SwiftPM, tag a semantic version, push it to a public Git repository, and list it on the Swift Package Index so others can depend on it.
imgSrc: /imgs/2023/1693067648.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-13T05:37:32.000Z'
lastUpdated: 2026-11-14
tags:
  - swift
title: 'Publishing a Swift package: SwiftPM, Git tags and the Swift Package Index'
---

A Swift package is a directory with a `Package.swift` manifest and source files. There is no central upload step like npm or PyPI: a "published" package is just a Git repository that other people can reach, plus semantic-version tags. The Swift Package Manager (SwiftPM) clones the repo and checks out the tag that matches the version requirement.

## Prerequisites

- A Swift toolchain from [swift.org](https://swift.org/install/), or Xcode on macOS (it includes Swift and SwiftPM).
- Git, and an account on a Git host such as GitHub, GitLab or Bitbucket.

## Step 1: create the package

`swift package init` names the package after the current directory, so create that first:

```bash
mkdir MyPackage
cd MyPackage
swift package init --type library
```

Use `--type executable` for a command-line tool. Recent toolchains generate:

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

Depending on your toolchain, the generated test uses Swift Testing (`import Testing`, `@Test`) or XCTest. Pass `--enable-swift-testing` or `--enable-xctest` to choose explicitly.

## Step 2: edit the manifest

`Package.swift` declares the package's name, supported platforms, the products other packages can use, its dependencies and its targets:

```swift
// swift-tools-version: 6.0
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
    dependencies: [
        // .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.0.0"),
    ],
    targets: [
        .target(name: "MyPackage"),
        .testTarget(name: "MyPackageTests", dependencies: ["MyPackage"]),
    ]
)
```

The first-line comment is required. It sets the minimum Swift toolchain that can build the package, and which manifest APIs you may use. `swift package init` writes your toolchain's version there. Lower it only if you need to support older compilers. Only list `platforms` if you actually need a newer minimum OS than SwiftPM's default.

The `products` entry is what consumers depend on. A target that isn't exposed through a product can't be imported by other packages.

## Step 3: implement and test

Put your code in `Sources/MyPackage` and your tests in `Tests/MyPackageTests`. Anything other packages should use must be marked `public`, because the default `internal` access level isn't visible outside the module. Then build and test:

```bash
swift build
swift test
```

## Step 4: commit and tag a version

SwiftPM resolves versions from Git tags, and the tags must be [semantic versions](https://semver.org/):

```bash
git init -b main
git add .
git commit -m "Initial commit"
git tag 0.1.0
```

A tag points at one commit. To release changes later, commit them and create a new tag such as `0.1.1` or `0.2.0`. Don't move an existing tag: anyone who already resolved it has that commit pinned in their `Package.resolved`.

## Step 5: push to a public repository

Create an empty repository on your Git host, then push the branch and the tag:

```bash
git remote add origin https://github.com/YourUsername/MyPackage.git
git push -u origin main
git push origin 0.1.0
```

That's the publish step. Anyone with access to the repository can now depend on it.

## Step 6: use it from another package

In the consuming package's `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/YourUsername/MyPackage.git", from: "0.1.0"),
],
targets: [
    .target(
        name: "App",
        dependencies: [
            .product(name: "MyPackage", package: "MyPackage"),
        ]
    ),
]
```

`from:` accepts any version up to the next major, so `0.1.0` here matches `0.1.0 ..< 1.0.0`. In Xcode, use **File → Add Package Dependencies…** and paste the repository URL.

## Step 7: list it on the Swift Package Index

The [Swift Package Index](https://swiftpackageindex.com/) is the main place people search for Swift packages. It builds your package against several Swift versions and platforms to show compatibility, and can host your DocC documentation. To be listed, the repository must be public, have `Package.swift` at the root, have at least one semantic-version tag, and build without errors. Submit the URL (including `https://` and `.git`) through the [Add a Package](https://swiftpackageindex.com/add-a-package) page, which opens an issue on the index's PackageList repository.

## Gotchas

- Package and product names are part of your public API. Renaming either breaks every consumer's manifest.
- Packages depending on yours must use a tagged version (or an explicit branch/revision). Untagged commits on `main` aren't picked up by `from:` requirements.
- Breaking changes need a new major version. After 1.0.0, consumers using `from:` won't pick up 2.0.0 until they change their manifest.

## Further reading

- [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/)
- [Build a library with SwiftPM (swift.org)](https://swift.org/getting-started/library-swiftpm/)
- [Swift Package Index: add a package](https://swiftpackageindex.com/add-a-package)
