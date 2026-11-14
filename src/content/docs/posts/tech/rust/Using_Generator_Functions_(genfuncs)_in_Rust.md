---
title: "Generator functions in Rust: iter::from_fn, async-stream and nightly gen blocks"
pubDate: "2023-04-20T14:45:32.928Z"
lastUpdated: 2026-11-14
description: "Rust has no stable yield keyword. Here's how to write generator-style code today with iter::from_fn, async-stream, and the unstable gen blocks."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/387158145.png
---

:::caution
An earlier version of this post claimed Rust marks generator functions with `async`. That's wrong: `async fn`
returns a `Future`, and stable Rust has no `yield` keyword. Generators exist only on nightly (see the last
section). "genfuncs" is not a Rust feature or crate; it's just shorthand for generator functions.
:::

A generator function produces a sequence of values lazily, pausing after each `yield` and resuming where it
left off on the next request. Python's `def ... yield` and JavaScript's `function*` are the familiar
examples. In Rust you get the same effect today by returning an `Iterator` (synchronous) or a `Stream`
(asynchronous). This post builds a Fibonacci generator three ways.

## Stable Rust: `std::iter::from_fn`

`iter::from_fn` turns a closure into an iterator. The closure owns the state that a generator would keep
between `yield`s, and returns `Some(value)` for each item or `None` to stop:

```rust
fn fibonacci() -> impl Iterator<Item = u64> {
    let (mut a, mut b) = (0u64, 1u64);
    std::iter::from_fn(move || {
        let current = a;
        let next = a.checked_add(b)?; // stop instead of overflowing
        (a, b) = (b, next);
        Some(current)
    })
}

fn main() {
    for n in fibonacci().take(10) {
        println!("{n}");
    }
}
```

This prints `0 1 1 2 3 5 8 13 21 34`. Using `checked_add` makes the iterator end cleanly near the top of the
`u64` range instead of panicking in debug builds. For sequences where each item depends only on the previous
one, `std::iter::successors` is even shorter. For anything with more state, write a struct and implement
`Iterator` for it.

## Async: the `async-stream` crate

When producing each value involves `.await` (reading from a socket, polling an API), you want a `Stream`
rather than an `Iterator`. The [`async-stream`](https://docs.rs/async-stream) crate (0.3.6 at the time of
writing) gives you a `stream!` macro where `yield` works:

```toml
[dependencies]
async-stream = "0.3"
futures = "0.3"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

```rust
use async_stream::stream;
use futures::{pin_mut, Stream, StreamExt};

fn fibonacci() -> impl Stream<Item = u64> {
    stream! {
        let (mut a, mut b) = (0u64, 1u64);
        loop {
            yield a;
            (a, b) = (b, a + b);
        }
    }
}

#[tokio::main]
async fn main() {
    let fib = fibonacci().take(10);
    pin_mut!(fib); // the stream must be pinned before calling next()

    while let Some(value) = fib.next().await {
        println!("{value}");
    }
}
```

Two things the original version of this example got wrong:

- `async fn main` needs a runtime; `#[tokio::main]` provides one.
- The stream returned by `stream!` is not `Unpin`, so `next()` won't compile until you pin it with
  `pin_mut!` (or `Box::pin`).

The infinite `loop` is fine here because `take(10)` stops polling after ten items; without it, `a + b` would
eventually overflow.

## Nightly: `gen` blocks

Native generators are being designed under the unstable `gen_blocks` feature
([tracking issue #117078](https://github.com/rust-lang/rust/issues/117078)), which allows `gen` blocks and
`gen fn`. A `gen` block evaluates to an `Iterator`, so the Fibonacci example becomes:

```rust
#![feature(gen_blocks)]

fn fibonacci() -> impl Iterator<Item = u64> {
    gen {
        let (mut a, mut b) = (0u64, 1u64);
        loop {
            yield a;
            (a, b) = (b, a + b);
        }
    }
}
```

This needs a nightly compiler and the 2024 edition (where `gen` is a reserved keyword). As of this update the
feature is still unstable, so the syntax may change; use `from_fn` or a hand-written `Iterator` in code you
need to ship.

## Further reading

- [`std::iter::from_fn`](https://doc.rust-lang.org/std/iter/fn.from_fn.html) and
  [`std::iter::successors`](https://doc.rust-lang.org/std/iter/fn.successors.html)
- [`async-stream` docs](https://docs.rs/async-stream)
- [`gen_blocks` in the Unstable Book](https://doc.rust-lang.org/unstable-book/language-features/gen-blocks.html)
