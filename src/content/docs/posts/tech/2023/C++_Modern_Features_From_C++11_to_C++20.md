---
description: The C++11, C++14, C++17 and C++20 features you'll use most, from auto, lambdas and move semantics to concepts, ranges and coroutines, each with a compilable example.
imgSrc: /imgs/2023/986397498.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-18T05:09:30.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: Modern C++ features from C++11 to C++20, with examples
---

C++11 changed the language more than any revision before it, and C++14, C++17 and C++20 built on it. This post covers the features from each standard that show up most in everyday code. Every example is a complete program; compile with `-std=c++20` (or `/std:c++20` on MSVC) and a recent compiler. Later standards (C++23 and C++26) aren't covered here.

## C++11

### `auto`, range-based `for` and lambdas

`auto` deduces a variable's type from its initializer. Range-based `for` iterates over any container or array. Lambdas define an unnamed function object inline.

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    auto i = 42;      // int
    auto d = 3.14;    // double
    auto s = "hello"; // const char*

    std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6};
    std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });

    for (const auto& elem : v) {
        std::cout << elem << ' '; // 9 6 5 4 3 2 1 1
    }
    std::cout << '\n';
}
```

### Move semantics

Rvalue references (`T&&`) let a type steal another object's resources instead of copying them. Standard containers use this when they grow, and you can request it explicitly with `std::move`:

```cpp
#include <string>
#include <utility>
#include <vector>

int main() {
    std::string big(1000000, 'x');
    std::vector<std::string> names;
    names.push_back(std::move(big)); // no 1 MB copy; big is left valid but unspecified
}
```

### Smart pointers

C++11 added `std::unique_ptr`, `std::shared_ptr` and `std::weak_ptr`, which delete their object automatically. `std::make_shared` is C++11; `std::make_unique` only arrived in C++14.

```cpp
#include <memory>

int main() {
    std::shared_ptr<int> p1 = std::make_shared<int>(42);
    std::unique_ptr<int> p2 = std::make_unique<int>(42); // C++14
}
```

### Variadic templates

Templates can take any number of arguments:

```cpp
#include <iostream>

template <typename T>
T sum(T t) {
    return t;
}

template <typename T, typename... Args>
T sum(T t, Args... args) {
    return t + sum(args...);
}

int main() {
    std::cout << sum(1, 2, 3, 4, 5) << '\n'; // 15
}
```

The result type is the type of the first argument. In C++17, a fold expression replaces the recursion: `template <typename... Args> auto sum(Args... args) { return (args + ...); }`.

## C++14

C++14 was a smaller release that filled gaps in C++11.

```cpp
#include <iostream>

auto multiply(int a, int b) { // return type deduced as int
    return a * b;
}

int main() {
    int flags = 0b101010; // binary literal: 42

    auto add = [](auto a, auto b) { return a + b; }; // generic lambda
    std::cout << add(1, 2) << ' ' << add(3.14, 2.73) << '\n'; // 3 5.87

    std::cout << multiply(6, 7) << ' ' << flags << '\n'; // 42 42
}
```

## C++17

### Structured bindings and `if` with initializer

Structured bindings unpack pairs, tuples and simple structs into named variables. `if` and `switch` can declare a variable scoped to the statement.

```cpp
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int> ages = {{"Alice", 25}, {"Bob", 30}};

    for (const auto& [name, age] : ages) {
        std::cout << name << ": " << age << '\n';
    }

    if (auto it = ages.find("Alice"); it != ages.end()) {
        std::cout << "Found: " << it->second << '\n';
    } else {
        std::cout << "Not found.\n";
    }
}
```

### Inline variables

An `inline` variable can be defined in a header and included in many translation units; the linker keeps one copy. Before C++17 you needed an `extern` declaration in the header and a definition in one `.cpp` file.

```cpp
// config.h
#pragma once
inline int global_counter = 0;
```

### `std::optional`

`std::optional<T>` holds either a `T` or nothing, replacing sentinel values like `-1` or a null pointer.

```cpp
#include <iostream>
#include <optional>

std::optional<int> find_even(int start, int end) {
    for (int i = start; i <= end; ++i) {
        if (i % 2 == 0) {
            return i;
        }
    }
    return std::nullopt;
}

