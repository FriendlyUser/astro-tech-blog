---
title: "C++ move semantics: rvalue references, move constructors and std::move"
description: "How C++11 move semantics work: rvalue references, writing a move constructor and move assignment, what std::move really does, and the common gotchas."
imgSrc: /imgs/2023/3072838870.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-04T18:30:25.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
---

Copying an object that owns a heap buffer, a file handle or a socket means duplicating that resource. When the source is about to be destroyed anyway (a temporary, or a local you're returning), the copy is wasted work. Move semantics, added in C++11, let the new object take over the source's resource instead, usually by copying a pointer and nulling out the original.

## Rvalues and rvalue references

Every C++ expression has a value category. The simplified version: an *lvalue* has a name or an identity you can take the address of (`x`, `v[0]`, `*p`); an *rvalue* is a temporary or a value about to expire (`42`, `a + b`, a function returning by value, `std::move(x)`). Strictly, rvalues are split into prvalues and xvalues, but you rarely need that distinction.

An rvalue reference, written `T&&`, binds only to rvalues:

```cpp
int x = 1;
int&& r1 = 42;            // OK: 42 is an rvalue
int&& r2 = x + 1;         // OK: temporary
// int&& r3 = x;          // error: x is an lvalue
int&& r4 = std::move(x);  // OK: std::move turns x into an rvalue (needs <utility>)
```

Overload resolution uses this: if a class has both `T(const T&)` and `T(T&&)`, passing an rvalue picks the move constructor, and passing an lvalue picks the copy constructor.

One gotcha: a *named* rvalue reference is itself an lvalue. Inside a function taking `T&& other`, the expression `other` is an lvalue, so if you want to move one of its members you still have to write `std::move(other.member)`.

## A class with copy and move operations

Here is a small `String` class that owns a heap buffer. It implements the full rule of five: destructor, copy constructor, copy assignment, move constructor and move assignment.

```cpp
#include <cstddef>
#include <cstring>
#include <iostream>
#include <utility>
#include <vector>

class String {
public:
    String(const char* str = "")
        : size_(std::strlen(str)), data_(new char[size_ + 1]) {
        std::memcpy(data_, str, size_ + 1);
    }

    ~String() { delete[] data_; }

    // Copy: allocate a new buffer and copy the characters
    String(const String& other)
        : size_(other.size_), data_(new char[other.size_ + 1]) {
        std::memcpy(data_, other.data_, size_ + 1);
        std::cout << "copy\n";
    }

    String& operator=(const String& other) {
        if (this != &other) {
            char* copy = new char[other.size_ + 1];
            std::memcpy(copy, other.data_, other.size_ + 1);
            delete[] data_;
            data_ = copy;
            size_ = other.size_;
        }
        return *this;
    }

    // Move: take the other object's buffer and leave it empty
    String(String&& other) noexcept
        : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr;
        std::cout << "move\n";
    }

    String& operator=(String&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = other.data_;
            other.size_ = 0;
            other.data_ = nullptr;
        }
        return *this;
    }

    const char* c_str() const { return data_ ? data_ : ""; }
    std::size_t size() const { return size_; }

private:
    std::size_t size_;
    char* data_;
};

int main() {
    String a("Hello, World!");
    String b(a);             // prints "copy"
    String c(std::move(a));  // prints "move"; a is now empty
    std::cout << c.c_str() << " (a.size() = " << a.size() << ")\n";

    std::vector<String> v;
    v.push_back(String("temp"));  // prints "move": the argument is a temporary
}
```

The move constructor does two pointer-sized copies and two writes, regardless of how long the string is. The copy constructor allocates and copies every character.

The moved-from object must still be safe to destroy and assign to, which is why the move operations set `other.data_` to `nullptr` (`delete[] nullptr` is a no-op). For standard library types the rule is the same: a moved-from `std::string` or `std::vector` is in a "valid but unspecified" state, so only assign to it or destroy it.

## What `std::move` actually does

`std::move` doesn't move anything. It is a cast to an rvalue reference, defined in `<utility>` roughly like this (it has been `constexpr` since C++14):

```cpp
template <typename T>
constexpr std::remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(t);
}
```

The move happens only if the result is passed to something that has an rvalue overload, like a move constructor. If the type has no move constructor, `std::move(x)` quietly falls back to a copy.

## Gotchas

- **Mark move operations `noexcept`.** When `std::vector` grows, it moves existing elements only if the move constructor is `noexcept` (or there is no copy constructor). Otherwise it copies them to keep its strong exception guarantee.
- **Don't write `return std::move(local);`.** Returning a local by value already moves it, or elides the copy entirely. Wrapping it in `std::move` blocks copy elision. GCC and Clang warn about this with `-Wpessimizing-move`.
- **Declaring a destructor or copy operation suppresses the implicit move operations.** The compiler only generates a move constructor and move assignment if you haven't declared a copy constructor, copy assignment, move assignment or destructor. A class that declares only a destructor will silently copy where you expected a move.
- **Prefer the rule of zero.** Hand-written move operations like the ones above are mainly for low-level resource-owning classes. If your members are `std::string`, `std::vector` or `std::unique_ptr`, don't declare any of the five and the compiler-generated versions will move correctly.
- **Don't use a moved-from object** except to assign to it or destroy it, unless the type documents what state it leaves behind (as `std::unique_ptr` does: it becomes null).

## Further reading

- [Value categories (cppreference)](https://en.cppreference.com/w/cpp/language/value_category)
- [Move constructors (cppreference)](https://en.cppreference.com/w/cpp/language/move_constructor)
- [`std::move` (cppreference)](https://en.cppreference.com/w/cpp/utility/move)
