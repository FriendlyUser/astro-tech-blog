---
description: This article aims to provide an in-depth understanding of C++ lambda
  expressions and their use cases, along with examples to illustrate their functionality.
imgSrc: /imgs/2023/3216063167.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-29T23:14:52.000Z'
tags: []
title: Demystifying C++ Lambda Expressions
---

# Demystifying C++ Lambda Expressions

C++ is a versatile and powerful programming language that offers a plethora of features to make writing code more expressive and efficient. One such feature introduced in C++11, and refined in later standards, is lambda expressions. This article aims to provide an in-depth understanding of C++ lambda expressions and their use cases, along with examples to illustrate their functionality.

## Table of Contents

1. Introduction to Lambda Expressions
2. Syntax of Lambda Expressions
3. Capturing Variables
4. Mutable Lambdas
5. Specifying a Return Type
6. Generic Lambdas
7. Practical Examples
8. Conclusion

## 1. Introduction to Lambda Expressions

Lambda expressions are a concise way to define small, anonymous functions, usually intended for short-term use. They are particularly useful in situations where you need a simple function object for a single use, such as when using the Standard Template Library (STL) algorithms or as a callback function.

Lambda expressions are a natural evolution of function objects (functors) and provide a more elegant syntax. They allow you to write code that is more readable and expressive, as they can be defined inline, close to where they are used.

## 2. Syntax of Lambda Expressions

A lambda expression has the following general syntax:

```cpp
[capture](parameters) -> return_type { body }
```

- **capture**: The variables from the surrounding scope that the lambda needs to access.
- **parameters**: A list of parameters the lambda takes, similar to regular function parameters.
- **return_type**: The return type of the lambda function. This is optional and can often be deduced by the compiler.
- **body**: The body of the lambda function, containing the code to be executed.

Here's a simple example of a lambda expression that takes two integers and returns their sum:

```cpp
auto sum = [](int a, int b) { return a + b; };
int result = sum(3, 4); // result = 7
```

## 3. Capturing Variables

Lambdas can capture variables from their surrounding scope, which allows them to access and manipulate those variables. There are two main ways to capture variables: by value and by reference.

- **By value**: A copy of the variable is made and used inside the lambda. Changes made to the captured variable inside the lambda do not affect the original variable.
- **By reference**: The lambda captures a reference to the original variable. Changes made to the captured variable inside the lambda affect the original variable.

Here's an example illustrating the difference between capturing by value and by reference:

```cpp
int x = 10;
auto add_x_by_value = [x](int a) { return a + x; };
auto add_x_by_reference = [&x](int a) { return a + x; };

x = 20;
int result1 = add_x_by_value(5);      // result1 = 15
int result2 = add_x_by_reference(5);   // result2 = 25
```

## 4. Mutable Lambdas

By default, a lambda that captures variables by value cannot modify those captured variables. To allow modification of captured variables by value, you can add the `mutable` keyword:

```cpp
int x = 10;
auto add_and_increment_x = [x](int a) mutable { x++; return a + x; };
int result = add_and_increment_x(5); // result = 16
```

## 5. Specifying a Return Type

In most cases, the compiler can deduce the return type of a lambda expression. However, if the lambda body contains complex logic or multiple return statements, you may need to specify the return type explicitly using the `->` operator:

```cpp
auto complex_lambda = [](double a, double b) -> double {
    if (a < b) {
        // Some complex logic
        return a + b;
    } else {
        // Some other complex logic
        return a * b;
    }
};
```

## 6. Generic Lambdas

C++14 introduced support for generic lambdas, which allow you to write lambda expressions that accept arguments of any type using template type deduction. To create a generic lambda, use the `auto` keyword for the parameter types:

```cpp
auto generic_sum = [](auto a, auto b) { return a + b; };

int int_result = generic_sum(3, 4);           // int_result = 7
double double_result = generic_sum(3.1, 4.2); // double_result = 7.3
```

## 7. Practical Examples

### Using Lambdas with STL Algorithms

Lambdas are often used with STL algorithms to define custom predicates or operations. Here's an example of using a lambda with the `std::sort` algorithm:

```cpp
#include <algorithm>
#include <vector>

int main(){
    std::vector<int> numbers = {3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5};

    // Sort in descending order
    std::sort(numbers.begin(), numbers.end(), [](int a, int b) { return a > b; });

    return 0;
}

```

### Using Lambdas as Callback Functions

Lambdas can be used as callback functions to customize the behavior of other functions. Here's an example of a higher-order function that takes a lambda as a callback:

```cpp
#include <iostream>
#include <functional>

void process_data(const std::vector<int>& data, const std::function<void(int)>& callback) {
    for (int value : data) {
        callback(value);
    }
}

int main() {
    std::vector<int> data = {1, 2, 3, 4, 5};

    // Print each value squared
    process_data(data, [](int value) { std::cout << value * value << " "; });

    return 0;
}
```

## 8. Conclusion

C++ lambda expressions provide a powerful and expressive way to create small, anonymous functions within your code. By understanding their syntax and features, such as capturing variables and using generic lambdas, you can write more concise and readable code. Whether you're working with STL algorithms or designing your own higher-order functions, lambdas offer a valuable tool for modern C++ programming.