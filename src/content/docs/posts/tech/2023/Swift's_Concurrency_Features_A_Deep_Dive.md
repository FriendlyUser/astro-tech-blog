---
description: Swift concurrency with working examples of async/await, actors, task groups, and cancellation, including a timeout helper and common gotchas.
imgSrc: /imgs/2023/2851628136.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-11-05T03:10:42.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Swift concurrency basics: async/await, actors, task groups and cancellation"
---

Swift's built-in concurrency model, introduced in Swift 5.5, replaces most completion handlers and manual locking with three pieces: `async`/`await` for writing asynchronous code in a straight line, actors for protecting shared mutable state, and tasks for running work concurrently with clear lifetimes. The examples below use `Task.sleep(for:)`, which needs Swift 5.7 and, on Apple platforms, iOS 16 or macOS 13.

## async/await

Mark a function `async` if it can suspend, and `throws` if it can fail. Callers use `await` (and `try`) at each call site, so every possible suspension point is visible in the code.

```swift
import Foundation

struct ProcessedData {
    let byteCount: Int
}

func fetchData(from url: URL) async throws -> Data {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data
}

func processData(from url: URL) async throws -> ProcessedData {
    let data = try await fetchData(from: url)
    return ProcessedData(byteCount: data.count)
}
```

`await` suspends the current task, not the thread. While `fetchData` waits on the network, the thread is free to run other tasks.

You can only call `async` functions from an async context. From synchronous code, such as a button action, start a `Task`:

```swift
func refreshButtonTapped(url: URL) {
    Task {
        do {
            let processed = try await processData(from: url)
            print("Downloaded \(processed.byteCount) bytes")
        } catch {
            print("Failed: \(error)")
        }
    }
}
```

In a command-line tool you can use `await` directly in top-level code (`main.swift`) or in an `@main` type's `static func main() async`. An unstructured `Task` started from a synchronous `main` won't keep the process alive, so the program can exit before it finishes.

## Actors

An actor is a reference type like a class, but it only runs one piece of code against its state at a time. Code outside the actor has to `await` when calling its methods or reading its properties, even synchronous ones, because the call may have to wait its turn.

```swift
actor Counter {
    private(set) var count = 0

    func increment() {
        count += 1
    }
}

func runCounter() async {
    let counter = Counter()

    await withTaskGroup(of: Void.self) { group in
        for _ in 0..<2 {
            group.addTask {
                for _ in 0..<1_000 {
                    await counter.increment()
                }
            }
        }
    }

    print(await counter.count) // always 2000
}
```

With a plain class and two concurrent tasks, `count += 1` would be a data race and the result would vary between runs. The actor serializes the increments, and `runCounter` waits for both child tasks before reading the total.

UI code uses a special global actor, `@MainActor`, which runs on the main thread. Annotate view models or functions that touch the UI with it.

## Task groups

A task group runs a dynamic number of child tasks concurrently and waits for all of them before returning. Use `withThrowingTaskGroup` when children can throw:

```swift
func fetchAll(_ urls: [URL]) async throws -> [URL: Data] {
    try await withThrowingTaskGroup(of: (URL, Data).self) { group in
        for url in urls {
            group.addTask {
                (url, try await fetchData(from: url))
            }
        }

        var results: [URL: Data] = [:]
        for try await (url, data) in group {
            results[url] = data
        }
        return results
    }
}
```

Results arrive in completion order, not the order you added the tasks, which is why this returns a dictionary keyed by URL. If any child throws, the error leaves the `for try await` loop, the remaining children are cancelled, and the group waits for them to finish before rethrowing. That is what "structured" means here: no child task outlives the group.

For a fixed number of concurrent calls, `async let` is shorter:

```swift
async let first = fetchData(from: url1)
async let second = fetchData(from: url2)
let (a, b) = try await (first, second)
```

## Cancellation and timeouts

Cancellation in Swift is cooperative. Calling `cancel()` on a task only sets a flag; the task stops when it next checks for cancellation. Many built-in APIs check for you: `Task.sleep` throws `CancellationError`, and `URLSession` cancels the request and throws a `URLError` with code `.cancelled`. In your own loops, call `try Task.checkCancellation()` or check `Task.isCancelled`.

There is no built-in timeout for a task, but you can build one from a task group: race the operation against a sleep, take whichever finishes first, and cancel the other.

```swift
struct TimeoutError: Error {}

func withTimeout<T: Sendable>(
    seconds: Double,
    operation: @escaping @Sendable () async throws -> T
) async throws -> T {
    try await withThrowingTaskGroup(of: T.self) { group in
        group.addTask { try await operation() }
        group.addTask {
            try await Task.sleep(for: .seconds(seconds))
            throw TimeoutError()
        }

        let result = try await group.next()!
        group.cancelAll()
        return result
    }
}

// Usage
let data = try await withTimeout(seconds: 5) {
    try await fetchData(from: url)
}
```

If the sleep finishes first, `group.next()` throws `TimeoutError` and the group cancels the fetch. If the fetch finishes first, `cancelAll()` stops the sleep. The timeout only works if the operation responds to cancellation; a tight loop that never checks will keep running.

## Gotchas

- **Actor reentrancy.** When an actor method hits an `await`, other calls can run on the actor before it resumes. Don't assume state is unchanged after a suspension point; re-check it.
- **`Sendable` checking.** Values passed between tasks or into actors must be `Sendable`. In the Swift 6 language mode these checks are errors rather than warnings, so expect to fix them when migrating.
- **`Task { }` inherits context.** A `Task` started from `@MainActor` code also runs on the main actor. Use `Task.detached` only when you specifically need to drop that inheritance.

## Further reading

- [The Swift Programming Language: Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
- [Swift 6 migration guide](https://www.swift.org/migration/documentation/migrationguide/)
- [Apple: Task](https://developer.apple.com/documentation/swift/task)
