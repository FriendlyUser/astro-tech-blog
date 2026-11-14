---
tags: ['python']
title: "Introduction to Python: where it came from, what it's used for, lists and argparse"
description: A short introduction to Python's origins and common uses, followed by two first examples, working with lists and parsing command-line arguments with argparse.
pubDate: Fri, 30 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1666734888.webp"
---

Python is a high-level, interpreted, dynamically typed language. Guido van Rossum first released it in February 1991 (version 0.9.0). The name comes from the comedy series *Monty Python's Flying Circus*, not the snake. Its design favours readability: indentation marks code blocks, and the standard library covers a lot without extra installs.

Van Rossum based Python on ABC, a teaching language he had worked on at CWI in the Netherlands. He kept ABC's readability and added things ABC lacked, such as exceptions, modules and access to the operating system. Python 2 reached end of life on 1 January 2020, so anything new should use Python 3.

## What Python is used for

- **Web back ends**: Django and Flask, plus FastAPI for APIs.
- **Data analysis and scientific computing**: NumPy, pandas, SciPy and Matplotlib.
- **Machine learning**: PyTorch, TensorFlow and scikit-learn. The heavy computation runs in C/C++/CUDA underneath, and Python is the interface.
- **Automation and scripting**: system administration, DevOps tooling, and glue code between other programs.
- **Finance**: data analysis with pandas, and quantitative libraries such as QuantLib, a C++ library with Python bindings.
- **Simple games**: 2D games with Pygame.

The common thread is a large ecosystem of packages on [PyPI](https://pypi.org/) and a low barrier to getting something working.

## Lists

A list is an ordered, mutable collection written with square brackets. Items can be of any type, including other lists.

```python
fruits = ["apple", "banana", "cherry"]
print(fruits)        # ['apple', 'banana', 'cherry']

print(fruits[0])     # 'apple', since indexes start at 0
print(fruits[-1])    # 'cherry', since negative indexes count from the end
print(fruits[0:2])   # ['apple', 'banana'], a slice that excludes the end index

fruits.append("date")       # add to the end
fruits.remove("banana")     # remove the first matching value
fruits.sort(reverse=True)   # sort in place
print(fruits, len(fruits))  # ['date', 'cherry', 'apple'] 3

more = fruits + ["elderberry"]  # concatenation creates a new list
```

`list.sort()` changes the list in place and returns `None`. `sorted(fruits)` returns a new sorted list and leaves the original alone. Mixing the two up is a common beginner bug.

## Command-line arguments with argparse

The standard-library `argparse` module parses command-line options and validates their types. It also generates `--help` output for you.

```python
import argparse

parser = argparse.ArgumentParser(description="Example argparse script.")
parser.add_argument("-n", "--name", required=True, help="your name")
parser.add_argument("-a", "--age", type=int, help="your age")

args = parser.parse_args()

print("Hello,", args.name)
if args.age is not None:
    print("Your age is", args.age)
```

Save it as `example.py` and run it:

```bash
$ python example.py -n Alice -a 30
Hello, Alice
Your age is 30
```

How it works:

- `ArgumentParser(description=...)` creates the parser. The description appears in `python example.py --help`.
- `add_argument` declares each option. Options are optional unless you pass `required=True`. An option that isn't given is `None`, unless you set `default=`.
- `type=int` converts the value. Passing `-a thirty` makes argparse exit with an error message instead of crashing later.
- `parse_args()` reads `sys.argv` and returns a namespace. The long option name becomes the attribute name, so `--age` becomes `args.age`.

The [argparse tutorial](https://docs.python.org/3/howto/argparse.html) covers positional arguments, flags (`action="store_true"`), choices and subcommands.

## References
- https://github.com/FriendlyUser/bookapi
