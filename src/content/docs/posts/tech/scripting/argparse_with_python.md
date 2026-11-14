---
title: "Python argparse basics: positional arguments, flags and a small CLI"
description: "How to define positional arguments and flags with Python's argparse module, with a sum/max example and a small book-tracker CLI that saves to JSON."
alt: git commits with golang
tags: ["python", "argparse"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 21 April 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/bear_book_1.png'
---

[`argparse`](https://docs.python.org/3/library/argparse.html) is the standard-library module for building command-line interfaces in Python. You declare the arguments your script accepts; `argparse` parses `sys.argv`, converts types, generates `--help` output, and exits with a usage message when the input is invalid.

## Positional arguments and a flag

This script takes one or more integers and prints their maximum, or their sum if you pass `--sum`:

```python
import argparse

parser = argparse.ArgumentParser(description="Sum or find the maximum of some integers.")
parser.add_argument("integers", metavar="N", type=int, nargs="+",
                    help="an integer to process")
parser.add_argument("--sum", dest="accumulate", action="store_const",
                    const=sum, default=max,
                    help="sum the integers (default: find the max)")

args = parser.parse_args()
print(args.accumulate(args.integers))
```

- `"integers"` has no leading dashes, so it's a positional argument. `nargs="+"` means "one or more" and collects the values into a list; `type=int` converts each one.
- `--sum` is an optional flag. `action="store_const"` stores `const` (the built-in `sum` function) when the flag is present, and `default` (the built-in `max`) when it isn't. `dest="accumulate"` sets the attribute name on `args`.

```text
$ python script.py 1 2 3 --sum
6
$ python script.py 1 2 3
3
$ python script.py a
usage: script.py [-h] [--sum] N [N ...]
script.py: error: argument N: invalid int value: 'a'
```

Invalid input exits with status 2 and a usage line, and `python script.py -h` prints help built from the `help=` strings, without any extra code.

## A small book tracker

Here's a slightly bigger example: a CLI that keeps track of the books a bear has read. Each run of a script starts with a fresh process, so the list has to be stored somewhere between runs; this version saves it to `books.json` in the current directory.

```python
import argparse
import json
from pathlib import Path

BOOKS_FILE = Path("books.json")


def load_books():
    if BOOKS_FILE.exists():
        return json.loads(BOOKS_FILE.read_text())
    return []


def save_books(books):
    BOOKS_FILE.write_text(json.dumps(books, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Bear book tracker")
    parser.add_argument("--add", metavar="TITLE",
                        help="add a book to the reading list")
    parser.add_argument("--list", action="store_true",
                        help="list the books the bear has read")
    args = parser.parse_args()

    if not (args.add or args.list):
        parser.error("nothing to do: pass --add TITLE and/or --list")

    books = load_books()

    if args.add:
        books.append(args.add)
        save_books(books)
        print(f"Added {args.add!r}")

    if args.list:
        print("Bear's books:")
        for book in books:
            print(f"- {book}")


if __name__ == "__main__":
    main()
```

```text
$ python book_tracker.py --add "The Giving Tree"
Added 'The Giving Tree'
$ python book_tracker.py --add "Corduroy" --list
Added 'Corduroy'
Bear's books:
- The Giving Tree
- Corduroy
```

`parser.error()` prints the usage line plus your message and exits with status 2, the same way `argparse` reports its own errors.

## Next steps

- When a CLI grows several distinct actions (`add`, `list`, `remove`), switch from flags to subcommands with [`add_subparsers()`](https://docs.python.org/3/library/argparse.html#sub-commands), the way `git` has `git add` and `git log`.
- Use `choices=[...]` to restrict a value to a fixed set, and `required=True` for options that must be present.
- Use `add_mutually_exclusive_group()` when two flags can't be combined.
- Splitting the command line into arguments happens before `argparse` sees it, so values containing spaces need quotes, as in the example above.

The [argparse tutorial](https://docs.python.org/3/howto/argparse.html) in the Python docs covers these step by step.
