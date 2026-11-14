---
description: How to debug Swift code in Xcode with breakpoints, LLDB's p, po and v commands, print and Logger output, and the Address and Thread Sanitizers.
imgSrc: /imgs/2023/45c8f451-5ee8-4f76-8769-691be0cfc6c2.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-23T01:41:19.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Debugging Swift in Xcode: breakpoints, LLDB, logging and sanitizers"
---

Most Swift debugging happens in Xcode with four tools: breakpoints to stop the program, LLDB to inspect it while it's stopped, logging for things you can't stop on, and sanitizers for memory and threading bugs that don't show up until runtime.

## Breakpoints

Click a line number in the editor gutter to add a breakpoint. Run the app, and execution pauses on that line. From the debug bar you can then Step Over (F6), Step Into (F7), Step Out (F8) or Continue (Ctrl-Cmd-Y).

Plain breakpoints are only the start. Right-click a breakpoint and choose **Edit Breakpoint** to get more out of it:

- **Condition**: only stop when an expression is true, for example `index == 42`. Useful inside loops.
- **Ignore**: skip the first N hits.
- **Action**: run an LLDB command, log a message, or play a sound when the breakpoint hits. Combine a log action with **Automatically continue after evaluating actions** and you get a print statement that doesn't require recompiling.

In the Breakpoint navigator (Cmd-8), the **+** button at the bottom adds symbolic breakpoints and a **Swift Error Breakpoint**, which stops wherever a Swift error is thrown. That's often faster than working backwards from a `catch` block.

## LLDB

When execution is paused, the console in the Debug area is an LLDB prompt. The commands you'll use most:

| Command | What it does |
| --- | --- |
| `v count` | Read a variable directly from memory (`v` is short for `frame variable`). Doesn't run code, so it works even when expression evaluation fails. |
| `p count` | Print a variable or evaluate an expression. |
| `po person` | Print an object's description (`CustomDebugStringConvertible` / `description`). |
| `expr count = 0` | Evaluate an expression, including ones with side effects such as changing a value. |
| `bt` | Show the call stack of the current thread. |
| `frame variable` | Show all local variables in the current frame. |

Since Xcode 15, `p` and `po` are aliases for LLDB's `dwim-print` command. For a plain variable, `p` reads it the same way `v` does, and only falls back to compiling an expression when it has to. If `p` or `po` fails with an expression-evaluation error, try `v`.

```text
(lldb) v count
(Int) count = 42
(lldb) expr count = 0
(lldb) continue
```

## Print statements and logging

`print` is still the quickest way to see what's happening:

```swift
let count = 42
print("The value of count is \(count)")
```

Two related functions are worth knowing. `debugPrint(_:)` prints the debug description (strings appear quoted, for example). `dump(_:)` prints a value's full structure, including nested properties, which is handy for structs and arrays.

For anything you want to keep in the codebase, use `Logger` from the `os` framework instead of `print`. Log messages have levels, show up in Xcode's console with filtering, and can be read from a device in Console.app:

```swift
import os

let logger = Logger(subsystem: "com.example.MyApp", category: "network")

func handle(items: [String]) {
    logger.debug("Fetched \(items.count) items")
}
```

Interpolated strings in `Logger` messages are treated as private by default and are redacted in logs collected outside the debugger. Mark values with `privacy: .public` only when they contain nothing sensitive.

## Address Sanitizer (ASan)

Swift is memory-safe by default, so ASan matters mostly when you use unsafe pointers or call into C and Objective-C. It detects use-after-free, heap and stack buffer overflows, and similar errors at runtime, and stops with a report showing where the bad access happened and where the memory was allocated.

To turn it on, open **Product > Scheme > Edit Scheme**, select **Run**, open the **Diagnostics** tab and check **Address Sanitizer**. Rebuild and run.

This writes one element past the end of a buffer, which ASan reports as a heap-buffer-overflow:

```swift
let buffer = UnsafeMutablePointer<Int>.allocate(capacity: 4)
buffer.initialize(repeating: 0, count: 4)
buffer[4] = 1 // out of bounds: valid indices are 0...3
buffer.deallocate()
```

## Thread Sanitizer (TSan)

TSan detects data races: two threads accessing the same memory without synchronization, where at least one access is a write. Enable it in the same **Diagnostics** tab by checking **Thread Sanitizer**. You can't enable ASan and TSan at the same time, and TSan runs on macOS and simulators, not on physical iOS devices.

This compiles in Swift 5 language mode and races on `counter`:

```swift
import Foundation

var counter = 0
DispatchQueue.concurrentPerform(iterations: 1000) { _ in
    counter += 1
}
print(counter) // often less than 1000
```

TSan pauses at the racing access and shows the stacks of both threads. Fix it by protecting the shared state (a lock, a serial queue, or an actor). In Swift 6 language mode, strict concurrency checking catches many races like this at compile time, but TSan still helps with code that opts out of checking or crosses into C and Objective-C.

## Gotchas

- Sanitizers slow the app down considerably and increase memory use. Turn them on for a debugging session or a CI test run, not for everyday builds.
- Optimized (Release) builds make LLDB less useful: variables may show as unavailable and stepping jumps around. Debug with the Debug configuration when you can.
- `po` relies on running code in your process. If the process is in a bad state, `v` is more reliable.

## Further reading

- [Xcode: Diagnosing memory, thread, and crash issues early](https://developer.apple.com/documentation/xcode/diagnosing-memory-thread-and-crash-issues-early)
- [Debugging improvements in Swift 5.9](https://www.swift.org/blog/whats-new-swift-debugging-5.9/)
- [LLDB tutorial](https://lldb.llvm.org/use/tutorial.html)
