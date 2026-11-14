---
title: Calling C functions from Rust with FFI and the cc crate
description: Compile a small C file with a Cargo build script, declare it in an unsafe extern block, and call it from Rust, including passing strings with CString.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

Rust's foreign function interface (FFI) lets Rust call functions that follow the C ABI, which covers C libraries and anything else that exports C-compatible symbols. This post compiles a small C file as part of a Cargo build, then calls two functions from it: one that adds two integers and one that takes a string.

## Project layout

```bash
cargo new ffi_demo
cd ffi_demo
cargo add --build cc
```

```text
ffi_demo/
├── Cargo.toml
├── build.rs
└── src/
    ├── main.rs
    └── sum.c
```

`cargo add --build cc` adds the [`cc`](https://docs.rs/cc) crate under `[build-dependencies]`:

```toml
[build-dependencies]
cc = "1"
```

## The C code

`src/sum.c`:

```c
#include <stddef.h>

int sum(int x, int y) {
    return x + y;
}

size_t count_vowels(const char *s) {
    size_t n = 0;
    for (; *s != '\0'; s++) {
        switch (*s) {
            case 'a': case 'e': case 'i': case 'o': case 'u':
            case 'A': case 'E': case 'I': case 'O': case 'U':
                n++;
        }
    }
    return n;
}
```

## Building the C code with Cargo

`build.rs` runs before your crate is compiled. `cc::Build` finds the platform's C compiler (gcc, clang or MSVC), compiles the file into a static library, and tells Cargo to link it:

```rust
fn main() {
    println!("cargo:rerun-if-changed=src/sum.c");
    cc::Build::new().file("src/sum.c").compile("sum");
}
```

Because the library is linked statically, there's no `.so`/`.dll` to install or find at runtime, and the same setup works on Linux, macOS and Windows. You still need a C compiler installed.

## Declaring and calling the functions

`src/main.rs`:

```rust
use std::ffi::{c_char, c_int, CString};

unsafe extern "C" {
    fn sum(x: c_int, y: c_int) -> c_int;
    fn count_vowels(s: *const c_char) -> usize;
}

fn main() {
    let x = 1;
    let y = 2;
    let result = unsafe { sum(x, y) };
    println!("The sum of {x} and {y} is {result}.");

    let text = CString::new("Hello from Rust").expect("no interior NUL bytes");
    let vowels = unsafe { count_vowels(text.as_ptr()) };
    println!("{vowels} vowels");
}
```

```bash
cargo run
```

```text
The sum of 1 and 2 is 3.
4 vowels
```

### What the pieces mean

- **`extern "C"`** declares functions that use the C calling convention. The Rust compiler can't see their bodies, so it trusts that the signatures you write match the C ones. A mismatch (say, `i64` where C has `int`) compiles fine and produces garbage or crashes at runtime.
- **`unsafe extern`**: since the 2024 edition (the default for new `cargo new` projects), extern blocks must be marked `unsafe`, as a reminder that the declarations themselves are a promise you're making. On the 2021 edition, plain `extern "C" { ... }` still compiles.
- **`unsafe { ... }` at the call site**: calling a foreign function is unsafe because Rust can't check what it does with pointers or memory. If a function really is safe to call with any arguments, you can declare it with `safe fn` inside the `unsafe extern` block (Rust 1.82+) and call it without `unsafe`. That's a promise, not a check, and `sum` doesn't quite qualify: signed integer overflow is undefined behaviour in C, so `sum(c_int::MAX, 1)` is UB.
- **`c_int`, `c_char`** are aliases for whatever C's `int` and `char` are on the target platform. `size_t` maps to `usize` on all mainstream platforms.
- **`CString`** owns a NUL-terminated copy of a Rust string. Rust `&str` is not NUL-terminated, so it can't be passed to C directly. `CString::new` fails if the string contains an interior `\0`. Keep the `CString` alive while C uses the pointer: `CString::new("...").unwrap().as_ptr()` in a single expression creates a dangling pointer, because the temporary is dropped at the end of the statement.
- No `#[link]` attribute is needed here, because `cc` emits the `cargo:rustc-link-lib` instruction for the library it built.

## Linking a prebuilt library instead

If the C library is already built (a system library, or a `.so`/`.dylib`/`.dll` you ship), skip `cc` and tell Cargo where it is from `build.rs`:

```rust
fn main() {
    println!("cargo:rustc-link-search=native=/path/to/lib");
    println!("cargo:rustc-link-lib=dylib=sum");
}
```

With a shared library, the OS also has to find it at runtime, for example via `LD_LIBRARY_PATH` on Linux, `DYLD_LIBRARY_PATH` on macOS, or by putting the DLL next to the executable on Windows.

## Next steps

- For a real C library with many functions and structs, generate the `extern` declarations from its header with [bindgen](https://rust-lang.github.io/rust-bindgen/) instead of writing them by hand.
- Wrap the raw `unsafe` functions in a small safe Rust API (taking `&str`, returning `Result`) so the rest of your code never touches raw pointers.
- [FFI chapter of the Rustonomicon](https://doc.rust-lang.org/nomicon/ffi.html)
- [Using `extern` functions to call external code, The Rust Programming Language](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html#using-extern-functions-to-call-external-code)
