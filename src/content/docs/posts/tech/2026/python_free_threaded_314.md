---
title: "Free-threaded Python 3.14: running threads without the GIL"
description: "What PEP 703 and PEP 779 changed, how to install the 3.14t build, check whether the GIL is on, time a CPU-bound threading example, and avoid extension pitfalls."
tags: ["Python", "Python 3.14", "Free-Threading", "GIL", "Concurrency", "Threading"]
pubDate: "2026-09-16T16:00:00.000Z"
imgSrc: "/imgs/2026/python_free_threaded_314.webp"
imgAlt: "Two panels of four thread lanes: with the GIL the work slices take turns, on python3.14t all four bars run at once"
---

CPython's global interpreter lock (GIL) lets only one thread run Python bytecode at a time, so threads have never helped CPU-bound pure-Python code. The free-threaded build removes the GIL, which means a `ThreadPoolExecutor` can now keep several cores busy without moving to `multiprocessing` and paying for pickling and separate processes.

This post covers where free-threading stands in Python 3.14, how to install it, how to check that the GIL is really off, a benchmark you can run yourself, and what to watch for with C extensions. Examples were run with CPython 3.14 (both the default and the `3.14t` build) installed through uv.

## Where it stands: PEP 703 and PEP 779

[PEP 703](https://peps.python.org/pep-0703/) proposed making the GIL optional. It was accepted with a phased plan:

1. **Experimental** (Python 3.13): a separate free-threaded build, opt-in, with known performance gaps.
2. **Supported** (Python 3.14): still a separate build and still opt-in, but officially supported rather than experimental.
3. **Default**: some future release, if the ecosystem and performance justify it. No version has been picked.

[PEP 779](https://peps.python.org/pep-0779/) set the criteria for moving from phase 1 to phase 2 (performance, memory use, and stability targets) and was accepted for 3.14. So in 3.14 the free-threaded build is a supported configuration you can deploy, but `python` on most systems is still the normal build with the GIL. You have to choose the free-threaded interpreter explicitly. It installs as `python3.14t` (the `t` suffix) next to the regular one.

The other notable 3.14 change is that the specializing adaptive interpreter (the part of CPython that rewrites hot bytecode into faster specialized forms) now works in the free-threaded build. In 3.13 it was disabled there, which is the main reason 3.13t was much slower on single-threaded code.

## Installing a free-threaded build

With uv:

```bash
uv python install 3.14t
uv run --python 3.14t python -c "import sys; print(sys.version)"
```

The version string says so explicitly, for example `3.14.x free-threading build (main, ...)`.

Other options:

- **python.org installers** for Windows and macOS can install the free-threaded binaries alongside the normal ones (it's an optional component, off by default).
- **pyenv** uses the same suffix: `pyenv install 3.14t`.
- **From source**, configure with `./configure --disable-gil`.

Create a virtual environment from that interpreter like any other: `uv venv --python 3.14t` or `python3.14t -m venv .venv`. Packages you install there need wheels built for the free-threaded ABI, which carry a `cp314t` tag.

## Checking whether the GIL is actually off

There are two separate questions: was this interpreter built without the GIL, and is the GIL disabled right now? The second can change at runtime.

```python
import sys
import sysconfig

print("free-threaded build:", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
print("GIL enabled right now:", sys._is_gil_enabled())
```

On the free-threaded build this prints `True` and `False`. On the regular build it prints `False` and `True`.

`sys._is_gil_enabled()` has the underscore because it's a CPython-specific helper, but it's documented and is the way to check. You can also force the GIL back on in a free-threaded interpreter with `PYTHON_GIL=1` or `python -X gil=1`, which is handy for comparing the same build with and without it.

## A CPU-bound benchmark you can time yourself

This counts primes with trial division, split across a thread pool. It's pure Python with no I/O, which is exactly the case the GIL used to serialize.

```python
# bench.py
import sys
import sysconfig
import time
from concurrent.futures import ThreadPoolExecutor


def count_primes(start: int, stop: int) -> int:
    """Deliberately naive, pure-Python, CPU-bound work."""
    found = 0
    for n in range(max(start, 2), stop):
        for d in range(2, int(n**0.5) + 1):
            if n % d == 0:
                break
        else:
            found += 1
    return found


def run(workers: int, limit: int = 2_000_000) -> float:
    step = limit // workers
    chunks = [(i * step, (i + 1) * step) for i in range(workers)]
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        total = sum(pool.map(lambda c: count_primes(*c), chunks))
    elapsed = time.perf_counter() - t0
    print(f"{workers} thread(s): {total} primes in {elapsed:.2f}s")
    return elapsed


if __name__ == "__main__":
    print(sys.version)
    print("free-threaded build:", bool(sysconfig.get_config_var("Py_GIL_DISABLED")))
    print("GIL enabled right now:", sys._is_gil_enabled())
    base = run(1)
    for n in (2, 4, 8):
        print(f"  speedup vs 1 thread: {base / run(n):.2f}x")
```

Run it on both builds:

```bash
uv run --no-project --python 3.14 bench.py
uv run --no-project --python 3.14t bench.py
```

On the regular build every run takes about the same time no matter how many threads you add, because only one thread executes bytecode at a time. On the free-threaded build the wall-clock time drops as you add threads, up to the number of physical cores.

When I ran it on a 16-thread Windows desktop that was also busy with other work, the regular build took about 5 seconds whether it used 1 thread or 8. The free-threaded build finished the 8-thread run in about 1.3 seconds. Single-thread timings on that machine swung by more than 30% between runs, so I won't quote a single-thread overhead or a precise speedup from it. Run the script yourself, more than once, on a quiet machine.

Two things affect what you'll see:

- **The chunks aren't equal work.** Bigger numbers take longer to test, so the last chunk is the slowest and sets the total time. Real workloads often have the same problem; a pool with many small tasks balances better than one task per thread.
- **Hyperthreads aren't cores.** Going past the physical core count usually adds little.

### Single-thread overhead

Removing the GIL isn't free. Reference counting uses a biased scheme with atomic operations for objects shared between threads, built-in containers carry per-object locks, and the build uses the mimalloc allocator. The Python 3.14 "What's New" puts the single-threaded penalty at roughly 5 to 10% on the pyperformance suite, depending on platform and compiler, down from much larger numbers in 3.13. Memory use is also somewhat higher.

That means the free-threaded build is a win when your program can actually use several threads for Python-level work. A single-threaded script, or a web app that already scales with processes, gains nothing and pays the overhead.

## Your code still needs locks

The GIL never made your code thread-safe; it only made some races rare. Without it, they show up quickly. A shared counter is the classic case:

```python
# race.py
import threading

counter = 0
lock = threading.Lock()


def unsafe(n):
    global counter
    for _ in range(n):
        counter += 1  # read, add, write: three steps, not one


def safe(n):
    global counter
    for _ in range(n):
        with lock:
            counter += 1


for fn in (unsafe, safe):
    counter = 0
    threads = [threading.Thread(target=fn, args=(200_000,)) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    print(f"{fn.__name__}: {counter} (expected {8 * 200_000})")
```

On the 3.14t build, one run printed:

```text
unsafe: 331786 (expected 1600000)
safe: 1600000 (expected 1600000)
```

On the regular 3.14 build the unsafe version happened to print the right total in that run, which is exactly why these bugs survive for years. The GIL makes lost updates unlikely; it doesn't rule them out.

What the free-threaded build does guarantee is that the interpreter itself won't crash or corrupt objects: `list.append`, `dict` assignment and similar single operations on built-in types are internally locked. Compound operations ("check then set", "read then increment", iterating while another thread mutates) need your own `threading.Lock`, a `queue.Queue`, or a design where threads don't share mutable state at all.

## C extensions and the GIL coming back

Pure-Python packages work unchanged. Packages with compiled code need two things:

1. **A wheel for the free-threaded ABI** (`cp314t`). The regular `cp314` wheels won't install, and the stable ABI (`abi3`) wheels aren't supported on free-threaded builds in 3.14. If no `cp314t` wheel exists, pip or uv will try to build from source.
2. **A declaration that the module is safe without the GIL.** Extensions using multi-phase init set the `Py_mod_gil` slot to `Py_MOD_GIL_NOT_USED`; single-phase modules call `PyUnstable_Module_SetGIL()`. Cython and pybind11 have options for this.

If you import an extension that hasn't made that declaration, the interpreter **re-enables the GIL for the whole process** and emits a `RuntimeWarning` naming the module. Your program keeps working, just without parallelism, so check `sys._is_gil_enabled()` after your imports, not only at startup:

```python
import sys

import numpy  # and whatever else your program imports

if sys._is_gil_enabled():
    raise SystemExit("an imported extension turned the GIL back on")
```

You can keep the GIL off anyway with `PYTHON_GIL=0` or `-X gil=0`, but that's a bet that the extension's C code is thread-safe without having been designed for it. I wouldn't do that in production.

Many of the big compiled packages ship `cp314t` wheels (NumPy does, for example: `uv run --python 3.14t --with numpy` installed one and the GIL stayed off). For the rest, the community tracker at [py-free-threading.github.io](https://py-free-threading.github.io/) lists compatibility status and porting advice.

## When to use it, and when not

Reach for 3.14t when:

- You have CPU-bound Python work that splits into independent pieces, and `multiprocessing` hurts because the data is large, expensive to pickle, or shared.
- You already use threads (for I/O, or a C library that releases the GIL) and want the Python-level parts to run in parallel too.

Stay on the regular build when:

- Your code is single-threaded or I/O-bound with `asyncio`. You'd pay the overhead for nothing.
- A dependency has no free-threaded wheel, or re-enables the GIL on import.
- You need `abi3` wheels or a deployment platform that only offers the default build.

Python 3.14 also added `concurrent.futures.InterpreterPoolExecutor` (multiple interpreters in one process, each with its own GIL). It's another way to get parallelism without processes, with stronger isolation and no shared objects. If your threads don't need to share Python objects, it's worth comparing.

## Further reading

- [Python support for free threading](https://docs.python.org/3/howto/free-threading-python.html) (the official HOWTO)
- [C API extension support for free threading](https://docs.python.org/3/howto/free-threading-extensions.html)
- [PEP 703](https://peps.python.org/pep-0703/) and [PEP 779](https://peps.python.org/pep-0779/)
- [What's New in Python 3.14](https://docs.python.org/3/whatsnew/3.14.html)
