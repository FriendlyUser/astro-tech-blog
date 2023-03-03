---
tags: ['python', 'introtopython']
title: Chapter 8 File handling and data processing.
description: For my introductory book on python, functional programming.
pubDate: Fri, 30 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3280960381.png

---
Functional programming is a programming paradigm that focuses on creating software applications by composing pure functions that avoid changing state and mutating data. In functional programming, functions are treated as first-class citizens and can be passed around like any other value, including being returned from other functions.

Functional programming differs from imperative programming in that the latter focuses on describing how the program should be executed step-by-step, often relying on loops, conditionals, and mutable variables. Imperative programming is based on the idea of commands that modify the state of the program, and the execution of these commands often happens in a specific order.

Object-oriented programming (OOP), on the other hand, is a programming paradigm that focuses on objects and their interactions. In OOP, objects encapsulate data and behavior, and communication between objects is done through method calls. OOP emphasizes the use of inheritance, encapsulation, and polymorphism.

In functional programming, the focus is on composing functions that transform data without mutating it, while in OOP, the focus is on creating objects that encapsulate data and behavior. Functional programming encourages immutability and avoids side effects, while OOP emphasizes encapsulation and abstraction.

Both functional programming and OOP can be used to write high-quality software applications, but they approach problems from different angles and have different strengths and weaknesses. Functional programming can be more concise and easier to reason about, while OOP can be more intuitive for modeling complex systems with many interacting objects.


Functional programming has several advantages and disadvantages. Some of the advantages include:

Advantages:

1. Purity: Functions in functional programming are pure, which means they don't have side-effects and always produce the same output for a given input. This makes functions easier to test, reason about, and compose, leading to more reliable and maintainable code.
2. Immutability: Data in functional programming is immutable, meaning that it cannot be modified once created. This eliminates the risk of data corruption or unintended side effects, leading to more predictable and reliable code.
3. Higher-Order Functions: Functional programming treats functions as first-class citizens, meaning that they can be passed around like any other value. This allows for higher-order functions, which are functions that take other functions as arguments or return functions as results. Higher-order functions provide a powerful abstraction mechanism, allowing for more concise and reusable code.
4. Concurrency and Parallelism: Functional programming is well-suited for concurrency and parallelism because of its emphasis on immutability and purity. Since functions in functional programming do not modify state, it is easier to reason about concurrent and parallel execution, leading to more efficient and scalable programs.

However, functional programming also has some disadvantages:

Disadvantages:

1. Steep Learning Curve: Functional programming requires a different mindset and approach to programming than traditional imperative programming, which can make it difficult for developers to learn.
2. Performance Overhead: The emphasis on immutability and purity can sometimes come at a performance cost, as creating new data structures instead of modifying existing ones can be more computationally expensive. However, functional programming languages and libraries have evolved to optimize these operations, reducing this overhead.
3. Limited Tooling: Functional programming languages and tools are not as widely adopted as traditional programming languages and tools, which can make it more challenging to find resources and support.
4. Difficulty in Modeling Some Problems: Functional programming can be challenging to apply to some problems that are more naturally expressed using imperative or object-oriented programming paradigms. In these cases, other paradigms may be more suitable.

Sure, I can give you an overview of how to use some of the built-in functions in Python for working with iterables.

1. map(): The `map()` function applies a given function to each item of an iterable and returns a new iterable with the transformed values. Here's an example:


```python
def square(x):
 return x**2

numbers = [1, 2, 3, 4, 5]
squared_numbers = map(square, numbers)
print(list(squared_numbers)) # Output: [1, 4, 9, 16, 25]
```
In this example, we defined a function `square()` that takes a number and returns its square. We then applied the `map()` function to the `numbers` list with the `square()` function as the first argument. The result is a new iterable containing the squared values of the original numbers.

2. filter(): The `filter()` function applies a given function to each item of an iterable and returns a new iterable with only the items for which the function returns `True`. Here's an example:


```python
def is_even(x):
 return x % 2 == 0

numbers = [1, 2, 3, 4, 5]
even_numbers = filter(is_even, numbers)
print(list(even_numbers)) # Output: [2, 4]
```
In this example, we defined a function `is_even()` that takes a number and returns `True` if it is even. We then applied the `filter()` function to the `numbers` list with the `is_even()` function as the first argument. The result is a new iterable containing only the even numbers from the original list.

