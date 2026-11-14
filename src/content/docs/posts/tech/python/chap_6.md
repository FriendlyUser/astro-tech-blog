---
tags: ['python', 'introtopython']
title: "Chapter 6: Handling and raising exceptions in Python"
description: How Python exceptions work, catching them with try/except/else/finally, raising your own with raise and assert, and defining custom exception classes.
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2921207460.png

---
When something goes wrong at runtime (a missing file, a bad argument, a missing dictionary key), Python raises an exception. An exception is an object: it has a type, a message, and a traceback showing the chain of calls that led to it. If nothing catches it, the program stops and prints that traceback.

## Common built-in exceptions

These are the ones you'll see most often:

- `NameError`: a variable or function name isn't defined.
- `TypeError`: an operation is applied to the wrong type, e.g. `"1" + 1`.
- `ValueError`: the type is right but the value isn't, e.g. `int("abc")`.
- `IndexError`: a sequence index is out of range.
- `KeyError`: a dictionary key doesn't exist.
- `ImportError` / `ModuleNotFoundError`: a module can't be imported.
- `OSError`: an operating-system or I/O call failed. `IOError` is just an alias of `OSError` since Python 3.3, and subclasses like `FileNotFoundError` and `PermissionError` let you catch specific cases.
- `SyntaxError`: the code can't be parsed. This is raised before your module runs, so you can't catch it with a `try` in the same file; you'll only catch it around things like `eval()`, `exec()` or `import`.

All of these inherit from `Exception`, which in turn inherits from `BaseException`. See the [exception hierarchy](https://docs.python.org/3/library/exceptions.html#exception-hierarchy) for the full tree.

## Catching exceptions with try/except

```python
try:
    # code that might raise
    ...
except SomeError:
    # runs only if SomeError (or a subclass) was raised
    ...
else:
    # runs only if the try block raised nothing
    ...
finally:
    # always runs, whether or not an exception happened
    ...
```

- You can have several `except` clauses; the first one that matches the exception type wins.
- `except SomeError as e:` binds the exception object so you can inspect or log it.
- `else` is the place for code that should run only on success. Keeping it out of the `try` block means you don't accidentally catch errors from it.
- `finally` is for cleanup, such as closing files or connections. For files, a `with` block (covered in the next chapter) usually does this for you.

A small example:

```python
def parse_age(text):
    try:
        age = int(text)
    except ValueError:
        print(f"{text!r} is not a whole number")
        return None
    else:
        print("Parsed OK")
        return age
    finally:
        print("Done parsing")


parse_age("42")    # Parsed OK, Done parsing -> 42
parse_age("forty") # 'forty' is not a whole number, Done parsing -> None
```

Note that `finally` runs even when the `try` or `except` block returns.

Catching the right errors matters:

```python
my_list = [1, 2, 3]
try:
    print(my_list[3])
except IndexError:
    print("Index is out of range")

my_dict = {"name": "John", "age": 30}
try:
    print(my_dict["address"])
except KeyError as e:
    print(f"Key not found: {e}")
```

For dictionaries, `my_dict.get("address")` (which returns `None` or a default) is often simpler than catching `KeyError`.

### Avoid bare `except:`

Leaving out the exception type (`except:`) catches *everything*, including `KeyboardInterrupt` (Ctrl+C) and `SystemExit`, and hides bugs such as typos that raise `NameError`. If you really need a catch-all, use `except Exception as e:` and log or re-raise `e`.

## Raising exceptions

Use `raise` with an exception instance:

```python
def set_age(age):
    if age < 0:
        raise ValueError("Age cannot be negative")
    return age
```

Inside an `except` block, a plain `raise` re-raises the current exception. To translate one exception into another while keeping the original in the traceback, use `raise ... from ...`:

```python
def load_port(config):
    try:
        return int(config["port"])
    except (KeyError, ValueError) as e:
        raise RuntimeError("config needs an integer 'port'") from e
```

For checking user input, try the conversion and catch the error rather than pre-validating with string methods. For example, `"-5".isdigit()` is `False` even though `int("-5")` works:

```python
text = input("Enter a number: ")
try:
    number = int(text)
except ValueError:
    print("Input must be a whole number")
```

## assert

`assert condition, "message"` raises `AssertionError` with that message if the condition is false:

```python
x = -1
assert x > 0, "Value must be positive"  # AssertionError: Value must be positive
```

Asserts are for checking your own assumptions while developing. Don't use them to validate user input or enforce rules: running Python with `-O` removes all `assert` statements, so the check silently disappears. Use `raise` for anything that must always be checked.

## Custom exceptions

Define your own exception by subclassing `Exception`. A custom type lets callers catch your error specifically, without also catching unrelated `ValueError`s:

```python
class NegativeInputError(Exception):
    """Raised when a function receives a negative number."""


def square(x):
    if x < 0:
        raise NegativeInputError(f"Input must be non-negative, got {x}")
    return x ** 2


try:
    result = square(-1)
except NegativeInputError as e:
    print(e)  # Input must be non-negative, got -1
```

In a larger project it's common to define one base exception for the package (`class MyAppError(Exception)`) and derive the specific errors from it, so callers can catch all of them with a single `except MyAppError`.

## Further reading

- [Errors and Exceptions](https://docs.python.org/3/tutorial/errors.html) in the official Python tutorial
- [Built-in Exceptions](https://docs.python.org/3/library/exceptions.html) reference
