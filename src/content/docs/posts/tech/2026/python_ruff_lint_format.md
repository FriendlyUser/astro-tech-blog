---
title: "Linting and formatting Python with Ruff"
description: "Configure Ruff in pyproject.toml, pick rule sets (E, F, I, UP, B), apply safe and unsafe fixes, compare ruff format with Black, and run both checks in CI."
tags: ["Python", "Ruff", "Linting", "Code Formatting", "pyproject.toml"]
pubDate: "2026-08-26T16:00:00.000Z"
imgSrc: "/imgs/2026/python_ruff_lint_format.webp"
imgAlt: "A terminal showing ruff check findings such as E401, F401 and B006, then ruff check --fix and ruff format ending in All checks passed"
---

Ruff is a Python linter and formatter from Astral, shipped as a single binary. One tool replaces Flake8 and many of its plugins, isort, pyupgrade and Black, reads its configuration from `pyproject.toml`, and is fast enough to run on every save. Most projects adopt it for the speed and keep it because there is only one tool to configure.

This post sets up Ruff on a small package: choosing rule sets, fixing what it finds, formatting, per-file exceptions, and wiring it into CI. Examples use Ruff 0.16.4. That matters, because 0.16.0 (July 23, 2026) changed the default rule set; more on that below.

## Running it

You don't need to add Ruff to a project to try it:

```bash
uvx ruff check .
uvx ruff format .
```

For a project, pin it as a dev dependency so everyone runs the same version: `uv add --dev ruff` or `pip install ruff==0.16.4`. Ruff has two subcommands that matter: `ruff check` (the linter) and `ruff format` (the formatter). They are configured separately and run separately.

## A file with problems

Here is `src/shop/orders.py`, written in an older style with a few real bugs mixed in:

```python
import os, sys
import json
from typing import List, Optional, Dict


def load_orders(path: str, cache: Dict[str, list] = {}) -> List[dict]:
    if path in cache:
        return cache[path]
    f = open(path)
    data = json.load(f)
    cache[path] = data
    return data


def total(orders: List[dict], currency: Optional[str] = None) -> float:
    result = 0
    for o in orders:
        if currency != None and o["currency"] != currency:
            continue
        result += o['amount']
    return result


def summary(orders):
    try:
        t = total(orders)
    except Exception:
        raise ValueError("bad orders")
    return "Total: {}".format(t)
```

And a test that uses a star import:

```python
# tests/test_orders.py
from shop.orders import *


def test_total():
    assert total([{"amount": 2, "currency": "CAD"}]) == 2
```

## Choosing rules

Every Ruff rule has a code made of a prefix and a number. The prefix is the linter the rule came from:

| Prefix | Origin | What it catches |
|---|---|---|
| `E` | pycodestyle errors | Style errors such as `== None`, several imports on one line |
| `F` | Pyflakes | Unused imports and variables, undefined names, star imports |
| `I` | isort | Unsorted or badly grouped imports |
| `UP` | pyupgrade | Old syntax that has a newer equivalent for your target Python |
| `B` | flake8-bugbear | Likely bugs: mutable defaults, `raise` without `from` in `except` |

Before 0.16, Ruff with no configuration enabled 59 rules (`E4`, `E7`, `E9` and `F`). Since 0.16.0 the default set has 413 rules, including many from `B`, `UP` and Ruff's own `RUF` category, and 18 of the more opinionated `E` and `F` rules (`E711` and `F403`, for example) were taken out of the default. The full list is on the [Default Rules](https://docs.astral.sh/ruff/default-rules/) page.

I would still write the rule selection down explicitly. It makes the project's choices visible in review, and an upgrade of Ruff will not silently change what is checked. Add this to `pyproject.toml`:

```toml
[project]
name = "shop"
version = "0.1.0"
requires-python = ">=3.12"

[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
```

`select` replaces the default set entirely. If you would rather keep the defaults and add to them, use `extend-select` instead. Ruff reads the target Python version from `requires-python`, which is what tells the `UP` rules that `list[dict]` and `str | None` are safe to use.

Now run the linter. The default output shows a code frame and the proposed fix for every problem; `--output-format concise` gives one line each:

```bash
ruff check --output-format concise .
```

