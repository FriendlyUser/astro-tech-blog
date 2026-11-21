---
title: "Writing a Python extension in Rust with PyO3 0.28 and maturin"
description: "Build a Python module in Rust with PyO3 0.28 and maturin: #[pyfunction], a declarative #[pymodule], the Bound API, py.detach for threads, and wheels."
tags: ["Rust", "Python", "PyO3", "maturin", "FFI"]
pubDate: "2026-05-06T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_pyo3_maturin.webp"
imgAlt: "Four thread lanes where Rust work runs in parallel once each thread detaches from the Python interpreter"
---

PyO3 is a Rust crate for writing Python extension modules (and for embedding Python in Rust). maturin is the build tool that compiles such a crate and packages it as a normal Python wheel. Together they let you move a hot loop from Python into Rust and still ship something users install with `pip install`.

This post builds a small text-statistics module, `textstats`, and covers the parts that trip people up: the `Bound` API, letting other Python threads run while Rust works, and building wheels for other machines. The examples use PyO3 0.28.3, maturin 1.13 and Python 3.13. PyO3 has renamed several APIs over the last few releases, so check which version a tutorial targets before copying from it. There's a list of the renames at the end.

## Creating the project

maturin installs into a virtual environment, and `maturin develop` installs your module into that same environment:

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install maturin
maturin new -b pyo3 textstats
cd textstats
```

`maturin new` writes a `pyproject.toml` that uses maturin as the build backend, and a `Cargo.toml` like this (I've pinned the patch version):

```toml
[package]
name = "textstats"
version = "0.1.0"
edition = "2024"

[lib]
name = "textstats"
crate-type = ["cdylib"]

[dependencies]
pyo3 = "0.28.3"
```

Two lines matter here. `crate-type = ["cdylib"]` builds a shared library that Python can load. The `[lib] name` must match the name of your `#[pymodule]`, because Python looks for an init function named after the module. If they differ, the build succeeds and `import textstats` then fails with an `ImportError` about a missing module export function.

You may see older guides add `features = ["extension-module"]` to the pyo3 dependency. Current PyO3 gets the same effect from an environment variable that maturin sets during the build, so the generated `Cargo.toml` no longer has it.

## The Rust code

Replace `src/lib.rs` with this:

```rust
use std::collections::HashMap;

use pyo3::prelude::*;

/// Lowercased words: runs of letters, digits and apostrophes.
fn words(text: &str) -> impl Iterator<Item = String> + '_ {
    text.split(|c: char| !(c.is_alphanumeric() || c == '\''))
        .filter(|w| !w.is_empty())
        .map(|w| w.to_lowercase())
}

fn count_words(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in words(text) {
        *counts.entry(word).or_insert(0) += 1;
    }
    counts
}

/// Word statistics implemented in Rust.
#[pymodule]
mod textstats {
    use pyo3::exceptions::PyValueError;
    use pyo3::prelude::*;
    use pyo3::types::{PyDict, PyList};

    /// Number of words in `text`.
    #[pyfunction]
    fn word_count(text: &str) -> usize {
        super::words(text).count()
    }

    /// A dict mapping each word to how often it occurs.
    #[pyfunction]
    fn word_frequencies<'py>(py: Python<'py>, text: &str) -> PyResult<Bound<'py, PyDict>> {
        let counts = py.detach(|| super::count_words(text));
        let dict = PyDict::new(py);
        for (word, n) in counts {
            dict.set_item(word, n)?;
        }
        Ok(dict)
    }

    /// The `n` most common words, most frequent first.
    #[pyfunction]
    #[pyo3(signature = (text, n = 10))]
    fn top_words(py: Python<'_>, text: &str, n: usize) -> PyResult<Vec<(String, usize)>> {
        if n == 0 {
            return Err(PyValueError::new_err("n must be at least 1"));
        }
        let mut counts: Vec<(String, usize)> =
            py.detach(|| super::count_words(text)).into_iter().collect();
        counts.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
        counts.truncate(n);
        Ok(counts)
    }

    /// Total number of characters across a list of strings.
    #[pyfunction]
    fn total_chars(items: &Bound<'_, PyList>) -> PyResult<usize> {
        let mut total = 0;
        for item in items.iter() {
            let s: String = item.extract()?;
            total += s.chars().count();
        }
        Ok(total)
    }
}
```

