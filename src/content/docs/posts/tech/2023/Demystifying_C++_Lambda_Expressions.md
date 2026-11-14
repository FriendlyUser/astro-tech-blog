---
description: How C++ lambdas work, covering syntax, value and reference captures, init captures, mutable and generic lambdas, explicit return types, and use with STL algorithms.
imgSrc: /imgs/2023/3216063167.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-29T23:14:52.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ lambda expressions: syntax, captures, and generic lambdas"
---

A lambda expression defines an unnamed function object inline, right where you need it. The compiler turns each lambda into a class with an `operator()`, and captured variables become its data members. Lambdas arrived in C++11 and got more capable in C++14, 17 and 20. Their most common job is passing a short predicate or callback to an STL algorithm without writing a separate functor class.

## Syntax

```cpp
[captures](parameters) -> return_type { body }
```

- **captures**: which variables from the enclosing scope the lambda can use, and how (by copy or by reference).
- **parameters**: like a normal function's parameter list. If there are no parameters you can omit the `()` entirely, as in `[] { return 42; }`.
- **return_type**: optional. Without it, the compiler deduces the type from the `return` statements.
- **body**: the code to run.

```cpp
auto sum = [](int a, int b) { return a + b; };
int result = sum(3, 4); // 7
```

`auto` is needed because every lambda has its own unique, unnamed type.

## Capturing variables

A capture by value copies the variable into the lambda when the lambda is created. A capture by reference stores a reference to the original:

```cpp
int x = 10;
auto add_x_by_value = [x](int a) { return a + x; };
auto add_x_by_reference = [&x](int a) { return a + x; };

x = 20;
int result1 = add_x_by_value(5);     // 15: uses the copy made when x was 10
int result2 = add_x_by_reference(5); // 25: sees the current x
```

You can also capture everything the body uses with a default: `[=]` copies, `[&]` references. Mixing is allowed, for example `[=, &total]` copies everything except `total`. Explicit capture lists are easier to review, because you can see exactly what the lambda depends on.

Inside a member function, `[this]` captures the object pointer and `[*this]` (C++17) copies the whole object. C++20 deprecates the implicit capture of `this` through `[=]`, so write `[=, this]` when you mean it.

### Init captures

Since C++14 you can create a new variable in the capture list. This is the way to move a value into a lambda:

```cpp
#include <memory>
#include <utility>

auto ptr = std::make_unique<int>(42);
auto read = [p = std::move(ptr)] { return *p; };
int value = read(); // 42; ptr is now empty
```

## Mutable lambdas

A lambda's `operator()` is `const` by default, so it can't modify its by-value captures. `mutable` removes that restriction. The copy belongs to the lambda object and keeps its value between calls, while the original variable is untouched:

```cpp
int x = 10;
auto add_and_increment_x = [x](int a) mutable { x++; return a + x; };

int r1 = add_and_increment_x(5); // 16: the lambda's copy of x is now 11
int r2 = add_and_increment_x(5); // 17: the copy is now 12
// x is still 10
```

## Specifying a return type

Return type deduction works with several `return` statements as long as they all produce the same type. You need `->` when they don't:

```cpp
auto safe_divide = [](int a, int b) -> double {
    if (b == 0) {
        return 0;          // int, converted to double
    }
    return static_cast<double>(a) / b;
};
```

Without `-> double`, this fails to compile because the first `return` deduces `int` and the second `double`.

## Generic lambdas

C++14 lets you use `auto` for parameter types. The lambda's `operator()` becomes a template:

```cpp
auto generic_sum = [](auto a, auto b) { return a + b; };

int int_result = generic_sum(3, 4);           // 7
double double_result = generic_sum(1.5, 2.25); // 3.75
```

C++20 adds an explicit template parameter list, which helps when you need to name the type:

```cpp
#include <vector>

auto first_or_default = []<typename T>(const std::vector<T>& v) {
    return v.empty() ? T{} : v.front();
};
```

## Examples

### With STL algorithms

```cpp
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};

    // Sort in descending order
    std::sort(numbers.begin(), numbers.end(), [](int a, int b) { return a > b; });

    // Count values above a threshold captured from the enclosing scope
    int threshold = 4;
    auto above = std::count_if(numbers.begin(), numbers.end(),
                               [threshold](int n) { return n > threshold; });

    std::cout << above << "\n"; // 5
}
```

### As a callback

`std::function` can hold any callable with a matching signature, including a lambda:

```cpp
#include <functional>
#include <iostream>
#include <vector>

void process_data(const std::vector<int>& data, const std::function<void(int)>& callback) {
    for (int value : data) {
        callback(value);
    }
}

int main() {
    std::vector<int> data = {1, 2, 3, 4, 5};

    // Print each value squared
    process_data(data, [](int value) { std::cout << value * value << " "; });
    std::cout << "\n";
}
```

`std::function` erases the lambda's type, which may cost a heap allocation and an indirect call. If the callback is only used inside the function, a template parameter (`template <typename F> void process_data(const std::vector<int>&, F&& callback)`) avoids that overhead.

## Gotchas

- **Dangling references.** A lambda that captures locals by reference must not outlive them. Returning `[&]` lambdas from functions, or storing them for a thread or a later callback, is a common source of use-after-free bugs. Capture by value (or move with an init capture) when the lambda escapes its scope.
- **By-value captures are snapshots.** They take the value at the point the lambda is created, not when it's called, as the `add_x_by_value` example shows.
- **Captureless lambdas convert to function pointers.** `[](int a) { return a * 2; }` can be passed to a C API expecting `int (*)(int)`. A lambda with captures can't.

## Further reading

- [Lambda expressions on cppreference](https://en.cppreference.com/w/cpp/language/lambda)