```text
src\shop\orders.py:1:1: E401 [*] Multiple imports on one line
src\shop\orders.py:1:1: I001 [*] Import block is un-sorted or un-formatted
src\shop\orders.py:1:8: F401 [*] `os` imported but unused
src\shop\orders.py:1:12: F401 [*] `sys` imported but unused
src\shop\orders.py:3:1: UP035 `typing.List` is deprecated, use `list` instead
src\shop\orders.py:3:1: UP035 `typing.Dict` is deprecated, use `dict` instead
src\shop\orders.py:6:35: UP006 [*] Use `dict` instead of `Dict` for type annotation
src\shop\orders.py:6:53: B006 Do not use mutable data structures for argument defaults
src\shop\orders.py:6:60: UP006 [*] Use `list` instead of `List` for type annotation
src\shop\orders.py:15:19: UP006 [*] Use `list` instead of `List` for type annotation
src\shop\orders.py:15:41: UP045 [*] Use `X | None` for type annotations
src\shop\orders.py:18:24: E711 Comparison to `None` should be `cond is not None`
src\shop\orders.py:28:9: B904 Within an `except` clause, raise exceptions with `raise ... from err` or `raise ... from None` to distinguish them from errors in exception handling
src\shop\orders.py:29:12: UP032 [*] Use f-string instead of `format` call
tests\test_orders.py:1:1: F403 `from shop.orders import *` used; unable to detect undefined names
tests\test_orders.py:5:12: F405 `total` may be undefined, or defined from star imports
Found 16 errors.
[*] 9 fixable with the `--fix` option (2 hidden fixes can be enabled with the `--unsafe-fixes` option).
```

(The paths use backslashes because this was run on Windows.) To learn what a rule is about, `ruff rule B904` prints its documentation, including why it matters and an example of the fix.

## Fixing: safe and unsafe

Rules marked `[*]` have a fix Ruff considers **safe**: it does not change what the code does. Apply them all with:

```bash
ruff check --fix .
```

```text
src\shop\orders.py:4:53: B006 Do not use mutable data structures for argument defaults
src\shop\orders.py:16:24: E711 Comparison to `None` should be `cond is not None`
src\shop\orders.py:26:9: B904 Within an `except` clause, raise exceptions with `raise ... from err` or `raise ... from None` to distinguish them from errors in exception handling
tests\test_orders.py:1:1: F403 `from shop.orders import *` used; unable to detect undefined names
tests\test_orders.py:5:12: F405 `total` may be undefined, or defined from star imports
Found 16 errors (11 fixed, 5 remaining).
No fixes available (2 hidden fixes can be enabled with the `--unsafe-fixes` option).
```

Eleven problems went away: the imports were split, sorted and pruned, `List`, `Dict` and `Optional` became `list`, `dict` and `str | None`, and `.format()` became an f-string.

The two "hidden" fixes are **unsafe**: they might change behaviour. Look at them before applying:

```bash
ruff check --unsafe-fixes --diff .
```

```diff
-def load_orders(path: str, cache: dict[str, list] = {}) -> list[dict]:
+def load_orders(path: str, cache: dict[str, list] = None) -> list[dict]:
+    if cache is None:
+        cache = {}
     if path in cache:
         return cache[path]
 ...
-        if currency != None and o["currency"] != currency:
+        if currency is not None and o["currency"] != currency:
```

The `E711` fix is fine here. It is marked unsafe because `!= None` calls `__ne__`, which a class can override, while `is not None` does not. The `B006` fix shows why "unsafe" exists. The mutable default in `load_orders` is a bug in most code, but in this function the shared dict is being used, deliberately or not, as a cache across calls. The fix would quietly turn the cache off, and it would also leave the annotation wrong (`dict[str, list] = None` should be `dict[str, list] | None`). Unsafe fixes are worth reading one by one. Here the right change is to remove the hidden cache entirely and fix the file handle while we are at it.

`B904` has no automatic fix because Ruff cannot know whether you want `from err` or `from None`.

## Per-file ignores and inline suppressions

