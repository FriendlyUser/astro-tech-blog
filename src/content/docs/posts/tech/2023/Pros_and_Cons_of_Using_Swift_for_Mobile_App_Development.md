---
title: "Swift for mobile apps: strengths, drawbacks and when to pick something else"
pubDate: "2024-06-12T20:34:39.000Z"
lastUpdated: 2026-11-14
description: "The practical pros and cons of Swift for mobile development: safety, Apple tooling, Objective-C interop, Android support, and language churn."
tags:
  - swift
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/244959930.png
---

Swift is Apple's language for iOS, iPadOS, macOS, watchOS, tvOS and visionOS. Apple introduced it in 2014 and open-sourced it in 2015, and it is now the default language for new Apple-platform apps. Whether it's the right choice for a mobile project mostly comes down to one question: are you building for Apple devices, Android, or both?

## Where Swift works well

### Safer by default than Objective-C

The biggest practical win is optionals. A value that might be missing has a different type (`String?`) from one that can't (`String`), and the compiler makes you unwrap it before use:

```swift
let input = "42"
if let number = Int(input) {   // Int(_:) returns Int? because parsing can fail
    print(number + 1)
} else {
    print("not a number")
}
```

That removes a whole class of "message sent to nil" and null-dereference bugs. Swift also checks array bounds and integer overflow at runtime (trapping instead of silently corrupting memory), and since Swift 6 the compiler can check for data races in concurrent code when you opt in to the Swift 6 language mode.

### Apple's tooling and frameworks are built for it

New Apple frameworks are designed with Swift in mind, and some, such as SwiftUI, SwiftData and Swift Charts, are Swift-only. Xcode, Instruments, Swift Package Manager and Apple's documentation all assume Swift first.

### Gradual adoption in Objective-C codebases

Swift and Objective-C can live in the same app target. Swift can call Objective-C through a bridging header, and Objective-C can call Swift classes exposed with `@objc`. That lets an older app add new screens in Swift without a rewrite.

### Compiled to native code

Swift compiles ahead of time through LLVM to native machine code, with no virtual machine or garbage collector; memory is managed with automatic reference counting (ARC). For most app code, performance isn't the deciding factor between languages, but you don't pay a runtime startup cost either.

### Open source, and not only for Apple

The compiler, standard library and package manager are open source under the Apache 2.0 licence, with official toolchains for Linux and Windows. That makes it possible to share code between an iOS app and, for example, a Swift server.

## Drawbacks

### Android is possible, but not the default

Swift 6.3 (March 2026) shipped the first official Swift SDK for Android. It lets you build Swift packages for Android and call them from an existing Kotlin or Java app through JNI using the Swift Java projects. It does not give you a cross-platform UI layer: Android screens are still built with Android's own toolkits. If you need one codebase for both platforms' UI today, the mainstream options are still Flutter, React Native or Kotlin Multiplatform, or two native apps.

### The language keeps changing

Swift has evolved quickly. The early 1.x to 3 releases broke source compatibility, and more recently moving a project to the Swift 6 language mode with strict concurrency checking can produce a large number of new errors in an existing codebase. Each Xcode release bundles its own Swift compiler, and Apple periodically raises the minimum Xcode version for App Store submissions, so you can't stay on an old toolchain indefinitely.

### ABI stability is solved on Apple platforms, with caveats

Swift 5.0 (2019) made the ABI stable on Apple platforms, so the Swift runtime now ships with the OS rather than inside every app. Distributing a closed-source binary framework that works across compiler versions additionally needs module stability (Swift 5.1+, built with library evolution enabled). Most app developers who consume libraries as source through Swift Package Manager never hit this; it mainly matters to SDK vendors shipping XCFrameworks.

### Smaller ecosystem outside Apple

For iOS work the ecosystem is large. Outside Apple platforms, such as server or general-purpose libraries, there are fewer packages and fewer people to hire than for Java, Kotlin or JavaScript.

## When to choose something else

- You need both Android and iOS from one UI codebase and don't have the people for two native apps: look at Flutter, React Native or Kotlin Multiplatform.
- Your team is mostly web developers and the app is mainly forms and lists: React Native lets them reuse more of what they know.
- You're maintaining a large, stable Objective-C app: there's no need to rewrite working code; add Swift where you're writing new features.

For an app that targets Apple platforms only, Swift (with SwiftUI or UIKit) is the default choice and the one Apple's documentation and new APIs are written for.

## Further reading

- [Swift.org](https://www.swift.org/)
- [The Swift Programming Language book](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/)
- [Swift 6.3 release announcement (includes the Android SDK)](https://www.swift.org/blog/swift-6.3-released/)
