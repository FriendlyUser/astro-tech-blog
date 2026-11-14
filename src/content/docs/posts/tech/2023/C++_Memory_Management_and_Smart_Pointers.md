---
description: Why raw new/delete is error-prone in C++ and how std::unique_ptr, std::shared_ptr and std::weak_ptr express ownership, with working examples.
imgSrc: /imgs/2023/954954072.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-10T21:02:58.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ smart pointers: unique_ptr, shared_ptr and weak_ptr instead of new and delete"
---

In C++, objects with automatic storage (local variables, usually on the stack) are destroyed when they go out of scope. Objects created with `new` live until someone calls `delete`. Getting that "someone" right is where leaks, double frees and dangling pointers come from. Smart pointers make ownership part of the type, so the compiler and destructors do the bookkeeping.

## The problem with raw `new` and `delete`

```cpp
int* create_array(int size) {
    return new int[size];
}

void use_array() {
    int* my_array = create_array(10);
    // ... if anything here throws or returns early, the array leaks ...
    delete[] my_array; // must be delete[], not delete
}
```

Nothing in `int*` says who owns the memory, whether it is one object or an array, or whether it has already been freed. Any early `return` or exception between `new` and `delete` leaks it.

The fix is RAII: tie the resource's lifetime to an object whose destructor releases it. Smart pointers in `<memory>` are RAII wrappers for heap objects. And for arrays, prefer `std::vector<int>` over any kind of pointer.

## `std::unique_ptr`: single owner

`std::unique_ptr<T>` owns one object and deletes it in its destructor. It can be moved but not copied, so there is always exactly one owner. With the default deleter it is the same size as a raw pointer and adds no runtime cost.

```cpp
#include <memory>
#include <string>
#include <utility>

struct Widget {
    std::string name;
};

std::unique_ptr<Widget> make_widget() {
    return std::make_unique<Widget>(Widget{"gear"}); // make_unique is C++14
}

int main() {
    auto w = make_widget();
    // auto copy = w;          // error: unique_ptr is not copyable
    auto owner = std::move(w); // ownership moves; w is now null
}   // owner's destructor deletes the Widget
```

`unique_ptr` has an array form, `std::unique_ptr<int[]>`, which calls `delete[]`:

```cpp
#include <memory>

std::unique_ptr<int[]> create_unique_array(int size) {
    return std::make_unique<int[]>(size); // elements value-initialised to 0
}
```

A custom deleter lets it manage non-memory resources too:

```cpp
#include <cstdio>
#include <memory>

struct FileCloser {
    void operator()(std::FILE* f) const { std::fclose(f); }
};

int main() {
    std::unique_ptr<std::FILE, FileCloser> file(std::fopen("data.txt", "r"));
    if (!file) return 1;
    // ... read from file.get() ...
}   // fclose runs here, even on early return
```

The deleter is only called for a non-null pointer, so a failed `fopen` is safe.

## `std::shared_ptr`: shared ownership

`std::shared_ptr<T>` lets several owners share one object. A control block holds a reference count; the object is destroyed when the last `shared_ptr` to it is destroyed or reset.

```cpp
#include <iostream>
#include <memory>

int main() {
    auto a = std::make_shared<int>(42);
    {
        std::shared_ptr<int> b = a;
        std::cout << a.use_count() << '\n'; // 2
    }
    std::cout << a.use_count() << '\n';     // 1
}   // count drops to 0, the int is deleted
```

Prefer `std::make_shared`: it allocates the object and the control block in one allocation. Since C++17, `std::shared_ptr<int[]>` calls `delete[]` correctly, and C++20 adds `std::make_shared<int[]>(n)`.

`shared_ptr` costs more than `unique_ptr`: it's typically two pointers wide (object and control block), and every copy updates the reference count atomically. Use it when ownership is genuinely shared, not as a default.

## `std::weak_ptr`: observing without owning

`std::weak_ptr<T>` refers to an object managed by `shared_ptr` without keeping it alive. Its main use is breaking reference cycles: if a parent holds a `shared_ptr` to its child and the child holds a `shared_ptr` back to its parent, neither count ever reaches zero and both leak. Make the back-pointer weak:

```cpp
#include <iostream>
#include <memory>

struct Parent;

struct Child {
    std::weak_ptr<Parent> parent; // non-owning back-reference
};

struct Parent {
    std::shared_ptr<Child> child;
    ~Parent() { std::cout << "Parent destroyed\n"; }
};

int main() {
    auto parent = std::make_shared<Parent>();
    parent->child = std::make_shared<Child>();
    parent->child->parent = parent;

    if (auto p = parent->child->parent.lock()) { // p is a shared_ptr, or empty if expired
        std::cout << "parent use_count: " << p.use_count() << '\n'; // 2
    }
}   // prints "Parent destroyed": no cycle keeps it alive
```

To use the object, call `lock()`. It returns a `shared_ptr` that is empty if the object is gone. While that `shared_ptr` exists it does count as an owner, which is why `use_count()` reports 2 above. That's what makes `lock()` safe: the object can't be destroyed while you are using it.

## Gotchas

- Don't create two `shared_ptr`s from the same raw pointer (`std::shared_ptr<T>(raw)` twice). Each gets its own control block, and the object is deleted twice. If an object needs a `shared_ptr` to itself, inherit from `std::enable_shared_from_this`.
- Pass `const T&` or `T*` to functions that only use an object. Pass a smart pointer only when the function takes part in ownership (stores it or takes it over).
- Don't use `std::move` on a `unique_ptr` and then read it; the moved-from pointer is null.

## Further reading

- [Smart pointers on cppreference](https://en.cppreference.com/w/cpp/memory)
- [C++ Core Guidelines: resource management](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource)
