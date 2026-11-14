---
tags: ['python', 'introtopython']
title: Writing generator functions with yield in Python
description: How the yield keyword turns a function into a generator, how to consume one with a for loop or next(), and when generators save memory.
pubDate: Fri, 21 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1895495590.png
---

Any function that contains the `yield` keyword is a generator function. Calling it doesn't run the body; it returns a generator, an iterator that produces values one at a time as you ask for them.

That makes generators useful for large or infinite sequences: values are produced on demand instead of being built into a list and held in memory all at once.

## A countdown generator

```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1
```

Each time execution reaches `yield n`, the function hands `n` back to the caller and pauses, keeping its local variables. When the next value is requested, it resumes on the line after the `yield`.

The usual way to consume a generator is a `for` loop:

```python
for i in countdown(5):
    print(i)
```

Output:

```text
5
4
3
2
1
```

## What the for loop does for you

You can also pull values by hand with `next()`. When the function returns (here, when the `while` loop ends), the generator raises `StopIteration`, which is how a `for` loop knows to stop:

```python
>>> gen = countdown(2)
>>> next(gen)
2
>>> next(gen)
1
>>> next(gen)
Traceback (most recent call last):
  ...
StopIteration
```

A generator can only be iterated once. After it is exhausted, call `countdown(5)` again to get a fresh one.

## Generator expressions

For simple cases you don't need a function. A generator expression looks like a list comprehension with parentheses:

```python
squares = (x * x for x in range(1_000_000))
print(sum(squares))
```

`sum` consumes the values one by one, so the million squares are never stored in a list.

## Delegating with yield from

`yield from` passes through every value from another iterable, which is handy when one generator builds on another:

```python
def countdown_twice(n):
    yield from countdown(n)
    yield from countdown(n)

print(list(countdown_twice(2)))  # [2, 1, 2, 1]
```

## When not to use a generator

If you need to index into the results, take their `len()`, or loop over them more than once, a list is simpler. Generators pay off when the sequence is large, expensive to compute, or never-ending, such as reading a big file line by line or streaming records from an API.

Further reading: [Generators](https://docs.python.org/3/howto/functional.html#generators) in the Python functional programming HOWTO, and the [`yield` expression](https://docs.python.org/3/reference/expressions.html#yield-expressions) reference.
