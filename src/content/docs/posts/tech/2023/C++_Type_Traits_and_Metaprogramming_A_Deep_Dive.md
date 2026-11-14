---
description: "Use the <type_traits> header to inspect, compare and transform types at compile time, branch with if constexpr, and write your own trait with partial specialization."
imgSrc: /imgs/2023/2861854918.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-17T21:19:07.000Z'
lastUpdated: 2026-11-14
tags: ["C++", "cpp"]
title: "C++ type traits: querying and transforming types at compile time"
---

Type traits are class templates in `<type_traits>` that answer questions about types at compile time ("is `T` an integer?", "are `T` and `U` the same?") or produce a new type from an old one ("`T` without `const`"). They are the basic tool of C++ template metaprogramming: code that the compiler evaluates while building your program, so generic code can pick a different implementation per type with no runtime cost.

## How a trait looks

A query trait such as `std::is_integral<T>` is a class with a `static constexpr bool value`. Since C++17 each one also has a `_v` variable template, so these two lines mean the same thing:

```cpp
std::is_integral<int>::value
std::is_integral_v<int>
```

A transformation trait such as `std::remove_const<T>` has a nested `type`, with a `_t` alias since C++14: `std::remove_const_t<const int>` is `int`.

## The three kinds of trait

**Type properties** describe a single type:

- `std::is_integral<T>`, `std::is_floating_point<T>`, `std::is_arithmetic<T>`
- `std::is_pointer<T>`
- `std::is_const<T>`: note that `std::is_const_v<const int&>` is `false`, because the reference itself isn't const. Use `std::remove_reference_t` first if that's what you mean.

**Type relationships** compare two types:

- `std::is_same<T, U>`: exactly the same type, including cv-qualifiers
- `std::is_base_of<Base, Derived>`
- `std::is_convertible<From, To>`: whether `From` can be implicitly converted to `To`

**Type transformations** produce a new type:

- `std::remove_const<T>`, `std::add_pointer<T>`
- `std::decay<T>`: what happens to a type passed by value. It removes references and cv-qualifiers and turns arrays and functions into pointers.
- `std::common_type<T, U>`: the type both can convert to, e.g. `double` for `int` and `double`
- `std::invoke_result<F, Args...>`: the result of calling `F` with `Args` (this replaced `std::result_of`, which was removed in C++20)

## Branching on a type with `if constexpr`

`if constexpr` (C++17) discards the branches whose condition is false, so code that wouldn't compile for a given `T` is never instantiated:

```cpp
#include <iostream>
#include <string>
#include <type_traits>

template <typename T>
std::string describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        return "integer " + std::to_string(value);
    } else if constexpr (std::is_floating_point_v<T>) {
        return "floating point " + std::to_string(value);
    } else if constexpr (std::is_pointer_v<T>) {
        return "pointer";
    } else {
        return "something else";
    }
}

int main() {
    int x = 42;
    std::cout << describe(x) << '\n';               // integer 42
    std::cout << describe(3.5) << '\n';             // floating point 3.500000
    std::cout << describe(&x) << '\n';              // pointer
    std::cout << describe(std::string{"hi"}) << '\n'; // something else
}
```

With a plain `if`, the `std::to_string(value)` call would have to compile for `std::string` too, and it doesn't.

## Rejecting types with `static_assert`

This `min_of` accepts two arithmetic values of possibly different types and returns their common type:

```cpp
#include <iostream>
#include <type_traits>

template <typename T, typename U>
auto min_of(const T& a, const U& b) {
    static_assert(std::is_arithmetic_v<T> && std::is_arithmetic_v<U>,
                  "min_of requires arithmetic arguments");
    using R = std::common_type_t<T, U>;
    return a < b ? static_cast<R>(a) : static_cast<R>(b);
}

int main() {
    int a = 5;
    double b = 3.2;
    std::cout << "Minimum of " << a << " and " << b << " is " << min_of(a, b) << '\n';
}
```

`min_of(5, 3.2)` returns the `double` `3.2`. Passing a `std::string` fails at compile time with the message from the `static_assert`.

One trap: mixing signed and unsigned integers. `min_of(-1, 1u)` converts `-1` to a large `unsigned int` before comparing, so it returns `1`. C++20's `std::cmp_less` in `<utility>` compares integers of different signedness correctly.

In C++20 you can also express the requirement as a constraint, `template <typename T, typename U> requires std::is_arithmetic_v<T> && std::is_arithmetic_v<U>`, which removes the function from overload resolution instead of failing inside it.

## Writing your own trait

Standard traits are ordinary templates, and you write your own the same way: a primary template for the general case and a partial specialization for the case you want to detect.

```cpp
#include <type_traits>
#include <vector>

template <typename T>
struct is_std_vector : std::false_type {};

template <typename T, typename Alloc>
struct is_std_vector<std::vector<T, Alloc>> : std::true_type {};

template <typename T>
inline constexpr bool is_std_vector_v = is_std_vector<T>::value;

static_assert(is_std_vector_v<std::vector<int>>);
static_assert(!is_std_vector_v<int>);
```

Inheriting from `std::true_type` or `std::false_type` provides `value`, so the new trait behaves like the standard ones.

## Further reading

- [`<type_traits>` on cppreference](https://en.cppreference.com/w/cpp/header/type_traits)
- [`if constexpr`](https://en.cppreference.com/w/cpp/language/if#Constexpr_if)
- [Constraints and concepts](https://en.cppreference.com/w/cpp/language/constraints)