3. reduce(): The `reduce()` function applies a given function to the items of an iterable in a cumulative way and returns a single value. Here's an example:


```python
from functools import reduce

def add(x, y):
 return x + y

numbers = [1, 2, 3, 4, 5]
sum_of_numbers = reduce(add, numbers)
print(sum_of_numbers) # Output: 15
```
In this example, we defined a function `add()` that takes two numbers and returns their sum. We then applied the `reduce()` function to the `numbers` list with the `add()` function as the first argument. The result is the sum of all the numbers in the original list.

4. lambda: The `lambda` keyword is used to create anonymous functions in Python. These are functions that have no name and are defined on the fly. Here's an example:


```python
numbers = [1, 2, 3, 4, 5]
squared_numbers = map(lambda x: x**2, numbers)
print(list(squared_numbers)) # Output: [1, 4, 9, 16, 25]
```
In this example, we used a lambda function to define the square function directly inside the `map()` function. The lambda function takes a number as its argument and returns its square. This is a shorter way to define small, one-time-use functions.


List comprehensions, set comprehensions, and dictionary comprehensions are a concise and powerful way to create new collections from existing ones in Python. Here's an overview of how to use them:

1. List comprehensions: A list comprehension is a way to create a new list by specifying a pattern that describes the contents of the list. It has the following syntax:


```python
new_list = [expression for item in iterable if condition]
```
where `expression` is the operation that transforms the `item`, `iterable` is the iterable that you want to transform, and `condition` is an optional filtering condition. Here's an example:


```python
numbers = [1, 2, 3, 4, 5]
squared_numbers = [x\*\*2 for x in numbers if x % 2 == 0]
print(squared_numbers) # Output: [4, 16]
```
In this example, we used a list comprehension to create a new list `squared_numbers` that contains the squares of the even numbers from the original list.

2. Set comprehensions: A set comprehension is similar to a list comprehension, but it creates a new set instead of a list. It has the following syntax:


```python
new_set = {expression for item in iterable if condition}
```
where `expression`, `iterable`, and `condition` are the same as in a list comprehension. Here's an example:


```python
numbers = [1, 2, 3, 4, 5]
even_numbers = {x for x in numbers if x % 2 == 0}
print(even_numbers) # Output: {2, 4}
```
In this example, we used a set comprehension to create a new set `even_numbers` that contains the even numbers from the original list.

3. Dictionary comprehensions: A dictionary comprehension is a way to create a new dictionary by specifying a pattern that describes the contents of the dictionary. It has the following syntax:


```python
new_dict = {key_expression: value_expression for item in iterable if condition}
```
where `key_expression` and `value_expression` are the operations that transform the `item` into a key-value pair, `iterable` is the iterable that you want to transform, and `condition` is an optional filtering condition. Here's an example:


```python
numbers = [1, 2, 3, 4, 5]
squared_dict = {x: x**2 for x in numbers if x % 2 == 0}
print(squared_dict) # Output: {2: 4, 4: 16}
```
In this example, we used a dictionary comprehension to create a new dictionary `squared_dict` that contains the squares of the even numbers from the original list, with the even numbers themselves as the keys.


In Python, generators are a way to create lazy iterables that can be consumed on demand. Generators are functions that use the `yield` statement to return a value, but instead of returning all the values at once, they return a sequence of values as the generator is iterated over. This makes generators useful for generating large sequences of data that might be too large to store in memory all at once.

Here's an example of a generator function that generates the Fibonacci sequence:


```python
def fibonacci():
 a, b = 0, 1
 while True:
  yield a
 a, b = b, a + b
```
This function generates the Fibonacci sequence indefinitely. To use this generator, you can iterate over it like this:


```python
for num in fibonacci():
 if num > 100:
  break
 print(num)
```
This will print the Fibonacci sequence up to the first number greater than 100.

In addition to generator functions, Python also has generator expressions, which are similar to list comprehensions and set comprehensions, but they create lazy iterables instead of lists or sets. Here's an example:


```python
squares = (x**2 for x in range(10))
```
This creates a generator expression that generates the squares of the numbers from 0 to 9. To consume the values generated by this generator expression, you can iterate over it like this:


```python
for square in squares:
 print(square)
```
This will print the squares of the numbers from 0 to 9. Note that the generator expression only generates the squares of the numbers as they are needed, so it doesn't store all the squares in memory at once.


