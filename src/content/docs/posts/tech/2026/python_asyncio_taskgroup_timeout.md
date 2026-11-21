---
title: "asyncio TaskGroup and asyncio.timeout: structured concurrency in Python"
description: "Replace asyncio.gather with TaskGroup, handle failures with ExceptionGroup and except*, add deadlines with asyncio.timeout, and cap concurrency."
tags: ["Python", "asyncio", "Concurrency", "TaskGroup", "Async"]
pubDate: "2026-03-03T16:00:00.000Z"
imgSrc: "/imgs/2026/python_asyncio_taskgroup_timeout.webp"
imgAlt: "A timeline of three tasks in a TaskGroup where task b fails at 0.5 seconds and tasks a and c are cancelled at the same moment"
---

`asyncio.TaskGroup` and `asyncio.timeout` arrived in Python 3.11, and together they give asyncio what Trio users call structured concurrency: tasks started inside a block are finished, one way or another, by the time the block exits. No task outlives the code that started it, and a failure in one task cancels its siblings instead of leaving them running in the background.

This post compares `TaskGroup` with `asyncio.gather`, shows how failures come out as an `ExceptionGroup`, adds per-request and overall deadlines, and puts it all together in a small concurrent fetcher with a concurrency limit. Examples were run on Python 3.12; everything shown needs 3.11 or newer.

## The problem with `gather`

`asyncio.gather` runs awaitables concurrently and returns their results in order. Its default failure behaviour is the problem: when one awaitable raises, `gather` propagates that exception immediately, and **the others keep running**. Nothing awaits them any more, so their results and any later exceptions are lost.

Here is a helper that logs when it finishes or gets cancelled:

```python
import asyncio
import time

START = time.perf_counter()


def log(msg: str) -> None:
    print(f"{time.perf_counter() - START:4.1f}s {msg}")


async def fetch(name: str, delay: float, fail: bool = False) -> str:
    try:
        await asyncio.sleep(delay)
        if fail:
            raise ConnectionError(f"{name} refused the connection")
        log(f"{name} done")
        return f"{name}: ok"
    except asyncio.CancelledError:
        log(f"{name} cancelled")
        raise
```

With `gather`, task `b` fails after half a second:

```python
async def with_gather() -> None:
    log("gather: start")
    try:
        await asyncio.gather(fetch("a", 1), fetch("b", 0.5, fail=True), fetch("c", 2))
    except ConnectionError as e:
        log(f"gather raised: {e}")
    await asyncio.sleep(2)  # give the orphans time to show themselves
    log("gather: end")
```

```text
 0.0s gather: start
 0.5s gather raised: b refused the connection
 1.0s a done
 2.0s c done
 2.6s gather: end
```

The caller has already moved on to error handling at 0.5 s, but `a` and `c` carry on and finish later. In a real program those might be HTTP requests or database writes happening after you decided the operation failed.

## The same thing with `TaskGroup`

```python
async def with_taskgroup() -> None:
    log("taskgroup: start")
    try:
        async with asyncio.TaskGroup() as tg:
            tg.create_task(fetch("a", 1))
            tg.create_task(fetch("b", 0.5, fail=True))
            tg.create_task(fetch("c", 2))
    except* ConnectionError as eg:
        for e in eg.exceptions:
            log(f"taskgroup raised: {e!r}")
    log("taskgroup: end")
```

```text
 0.0s taskgroup: start
 0.5s c cancelled
 0.5s a cancelled
 0.5s taskgroup raised: ConnectionError('b refused the connection')
 0.5s taskgroup: end
```

When `b` fails, the group cancels `a` and `c`, **waits for them to finish cancelling**, and only then raises. By the time the `except*` clause runs, nothing from the group is still running.

The rules for a `TaskGroup` block:

- `tg.create_task()` schedules a task and returns it. You can keep the task object and read `task.result()` after the block.
- Leaving the `async with` block waits for every task in the group.
- If any task raises (other than `CancelledError`), the remaining tasks are cancelled. The body of the `async with` is cancelled too, if it is still running.
- All the exceptions are collected and raised together as an `ExceptionGroup` (or `BaseExceptionGroup`).
- If the body itself raises, the tasks are cancelled the same way.

## `ExceptionGroup` and `except*`

Because more than one task can fail before the cancellation takes effect, `TaskGroup` always raises a group, even for a single failure. A plain `except ValueError:` does not catch it:

```python
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(work(3))  # raises ValueError
except ValueError:
    print("never printed")
except ExceptionGroup as eg:
    print(eg)  # unhandled errors in a TaskGroup (1 sub-exception)
```

`except*` (also new in 3.11) matches exceptions *inside* the group. Each `except*` clause receives a group containing only the matching exceptions, and several clauses can run for one group:

```python
try:
    async with asyncio.TaskGroup() as tg:
        for url in urls:
            tg.create_task(download(url))
except* TimeoutError as eg:
    print(f"{len(eg.exceptions)} downloads timed out")
except* ConnectionError as eg:
    print(f"{len(eg.exceptions)} hosts refused")
```

Anything not matched by an `except*` clause is re-raised in a new group. You cannot mix `except` and `except*` in the same `try`.

Do not expect the group to contain one exception per failing task. Once the first failure triggers cancellation, the other tasks are usually cancelled before they get a chance to fail. In a test with tasks set to fail at 0.3 s and 0.6 s, only the first error was in the group; the second task was cancelled at 0.3 s.

### When you want every result, failures included

Sometimes one bad item should not stop the rest, for example when processing a batch and reporting the failures at the end. Catch inside the task and return the error as a value:

