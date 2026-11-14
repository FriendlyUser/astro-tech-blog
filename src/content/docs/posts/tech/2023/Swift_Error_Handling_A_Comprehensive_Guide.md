---
title: "Swift error handling: throws, do-catch, try?, typed throws and rethrows"
pubDate: "2024-03-18T15:08:37.000Z"
lastUpdated: 2026-11-14
description: "How Swift error handling works: defining Error types, throwing and propagating errors, do-catch with patterns, try? and try!, typed throws, rethrows and defer."
tags:
  - swift
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3847215807.webp
---

Swift handles recoverable errors with values that conform to the `Error` protocol. A function marks itself `throws`, callers must call it with `try`, and the compiler makes sure every thrown error is either handled with `do`/`catch` or passed up to a function that also throws. Unlike exceptions in Java or C++, you can see every call that might fail because it has `try` in front of it.

## Defining errors

Any type can be an error by conforming to `Error`. Enums are the usual choice, and associated values carry details:

```swift
enum NetworkError: Error {
    case serverError(statusCode: Int)
    case noInternetConnection
    case authenticationFailed(reason: String)
}
```

## Throwing and propagating

A function that can fail is marked `throws` and uses `throw` to exit with an error. A caller that doesn't want to handle the error can be marked `throws` too and just call with `try`; the error passes straight through.

```swift
func fetchData(isOnline: Bool, statusCode: Int) throws -> String {
    guard isOnline else {
        throw NetworkError.noInternetConnection
    }
    guard (200..<300).contains(statusCode) else {
        throw NetworkError.serverError(statusCode: statusCode)
    }
    return "payload"
}

func loadDashboard() throws -> String {
    let data = try fetchData(isOnline: true, statusCode: 503)
    return "Dashboard: \(data)"
}
```

## Handling errors with do-catch

`catch` clauses are patterns, so you can match specific cases and bind associated values. A final `catch` with no pattern catches everything else and gives you an implicit `error` constant.

```swift
do {
    let page = try loadDashboard()
    print(page)
} catch NetworkError.serverError(let code) where code >= 500 {
    print("Server is down (\(code)), try again later")
} catch NetworkError.noInternetConnection {
    print("No internet connection")
} catch let NetworkError.authenticationFailed(reason) {
    print("Authentication failed: \(reason)")
} catch {
    print("Unexpected error: \(error)")
}
// Prints: Server is down (503), try again later
```

With untyped `throws`, the compiler can't know which errors are possible, so the catch-all clause is required unless the enclosing function also throws.

## try? and try!

`try?` turns the result into an optional and discards the error. `try!` asserts that the call cannot fail and crashes if it does.

```swift
let maybePage = try? loadDashboard()        // String?, nil here
let config = try! fetchData(isOnline: true, statusCode: 200) // String, traps on error
```

Use `try?` when you genuinely don't care why something failed. Keep `try!` for cases where failure means a programming error, like decoding a resource bundled with the app.

## Typed throws

Since Swift 6.0 ([SE-0413](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)) a function can declare the one error type it throws. Callers then get `error` with that concrete type, and a `do`/`catch` can be exhaustive without a catch-all.

```swift
func fetchTyped(isOnline: Bool) throws(NetworkError) -> String {
    guard isOnline else { throw .noInternetConnection }
    return "payload"
}

do {
    _ = try fetchTyped(isOnline: false)
} catch {
    // error is NetworkError here, not any Error
    switch error {
    case .serverError(let code): print("Server error \(code)")
    case .noInternetConnection: print("Offline")
    case .authenticationFailed(let reason): print("Auth: \(reason)")
    }
}
```

The proposal itself recommends untyped `throws` for most code, since a fixed error type is hard to change later in a public API. Typed throws are most useful inside a module, in generic code that should pass a closure's error type through unchanged, and in embedded Swift where `any Error` boxing isn't available.

## rethrows

A function that takes a throwing closure can be marked `rethrows`. It only throws if the closure does, so callers passing a non-throwing closure don't need `try`. That's how `map` and `filter` work.

```swift
func retry<T>(times: Int, _ operation: () throws -> T) rethrows -> T {
    for _ in 1..<max(times, 1) {
        if let value = try? operation() { return value }
    }
    return try operation()
}

let n = retry(times: 3) { 42 }                 // no try needed
let s = try? retry(times: 3) { try loadDashboard() }
```

## Cleanup with defer

`defer` runs a block when the current scope exits, whether by returning or by throwing. It's the place to close files or release locks.

```swift
import Foundation

func process(path: String) throws {
    let handle = FileHandle(forReadingAtPath: path)
    defer { try? handle?.close() }
    // ... work that might throw ...
}
```

## Errors versus Result and async

- `Result<Success, Failure>` stores either a value or an error. It's useful when you need to keep an outcome around, such as in a callback-based API. `Result { try loadDashboard() }` converts a throwing call into a `Result`, and `.get()` converts it back.
- `async throws` functions combine with `try await`. Errors behave the same way across suspension points. If an error escapes the body of `withThrowingTaskGroup`, the group's remaining child tasks are cancelled.

## Further reading

- [The Swift Programming Language: Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/)
- [SE-0413 Typed throws](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0413-typed-throws.md)
