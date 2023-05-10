---
description: In this article, we will dive deep into function objects and functors
  in C++, exploring their use cases and benefits
imgSrc: /imgs/2023/248665811.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-03T21:43:43.000Z'
tags: []
title: C++ Function Objects and Functors A Comprehensive Guide
---

# C++ Function Objects and Functors: A Comprehensive Guide

C++ offers various ways to represent functions and callable objects, with function pointers, lambda expressions, and functors being the most common. In this article, we will dive deep into function objects and functors in C++, exploring their use cases and benefits.

## What are Function Objects and Functors?

A function object, also known as a functor, is an object that can be called as if it were a function. Functors are instances of a class or a struct that define the function call operator, `operator()`. This operator allows objects of the class to be called with arguments like a regular function.

## Why Use Functors?

Functors provide several advantages over regular functions and function pointers:

1. **State**: Functors can maintain state between calls, unlike regular functions.
2. **Inline Expansion**: The C++ compiler can inline the `operator()` call, potentially leading to better performance.
3. **Customization**: Functors can be customized by providing different implementations of the `operator()` for different situations.
4. **Object-Oriented Design**: Functors align with object-oriented design principles, allowing for better code organization and maintainability.

## Defining a Functor

To define a functor, you need to create a class or struct that implements the `operator()` with the desired signature. Here's an example of a simple functor that adds a constant value to its input:

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
    std::cout << "10 + 5 = " << add_five(10) << std::endl; // Output: 10 + 5 = 15

    return 0;
}
```

In this example, the `AddValue` class implements a functor that adds a constant value to its input. The constructor takes the constant value and stores it in the private member `value_`. The `operator()` is defined as a member function, taking an integer input and returning the result of adding the stored value to it.

## Functors in the Standard Library

C++ Standard Library provides a variety of predefined functors that are commonly used in algorithms and data structures. Some of the most widely used functors include:

### Arithmetic Functors

These functors perform arithmetic operations:

- `std::plus<>`: Adds two values.
- `std::minus<>`: Subtracts the second value from the first.
- `std::multiplies<>`: Multiplies two values.
- `std::divides<>`: Divides the first value by the second.
- `std::modulus<>`: Computes the remainder of the division of the first value by the second.

### Comparison Functors

These functors perform comparison operations:

- `std::equal_to<>`: Checks if two values are equal.
- `std::not_equal_to<>`: Checks if two values are not equal.
- `std::greater<>`: Checks if the first value is greater than the second.
- `std::less<>`: Checks if the first value is less than the second.
- `std::greater_equal<>`: Checks if the first value is greater than or equal to the second.
- `std::less_equal<>`: Checks if the first value is less than or equal to the second.

### Logical Functors

These functors perform logical operations:

- `std::logical_and<>`: Performs a logical AND operation.
- `std::logical_or<>`: Performs a logical OR operation.
- `std::logical_not<>`: Performs a logical NOT operation.

These functors can be used with standard algorithms like `std::transform`, `std::accumulate`, and `std::sort`.

## Conclusion

Functors are a powerful and flexible way to represent callable objects in C++. They offer several advantages over regular functions and function pointers, such as maintaining state, inline expansion, customization, and adherence to object-oriented design principles. By leveraging functors and the predefined functors in the C++ Standard Library, you can create more efficient and maintainable code.