Star imports are a reasonable thing to flag in library code and a reasonable thing to allow in some test files. Rather than turning `F403` off everywhere, scope the exception:

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]
ignore = ["E501"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["F403", "F405"]

[tool.ruff.lint.isort]
known-first-party = ["shop"]
```

`ignore = ["E501"]` turns off the line-length rule. The formatter already decides where lines break, and the long lines it leaves behind are usually strings or comments it cannot split; many projects would rather not hand-wrap those. Keep `E501` if you want a hard limit. The `isort.known-first-party` setting makes sure `shop` imports are grouped as your own code rather than as third-party packages.

For a single line, `# noqa: F401` works as it did in Flake8. Ruff 0.16 also added its own comment, `# ruff: ignore[F401]`, which can go at the end of the line or on the line before it. Always name the rule; a bare `# noqa` hides everything on that line, including problems added later.

After fixing the remaining issues by hand (a `with` block for the file, `is not None`, and `raise ... from err`), the module looks like this:

```python
import json
from pathlib import Path


def load_orders(path: Path) -> list[dict]:
    with path.open() as f:
        return json.load(f)


def total(orders: list[dict], currency: str | None = None) -> float:
    result = 0
    for o in orders:
        if currency is not None and o["currency"] != currency:
            continue
        result += o["amount"]
    return result


def summary(orders: list[dict]) -> str:
    try:
        t = total(orders)
    except KeyError as err:
        raise ValueError("order is missing a field") from err
    return f"Total: {t}"
```

```text
$ ruff check .
All checks passed!
```

## `ruff format` and Black

`ruff format` is designed as a near drop-in replacement for Black: the same style choices (double quotes, magic trailing commas, 88 characters by default) and, on code Black has already formatted, very few differences. The differences that do exist are listed in Ruff's documentation, and they are mostly edge cases in how comments and long expressions are placed.

See what it would change without writing anything. Run against the file as it was right after `ruff check --fix`, only the quote style is left:

```bash
ruff format --diff .
```

```diff
--- src\shop\orders.py
+++ src\shop\orders.py
@@ -15,7 +15,7 @@
     for o in orders:
         if currency != None and o["currency"] != currency:
             continue
-        result += o['amount']
+        result += o["amount"]
     return result
```

The formatter has a handful of options under `[tool.ruff.format]`: `quote-style`, `indent-style`, `line-ending`, `docstring-code-format`, `skip-magic-trailing-comma`. `line-length` lives under `[tool.ruff]` and applies to both the formatter and `E501`.

Since 0.16, `ruff format` also formats Python code blocks inside Markdown files. If your README contains deliberately unformatted examples, either wrap them in `<!-- fmt: off -->` and `<!-- fmt: on -->` or exclude Markdown with `extend-exclude = ["*.md"]` under `[tool.ruff]`.

Two things to know when switching from Black:

- **Run the formatter after the linter's fixes.** `ruff check --fix` can produce code the formatter would lay out differently, so run `ruff check --fix` first and `ruff format` second.
- **Keep formatter-conflicting lint rules off.** Some lint rules disagree with the formatter, such as `COM812` (missing trailing comma). `ruff format` prints a warning naming any conflicting rule in your selection, and recommends adding it to `ignore`.

## Running it in CI

In CI you want both commands to **fail on problems without changing files**:

```bash
ruff check .
ruff format --check .
```

`ruff check` exits non-zero if anything is found; `ruff format --check` exits non-zero if any file would be reformatted. With `--output-format github`, both print GitHub Actions annotations, so problems appear inline on the pull request's diff.

A minimal GitHub Actions workflow using Astral's action:

```yaml
name: lint
on: [push, pull_request]

jobs:
  ruff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: astral-sh/ruff-action@v4
        with:
          version: "0.16.4"
          args: "check --output-format github"
      - uses: astral-sh/ruff-action@v4
        with:
          version: "0.16.4"
          args: "format --check --output-format github"
```

If `version` is omitted, the action looks for a Ruff version pinned in `pyproject.toml` and falls back to the newest release. Pin it one way or the other, so a new Ruff release does not break your build unannounced. On other CI systems, `uvx ruff@0.16.4 check .` works anywhere uv is installed.

For local enforcement, the official pre-commit hooks are in `astral-sh/ruff-pre-commit`, with hook IDs `ruff-check` (pass `args: [--fix]` to fix) and `ruff-format`. Put `ruff-check` first, for the same reason as above.

## Gotchas

- **`select` versus `extend-select`.** `select` throws away the defaults; `extend-select` adds to them. Mixing them up is the usual reason a rule is unexpectedly on or off.
- **Upgrades can add findings.** New rules and changed defaults land in minor releases, as 0.16 showed. Pin the version and upgrade deliberately, reading the changelog.
- **`ruff format` is not configurable like YAPF.** If your team wants a style Black would not produce, Ruff's formatter will not give it to you either.
- **Ruff is not a type checker.** It does not replace mypy or Pyright, although rules such as `F821` (undefined name) catch some of the same mistakes.

## Further reading

- [Ruff documentation](https://docs.astral.sh/ruff/)
- [Configuring Ruff](https://docs.astral.sh/ruff/configuration/)
- [Rules reference](https://docs.astral.sh/ruff/rules/)
- [The Ruff formatter, including differences from Black](https://docs.astral.sh/ruff/formatter/)
- [Ruff v0.16.0 release post](https://astral.sh/blog/ruff-v0.16.0)