### `#[pyfunction]` and argument conversion

`#[pyfunction]` generates the glue that converts Python arguments into Rust types and the return value back. `&str` comes from a Python `str`, `usize` from an `int` (a negative number raises `OverflowError`), and `Vec<(String, usize)>` becomes a list of tuples. A wrong type raises `TypeError` before your function runs.

`#[pyo3(signature = (text, n = 10))]` gives `n` a default value, so Python can call `top_words(text)`. Returning `PyResult<T>` lets you raise exceptions: `PyValueError::new_err(...)` becomes a `ValueError` in Python.

### The declarative `#[pymodule]`

The `#[pymodule] mod textstats { ... }` form exports every `#[pyfunction]` defined inside it, and the module's doc comment becomes the Python module's `__doc__`. To export something defined elsewhere, add `#[pymodule_export] use super::some_function;` inside the module.

The older function form still works, and you'll see it in a lot of existing code:

```rust
#[pymodule]
fn textstats(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_function(wrap_pyfunction!(word_count, m)?)?;
    Ok(())
}
```

I find the `mod` form easier to keep correct, because you can't forget to register a function.

I kept the counting logic in plain Rust functions (`words`, `count_words`) outside the module. They know nothing about Python, which makes them easy to reuse from other Rust code.

### The `Bound` API

`Bound<'py, T>` is PyO3's smart pointer to a Python object. The `'py` lifetime ties it to a `Python<'py>` token, which proves the thread is attached to the interpreter. You get a `Python` token by taking it as an argument (`py: Python<'py>`), as `word_frequencies` does. Any `Bound` value also hands one out with `.py()`.

Python types are written as `Bound<'py, PyDict>`, `Bound<'py, PyList>`, and so on, and their methods come from traits in the prelude (`PyDictMethods`, `PyListMethods`, ...). That's why `dict.set_item` and `items.iter()` work after `use pyo3::prelude::*`. `item.extract::<T>()` converts a Python object into a Rust type and returns an error, which becomes a `TypeError` in Python, if it can't.

Should you take `&Bound<'_, PyList>` or `Vec<String>`? `Vec<String>` is simpler: PyO3 converts the whole list before your function runs. `&Bound<PyList>` gives you the Python object itself, so you can process items one at a time, stop early, or mutate the list. For a list of plain strings that you read once, the `Vec` version is fine.

## Building and calling it

```bash
maturin develop --release
```

That compiles the crate and installs it into the active virtual environment. Leave out `--release` for faster builds while iterating, but don't time anything with a debug build. Then add a quick test file, `test_textstats.py`:

```python
import pytest
import textstats

TEXT = "the cat and the hat and the bat"


def test_counts():
    assert textstats.word_count(TEXT) == 8
    assert textstats.top_words(TEXT, 2) == [("the", 3), ("and", 2)]
    assert textstats.word_frequencies("a b a") == {"a": 2, "b": 1}
    assert textstats.total_chars(["héllo", "wörld"]) == 10


def test_errors():
    with pytest.raises(ValueError):
        textstats.top_words(TEXT, 0)
    with pytest.raises(TypeError):
        textstats.total_chars(["ok", 3])
```

```bash
pip install pytest
pytest
```

