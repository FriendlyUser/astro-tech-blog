---
description: Write and run Python tests with pytest, read its assertion output, and use
  fixtures, parametrize, pytest.raises and tmp_path with runnable examples.
imgSrc: /imgs/2023/3614994253.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-07T12:11:18.000Z'
lastUpdated: 2026-11-14
tags: ["python", "testing"]
title: 'Getting started with pytest: tests, fixtures and parametrize'
---

pytest is the most widely used test runner for Python. You write tests as plain functions that use the built-in `assert` statement, and pytest finds them, runs them, and shows the values involved when an assertion fails. Fixtures handle setup and teardown, and a large plugin ecosystem covers coverage, parallel runs, async code and more.

The current release is pytest 9.2, which requires Python 3.10 or later. Everything below also works on pytest 8.

## Installing

```bash
pip install pytest
```

## A first test

pytest collects files named `test_*.py` or `*_test.py`. Inside them, it runs functions whose names start with `test`, and methods whose names start with `test` in classes named `Test*` (those classes must not define `__init__`).

`example.py`:

```python
def add(a, b):
    return a + b
```

`test_example.py`:

```python
from example import add


def test_add():
    assert add(1, 2) == 3
    assert add(5, 7) == 12
```

Run `pytest` from the directory that contains both files:

```bash
pytest
```

The output ends with a summary line such as `1 passed in 0.01s`.

## Reading a failure

pytest rewrites `assert` statements in test modules so a failure reports the values on each side. Change the second assertion to `== 13` and run again:

```text
    def test_add():
        assert add(1, 2) == 3
>       assert add(5, 7) == 13
E       assert 12 == 13
E        +  where 12 = add(5, 7)

test_example.py:6: AssertionError
=========================== short test summary info ===========================
FAILED test_example.py::test_add - assert 12 == 13
```

You don't need `assertEqual` and its relatives. A plain `assert` on lists, dicts or strings also gets a diff of what differs.

## Parametrized tests

`@pytest.mark.parametrize` runs one test function with several sets of arguments. Each set shows up as a separate test, so one failing case doesn't hide the others:

```python
import pytest

from example import add


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (1, 2, 3),
        (5, 7, 12),
        (0, 0, 0),
        (-1, 1, 0),
    ],
)
def test_add_cases(a, b, expected):
    assert add(a, b) == expected
```

## Fixtures

A fixture is a function decorated with `@pytest.fixture`. A test requests it by naming it as a parameter. If the fixture uses `yield`, the code after the `yield` runs as teardown, even when the test fails.

This fixture creates an in-memory SQLite database for each test, so the example runs without any external services:

```python
import sqlite3

import pytest


@pytest.fixture
def db():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE users (name TEXT)")
    conn.executemany("INSERT INTO users VALUES (?)", [("ada",), ("grace",)])
    yield conn
    conn.close()


def test_user_count(db):
    (count,) = db.execute("SELECT COUNT(*) FROM users").fetchone()
    assert count == 2
```

Fixtures are created once per test by default. Pass `scope="module"` or `scope="session"` to share an expensive resource across tests. To use a fixture from several test files, put it in a `conftest.py` file. pytest loads `conftest.py` files automatically, so you don't import them.

## Built-in helpers worth knowing

`pytest.raises` checks that code raises an exception, and `tmp_path` is a built-in fixture that gives each test its own temporary directory as a `pathlib.Path`:

```python
import pytest


def test_divide_by_zero():
    with pytest.raises(ZeroDivisionError):
        1 / 0


def test_writes_file(tmp_path):
    out = tmp_path / "out.txt"
    out.write_text("hello")
    assert out.read_text() == "hello"
```

Other built-in fixtures include `monkeypatch` (temporarily set attributes, environment variables or dict items), `capsys` (capture stdout and stderr) and `caplog` (capture log records).

## Useful command-line options

| Option | What it does |
| --- | --- |
| `-v` | List each test with its result |
| `-x` | Stop after the first failure |
| `-k "add and not zero"` | Run only tests whose names match the expression |
| `--lf` | Re-run only the tests that failed last time |
| `-s` | Don't capture output, so `print` shows up immediately |
| `path/to/test_file.py::test_name` | Run a single test |

## Configuration

Put settings in `pyproject.toml` so everyone runs the tests the same way. pytest 9 reads a native `[tool.pytest]` table:

```toml
[tool.pytest]
testpaths = ["tests"]
addopts = ["-ra"]
```

On pytest 8 and earlier, use `[tool.pytest.ini_options]` instead, with `addopts = "-ra"` as a string. pytest 9 still reads the old table, but you can't define both.

## Further reading

- [pytest documentation](https://docs.pytest.org/en/stable/)
- [How to use fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- [Changelog](https://docs.pytest.org/en/stable/changelog.html)
