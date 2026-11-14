---
title: "Pointers and references in C++: syntax, differences and when to use each"
pubDate: "2024-09-08T17:17:24.000Z"
lastUpdated: 2026-11-14
description: "How C++ pointers and references work, how they differ (null, reseating, syntax), and when to use each for parameters, optional values and ownership."
tags:
  - cpp
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4279596222.webp
---

A pointer is a variable that holds the address of an object. A reference is another name for an existing object. Both let a function work on the caller's data instead of a copy, but they behave differently around null, reassignment and syntax, and picking the right one makes intent clearer.

## Pointers

Declare a pointer with `*`, take an object's address with `&`, and read or write through the pointer by dereferencing it with `*`:

```cpp
int num = 42;
int *ptr = &num;   // ptr holds the address of num

int value = *ptr;  // value is 42
*ptr = 10;         // num is now 10
```

A pointer that points at nothing should be set to `nullptr`. Dereferencing a null (or uninitialized) pointer is undefined behaviour, so check before you dereference when null is possible:

```cpp
int *maybe = nullptr;
if (maybe) {
    *maybe = 1;  // only runs when maybe points somewhere
}
```

### Pointer arithmetic

Adding to a pointer moves it by whole elements, not bytes, so it's how you walk through an array:

```cpp
int arr[5] = {1, 2, 3, 4, 5};
int *p = arr;   // an array name converts to a pointer to its first element

++p;            // now points at arr[1]
int second = *p;  // 2
```

Arithmetic is only valid inside an array (or one past its end). Going further is undefined behaviour, and the compiler won't stop you.

## References

A reference is declared with `&` and must be bound to an object when it's created. After that, using the reference is the same as using the original object: no `*` or `&` needed.

```cpp
int num = 42;
int &ref = num;

int value = ref;  // 42
ref = 10;         // num is now 10
```

`ref = 10` assigns to `num`; it doesn't make `ref` refer to something else. A reference can't be reseated after initialization.

## Pointers vs references

| | Pointer | Reference |
|---|---|---|
| Can be null | Yes (`nullptr`) | No |
| Can be changed to refer to another object | Yes | No |
| Must be initialized | No (but uninitialized pointers are a bug waiting to happen) | Yes |
| Access syntax | `*p`, `p->member` | Same as the object: `r`, `r.member` |

Neither one keeps the object alive. A reference to a local variable that has gone out of scope dangles just like a pointer does, and using it is undefined behaviour:

```cpp
int &bad() {
    int local = 5;
    return local;  // returns a dangling reference; compilers warn about this
}
```

## When to use which

### Function parameters

Use a reference when the function needs to modify the caller's object and the argument is always required:

```cpp
void increment(int &num) {
    ++num;
}

int main() {
    int value = 5;
    increment(value);  // value is now 6
}
```

Use a pointer when "no object" is a valid input. The caller passes `nullptr` to opt out, and the function has to check:

```cpp
void increment(int *num) {
    if (num) {
        ++*num;
    }
}

int main() {
    int value = 5;
    increment(&value);   // value is now 6
    increment(nullptr);  // does nothing
}
```

For large objects you only read, pass by `const` reference. It avoids a copy and the signature tells the caller their object won't be changed:

```cpp
#include <string>
#include <vector>

std::size_t total_length(const std::vector<std::string> &words) {
    std::size_t total = 0;
    for (const auto &w : words) {
        total += w.size();
    }
    return total;
}
```

### Dynamic memory

Memory allocated at runtime is reached through a pointer, but you rarely need to manage it with raw `new` and `delete`. For an array whose size is only known at runtime, use `std::vector`; for a single heap object, use `std::unique_ptr` (or `std::shared_ptr` if ownership really is shared). Both free the memory automatically, including when an exception is thrown.

```cpp
#include <iostream>
#include <memory>
#include <vector>

struct Widget {
    int id;
};

int main() {
    std::size_t size = 0;
    std::cout << "Enter the size of the array: ";
    std::cin >> size;

    std::vector<int> numbers(size);           // replaces new int[size] / delete[]
    auto widget = std::make_unique<Widget>(); // replaces new Widget / delete

    widget->id = 1;
    numbers.push_back(widget->id);
    std::cout << numbers.size() << '\n';
}   // both are freed here
```

A useful rule of thumb in modern C++: smart pointers and containers *own* memory, while raw pointers and references only *observe* something that is owned elsewhere.

## Further reading

- [References (cppreference)](https://en.cppreference.com/w/cpp/language/reference)
- [Pointer declaration (cppreference)](https://en.cppreference.com/w/cpp/language/pointer)
- [C++ Core Guidelines: F.7, F.60 and the R (resource management) section](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
