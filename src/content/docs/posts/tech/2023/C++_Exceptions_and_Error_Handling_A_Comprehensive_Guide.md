---
description: 'How C++ exceptions work: the standard exception hierarchy, throwing and catching, custom exception types, RAII, noexcept, and when std::expected fits better.'
imgSrc: /imgs/2023/DALL·E 2022-12-25 21.48.12 - teddy bear on coach looking out the
  window at a tree.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-13T03:27:04.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: 'C++ exceptions: throwing, catching and writing exception-safe code'
---

An exception reports an error that the current function can't handle. `throw` stops normal execution, the runtime unwinds the stack (destroying local objects on the way), and control resumes in the nearest `catch` block whose type matches. If nothing matches, `std::terminate` is called and the program ends.

The advantage over return codes is that the error can't be silently ignored, and the code between the throw and the handler doesn't have to check and forward it.

## The standard exception types

You can throw a value of almost any type, including `int`, but don't: a handler for `int` says nothing about what went wrong. Throw a class derived from `std::exception`, which gives every error a `what()` message and lets callers catch everything with one handler.

The common standard types, from `<stdexcept>` and `<new>`:

- `std::logic_error`: a bug the caller could have avoided. Subclasses include `std::invalid_argument`, `std::out_of_range` (thrown by `std::vector::at`), `std::domain_error` and `std::length_error`.
- `std::runtime_error`: a failure that depends on the environment. Subclasses include `std::range_error`, `std::overflow_error` and `std::system_error` (from `<system_error>`, which carries an error code).
- `std::bad_alloc`: thrown by `new` when allocation fails. It derives directly from `std::exception`, not from `runtime_error`.

## Throwing and catching

```cpp
#include <iostream>
#include <stdexcept>

int divide(int a, int b) {
    if (b == 0) {
        throw std::invalid_argument("divide: division by zero");
    }
    return a / b;
}

int main() {
    try {
        std::cout << divide(10, 0) << '\n';
    } catch (const std::invalid_argument& e) {
        std::cerr << "Bad input: " << e.what() << '\n';
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << '\n';
    }
}
```

Handlers are tried in order, and the first one that matches wins. Put more specific types before their base classes; if `catch (const std::exception&)` came first, the `invalid_argument` handler would never run.

Integer division by zero is undefined behaviour in C++, not an exception. That's why `divide` checks `b` and throws before dividing. The same goes for null pointer dereferences and out-of-bounds `operator[]`: they don't throw, so `try` won't save you.

## Custom exception types

Derive from the closest standard type and add whatever data a handler needs:

```cpp
#include <iostream>
#include <stdexcept>
#include <string>

class ParseError : public std::runtime_error {
public:
    ParseError(const std::string& message, int line)
        : std::runtime_error(message + " (line " + std::to_string(line) + ")"),
          line_(line) {}

    int line() const noexcept { return line_; }

private:
    int line_;
};

void parse_config() {
    throw ParseError("expected '='", 12);
}

int main() {
    try {
        parse_config();
    } catch (const ParseError& e) {
        std::cerr << e.what() << '\n';   // expected '=' (line 12)
        std::cerr << "line " << e.line() << '\n';
    }
}
```

## Rethrowing

Inside a `catch` block, `throw;` rethrows the current exception unchanged, keeping its dynamic type. `throw e;` throws a copy of `e` as its static type, which slices a derived exception down to the base. Using `parse_config` from the previous example:

```cpp
try {
    parse_config();
} catch (const std::exception& e) {
    std::cerr << "logging: " << e.what() << '\n';
    throw;   // still a ParseError for the next handler
}
```

## RAII: cleanup without try/catch

During unwinding, destructors of fully constructed local objects run. That's how C++ cleans up on errors: hold every resource (memory, files, locks) in an object whose destructor releases it, and you don't need `try`/`catch` just to clean up.

```cpp
#include <fstream>
#include <memory>
#include <mutex>

std::mutex m;

void work() {
    std::lock_guard<std::mutex> lock(m);      // unlocked on any exit
    auto buffer = std::make_unique<char[]>(4096); // freed on any exit
    std::ofstream out("log.txt");               // closed on any exit
    // ... code that may throw ...
}
```

Code that uses raw `new`/`delete` or manual `lock()`/`unlock()` leaks or deadlocks as soon as something between the two throws.

## Guidelines

- **Throw by value, catch by `const` reference.** Catching by value copies the exception and slices derived types.
- **Throw from constructors when they can't establish the object's invariants.** It's the only way a constructor can report failure. The destructor of a partly built object doesn't run, but its already-constructed members and base classes are destroyed, so keep resources in RAII members and nothing leaks.
- **Don't let exceptions escape destructors.** Destructors are implicitly `noexcept` since C++11, so an exception leaving one calls `std::terminate`. Catch and handle errors inside the destructor, or offer an explicit `close()` that can throw.
- **Mark functions that can't throw `noexcept`**, especially move constructors and move assignment. `std::vector` only moves elements during reallocation if the move constructor is `noexcept`; otherwise it copies them (if the type is copyable) to keep the strong guarantee.
- **Know which guarantee your code gives.** *Basic*: after an exception, objects are still valid and nothing leaks. *Strong*: the operation either succeeds or has no effect (copy-and-swap gets you this). *No-throw*: it never throws.
- **Catch where you can do something about the error**, such as retrying, reporting to the user, or failing a request. Catching only to log and rethrow at every layer adds noise.

## When not to use exceptions

Exceptions are for errors that are rare and that the immediate caller usually can't handle. For outcomes that are expected and common, such as a parse failing on user input or a lookup with no result, a return type that carries the failure is clearer and cheaper:

- `std::optional<T>` (C++17) when "no value" needs no explanation.
- `std::expected<T, E>` (C++23, `<expected>`) when the caller needs to know why it failed.

Some codebases, especially in games and embedded work, build with exceptions disabled (`-fno-exceptions`); check before you rely on them in a library.

## Further reading

- [Exceptions on cppreference](https://en.cppreference.com/w/cpp/language/exceptions)
- [C++ Core Guidelines: Error handling](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-errors)
