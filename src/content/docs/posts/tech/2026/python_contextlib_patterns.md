---
title: "contextlib patterns in Python: contextmanager, ExitStack, suppress and chdir"
description: "Write context managers with @contextmanager, handle exceptions in them, manage many resources with ExitStack, and use suppress, chdir and async versions."
tags: ["Python", "contextlib", "Context Managers", "Resource Management", "asyncio"]
pubDate: "2026-06-15T16:00:00.000Z"
imgSrc: "/imgs/2026/python_contextlib_patterns.webp"
imgAlt: "An ExitStack drawn as a stack of three open files and a callback, numbered in the reverse order they are exited"
---

A context manager is anything you can use in a `with` statement: it runs setup code on entry and cleanup code on exit, even when the block raises. Files, locks and database transactions are the usual examples. The `contextlib` module in the standard library has the tools for writing your own without a class, and for the awkward cases: a number of resources you only know at runtime, exceptions you want to ignore, or a working directory you need to change for a moment.

This post goes through the parts of `contextlib` I use most, with runnable examples. They were run on Python 3.12; `chdir` needs 3.11 or newer, and everything else works on any supported version.

## `@contextmanager`: a context manager from a generator

The class-based protocol is `__enter__` and `__exit__`. For most cases, a generator with one `yield` is shorter:

```python
import time
from contextlib import contextmanager


@contextmanager
def timed(label: str):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label}: {time.perf_counter() - start:.3f}s")


with timed("sleep"):
    time.sleep(0.05)
```

```text
sleep: 0.050s
```

Everything before `yield` is the setup, the value yielded is what `as` binds to, and everything after is the cleanup. The decorated function can also be used as a decorator, which runs the whole function inside the block each time it is called:

```python
@timed("nightly job")
def job() -> None:
    ...
```

### Always use `try`/`finally` around the `yield`

If the body of the `with` raises, the exception is thrown into the generator **at the `yield`**. Without `try`/`finally`, the cleanup code after the `yield` never runs:

```python
@contextmanager
def lock():
    print("acquire")
    yield
    print("release")  # skipped if the block raises


with lock():
    raise KeyError("x")
# prints "acquire", then the KeyError propagates; "release" is never printed
```

This is the most common bug in hand-written context managers. Put the cleanup in a `finally` unless you genuinely want it to run only on success.

### Handling exceptions inside the context manager

Because the exception arrives at the `yield`, you can catch it there. That makes "commit on success, roll back on failure" patterns natural. Here is a file writer that only replaces the target if the whole block succeeds, so a crash halfway through never leaves a half-written file:

```python
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def atomic_write(path: Path, mode: str = "w"):
    """Write to a temp file and rename it over `path` only if the block succeeds."""
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(fd, mode) as f:
            yield f
        os.replace(tmp, path)
    except BaseException:
        os.unlink(tmp)
        raise


target = Path(tempfile.mkdtemp()) / "settings.json"

with atomic_write(target) as f:
    f.write('{"debug": false}')

try:
    with atomic_write(target) as f:
        f.write('{"debug": tr')
        raise ValueError("serialiser blew up")
except ValueError as e:
    print("failed:", e)

print(target.read_text())
print(sorted(p.name for p in target.parent.iterdir()))
```

```text
failed: serialiser blew up
{"debug": false}
['settings.json']
```

The second write failed, the original file is untouched, and the temp file is gone. `os.replace` is atomic on the same filesystem, which is why the temp file is created in the target's directory.

Two rules for exceptions in a generator context manager:

- **Re-raise unless you mean to suppress.** If the generator catches the exception and does not raise, the `with` statement treats it as handled and execution continues after the block. That is occasionally what you want and usually a bug.
- **Catch `BaseException` when cleanup must happen on any exit**, including `KeyboardInterrupt` and task cancellation. Or use `finally`, which covers everything.

Yield exactly once. A generator that never yields raises `RuntimeError: generator didn't yield`, and one that yields twice raises `RuntimeError: generator didn't stop`.

## `ExitStack`: a variable number of resources

`with open(a) as fa, open(b) as fb:` is fine when you know there are two files. When the number comes from user input or a config file, you cannot write the `with` statement. `ExitStack` collects context managers at runtime and exits them all, in reverse order, when the stack itself exits:

```python
from contextlib import ExitStack

with ExitStack() as stack:
    files = [stack.enter_context(open(n)) for n in names]
    stack.callback(print, "all parts read; closing files")
    for f in files:
        print(f.readline().strip())

print("closed:", all(f.closed for f in files))
```

```text
line from part 0
line from part 1
line from part 2
all parts read; closing files
closed: True
```