```python
async def safe(i: int) -> int | Exception:
    try:
        return await work(i)
    except ValueError as e:
        return e


async with asyncio.TaskGroup() as tg:
    tasks = [tg.create_task(safe(i)) for i in range(1, 7)]

results = [t.result() for t in tasks]
ok = [r for r in results if not isinstance(r, Exception)]
failed = [r for r in results if isinstance(r, Exception)]
```

`asyncio.gather(..., return_exceptions=True)` does the same job and is still fine for this case, because with `return_exceptions=True` it waits for everything. The orphan problem only applies to `gather` without it.

## Deadlines with `asyncio.timeout`

`asyncio.timeout(delay)` is an async context manager that cancels the code inside it once `delay` seconds have passed, and turns that cancellation into a `TimeoutError` when the block exits:

```python
try:
    async with asyncio.timeout(0.5) as cm:
        await asyncio.sleep(2)
except TimeoutError:
    print("timed out; expired =", cm.expired())  # timed out; expired = True
```

Compared with the older `asyncio.wait_for(coro, timeout)`, it wraps a block rather than one awaitable, so a deadline can cover several steps (connect, send, read) without nesting. The context manager also has `reschedule(when)` to move the deadline, and `asyncio.timeout(None)` starts with no deadline that you can set later. `asyncio.timeout_at(when)` takes an absolute time from `loop.time()` instead of a delay.

Two details matter:

- The exception is the built-in `TimeoutError`. Since 3.11, `asyncio.TimeoutError` is an alias for it.
- Inside the block, the code sees a `CancelledError`, not a `TimeoutError`. Cleanup code that catches `CancelledError` must re-raise it, or the timeout cannot do its job.

## Putting it together: a concurrent fetcher with limits

A common job: fetch a list of URLs, at most N at a time, with a timeout per request and an overall budget for the whole batch. The example below uses `asyncio.sleep` in place of an HTTP client so it runs anywhere; swap `fake_get` for an `httpx.AsyncClient` or `aiohttp` call and the structure stays the same.

```python
import asyncio
import random
import time

MAX_CONCURRENT = 3
PER_REQUEST_TIMEOUT = 1.0
TOTAL_BUDGET = 5.0


async def fake_get(url: str) -> int:
    """Stand-in for an HTTP call: random latency, one slow URL."""
    delay = 2.0 if url.endswith("/7") else random.uniform(0.1, 0.6)
    await asyncio.sleep(delay)
    return 200


async def fetch(url: str, limit: asyncio.Semaphore) -> tuple[str, int | str]:
    async with limit:
        try:
            async with asyncio.timeout(PER_REQUEST_TIMEOUT):
                status = await fake_get(url)
        except TimeoutError:
            return url, "timed out"
    return url, status


async def main() -> None:
    urls = [f"https://example.com/items/{i}" for i in range(10)]
    limit = asyncio.Semaphore(MAX_CONCURRENT)
    start = time.perf_counter()

    async with asyncio.timeout(TOTAL_BUDGET):
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch(u, limit)) for u in urls]

    for task in tasks:
        url, result = task.result()
        print(f"{url:32} {result}")
    print(f"finished in {time.perf_counter() - start:.1f}s")


random.seed(1)
asyncio.run(main())
```

```text
https://example.com/items/0      200
https://example.com/items/1      200
https://example.com/items/2      200
https://example.com/items/3      200
https://example.com/items/4      200
https://example.com/items/5      200
https://example.com/items/6      200
https://example.com/items/7      timed out
https://example.com/items/8      200
https://example.com/items/9      200
finished in 1.8s
```

The layering is deliberate:

- **The semaphore is outside the per-request timeout.** Time spent waiting for a free slot does not count against the request's one second. Put the `timeout` outside `async with limit` and requests at the back of the queue time out before they start.
- **The per-request timeout is handled inside the task.** A slow URL becomes a result (`"timed out"`) instead of an exception, so it does not cancel the other nine.
- **The overall budget wraps the whole `TaskGroup`.** If it expires, every running and waiting task is cancelled, the group finishes, and `main` gets a `TimeoutError`.

Creating all the tasks up front and letting the semaphore gate them is fine for hundreds or a few thousand items. For a very large or unbounded input (lines from a file, messages from a queue), use a fixed number of worker tasks reading from an `asyncio.Queue` instead, so you are not holding a task object per item.

## Gotchas

- **Don't swallow `CancelledError`.** If a task catches it and returns normally, the `TaskGroup` and `asyncio.timeout` machinery cannot tell that cancellation happened. Catch it only to clean up, then `raise`.
- **A `TaskGroup` cannot be reused.** Once its block has exited, `create_task` on it raises `RuntimeError`. Create a new group for the next batch.
- **Fire-and-forget does not fit.** If you want a background task that outlives the current function, `TaskGroup` is the wrong tool. Keep a reference to the task yourself (the event loop holds only a weak reference) and decide who awaits or cancels it.
- **Libraries may still raise plain exceptions.** Code that awaits a `TaskGroup` raises `ExceptionGroup`; code that calls `gather` raises the first exception directly. When you change one to the other, update every `except` that wraps it.

## Further reading

- [asyncio Task Groups](https://docs.python.org/3/library/asyncio-task.html#task-groups)
- [asyncio timeouts](https://docs.python.org/3/library/asyncio-task.html#timeouts)
- [asyncio synchronization primitives (Semaphore)](https://docs.python.org/3/library/asyncio-sync.html)
- [PEP 654: Exception Groups and except*](https://peps.python.org/pep-0654/)
