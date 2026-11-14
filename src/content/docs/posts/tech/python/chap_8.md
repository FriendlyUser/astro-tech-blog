---
tags: ['python', 'introtopython']
title: "Chapter 8: Functional programming in Python"
description: Chapter 8 of my intro to Python book covers pure functions, map, filter, reduce, lambdas, comprehensions and generators, with runnable examples.
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3280960381.png

---
Functional programming builds programs out of functions that take input and return output without changing anything outside themselves. Functions are values: you can store them in variables, pass them to other functions and return them from functions.

That contrasts with imperative code, which describes step by step how to change the program's state using loops and mutable variables, and with object-oriented programming (Chapter 5), which bundles state and behaviour into objects that talk to each other through methods.

Python is not a purely functional language. Lists and dicts are mutable, and nothing stops a function from having side effects. But Python has first-class functions and several built-ins that make a functional style easy, and mixing the styles is normal in real code.

## Why use a functional style

- **Pure functions are easy to test.** A function that only depends on its arguments and returns the same output for the same input needs no setup or mocks.
- **No shared mutable state.** If data isn't modified in place, you don't get bugs where one part of the program changes a list another part is still using. This also makes it easier to run work in parallel (for example with `concurrent.futures`).
- **Higher-order functions remove boilerplate.** A function that takes another function as an argument (like `map` or `sorted(key=...)`) lets you reuse the looping logic and only write the part that differs.

The trade-offs:

- Building new objects instead of modifying existing ones costs memory and time, which matters for large data.
- Python has no tail-call optimisation and a default recursion limit of 1000 frames (`sys.getrecursionlimit()`), so deeply recursive "functional" solutions fail where a loop would not.
- Long chains of `map`/`filter`/`lambda` are often harder to read than a comprehension or a plain `for` loop. Use whichever is clearer.

## map, filter, reduce and lambda

### map()

`map(function, iterable)` calls the function on each item and returns a lazy `map` iterator. Wrap it in `list()` to see all the results:

```python
def square(x):
    return x**2

numbers = [1, 2, 3, 4, 5]
squared_numbers = map(square, numbers)
print(list(squared_numbers))  # [1, 4, 9, 16, 25]
```

### filter()

`filter(function, iterable)` keeps only the items for which the function returns a truthy value:

```python
def is_even(x):
    return x % 2 == 0

numbers = [1, 2, 3, 4, 5]
even_numbers = filter(is_even, numbers)
print(list(even_numbers))  # [2, 4]
```

### reduce()

`reduce()` lives in `functools`, not the built-ins. It combines items pairwise from left to right until one value is left:

```python
from functools import reduce
from operator import add

numbers = [1, 2, 3, 4, 5]
print(reduce(add, numbers))  # ((((1 + 2) + 3) + 4) + 5) = 15
```

For sums specifically, use the built-in `sum(numbers)`. `reduce` is for combinations that don't already have a built-in, such as merging a list of dicts. Pass a third argument as the starting value, otherwise `reduce` raises `TypeError` on an empty iterable.

### lambda

`lambda` creates a small anonymous function from a single expression. It is handy as a one-off argument to `map`, `filter` or `sorted`:

```python
numbers = [1, 2, 3, 4, 5]
print(list(map(lambda x: x**2, numbers)))  # [1, 4, 9, 16, 25]

words = ["banana", "Apple", "cherry"]
print(sorted(words, key=lambda w: w.lower()))  # ['Apple', 'banana', 'cherry']
```

If you find yourself assigning a lambda to a name (`square = lambda x: x**2`), write a `def` instead. It gets a proper name in tracebacks, and PEP 8 recommends it.

## Comprehensions

Comprehensions build a new collection from an existing iterable in one expression. They usually read better than `map` plus `filter`.

### List comprehensions

```python
new_list = [expression for item in iterable if condition]
```

The `if condition` part is optional.

```python
numbers = [1, 2, 3, 4, 5]
squared_evens = [x**2 for x in numbers if x % 2 == 0]
print(squared_evens)  # [4, 16]
```

### Set comprehensions

Same syntax with curly braces. The result is a set, so duplicates are dropped:

```python
numbers = [1, 2, 2, 3, 4, 4, 5]
even_numbers = {x for x in numbers if x % 2 == 0}
print(even_numbers)  # {2, 4}
```

### Dictionary comprehensions

Use `key: value` in curly braces:

```python
numbers = [1, 2, 3, 4, 5]
squared_dict = {x: x**2 for x in numbers if x % 2 == 0}
print(squared_dict)  # {2: 4, 4: 16}
```

## Generators

A generator produces values one at a time, only when asked. That lets you work with sequences that are too large to hold in memory, or even infinite.

### Generator functions

Any function that contains `yield` is a generator function. Calling it returns a generator object. Each time you ask for the next value, the function runs until the next `yield`, hands back that value and pauses.

```python
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b
```

This generator never ends, so stop iterating yourself:

```python
for num in fibonacci():
    if num > 100:
        break
    print(num)
```

That prints 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 and 89. `itertools.takewhile(lambda n: n <= 100, fibonacci())` does the same without the explicit `break`.

### Generator expressions

A generator expression looks like a list comprehension in parentheses:

```python
squares = (x**2 for x in range(10))

for square in squares:
    print(square)  # 0, 1, 4, ... 81
```

Nothing is computed until the loop asks for it. A generator can only be consumed once: a second `for square in squares:` loop prints nothing, because the generator is already exhausted. If you need the values again, build a list or create a new generator.

When a generator expression is the only argument to a function, you can drop the extra parentheses:

```python
total = sum(x**2 for x in range(10))  # 285
```

## Further reading

- [Functional Programming HOWTO](https://docs.python.org/3/howto/functional.html) in the Python docs
- [`functools`](https://docs.python.org/3/library/functools.html) and [`itertools`](https://docs.python.org/3/library/itertools.html) module docs