int main() {
    if (auto result = find_even(1, 10)) {
        std::cout << "Found: " << *result << '\n'; // Found: 2
    } else {
        std::cout << "Not found.\n";
    }
}
```

C++17 also added `std::variant`, `std::string_view` and `std::filesystem`.

## C++20

### Concepts

Concepts name the requirements a template argument must meet. A call with the wrong type fails with a short error naming the unmet concept instead of pages of template instantiation errors.

```cpp
#include <concepts>
#include <iostream>

template <typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template <Addable T>
T add(T a, T b) {
    return a + b;
}

int main() {
    std::cout << add(2, 3) << '\n'; // 5
    // add(nullptr, nullptr);       // error: constraints not satisfied
}
```

### Ranges

Range adaptors compose lazily with `|`; nothing is computed until you iterate.

```cpp
#include <iostream>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> v = {1, 2, 3, 4, 5};

    auto even = [](int x) { return x % 2 == 0; };
    auto square = [](int x) { return x * x; };

    for (int x : v | std::views::filter(even) | std::views::transform(square)) {
        std::cout << x << ' '; // 4 16
    }
    std::cout << '\n';
}
```

### Coroutines

A coroutine is a function that can suspend (`co_await`, `co_yield`) and resume later. C++20 provides only the language mechanism and low-level types in `<coroutine>`. There is no ready-made task or generator type, and `std::future` can't be used as a coroutine return type. You either write a small return type yourself, use a library (cppcoro, Boost.Asio, folly), or use C++23's `std::generator`. A minimal generator looks like this:

```cpp
#include <coroutine>
#include <exception>
#include <iostream>
#include <utility>

struct IntGenerator {
    struct promise_type {
        int current = 0;

        IntGenerator get_return_object() {
            return IntGenerator{std::coroutine_handle<promise_type>::from_promise(*this)};
        }
        std::suspend_always initial_suspend() noexcept { return {}; }
        std::suspend_always final_suspend() noexcept { return {}; }
        std::suspend_always yield_value(int value) noexcept {
            current = value;
            return {};
        }
        void return_void() noexcept {}
        void unhandled_exception() { std::terminate(); }
    };

    explicit IntGenerator(std::coroutine_handle<promise_type> h) : handle(h) {}
    IntGenerator(IntGenerator&& other) noexcept : handle(std::exchange(other.handle, {})) {}
    ~IntGenerator() {
        if (handle) handle.destroy();
    }

    bool next() {
        handle.resume();
        return !handle.done();
    }
    int value() const { return handle.promise().current; }

    std::coroutine_handle<promise_type> handle;
};

IntGenerator count_to(int n) {
    for (int i = 1; i <= n; ++i) {
        co_yield i;
    }
}

int main() {
    auto gen = count_to(3);
    while (gen.next()) {
        std::cout << gen.value() << '\n'; // 1, 2, 3
    }
}
```

### `constexpr` with allocation, and `consteval`

`constexpr` functions have been around since C++11, but C++20 allows much more inside them, including virtual calls, `try` blocks and `new`/`delete` as long as the memory is freed before the evaluation ends. That makes `std::vector` and `std::string` usable at compile time. `consteval` forces a function to run at compile time.

```cpp
#include <numeric>
#include <vector>

constexpr int sum_first(int n) {
    std::vector<int> v(n);
    std::iota(v.begin(), v.end(), 1);
    return std::accumulate(v.begin(), v.end(), 0);
}

static_assert(sum_first(10) == 55); // evaluated by the compiler

int main() {}
```

Compile-time `std::vector` needs GCC 12, Clang 15 with libc++, or MSVC 2019 16.10 or later.

### `std::format`

`std::format` gives Python-style, type-safe formatting:

```cpp
#include <format>
#include <iostream>
#include <string>

int main() {
    std::string message = std::format("Hello, {}! Your age is {}.", "Alice", 30);
    std::cout << message << '\n';
}
```

Library support arrived later than the language features: GCC's libstdc++ only shipped `<format>` in GCC 13. On older toolchains, the [{fmt}](https://fmt.dev/) library provides the same API. C++23 adds `std::print`, which formats and prints in one call.

## Further reading

- [cppreference: compiler support tables](https://en.cppreference.com/w/cpp/compiler_support) show which compiler versions implement each feature.
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) for advice on using these features well.
