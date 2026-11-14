---
title: "Unsafe Rust basics: raw pointers and calling C's malloc and free"
description: What the unsafe keyword allows in Rust, with two examples, dereferencing a raw pointer and managing a buffer with libc's malloc and free, plus the rules you must uphold.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

Safe Rust rejects any program the compiler can't prove is memory-safe. Some correct programs, such as code that talks to C libraries or implements low-level data structures, can't be proven safe by the compiler. For those, Rust has `unsafe`: a block or function where you promise the compiler that you've checked the invariants it can't.

`unsafe` doesn't switch off the borrow checker or type checking. It unlocks five extra operations:

- dereferencing a raw pointer (`*const T` / `*mut T`)
- calling an `unsafe` function, including foreign (C) functions
- reading or writing a mutable `static`
- implementing an `unsafe` trait (such as `Send` or `Sync`)
- reading fields of a `union`

If code in an `unsafe` block breaks one of Rust's rules, for example by reading freed memory, the result is undefined behaviour, the same as in C.

## Dereferencing a raw pointer

```rust
fn main() {
    let mut num = 5;
    let ptr = &mut num as *mut i32;

    unsafe {
        *ptr += 1;
    }

    println!("{num}"); // 6
}
```

`&mut num as *mut i32` casts a mutable reference to a raw pointer. Creating a raw pointer is safe; only dereferencing it needs `unsafe`, because the compiler no longer tracks whether it points at valid, live memory. Here it obviously does, since `num` is still in scope.

Raw pointers also support pointer arithmetic (`ptr.add(n)`, `ptr.offset(n)`), which is `unsafe` too: going past the end of the allocation is undefined behaviour.

## Allocating a buffer with C's malloc

Calling C functions is the most common reason to write `unsafe`. This example uses the [`libc`](https://crates.io/crates/libc) crate (0.2.191 at the time of writing) for the `malloc` and `free` declarations:

```toml
[dependencies]
libc = "0.2"
```

```rust
use std::{ptr, slice};

fn main() {
    let array = [1, 2, 3, 4, 5];
    let len = array.len();
    let byte_len = len * std::mem::size_of::<i32>();

    // SAFETY: malloc returns either null or a pointer to at least `byte_len`
    // bytes, suitably aligned for any type, which we check before using.
    let raw = unsafe { libc::malloc(byte_len) } as *mut i32;
    if raw.is_null() {
        panic!("malloc failed");
    }

    {
        // SAFETY: `raw` points to `len` i32s worth of uninitialised memory that
        // nothing else uses. We initialise it with the copy before creating a
        // slice over it, and the slice is dropped before we free the memory.
        let buffer = unsafe {
            ptr::copy_nonoverlapping(array.as_ptr(), raw, len);
            slice::from_raw_parts_mut(raw, len)
        };

        buffer[0] = 10;
        for value in buffer.iter() {
            println!("{value}");
        }
    }

    // SAFETY: `raw` came from malloc and is freed exactly once.
    unsafe { libc::free(raw as *mut libc::c_void) };
}
```

This prints `10 2 3 4 5`, one per line. The things that make it correct are all things the compiler can't check:

- `malloc` can return null, so we check before using the pointer.
- The memory must be initialised before we make a slice over it; `copy_nonoverlapping` does that.
- The slice `buffer` must not be used after `free`. The inner block ends its lifetime first. `from_raw_parts_mut` would otherwise hand back a slice with an unbounded lifetime that the borrow checker can't tie to the allocation.
- Memory from `malloc` must be released with `free`, not Rust's allocator, and only once.

In real code you'd only do this if a C library hands you `malloc`ed memory or expects you to give it some. For your own buffers, `Vec<i32>` (or `std::alloc` if you need manual control) does the same thing safely.

## Keeping unsafe code manageable

- Keep `unsafe` blocks small and wrap them in a safe function whose signature can't be misused. That's how most of the standard library is built.
- Write a `// SAFETY:` comment on each `unsafe` block explaining why the invariants hold. Clippy's `undocumented_unsafe_blocks` lint can enforce this.
- Run tests under [Miri](https://github.com/rust-lang/miri), which detects many kinds of undefined behaviour (out-of-bounds access, use-after-free, invalid aliasing) at runtime.

## Further reading

- [Unsafe Rust in The Rust Programming Language](https://doc.rust-lang.org/book/ch20-01-unsafe-rust.html)
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/), the detailed guide to writing unsafe code
