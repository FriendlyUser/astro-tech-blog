---
title: "Calling C++ from Swift: native interop and Objective-C++ wrappers"
pubDate: "2024-03-16T02:33:51.000Z"
lastUpdated: 2026-11-14
description: "How to use C++ code from Swift: direct C++ interoperability since Swift 5.9 with SwiftPM or Xcode, and the older Objective-C++ wrapper approach."
tags:
  - swift
  - cpp
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3972119242.png
---

:::note
An earlier version of this post said Swift has no native C++ support. That stopped being true with Swift 5.9 (2023), which added direct C++ interoperability. The Objective-C++ wrapper approach below still works and is still the right choice in some cases.
:::

If you have an existing C++ library (a game engine, a codec, shared business logic) and a Swift app, you have two ways to connect them. Since Swift 5.9, Swift can import C++ headers directly and call C++ functions and types. Before that, the standard approach was to wrap the C++ code in an Objective-C++ class and call the wrapper from Swift.

## Option 1: direct C++ interoperability

### Enabling it

C++ interop is opt-in per target:

- **SwiftPM**: add `swiftSettings: [.interoperabilityMode(.Cxx)]` to every Swift target that imports C++ code.
- **Xcode**: set the build setting "C++ and Objective-C Interoperability" to "C++ / Objective-C++".
- **swiftc**: pass `-cxx-interoperability-mode=default`.

### A SwiftPM example

```text
CxxDemo/
├── Package.swift
└── Sources/
    ├── CounterLib/
    │   ├── include/
    │   │   └── Counter.h
    │   └── Counter.cpp
    └── App/
        └── main.swift
```

`Package.swift`:

```swift
// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CxxDemo",
    targets: [
        .target(name: "CounterLib"),
        .executableTarget(
            name: "App",
            dependencies: ["CounterLib"],
            swiftSettings: [.interoperabilityMode(.Cxx)]
        ),
    ]
)
```

```cpp
// Sources/CounterLib/include/Counter.h
#pragma once
#include <string>

class Counter {
public:
    explicit Counter(int start) : value(start) {}
    void increment() { ++value; }
    int get() const { return value; }

private:
    int value;
};

std::string greeting(const std::string &name);
```

```cpp
// Sources/CounterLib/Counter.cpp
#include "Counter.h"

std::string greeting(const std::string &name) {
    return "Hello, " + name;
}
```

SwiftPM generates a module map for the headers in `include/`, so Swift can import the target by name:

```swift
// Sources/App/main.swift
import CounterLib
import CxxStdlib

var counter = Counter(41)   // copyable C++ class -> Swift value type
counter.increment()         // non-const method -> mutating, so counter must be var
print(counter.get())        // 42

let message = greeting(std.string("Swift"))
print(String(message))      // Hello, Swift
```

Run it with `swift run App`.

A few things to notice:

- A copyable C++ class or struct is imported as a Swift value type. Non-const member functions become `mutating`.
- `std::string` is not converted to `String` automatically. `CxxStdlib` provides the explicit conversions `std.string(_:)` and `String(_:)`.
- `int` is imported as `Int32`, as with C.

Outside SwiftPM you write the module map yourself (a `module.modulemap` next to the headers listing them with `header "Counter.h"`) and pass its directory with `-I`.

### Calling Swift from C++

It works in the other direction too. The compiler generates a header named `<ModuleName>-Swift.h` that exposes public Swift functions and types to C++, which you `#include` from your C++ sources.

### Limitations

The interop is still being extended, so check the [status page](https://www.swift.org/documentation/cxx-interop/status/) for your toolchain. Some limits from the official guide:

- Virtual member functions of C++ value types can't be called from Swift.
- C++20 modules can't be imported.
- Member functions that return references, pointers or view types are imported as unsafe and renamed with a `__` prefix and `Unsafe` suffix. Annotations such as `SWIFT_RETURNS_INDEPENDENT_VALUE` tell Swift a particular function is safe.
- Iterators are unsafe to use directly; prefer the Swift collection conformances for standard containers.
- Types with a deleted copy constructor are imported as non-copyable (`~Copyable`).
- SwiftPM has extra constraints on mixing packages with and without C++ interop enabled; see the status page before publishing a package that uses it.

## Option 2: an Objective-C++ wrapper

Before Swift 5.9 this was the only option, and it's still useful on Apple platforms when you want a stable Objective-C API boundary, or when your C++ uses features the importer can't handle. The idea is that Swift imports Objective-C, and Objective-C++ (`.mm` files) can call C++.

The important rule: the wrapper's header must be plain Objective-C, with no C++ types or includes, because Swift reads it as Objective-C. The C++ goes only in the `.mm` file.

```objc
// CounterWrapper.h — plain Objective-C, imported by Swift
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface CounterWrapper : NSObject
- (instancetype)initWithStart:(int)start;
- (void)increment;
- (int)value;
@end

NS_ASSUME_NONNULL_END
```

```objc
// CounterWrapper.mm — Objective-C++, can include C++ headers
#import "CounterWrapper.h"
#include "Counter.h"
#include <memory>

@implementation CounterWrapper {
    std::unique_ptr<Counter> _counter;
}

- (instancetype)initWithStart:(int)start {
    self = [super init];
    if (self) {
        _counter = std::make_unique<Counter>(start);
    }
    return self;
}

- (void)increment {
    _counter->increment();
}

- (int)value {
    return _counter->get();
}

@end
```

The `unique_ptr` is there because `Counter` has no default constructor, and C++ instance variables in an Objective-C class are default-constructed. It also means the C++ object is destroyed when the wrapper is deallocated.

In an app target, import the wrapper in the bridging header (Xcode offers to create `<Target>-Bridging-Header.h` when you add the first Objective-C file). In a framework target, import it in the framework's umbrella header instead.

```objc
// MyApp-Bridging-Header.h
#import "CounterWrapper.h"
```

Then use it from Swift like any Objective-C class:

```swift
let wrapper = CounterWrapper(start: 41)
wrapper.increment()
print(wrapper.value()) // 42
```

The cost is boilerplate: every C++ function you want in Swift needs a hand-written Objective-C method, and values cross the boundary as Objective-C types (`NSString`, `NSArray`) or C primitives. The wrapper is also a reference-counted class, even when the C++ type is a small value.

## Which to pick

For new code on Swift 5.9 or later, try direct interop first: there's no glue layer to maintain, and C++ value types stay value types. Fall back to an Objective-C++ wrapper (or a plain C API) when the importer can't handle a header, or when you want the C++ hidden behind a small, stable API.

## Further reading

- [Mixing Swift and C++ (swift.org)](https://www.swift.org/documentation/cxx-interop/)
- [Setting up mixed-language Swift and C++ projects](https://www.swift.org/documentation/cxx-interop/project-build-setup/)
- [Importing Objective-C into Swift (Apple)](https://developer.apple.com/documentation/swift/importing-objective-c-into-swift)
