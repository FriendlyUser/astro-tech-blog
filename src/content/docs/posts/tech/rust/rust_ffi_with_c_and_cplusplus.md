---
title: Calling C and C++ code from Rust with FFI and the cc crate
description: Compile C and C++ sources with the cc crate, declare them in Rust with extern "C", pass strings safely with CString, and wrap C++ classes in C functions.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

Plenty of useful code is written in C and C++: SQLite, zlib, OpenCV, and probably some of your own company's libraries. Rust's foreign function interface (FFI) lets you call that code directly, in the same process, with no more overhead than a normal function call.

This post builds a small project that compiles C and C++ sources as part of `cargo build` and calls them from Rust.

## How Rust's FFI works

- You declare foreign functions in an `extern "C"` block. Rust then calls them using the platform's C calling convention.
- Rust has no C++ ABI support. There is no `extern "C++"`: C++ functions must be exposed through `extern "C"` wrappers (or generated bindings, see the end of this post).
- Calling a foreign function is `unsafe`, because the compiler can't check that your declaration matches the real signature or that the foreign code is memory-safe.
- Use the C type aliases from `std::ffi` (`c_int`, `c_char`, `c_double`, ...) so the Rust declaration matches the C one on every platform.
- The foreign code has to be compiled and linked. The [`cc`](https://crates.io/crates/cc) crate does this from a build script, using whatever C/C++ compiler is installed (GCC, Clang, or MSVC).

The examples use Rust edition 2024 (Rust 1.85+), where extern blocks are written `unsafe extern "C"`. In older editions, drop the leading `unsafe`.

## Project layout

```text
rust_ffi_example/
├── Cargo.toml
├── build.rs
├── c_src/
│   ├── sum.c
│   └── vowels.c
├── cpp_src/
│   ├── product.h
│   ├── product.cpp
│   ├── product_wrapper.h
│   └── product_wrapper.cpp
└── src/
    └── main.rs
```

```toml
# Cargo.toml
[package]
name = "rust_ffi_example"
version = "0.1.0"
edition = "2024"

[build-dependencies]
cc = "1"
```

:::note
An earlier version of this post used the `gcc` build crate. That crate is deprecated and was renamed to `cc`; the API is the same `Build` builder.
:::

## Calling a C function

The C side:

```c
// c_src/sum.c
int sum(int a, int b) {
    return a + b;
}
```

The build script compiles it into a static library and tells Cargo to link it:

```rust
// build.rs
fn main() {
    cc::Build::new()
        .file("c_src/sum.c")
        .file("c_src/vowels.c")
        .compile("cfuncs");

    println!("cargo::rerun-if-changed=c_src");
}
```

`compile("cfuncs")` produces `libcfuncs.a` (or `cfuncs.lib` on MSVC) in Cargo's output directory and emits the linker flags for it, so you don't need `#[link]` attributes or any `.cargo/config.toml` changes. The `rerun-if-changed` line makes Cargo rerun the build script whenever a file under `c_src` changes.

The Rust side declares the function and calls it:

```rust
use std::ffi::c_int;

unsafe extern "C" {
    fn sum(a: c_int, b: c_int) -> c_int;
}

fn main() {
    let (a, b) = (10, 20);
    // SAFETY: `sum` takes two ints by value and has no preconditions.
    let result = unsafe { sum(a, b) };
    println!("The sum of {a} and {b} is {result}");
}
```

Since Rust 1.82 you can mark a declaration that has no preconditions as `pub safe fn sum(...)` inside the `unsafe extern` block, and then call it without an `unsafe` block.

## Passing strings to C

C strings are NUL-terminated byte arrays. A Rust `&str` is not NUL-terminated, so passing `my_str.as_ptr()` to C is a bug: C will read past the end of the string. Convert with `CString` first.

```c
// c_src/vowels.c
#include <stddef.h>

size_t count_vowels(const char *s) {
    size_t n = 0;
    for (; *s; s++) {
        switch (*s) {
            case 'a': case 'e': case 'i': case 'o': case 'u':
            case 'A': case 'E': case 'I': case 'O': case 'U':
                n++;
        }
    }
    return n;
}
```

```rust
use std::ffi::{c_char, CString, NulError};

unsafe extern "C" {
    fn count_vowels(s: *const c_char) -> usize;
}

/// Safe wrapper: callers never touch raw pointers.
pub fn vowels(s: &str) -> Result<usize, NulError> {
    let c_string = CString::new(s)?; // fails if `s` contains an interior NUL byte
    // SAFETY: `c_string` is a valid NUL-terminated string that outlives the call,
    // and `count_vowels` only reads from it.
    Ok(unsafe { count_vowels(c_string.as_ptr()) })
}
```

This is the usual shape of an FFI binding: a private `unsafe` declaration plus a public safe function that does the conversions and checks. Rust's `usize` matches C's `size_t` on the platforms Rust supports.

## Calling C++ code

C++ mangles function names and has classes, overloads and exceptions, none of which Rust can call directly. The fix is a thin `extern "C"` layer on the C++ side.

The C++ class:

```cpp
// cpp_src/product.h
class Product {
public:
    int multiply(int a, int b);
};
```

```cpp
// cpp_src/product.cpp
#include "product.h"

int Product::multiply(int a, int b) {
    return a * b;
}
```

A C-compatible wrapper:

```cpp
// cpp_src/product_wrapper.h
#ifdef __cplusplus
extern "C" {
#endif

int multiply(int a, int b);

#ifdef __cplusplus
}
#endif
```

```cpp
// cpp_src/product_wrapper.cpp
#include "product_wrapper.h"
#include "product.h"

int multiply(int a, int b) {
    Product product;
    return product.multiply(a, b);
}
```

Add a second `cc::Build` to `build.rs` for the C++ files. Both `product.cpp` and the wrapper must be compiled; `.cpp(true)` switches to the C++ compiler and links the C++ standard library:

```rust
// build.rs
fn main() {
    cc::Build::new()
        .file("c_src/sum.c")
        .file("c_src/vowels.c")
        .compile("cfuncs");

    cc::Build::new()
        .cpp(true)
        .file("cpp_src/product.cpp")
        .file("cpp_src/product_wrapper.cpp")
        .compile("product");

    println!("cargo::rerun-if-changed=c_src");
    println!("cargo::rerun-if-changed=cpp_src");
}
```

From Rust, the wrapper looks like any other C function:

```rust
use std::ffi::c_int;

unsafe extern "C" {
    fn multiply(a: c_int, b: c_int) -> c_int;
}

fn main() {
    // SAFETY: `multiply` takes two ints by value and has no preconditions.
    let result = unsafe { multiply(3, 4) };
    println!("Result: {result}"); // Result: 12
}
```

## Gotchas

- **Exceptions must not cross the boundary.** If C++ code can throw, catch everything in the `extern "C"` wrapper and return an error code. Letting an exception unwind into Rust through an `extern "C"` function is undefined behaviour.
- **Ownership is manual.** Memory allocated by C must be freed by C (expose a `free_*` function), and memory allocated by Rust must be freed by Rust. Rust's borrow checker can't see across the boundary.
- **Declarations aren't checked.** If your `extern` signature doesn't match the C header, the code still compiles and links, then misbehaves at runtime. For anything bigger than a few functions, generate the declarations.

## Going further

- [`bindgen`](https://rust-lang.github.io/rust-bindgen/) generates Rust `extern` declarations from C headers (and some C++).
- [`cxx`](https://cxx.rs/) generates a safe bridge between Rust and C++ on both sides, including `std::string`, `std::vector` and `std::unique_ptr`.
- To call Rust from C or C++, export functions with `#[unsafe(no_mangle)] pub extern "C" fn ...`, build the crate as a `staticlib` or `cdylib`, and use [`cbindgen`](https://github.com/mozilla/cbindgen) to generate the header.
- [The Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html) and the [`cc` docs](https://docs.rs/cc).
