---
title: "Calling shared libraries from Rust: link-time vs runtime loading"
description: How Rust calls functions in a C shared library, either linked when the program starts or loaded at runtime with libloading or dlopen.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/dalle-2022-10-01-22-10-49-transcribing-audio-to-text.webp'
---

Rust's foreign function interface (FFI) lets Rust call functions written in C, or in anything that exports a C ABI. When those functions live in a shared library (`.so` on Linux, `.dylib` on macOS, `.dll` on Windows), there are two different ways to use them:

1. **Link against the library at build time.** You declare the functions in an `extern "C"` block, the linker records a dependency on the library, and the OS loader maps it in when the program starts. If the library is missing, the program won't start.
2. **Load the library at runtime.** The program opens the library itself (`dlopen` / `LoadLibrary`), looks up symbols by name, and casts them to function pointers. This is how plugin systems work, and it lets you handle a missing library gracefully.

The two are often mixed up. An `extern "C"` block is for option 1; it plays no part in option 2.

Either way, the library's code is shared between processes and can be updated without recompiling your program, which is the main reason to use shared libraries rather than static ones.

## A C library to call

All the examples call this function:

```c
// mylib.c
double my_function(int a, double b) {
    return a * b;
}
```

Build it as a shared library (Linux shown; on macOS use `-dynamiclib -o libmylib.dylib`):

```bash
gcc -shared -fPIC -o libmylib.so mylib.c
```

Put `libmylib.so` in the root of your Cargo project.

## Option 1: link at build time

Declare the function with `#[link]` so rustc tells the linker which library to use:

```rust
// src/main.rs
use std::ffi::{c_double, c_int};

#[link(name = "mylib")]
unsafe extern "C" {
    fn my_function(a: c_int, b: c_double) -> c_double;
}

fn main() {
    // Calling a foreign function is unsafe: the compiler can't check
    // that this signature matches what the C code actually does.
    let result = unsafe { my_function(42, 1.5) };
    println!("my_function(42, 1.5) = {result}");
}
```

The `unsafe extern` spelling is required in the 2024 edition (the default for new Cargo projects) and accepted since Rust 1.82. On older editions, write `extern "C"`.

The linker also needs to know where to find the library. Add a `build.rs` next to `Cargo.toml`:

```rust
// build.rs
fn main() {
    let dir = std::env::var("CARGO_MANIFEST_DIR").unwrap();
    println!("cargo:rustc-link-search=native={dir}");
}
```

Then run it, telling the dynamic loader where to look at startup:

```bash
LD_LIBRARY_PATH=. cargo run
# my_function(42, 1.5) = 63
```

In a real deployment the library would be installed in a system library directory or found via an rpath instead of `LD_LIBRARY_PATH`.

## Option 2: load at runtime with `libloading`

The [`libloading`](https://crates.io/crates/libloading) crate wraps `dlopen`/`dlsym` on Unix and `LoadLibraryW`/`GetProcAddress` on Windows. It also ties each looked-up symbol to the lifetime of the `Library`, so you can't call a function after unloading the library that contains it.

```toml
[dependencies]
libloading = "0.9"
```

No `build.rs` and no `extern` block are needed:

```rust
use std::ffi::{c_double, c_int};

use libloading::{Library, Symbol};

// The function pointer type must use the C ABI.
type MyFunction = unsafe extern "C" fn(c_int, c_double) -> c_double;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    unsafe {
        // Loading runs the library's initialisers, so it is unsafe too.
        let lib = Library::new("./libmylib.so")?;
        let my_function: Symbol<MyFunction> = lib.get(b"my_function")?;
        println!("my_function(42, 1.5) = {}", my_function(42, 1.5));
    } // `lib` is dropped here, which unloads the library
    Ok(())
}
```

`libloading` 0.9 (current at the time of writing, 0.9.1) requires Rust 1.88 or newer. Use `libloading::library_filename("mylib")` if you want the platform-specific file name (`libmylib.so`, `libmylib.dylib`, `mylib.dll`) built for you.

## Option 2 without a crate: `dlopen` via `libc`

On Unix you can call the C API directly through the [`libc`](https://crates.io/crates/libc) crate (`libc = "0.2"`). This is what `libloading` does under the hood, minus the safety checks, so you have to do them yourself:

```rust
use std::ffi::CStr;

use libc::{c_double, c_int, dlclose, dlerror, dlopen, dlsym, RTLD_NOW};

type MyFunction = unsafe extern "C" fn(c_int, c_double) -> c_double;

fn main() {
    unsafe {
        // RTLD_NOW resolves every undefined symbol in the library immediately.
        let handle = dlopen(c"./libmylib.so".as_ptr(), RTLD_NOW);
        if handle.is_null() {
            panic!("dlopen failed: {}", CStr::from_ptr(dlerror()).to_string_lossy());
        }

        let ptr = dlsym(handle, c"my_function".as_ptr());
        if ptr.is_null() {
            panic!("dlsym failed: {}", CStr::from_ptr(dlerror()).to_string_lossy());
        }

        let my_function: MyFunction = std::mem::transmute(ptr);
        println!("my_function(42, 1.5) = {}", my_function(42, 1.5));

        // After this, calling my_function would be undefined behaviour.
        dlclose(handle);
    }
}
```

The `c"..."` C-string literals need Rust 1.77 or newer.

## Gotchas

- **Use `extern "C" fn` types, not plain `fn`.** Transmuting a symbol to `fn(i32, f64) -> f64` uses the Rust ABI, which isn't guaranteed to match C's. That's undefined behaviour even if it happens to work.
- **Check for null.** `dlopen` and `dlsym` return null on failure; calling through a null function pointer crashes.
- **Signatures aren't checked.** Neither the compiler nor the loader verifies that your Rust declaration matches the C function. Use the exact C types (`c_int`, `c_double`, `c_char`) and consider generating declarations with [`bindgen`](https://crates.io/crates/bindgen) for larger APIs.
- **Don't unload while in use.** Any function pointer or static obtained from a library becomes invalid after `dlclose`. `libloading`'s `Symbol` lifetime prevents this; raw pointers don't.

## Further reading

- [The Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html)
- [The Rust Reference: `#[link]` and external blocks](https://doc.rust-lang.org/reference/items/external-blocks.html)
- [`libloading` documentation](https://docs.rs/libloading)
