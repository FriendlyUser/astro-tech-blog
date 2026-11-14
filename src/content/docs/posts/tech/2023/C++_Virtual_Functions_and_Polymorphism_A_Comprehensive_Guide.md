---
description: "How virtual functions give C++ runtime polymorphism, why base classes need virtual destructors, abstract classes, and traps like slicing."
imgSrc: /imgs/2023/326029388.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-04T17:45:10.000Z'
lastUpdated: 2026-11-14
tags: ["cpp"]
title: "C++ virtual functions and runtime polymorphism"
---

Polymorphism lets you call the same function on different types and get type-specific behaviour. C++ has two kinds. Overloading and templates are **compile-time** polymorphism: the compiler picks the function. Virtual functions are **runtime** polymorphism: the call is resolved from the object's actual (dynamic) type when the program runs, even if you only hold a pointer or reference to the base class.

## Virtual functions

Mark a member function `virtual` in the base class, and derived classes can override it:

```cpp
#include <iostream>
#include <memory>

class Shape {
public:
    virtual ~Shape() = default;
    virtual void draw() const { std::cout << "Drawing a shape\n"; }
};

class Circle : public Shape {
public:
    void draw() const override { std::cout << "Drawing a circle\n"; }
};

int main() {
    std::unique_ptr<Shape> shape = std::make_unique<Circle>();
    shape->draw();  // Drawing a circle
}
```

The pointer's static type is `Shape`, but the object is a `Circle`, so `Circle::draw` runs. Without `virtual`, the call would be bound at compile time and print "Drawing a shape".

Compilers typically implement this with a *vtable*: each polymorphic class has a table of function pointers, and each object carries a hidden pointer to its class's table. A virtual call loads that pointer and calls through the table, which is a little slower than a direct call and usually prevents inlining.

### Why the virtual destructor matters

`unique_ptr<Shape>` deletes the object through a `Shape*`. If `Shape`'s destructor isn't virtual, deleting a `Circle` through a `Shape*` is undefined behaviour; in practice `Circle`'s destructor usually doesn't run, so anything it owns leaks. The C++ Core Guidelines rule (C.35) is that a base class destructor should be either public and virtual, or protected and non-virtual.

## Pure virtual functions and abstract classes

When the base class has no sensible default, declare the function pure virtual with `= 0`. A class with at least one pure virtual function is abstract and can't be instantiated; derived classes must implement the function to become concrete.

```cpp
#include <iostream>
#include <memory>
#include <numbers>
#include <vector>

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual const char* name() const = 0;
};

class Circle final : public Shape {
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return std::numbers::pi * r_ * r_; }
    const char* name() const override { return "circle"; }
private:
    double r_;
};

class Square final : public Shape {
public:
    explicit Square(double side) : side_(side) {}
    double area() const override { return side_ * side_; }
    const char* name() const override { return "square"; }
private:
    double side_;
};

int main() {
    // Shape s;  // error: Shape is abstract

    std::vector<std::unique_ptr<Shape>> shapes;
    shapes.push_back(std::make_unique<Circle>(1.0));
    shapes.push_back(std::make_unique<Square>(2.0));

    for (const auto& s : shapes) {
        std::cout << s->name() << ": " << s->area() << '\n';
    }
}
```

Output (`std::numbers::pi` needs C++20):

```text
circle: 3.14159
square: 4
```

`final` on a class stops further derivation, and on a function stops further overriding. It also lets the compiler call those functions directly when it knows the exact type.

## Gotchas

- **Use `override`.** If the derived signature doesn't match the base exactly (for example, missing `const`), you've declared a new function that hides the base one, and the virtual call silently goes to the base. With `override`, that mistake is a compile error.
- **Slicing.** Copying a derived object into a base object by value keeps only the base part: `Shape s = Circle{}; s.draw();` (using the first, non-abstract `Shape`) prints "Drawing a shape". Pass polymorphic objects by reference or pointer.
- **No virtual dispatch in constructors and destructors.** While `Shape`'s constructor runs, the object is still a `Shape`, so a virtual call there goes to `Shape`'s version (and calling a pure virtual function there is undefined behaviour).
- **Default arguments are static.** A default argument on a virtual function comes from the static type of the pointer, not the overriding function. Avoid giving overrides different defaults.
- **Prefer shallow hierarchies.** Use pure virtual interfaces when classes share no implementation, and favour composition over deep inheritance chains.

## Further reading

- [Virtual function specifier on cppreference](https://en.cppreference.com/w/cpp/language/virtual)
- [Abstract classes](https://en.cppreference.com/w/cpp/language/abstract_class)
- [C++ Core Guidelines: class hierarchies](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-hier)
