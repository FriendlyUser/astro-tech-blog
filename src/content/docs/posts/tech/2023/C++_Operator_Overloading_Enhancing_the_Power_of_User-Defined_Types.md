---
title: "C++ operator overloading: member vs non-member operators and C++20 comparisons"
description: "How to overload operators for your own C++ types: a complete Vector2 example, which operators must be members, defaulted == in C++20, and pitfalls."
imgSrc: /imgs/2023/1031426508.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-30T11:49:17.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
---

Operator overloading lets your own types work with C++'s operators, so a 2D vector type can be written `a + b` instead of `addVectors(a, b)`. An overloaded operator is just a function named `operator+`, `operator==`, `operator<<` and so on, declared either as a member function or as a free (non-member) function.

## A complete example

Here is a small `Vector2` class with the operators you'd typically want. It needs C++20 for the defaulted `==`:

```cpp
#include <iostream>

class Vector2 {
public:
    Vector2() = default;
    Vector2(float x, float y) : x_(x), y_(y) {}

    float x() const { return x_; }
    float y() const { return y_; }

    // Compound assignment changes *this: make it a member and return a reference
    Vector2& operator+=(const Vector2& rhs) {
        x_ += rhs.x_;
        y_ += rhs.y_;
        return *this;
    }

    // Unary minus: returns a new value
    Vector2 operator-() const { return {-x_, -y_}; }

    // C++20: compiler-generated memberwise comparison.
    // a != b is automatically rewritten as !(a == b).
    bool operator==(const Vector2&) const = default;

private:
    float x_ = 0;
    float y_ = 0;
};

// Binary + as a free function, implemented with +=
Vector2 operator+(Vector2 lhs, const Vector2& rhs) {
    lhs += rhs;
    return lhs;
}

// Stream output must be a free function: the left operand is std::ostream
std::ostream& operator<<(std::ostream& os, const Vector2& v) {
    return os << '(' << v.x() << ", " << v.y() << ')';
}

int main() {
    Vector2 a(1, 2);
    Vector2 b(3, 4);
    Vector2 c = a + b;

    std::cout << c << '\n';         // (4, 6)
    std::cout << -c << '\n';        // (-4, -6)
    std::cout << (c != a) << '\n';  // 1
}
```

A few things worth noticing:

- `+=` modifies the left operand, so it's a member returning `Vector2&`. `+` produces a new value, so it returns `Vector2` by value.
- `+` takes its left operand by value. That copy is the result we modify and return, so we don't need a separate local.
- Implementing `+` in terms of `+=` keeps the arithmetic in one place.
- `operator<<` can't be a member of `Vector2`, because a member operator's left operand is always `*this`, and here the left operand is the stream. It doesn't need to be a `friend` either, since it only uses the public getters.

Before C++20, write `operator==` by hand and define `operator!=` as `!(a == b)`.

## Member or non-member?

- **Must be members:** `=`, `()`, `[]` and `->`. Conversion operators (`operator bool()` and so on) are also always members. These can't be written as free functions, `friend` or not.
- **Usually members:** compound assignment (`+=`, `-=`, ...), increment and decrement, and unary operators, since they act on one object and often change it.
- **Usually free functions:** symmetric binary operators such as `+`, `-`, `*`, `==` and `<`. If the class has an implicit converting constructor, a free function allows conversions on both sides, while a member only allows them on the right (`v + 1` would compile, but `1 + v` wouldn't).
- **Use `friend` only when needed:** a free operator needs to be a friend only if it must reach private members that aren't exposed some other way.

## Comparisons in C++20

C++20 added the three-way comparison operator `<=>`. Defaulting it gives you `<`, `<=`, `>` and `>=` in one line, comparing members in declaration order:

```cpp
#include <compare>
#include <string>

struct Version {
    int major;
    int minor;
    std::string tag;

    auto operator<=>(const Version&) const = default;  // also implies a defaulted ==
};

// Version{1, 2, ""} < Version{1, 10, ""} is true
```

A defaulted `<=>` also declares a defaulted `==`, so this struct gets all six comparison operators.

## Rules and pitfalls

- **You can't change the basics.** You can't invent new operators, change an operator's precedence or how many operands it takes, or overload operators for built-in types only: at least one operand must be a class or enumeration type.
- **Some operators can't be overloaded:** `::`, `.`, `.*`, `?:`, `sizeof`, `alignof` and `typeid`.
- **Overloaded `&&` and `||` don't short-circuit.** Both operands are always evaluated, which surprises readers. Avoid overloading them, and the comma operator.
- **Keep the usual meaning.** `+` should add, `==` should be an equivalence. If you have to explain what an operator does, a named function is clearer.
- **Keep related operators consistent.** If `a + b` works, `a += b` should too, and give the same result.
- **Rule of three/five.** If your class needs a custom copy assignment operator because it manages a resource, it almost certainly needs a custom copy constructor and destructor too, plus the move constructor and move assignment. If it doesn't manage a resource directly, define none of them and let the compiler generate them.

## Further reading

- [Operator overloading (cppreference)](https://en.cppreference.com/w/cpp/language/operators)
- [Default comparisons (cppreference)](https://en.cppreference.com/w/cpp/language/default_comparisons)
