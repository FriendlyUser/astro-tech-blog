---
title: Compiling and calling C code from Rust with the cc crate
pubDate: "2023-04-22T16:25:05.026Z"
lastUpdated: 2026-11-14
description: "Use a build.rs script and the cc crate to compile C files into a static library, link it into a Rust crate, and call the functions through extern blocks."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

The [`cc`](https://crates.io/crates/cc) crate compiles C (and C++) source files from a Cargo
build script. It finds the platform's C compiler (MSVC on Windows, `cc`/`gcc`/`clang` elsewhere,
overridable with the `CC` environment variable), builds a static library, and tells Cargo to link
it. This is the usual way to ship a bit of C alongside a Rust crate. You need a working C
compiler installed.

## Project setup

```bash
cargo new cc_example
cd cc_example
```

`cc` runs at build time, so it goes under `[build-dependencies]`, not `[dependencies]`:

```toml
[build-dependencies]
cc = "1"
```

The latest release when this was revised was 1.11.2.

## Simple example

Create `src/foo.c`:

```c
#include <stdint.h>

int32_t add(int32_t a, int32_t b) {
    return a + b;
}
```

Create `build.rs` in the project root (next to `Cargo.toml`, not in `src/`):

```rust
fn main() {
    println!("cargo:rerun-if-changed=src/foo.c");
    cc::Build::new().file("src/foo.c").compile("foo");
}
```

`compile("foo")` builds `libfoo.a` (or `foo.lib` with MSVC) in Cargo's `OUT_DIR` and prints the
`cargo:rustc-link-lib=static=foo` and search-path instructions, so you don't add any link
attributes yourself. The `rerun-if-changed` line makes Cargo rerun the build script only when the C
file changes, rather than on every change in the package.

Declare the C function in `src/lib.rs` and wrap it in a safe function:

```rust
unsafe extern "C" {
    fn add(a: i32, b: i32) -> i32;
}

pub fn add_numbers(a: i32, b: i32) -> i32 {
    unsafe { add(a, b) }
}
```

`int32_t` maps exactly to `i32`. In the 2024 edition (the default for `cargo new`), `extern`
blocks must be written `unsafe extern`; the compiler can't check that the signature matches the C
code, so you are asserting it. The `unsafe extern` syntax also works in the 2021 edition on Rust 1.82
and later.

Call it from `src/main.rs`:

```rust
use cc_example::add_numbers;

fn main() {
    let result = add_numbers(5, 7);
    println!("The result is: {result}");
}
```

```bash
cargo run
```

```text
The result is: 12
```

## Several files and a header

With more than one C file, put the shared declarations in a header. Create `src/foo.h`:

```c
#ifndef FOO_H
#define FOO_H

#include <stdint.h>

int32_t add(int32_t a, int32_t b);
int32_t multiply(int32_t a, int32_t b);

#endif // FOO_H
```

Create `src/foo_multiply.c`:

```c
#include "foo.h"

int32_t multiply(int32_t a, int32_t b) {
    return a * b;
}
```

Add `#include "foo.h"` to the top of `src/foo.c` as well, so the compiler checks both
definitions against the header. Then list every file in `build.rs` and add the include
directory:

```rust
fn main() {
    println!("cargo:rerun-if-changed=src/foo.c");
    println!("cargo:rerun-if-changed=src/foo_multiply.c");
    println!("cargo:rerun-if-changed=src/foo.h");

    cc::Build::new()
        .file("src/foo.c")
        .file("src/foo_multiply.c")
        .include("src")
        .compile("foo");
}
```

Declare the new function in `src/lib.rs`:

```rust
unsafe extern "C" {
    fn add(a: i32, b: i32) -> i32;
    fn multiply(a: i32, b: i32) -> i32;
}

pub fn add_numbers(a: i32, b: i32) -> i32 {
    unsafe { add(a, b) }
}

pub fn multiply_numbers(a: i32, b: i32) -> i32 {
    unsafe { multiply(a, b) }
}
```

And use it in `src/main.rs`:

```rust
use cc_example::{add_numbers, multiply_numbers};

fn main() {
    println!("The sum is: {}", add_numbers(5, 7));
    println!("The product is: {}", multiply_numbers(5, 7));
}
```

```text
The sum is: 12
The product is: 35
```

## Gotchas and next steps

- **Signatures are not checked.** If the Rust declaration and the C definition disagree, you get
  undefined behaviour, not a compile error. For anything bigger than a few functions, generate the
  declarations from the header with [`bindgen`](https://crates.io/crates/bindgen).
- **Overflow is C's.** `a + b` overflowing `int32_t` is undefined behaviour in C, even though the
  Rust wrapper looks safe. Validate inputs in the wrapper if that matters.
- **Useful `Build` options:** `.define("NAME", Some("value"))`, `.flag_if_supported("-Wall")`,
  `.opt_level(2)`, and `.cpp(true)` to compile C++ (export functions with `extern "C"` on the C++
  side).
- **Linking an existing system library** (OpenSSL, zlib) is a different job: use
  [`pkg-config`](https://crates.io/crates/pkg-config) or `vcpkg` from `build.rs` instead of
  compiling its sources yourself.

## Further reading

- [`cc` on docs.rs](https://docs.rs/cc)
- [Build scripts (The Cargo Book)](https://doc.rust-lang.org/cargo/reference/build-scripts.html)
- [FFI in the Rustonomicon](https://doc.rust-lang.org/nomicon/ffi.html)