Each time you change the Rust code, run `maturin develop` again. The [maturin import hook](https://github.com/PyO3/maturin-import-hook) can rebuild automatically on import if you find that tedious.

## Letting other threads run: `py.detach`

On a normal CPython build, only one thread at a time can run Python code: the one holding the GIL. When Python calls into your Rust function, that thread is still attached to the interpreter and holds the GIL. So if four Python threads each call a Rust function that takes a second, the calls run one after another, even though the Rust code never touches a Python object.

`py.detach(|| ...)` fixes that. It detaches the thread from the interpreter (releasing the GIL), runs the closure, and attaches again before returning. While the closure runs, other Python threads, including other calls into your module, proceed in parallel:

```python
import time
from concurrent.futures import ThreadPoolExecutor

import textstats

text = open("big.txt", encoding="utf-8").read()  # any large text file

start = time.perf_counter()
with ThreadPoolExecutor(max_workers=4) as pool:
    results = list(pool.map(textstats.word_frequencies, [text] * 4))
print(f"4 calls took {time.perf_counter() - start:.2f}s")
```

Try it with and without the `py.detach` in `word_frequencies`, on a file of a few megabytes, and watch CPU usage. With `detach`, the counting runs on several cores at once. (Building the dict happens after `detach` returns, so that part is still serialized.)

The closure must be `Send` (formally PyO3's `Ungil` trait). `Bound` and `Python` aren't `Send`, so the compiler won't let you use Python objects inside `detach`. Copy what you need into Rust values first, as `word_frequencies` does with `text`.

This was called `py.allow_threads` until PyO3 0.26, which renamed it to `detach`. That release also renamed `Python::with_gil` to `Python::attach`. The new names make more sense on free-threaded Python builds (3.13t and later), which have no GIL at all. You still want `detach` there: the interpreter sometimes has to pause every attached thread, for example for garbage collection, and a thread stuck in a long Rust computation while attached holds everyone else up.

Since PyO3 0.28, modules declare by default that they support free-threaded Python. If your module keeps global state that relied on the GIL for safety, opt out with `#[pymodule(gil_used = true)]`.

## Building wheels

`maturin develop` is for your own machine. To distribute the module, build wheels:

```bash
maturin build --release        # wheel goes to target/wheels/
maturin sdist                  # source distribution
```

A wheel built this way targets your OS, your CPU architecture and your Python version. Three things widen that:

- **The stable ABI.** Enable an `abi3` feature, and one wheel works on every CPython version from the minimum you choose upward:

  ```toml
  pyo3 = { version = "0.28.3", features = ["abi3-py310"] }
  ```

  The limited API lacks a few things, and some conversions are slower, but for most extension modules one wheel per platform instead of one per Python version is worth it.
- **Linux compatibility.** Wheels uploaded to PyPI must meet a manylinux or musllinux policy. Build inside the `ghcr.io/pyo3/maturin` Docker image, or pass `--zig` to link with zig (install it with `pip install maturin[zig]`).
- **CI.** `maturin generate-ci github > .github/workflows/CI.yml` writes a GitHub Actions workflow that builds wheels for Linux, macOS and Windows and can publish them to PyPI.

## Renamed APIs to watch for

If an older example doesn't compile against PyO3 0.28, it is probably one of these:

| Older code | PyO3 0.28 |
|---|---|
| `&PyAny`, `&PyDict` ("GIL refs") | `Bound<'py, PyAny>`, `Bound<'py, PyDict>` (GIL refs were removed in 0.23) |
| `PyDict::new_bound(py)` | `PyDict::new(py)` |
| `py.allow_threads(...)` | `py.detach(...)` (0.26) |
| `Python::with_gil(...)` | `Python::attach(...)` (0.26) |
| `obj.downcast::<T>()` | `obj.cast::<T>()` (0.27) |
| `PyObject` | `Py<PyAny>` (the alias is deprecated since 0.26) |

The [migration guide](https://pyo3.rs/v0.28.3/migration.html) has every change, release by release.

## When not to use this

- If the slow part is already NumPy, pandas or another C-backed library, Rust won't make it faster. Profile first.
- Calling a tiny Rust function in a tight Python loop can be slower than plain Python, because each call pays for argument conversion. Pass the whole batch in one call instead.
- If you only need to call an existing C library from Python, `ctypes` or `cffi` may be less work than a new Rust crate.

## Further reading

- [PyO3 user guide](https://pyo3.rs/v0.28.3/)
- [maturin user guide](https://www.maturin.rs/)
- [PyO3 guide: parallelism](https://pyo3.rs/v0.28.3/parallelism.html) and [free-threading](https://pyo3.rs/v0.28.3/free-threading.html)