The important property is what happens on a partial failure. If the third `open()` raises `FileNotFoundError`, the first two files are already registered on the stack, so they are closed as the exception propagates. A hand-written loop with a list and a `try`/`finally` is easy to get wrong here; `ExitStack` gets it right by construction.

The other methods:

- `stack.callback(fn, *args)` registers any function as cleanup, which is handy for things that are not context managers (`stack.callback(shutil.rmtree, tmpdir)`).
- `stack.push(exit_fn)` registers an `__exit__`-style function that sees the exception.
- `stack.pop_all()` moves everything onto a new `ExitStack` and returns it, so the current `with` block exits without closing anything.

`pop_all()` is how you write a function that opens resources safely but hands them to the caller:

```python
def open_all(paths):
    with ExitStack() as stack:
        files = [stack.enter_context(open(p)) for p in paths]
        # If any open() failed we never get here, and the stack closed the rest.
        return stack.pop_all(), files


stack, files = open_all(names)
with stack:
    ...  # use files; they are closed when this block exits
```

If all opens succeed, ownership moves to the caller's `with stack:`. If one fails, the function's own `with` closes the ones that were opened.

## `suppress`: ignore specific exceptions

```python
import os
from contextlib import suppress

with suppress(FileNotFoundError):
    os.remove("cache.tmp")
```

It is the same as `try: ... except FileNotFoundError: pass`, in fewer lines and with the intent in the first line. Two warnings. Anything after the failing statement inside the block is skipped too, so keep the block to one statement. And never write `suppress(Exception)`: that hides bugs, which is the reason bare `except: pass` has a bad reputation.

## `chdir`: change directory for one block (3.11+)

Some tools only work relative to the current directory. `chdir` changes it on entry and restores the previous one on exit, even if the block raises:

```python
from contextlib import chdir
from pathlib import Path

print("before:", Path.cwd())
with chdir("/tmp"):
    print("inside:", Path.cwd())
print("after:", Path.cwd())
```

The current directory is process-wide state. `chdir` is not safe to use while other threads, or other asyncio tasks that might be scheduled during the block, depend on the current directory. In library code and anything concurrent, pass explicit paths (or `cwd=` to `subprocess.run`) instead.

## `asynccontextmanager`

The async version works the same way, with `await` allowed before and after the `yield`, and it is used with `async with`:

```python
import asyncio
from contextlib import asynccontextmanager


class FakePool:
    async def acquire(self):
        await asyncio.sleep(0.01)
        print("  acquired connection")
        return "conn-1"

    async def release(self, conn):
        await asyncio.sleep(0.01)
        print("  released", conn)


@asynccontextmanager
async def connection(pool: FakePool):
    conn = await pool.acquire()
    try:
        yield conn
    finally:
        await pool.release(conn)


async def main():
    async with connection(FakePool()) as conn:
        print("  using", conn)


asyncio.run(main())
```

```text
  acquired connection
  using conn-1
  released conn-1
```

The `try`/`finally` rule matters even more here. If the task is cancelled inside the block, `CancelledError` arrives at the `yield`, and only a `finally` (or an `except BaseException` that re-raises) gets the connection back to the pool.

`AsyncExitStack` is the async counterpart of `ExitStack`, with `enter_async_context()` and `push_async_callback()` for async resources. It also accepts regular context managers through `enter_context()`.

## Other small helpers worth knowing

- `nullcontext(value)` does nothing and returns `value`. Use it when a `with` is sometimes needed: `with (lock if threaded else nullcontext()):`.
- `closing(obj)` calls `obj.close()` on exit, for objects with a `close()` method that are not context managers.
- `redirect_stdout(buffer)` and `redirect_stderr(buffer)` capture output from code that prints. Like `chdir`, they change global state, so keep them out of threaded code.

## When to write a class instead

A generator-based context manager is single-use: each call creates a new generator, and you cannot enter the same object twice. If you need a reusable or re-entrant object (a lock you enter many times, a connection pool object that is also its own context manager), write a class with `__enter__` and `__exit__`, or `__aenter__` and `__aexit__`. `contextlib.AbstractContextManager` provides a default `__enter__` that returns `self`.

## Further reading

- [`contextlib` documentation](https://docs.python.org/3/library/contextlib.html)
- [ExitStack examples and recipes](https://docs.python.org/3/library/contextlib.html#examples-and-recipes)
- [The `with` statement in the language reference](https://docs.python.org/3/reference/compound_stmts.html#the-with-statement)
- [PEP 343: The "with" statement](https://peps.python.org/pep-0343/)
