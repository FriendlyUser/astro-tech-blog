---
title: "Unsafe Rust basics: raw pointers, unsafe traits, and calling C"
pubDate: "2024-06-24T02:12:29.000Z"
lastUpdated: 2026-11-14
description: "What `unsafe` actually allows in Rust, how unsafe functions and traits differ, how to wrap unsafe code in a safe API, and how to call a C function over FFI."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2223533571.webp
---

`unsafe` in Rust doesn't turn off the borrow checker or type system. It unlocks a small set of extra operations that the compiler can't verify, and makes you responsible for upholding the rules those operations could break. You need it for FFI, for writing data structures the borrow checker can't express, and occasionally to skip a check you've already proven unnecessary (for example `get_unchecked` instead of indexed access).

## What `unsafe` lets you do

Inside an `unsafe` block or function you can:

1. Dereference a raw pointer (`*const T` / `*mut T`).
2. Call an `unsafe` function, including foreign functions declared in an `extern` block.
3. Access or modify a mutable `static`.
4. Implement an `unsafe` trait.
5. Read fields of a `union`.

Everything else is checked as normal. Creating a raw pointer is safe; only dereferencing it is not.

## Unsafe functions

An `unsafe fn` means *the caller* must uphold some contract the compiler can't check. Document that contract in a `# Safety` section:

```rust
/// # Safety
///
/// `ptr` must be non-null, aligned, and point to an initialized `i32`.
unsafe fn dangerous_operation(ptr: *const i32) -> i32 {
    // SAFETY: the caller guarantees `ptr` is valid for reads.
    unsafe { *ptr }
}
```

In the 2024 edition, the body of an `unsafe fn` is no longer implicitly an unsafe block: the `unsafe_op_in_unsafe_fn` lint warns unless you wrap unsafe operations in their own `unsafe { }`. That keeps each unsafe operation visible and gives you a place for a `// SAFETY:` comment.

## Unsafe blocks

Calling the function requires an `unsafe` block, which is where you assert the contract holds:

```rust
fn main() {
    let value = 42;
    let value_ptr = &value as *const i32;

    // SAFETY: `value_ptr` points to a live, initialized local.
    let result = unsafe { dangerous_operation(value_ptr) };
    println!("The result is: {}", result);
}
```

## Unsafe traits

An `unsafe trait` is one whose *implementors* must uphold an invariant that other code relies on for memory safety. `Send` and `Sync` are the standard examples. Having unsafe methods does not make a trait unsafe, and implementing an unsafe trait does not require its methods to be unsafe; the `unsafe` goes on the `impl`:

```rust
/// # Safety
///
/// Implementors must be valid when every byte is zero.
unsafe trait Zeroable: Sized {
    fn zeroed() -> Self {
        // SAFETY: the trait contract guarantees all-zero bytes are a valid `Self`.
        unsafe { std::mem::zeroed() }
    }
}

// SAFETY: 0 is a valid u32.
unsafe impl Zeroable for u32 {}

fn main() {
    println!("{}", u32::zeroed()); // 0
}
```

Implementing `Zeroable` for a reference type like `&u8` would be undefined behaviour, which is exactly why the trait is `unsafe` to implement.

## Wrapping unsafe code in a safe API

Most unsafe code should sit behind a safe function that checks its own preconditions. The standard example (from the Rust Book) is splitting one mutable slice into two. The borrow checker can't prove the halves don't overlap, but we can:

```rust
use std::slice;

fn split_at_mut(values: &mut [i32], mid: usize) -> (&mut [i32], &mut [i32]) {
    let len = values.len();
    let ptr = values.as_mut_ptr();

    assert!(mid <= len);

    // SAFETY: `mid <= len`, so both ranges are in bounds and don't overlap.
    unsafe {
        (
            slice::from_raw_parts_mut(ptr, mid),
            slice::from_raw_parts_mut(ptr.add(mid), len - mid),
        )
    }
}

fn main() {
    let mut v = [1, 2, 3, 4, 5];
    let (a, b) = split_at_mut(&mut v, 2);
    a[0] = 10;
    b[0] = 30;
    println!("{:?}", v); // [10, 2, 30, 4, 5]
}
```

The `assert!` is what makes the function safe: callers can't pass a `mid` that would read out of bounds.

## Calling a C function

FFI is the most common reason to write `unsafe`. Given a small C file:

```c
// src/adder.c
int add(int a, int b) { return a + b; }
```

Compile and link it with the [`cc`](https://crates.io/crates/cc) crate from a build script (`cargo add --build cc`):

```rust
// build.rs
fn main() {
    cc::Build::new().file("src/adder.c").compile("adder");
}
```

Then declare the function and call it. The C integer types live in `std::ffi`, so you don't need the `libc` crate for this:

```rust
// src/main.rs
use std::ffi::c_int;

unsafe extern "C" {
    fn add(a: c_int, b: c_int) -> c_int;
}

fn main() {
    let (a, b) = (3, 4);
    // SAFETY: `add` takes two ints by value and has no other preconditions.
    let result = unsafe { add(a, b) };
    println!("The sum of {} and {} is {}", a, b, result);
}
```

The 2024 edition requires `unsafe extern` on the block, because declaring a foreign signature is itself a promise the compiler can't check. If a foreign function has no preconditions, you can declare it as `safe fn add(...)` inside the block and call it without `unsafe`.

The `libc` crate is useful for platform types and functions (`size_t`, `open`, `mmap`), but it is raw bindings, not a safe wrapper. Every call through it is still `unsafe`.

## Guidelines

- Keep unsafe blocks small, and put a `// SAFETY:` comment on each one explaining why it's sound.
- Document every `unsafe fn` and `unsafe trait` with a `# Safety` section listing the caller's or implementor's obligations.
- Run tests under [Miri](https://github.com/rust-lang/miri) (`cargo +nightly miri test`). It catches many kinds of undefined behaviour, such as out-of-bounds reads and invalid aliasing, that normal tests miss.
- Prefer an existing safe wrapper crate over writing your own bindings when one exists.

## Further reading

- [The Rust Book: Unsafe Rust](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html)
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/)
- [Rust 2024 edition guide: unsafe extern blocks](https://doc.rust-lang.org/edition-guide/rust-2024/unsafe-extern.html)
