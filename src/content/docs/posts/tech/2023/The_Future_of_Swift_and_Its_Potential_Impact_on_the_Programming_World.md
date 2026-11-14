---
description: "Where Swift is heading beyond iOS: compile-time data-race safety, server-side frameworks, Linux, Windows, Android and WebAssembly SDKs, and what happened to Swift for TensorFlow."
imgSrc: /imgs/2023/945555918.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-05-21T10:03:09.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Where Swift is heading: concurrency, server-side Swift and new platforms"
---

:::caution
An earlier version of this post presented Swift for TensorFlow as the future of Swift in machine learning. That project was [archived in February 2021](https://github.com/tensorflow/swift). The concurrency features it described as "planned" shipped years ago. This revision reflects Swift 6.4, the current release.
:::

Swift launched in 2014 as Apple's replacement for Objective-C and became open source in 2015. Most Swift code still ships in iOS and macOS apps. The interesting changes are elsewhere: the language has added compile-time data-race checking, and the toolchain now targets Linux, Windows, Android, WebAssembly and microcontrollers.

## Language changes go through Swift Evolution

New features are proposed and reviewed in public in the [swift-evolution](https://github.com/swiftlang/swift-evolution) repository and on the Swift Forums. Each proposal (SE-NNNN) states the motivation, design and source-compatibility impact. If you want to know where the language is going, read the proposals under review there rather than predictions in blog posts.

## Concurrency: from roadmap to compiler errors

The [Swift Concurrency Roadmap](https://forums.swift.org/t/swift-concurrency-roadmap/41611) from 2020 has been delivered:

- **Swift 5.5** added `async`/`await`, structured concurrency (`async let`, task groups) and actors.
- **Swift 6.0** added the Swift 6 language mode, in which data races that the compiler can detect are errors instead of warnings. Adopting it is opt-in per module, and many existing codebases needed real work to migrate.
- **Swift 6.2** made that model easier to adopt. For example, a module can make code main-actor-isolated by default, which suits app code that is mostly single-threaded.

The result is that Swift is one of the few mainstream languages where the compiler rejects data races. This is a bigger change for concurrent code than any single framework.

## Server-side Swift

Swift on the server is real but niche. [Vapor](https://vapor.codes/) and [Hummingbird](https://hummingbird.codes/) are the main web frameworks, both built on Apple's SwiftNIO networking library. The [Swift Server Workgroup](https://www.swift.org/documentation/server/) maintains guides and vets shared packages such as logging, metrics and HTTP clients. The Static Linux SDK can build fully statically linked Linux binaries, which makes container images small. The main reason to pick Swift here is sharing models and logic with an existing Swift app, or wanting value types and data-race checking on the backend. The library ecosystem is much smaller than Java's, Go's or Node's.

## More platforms

- **Linux and Windows:** official toolchains are on [swift.org/install](https://www.swift.org/install/). In Swift 6.4, SwiftPM uses Swift Build by default, so projects build the same way on Linux, macOS and Windows.
- **Android:** there is now an official [Swift SDK for Android](https://www.swift.org/documentation/articles/swift-sdk-for-android-getting-started.html) for sharing Swift code with Android apps.
- **WebAssembly:** a [Swift SDK for Wasm](https://www.swift.org/documentation/articles/wasm-getting-started.html) is published on swift.org, and JavaScriptKit handles calls to and from JavaScript.
- **Embedded Swift:** a restricted language subset that compiles to small binaries for microcontrollers.
- **Interop:** Swift 5.9 added direct C++ interoperability, and the swift-java project covers calls between Swift and Java.

None of these turn Swift into a default choice for cross-platform UI. On Android, for example, you still write the UI in Kotlin or Java and call shared Swift code.

## Machine learning

Swift for TensorFlow is gone. Its most lasting result is language-level differentiable programming, which continues as an experimental feature in the Swift compiler. For ML on Apple hardware today, the practical options are Core ML and Apple's [MLX](https://github.com/ml-explore/mlx-swift), which has Swift bindings. Training and research still happen mostly in Python.

## What to watch

- Proposals in the swift-evolution repo, especially ownership and performance work such as `Span` and non-copyable types.
- How the Android and Wasm SDKs mature, since they decide whether Swift becomes a shared-logic language outside Apple platforms.
- The [Swift blog](https://www.swift.org/blog/) release posts, which list what each version actually shipped.
