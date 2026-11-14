---
description: "How C++ function and class templates work, when to specialise them, variadic templates with fold expressions, and constraining templates with C++20 concepts."
imgSrc: /imgs/2023/1312348161.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-22T02:43:46.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ templates: function templates, class templates, specialization and variadic templates"
---

A template is a recipe the compiler uses to generate a function or class for each set of types you use it with. You write `larger` or `Stack` once, and the compiler stamps out `larger<int>`, `Stack<double>` and so on at compile time. This is how the standard library provides `std::vector<T>` and `std::sort` for any type.

From "Function templates" onward, the snippets form a single file, and the `main` at the end calls everything. Compile with `-std=c++20` (concepts need C++20, fold expressions need C++17).

## Template parameters

A template starts with `template` and a parameter list in angle brackets:

```cpp
template <typename T>   // type parameter
template <class T>      // same thing; typename and class are interchangeable here
template <int N>        // non-type parameter
```

Non-type parameters take compile-time values: integers, enums, pointers and references, and since C++20 also floating-point values and some class types. `std::array<int, 3>` uses one for its size.

## Function templates

```cpp
#include <concepts>
#include <cstring>
#include <iostream>
#include <utility>
#include <vector>

template <typename T>
T larger(T a, T b) {
    return (a > b) ? a : b;
}
```

`larger(5, 3)` deduces `T = int`, and `larger(2.5, 4.2)` deduces `T = double`. The compiler generates one instantiation per type. Deduction must agree across arguments, so `larger(1, 2.5)` fails to compile; write `larger<double>(1, 2.5)` to pick `T` yourself.

The function is named `larger` rather than `max` on purpose: with arguments from namespace `std` (such as `std::string`), argument-dependent lookup also finds `std::max`, and an unqualified call to your own `max` becomes ambiguous.

## Class templates

```cpp
template <typename T>
class Stack {
public:
    void push(const T& item) { data_.push_back(item); }

    T pop() {
        T item = std::move(data_.back());
        data_.pop_back();
        return item;
    }

    bool empty() const { return data_.empty(); }

private:
    std::vector<T> data_;
};
```

`Stack<int>` and `Stack<double>` are two unrelated classes generated from the same template. Calling `pop()` on an empty stack is undefined behaviour because `back()` on an empty vector is, so check `empty()` first. (`std::stack` splits this into `top()` and a `pop()` that returns `void`, partly so a throwing copy can't lose an element.)

## Specialization

An explicit specialization replaces the generic implementation for one specific set of template arguments. Comparing two `const char*` with `>` compares addresses, not text, so `larger` gives the wrong answer for C strings. A specialization fixes that:

```cpp
template <>
const char* larger<const char*>(const char* a, const char* b) {
    return (std::strcmp(a, b) > 0) ? a : b;
}
```

For function templates, a plain overload (`const char* larger(const char* a, const char* b)`) does the same job and is usually the better choice, because specializations don't take part in overload resolution and the interaction gets confusing.

Class templates also support **partial** specialization, which function templates don't. This one matches every pointer type:

```cpp
template <typename T>
struct Describe {
    static constexpr const char* name = "value";
};

template <typename T>
struct Describe<T*> {
    static constexpr const char* name = "pointer";
};
```

## Variadic templates

A parameter pack (`typename... Args`) accepts zero or more template arguments. Before C++17 you processed a pack with recursion: a base case plus a function that peels off the first argument. Since C++17, a fold expression does it in one line:

```cpp
template <typename... Args>
auto sum(Args... args) {
    return (args + ...);
}
```

`sum(1, 2, 3, 4, 5)` returns `15`, and `sum(1, 2.5)` returns `3.5` because the result type comes from adding the arguments. The older recursive version usually declared its return type as the type of the first argument, so `sum(1, 2.5)` silently truncated to `3`. A unary fold over `+` with an empty pack doesn't compile, so `sum()` is an error; write `(0 + ... + args)` if you need it to return `0`.

## Constraining templates with concepts

Templates use duck typing: `larger` compiles for any type with `>`, and a type without it produces an error deep inside the template body. C++20 concepts state the requirement up front:

```cpp
template <std::totally_ordered T>
T larger_checked(T a, T b) {
    return (a > b) ? a : b;
}
```

Passing a type that isn't ordered now fails at the call site, with an error that names the unmet concept.

## Putting it together

```cpp
int main() {
    std::cout << larger(5, 3) << ' ' << larger(2.5, 4.2) << '\n';    // 5 4.2
    std::cout << larger<double>(1, 2.5) << '\n';                      // 2.5
    std::cout << larger<const char*>("apple", "pear") << '\n';        // pear

    Stack<int> stack;
    stack.push(5);
    stack.push(3);
    std::cout << stack.pop() << '\n';                                 // 3

    std::cout << Describe<int>::name << ' ' << Describe<int*>::name << '\n';  // value pointer

    std::cout << sum(1, 2, 3, 4, 5) << ' ' << sum(1, 2.5) << '\n';    // 15 3.5
    std::cout << larger_checked(7, 9) << '\n';                        // 9
}
```

## Gotchas

- Template definitions normally go in headers. The compiler needs the full definition at the point of instantiation, so a template defined only in a `.cpp` file causes linker errors when used from another file.
- Every distinct set of arguments generates new code, which can increase binary size and compile times.
- Error messages from unconstrained templates can be long; concepts make them much shorter.

## Further reading

- [Templates on cppreference](https://en.cppreference.com/w/cpp/language/templates)
- [Fold expressions](https://en.cppreference.com/w/cpp/language/fold)
- [Constraints and concepts](https://en.cppreference.com/w/cpp/language/constraints)
