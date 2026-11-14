---
description: How C++ function objects work, why algorithms like std::sort can inline them, and how to use the standard functors and lambdas in their place.
imgSrc: /imgs/2023/248665811.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-03T21:43:43.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ function objects (functors): operator(), standard functors and lambdas"
---

A function object, or functor, is any object you can call like a function. In C++ that means a class or struct that defines `operator()`. You pass one wherever an algorithm or container expects "something callable", such as a comparator for `std::sort` or the key ordering for `std::map`.

## Defining a functor

```cpp
#include <iostream>

class AddValue {
public:
    explicit AddValue(int value) : value_(value) {}

    int operator()(int input) const {
        return input + value_;
    }

private:
    int value_;
};

int main() {
    AddValue add_five(5);
    std::cout << "10 + 5 = " << add_five(10) << '\n'; // 10 + 5 = 15
}
```

The constructor captures the value once; each call to `add_five(...)` uses it. Marking `operator()` as `const` matters: some standard library code calls function objects through a `const` reference.

## Why use a functor instead of a function pointer

- **State.** A functor carries data with it (`value_` above) without globals.
- **Inlining.** Each functor is its own type, so when you pass one to a template such as `std::sort`, the compiler knows exactly which `operator()` will run and can inline it. A function pointer is a runtime value, and the call is only inlined if the optimiser can prove which function it points to.

## Stateful functors with algorithms

`std::for_each` returns the function object it was given, so a functor can accumulate results as it runs:

```cpp
#include <algorithm>
#include <functional>
#include <iostream>
#include <numeric>
#include <vector>

struct CountAbove {
    int threshold;
    int count = 0;
    void operator()(int x) { if (x > threshold) ++count; }
};

int main() {
    std::vector<int> v{5, 2, 9, 1, 7};

    std::sort(v.begin(), v.end(), std::greater<>{});                            // 9 7 5 2 1
    int product = std::accumulate(v.begin(), v.end(), 1, std::multiplies<>{});  // 630
    CountAbove counter = std::for_each(v.begin(), v.end(), CountAbove{4});

    std::cout << product << ' ' << counter.count << '\n'; // 630 3
}
```

Other algorithms copy the function object freely, so don't rely on state surviving a call to `std::sort` or `std::transform`. If you need that, keep the state outside and hold a reference to it.

## Lambdas are functors

A lambda expression creates an unnamed class with an `operator()`, and the captures become its data members. `AddValue add_five(5)` and this lambda are equivalent:

```cpp
int value = 5;
auto add_five = [value](int input) { return input + value; };
```

For one-off callables, a lambda is usually shorter. A named functor class is still useful when the same callable is reused in several places, needs several overloads of `operator()`, or must be named as a type (for example `std::set<Key, MyCompare>`).

To store "any callable with this signature" (functor, lambda, or function pointer) in one variable, use `std::function<int(int)>`. It type-erases the callable, which usually means an indirect call and possibly a heap allocation, so prefer templates or `auto` where the type can stay visible.

## Standard library functors

`<functional>` provides function objects for the built-in operators:

| Category | Functors |
| --- | --- |
| Arithmetic | `plus`, `minus`, `multiplies`, `divides`, `modulus`, `negate` |
| Comparison | `equal_to`, `not_equal_to`, `greater`, `less`, `greater_equal`, `less_equal` |
| Logical | `logical_and`, `logical_or`, `logical_not` |
| Bitwise | `bit_and`, `bit_or`, `bit_xor`, `bit_not` |

Each is a class template. `std::less<int>` compares two `int`s; `std::less<>` (C++14 and later) is the "transparent" version that deduces argument types at the call site. Prefer `std::less<>`: it avoids accidental conversions and lets ordered containers such as `std::map<std::string, int, std::less<>>` look up keys by `std::string_view` or `const char*` without building a temporary `std::string`.

## Gotchas

- `std::bind1st`, `std::bind2nd`, `std::ptr_fun` and `std::not1` were removed in C++17. Use lambdas, `std::bind`, or `std::not_fn` instead.
- A comparator passed to `std::sort`, `std::set` or `std::map` must be a strict weak ordering. Using `<=` instead of `<` is undefined behaviour.

## Further reading

- [Function objects on cppreference](https://en.cppreference.com/w/cpp/utility/functional)
- [Lambda expressions on cppreference](https://en.cppreference.com/w/cpp/language/lambda)
