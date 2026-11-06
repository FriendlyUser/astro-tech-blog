---
description: This article provides an overview of the modern features introduced in
  C++11, C++14, C++17, and C++20.
imgSrc: /imgs/2023/986397498.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-18T05:09:30.000Z'
tags: []
title: C++ Modern Features From C++11 to C++20
---

# C++ Modern Features: From C++11 to C++20

C++ is a widely-used, high-performance programming language known for its flexibility and support for object-oriented, procedural, and generic programming paradigms. Since its creation in the early 1980s, C++ has undergone significant evolution with the release of new language standards, introducing new features and improving existing ones. This article provides an overview of the modern features introduced in C++11, C++14, C++17, and C++20.

## C++11

The C++11 standard introduced a plethora of new features aimed at improving code readability, performance, and developer productivity. Some of the most notable features include:

### 1. Auto Type Deduction

The `auto` keyword allows the compiler to deduce the type of a variable at compile-time based on its initializer. This feature significantly reduces the verbosity of code and makes it more readable.

```cpp
auto i = 42; // int
auto d = 3.14; // double
auto s = "hello"; // const char*
```

### 2. Range-based for Loop

C++11 introduced a new range-based `for` loop, simplifying iteration over containers and arrays.

```cpp
std::vector<int> v = {1, 2, 3, 4, 5};

for (auto const &elem : v) {
    std::cout << elem << std::endl;
}
```

### 3. Lambda Expressions

Lambda expressions enable the creation of anonymous functions, allowing developers to write more expressive and concise code.

```cpp
std::vector<int> v = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};
std::sort(v.begin(), v.end(), [](int a, int b) { return a > b; });
```

### 4. Smart Pointers

C++11 added the `shared_ptr`, `unique_ptr`, and `weak_ptr` smart pointers, which simplify memory management and help prevent memory leaks and dangling pointers.

```cpp
std::shared_ptr<int> p1 = std::make_shared<int>(42);
std::unique_ptr<int> p2 = std::make_unique<int>(42);
```

### 5. Variadic Templates

Variadic templates enable the creation of functions and classes that accept a varying number of template arguments.

```cpp
template<typename T>
T sum(T t) {
    return t;
}

template<typename T, typename... Args>
T sum(T t, Args... args) {
    return t + sum(args...);
}

int total = sum(1, 2, 3, 4, 5); // 15
```

## C++14

C++14 was a minor release that focused on refining and improving features introduced in C++11. Some of the key features include:

### 1. Binary Literals

C++14 introduced support for binary literals, allowing developers to define integer constants in binary notation.

```cpp
int x = 0b101010; // 42 in binary
```

### 2. Generic Lambdas

C++14 extended lambda expressions to support auto type deduction for parameters, enabling more generic code.

```cpp
auto add = [](auto a, auto b) { return a + b; };
int sum = add(1, 2); // 3
double result = add(3.14, 2.73); // 5.87
```

### 3. Return Type Deduction

In C++14, the compiler is able to deduce the return type of a function based on the return statement.

```cpp
auto multiply(int a, int b) {
    return a * b;
} // return type is int
```

## C++17

C++17 introduced several new features and library additions, including:

### 1. Structured Bindings

Structured bindings simplify the process of decomposing objects into their constituent parts.

```cpp
std::map<std::string, int> m = {{"Alice", 25}, {"Bob", 30}};

for (const auto &[name, age] : m) {
    std::cout << name << ": " << age << std::endl;
}
```

### 2. If and Switch with Initializer

C++17 allows an optional initializer to be included in both `if` and `switch` statements.

```cpp
if (auto it = m.find("Alice"); it != m.end()) {
    std::cout << "Found: " << it->second << std::endl;
} else {
    std::cout << "Not found." << std::endl;
}
```

### 3. Inline Variables

C++17 allows the `inline` specifier to be used with variables, providing a mechanism to define a single instance of a variable across multiple translationunits.

```cpp
// header.h
#pragma once
inline int globalVar = 42;
```

### 4. std::optional

`std::optional` is a new utility that represents a value that may or may not be present. It can be used to indicate the absence of a value without resorting to special values or pointers.

```cpp
std::optional<int> find_even(int start, int end) {
    for (int i = start; i <= end; ++i) {
        if (i % 2 == 0) {
            return i;
        }
    }
    return std::nullopt;
}

auto result = find_even(1, 10);
if (result.has_value()) {
    std::cout << "Found: " << result.value() << std::endl;
} else {
    std::cout << "Not found." << std::endl;
}
```

## C++20

C++20 brought some of the most significant changes in recent years, introducing new features and concepts that greatly impact the way C++ is written and used. Some of the key additions include:

### 1. Concepts

Concepts are a way to specify constraints on template parameters, making it easier to write generic code that is more readable and produces better error messages.

```cpp
#include <concepts>

template <typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::same_as<T>;
};

template <Addable T>
T add(T a, T b) {
    return a + b;
}
```

### 2. Ranges

Ranges provide a new way of working with sequences of values, introducing a more composable and expressive API for dealing with iterators.

```cpp
#include <ranges>

std::vector<int> v = {1, 2, 3, 4, 5};

auto even = [](int x) { return x % 2 == 0; };
auto square = [](int x) { return x * x; };

auto result = v | std::views::filter(even) | std::views::transform(square);
```

### 3. Coroutines

Coroutines are a new way of writing asynchronous and concurrent code that is more efficient and easier to reason about than traditional callback-based approaches.

```cpp
#include <coroutine>
#include <future>

std::future<int> async_add(int a, int b) {
    co_return a + b;
}

int main() {
    auto result = async_add(1, 2).get();
    std::cout << "Result: " << result << std::endl;
}
```

### 4. constexpr Improvements

C++20 expands the usage of `constexpr`, allowing more functionality at compile-time, such as dynamic memory allocation and virtual functions.

```cpp
constexpr int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

constexpr int result = factorial(5); // 120
```

### 5. std::format

C++20 introduces `std::format`, a type-safe and extensible alternative to `printf` and `iostreams` for text formatting.

```cpp
#include <format>

std::string message = std::format("Hello, {}! Your age is {}.", "Alice", 30);
std::cout << message << std::endl;
```

In conclusion, modern C++ standards have significantly evolved the language, introducing new features that improve code readability, safety, and performance. By leveraging these modern features, developers can write more expressive, efficient, and maintainable C++ code.