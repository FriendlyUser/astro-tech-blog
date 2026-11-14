---
title: "Rust iterators: adapters, consumers, and writing your own"
pubDate: "2024-04-21T08:28:32.000Z"
lastUpdated: 2026-11-14
description: "How Rust's Iterator trait works, how lazy adapters like map and filter chain into consumers like sum, how to implement a custom iterator, and common pitfalls."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1452718796.webp
---

An iterator in Rust is any type that implements the `Iterator` trait. Iterators are lazy: adapters such as `map` and `filter` build up a pipeline, and nothing runs until a consumer such as `sum`, `collect`, or a `for` loop pulls values through it. This post covers the trait, how chains are evaluated, and how to write your own iterator.

## The `Iterator` trait

The trait has one required method, `next`, which returns `Some(item)` until the sequence is exhausted and then `None`:

```rust
pub trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // ...plus dozens of provided methods: map, filter, take, sum, collect, etc.
}
```

Implement `next` and you get every provided method (`map`, `filter`, `zip`, `enumerate`, `fold`, …) for free.

## Getting an iterator

Ranges are iterators themselves. Collections give you three flavours:

- `iter()` yields shared references (`&T`).
- `iter_mut()` yields mutable references (`&mut T`).
- `into_iter()` yields owned values (`T`) and consumes the collection.

A `for` loop calls `into_iter()` on whatever you give it, so `for x in &v` iterates by reference and `for x in v` moves `v`.

```rust
fn main() {
    for i in 1..6 {
        println!("{}", i); // 1 through 5; the upper bound is exclusive
    }
}
```

## Chaining adapters into a consumer

Adapters take the iterator by value and return a new iterator. Here's the sum of all even squares below 100:

```rust
fn main() {
    let sum: i32 = (1..)
        .map(|x| x * x)
        .take_while(|&x| x < 100)
        .filter(|x| x % 2 == 0)
        .sum();

    println!("Sum: {}", sum); // 4 + 16 + 36 + 64 = 120
}
```

`(1..)` is infinite, which is fine because `take_while` stops the chain as soon as a square reaches 100. `sum` needs a type annotation (`let sum: i32`) because it can produce any type implementing `Sum`; without it the code doesn't compile.

With infinite iterators, make sure something in the chain actually stops it. Replacing `take_while` with `filter(|&x| x < 100)` would type-check but never terminate, because `filter` keeps pulling from `(1..)` looking for more matches.

## Writing a custom iterator

Store the iteration state in a struct and implement `next`. A Fibonacci generator:

```rust
pub struct Fibonacci {
    current: u32,
    next: u32,
}

impl Fibonacci {
    pub fn new() -> Self {
        Fibonacci { current: 0, next: 1 }
    }
}

impl Iterator for Fibonacci {
    type Item = u32;

    fn next(&mut self) -> Option<Self::Item> {
        let current = self.current;
        let next = current.checked_add(self.next)?; // end the sequence on overflow
        self.current = self.next;
        self.next = next;
        Some(current)
    }
}

fn main() {
    for number in Fibonacci::new().take(10) {
        println!("{}", number);
    }
}
```

Without `checked_add`, iterating far enough would overflow `u32`: that panics in debug builds and silently wraps in release builds. Returning `None` instead ends the iterator cleanly, a little before the largest Fibonacci number that fits in a `u32`.

For one-off iterators you often don't need a struct. `std::iter::successors` and `std::iter::from_fn` build an iterator from a closure:

```rust
fn main() {
    let powers_of_two: Vec<u32> = std::iter::successors(Some(1u32), |&n| n.checked_mul(2))
        .take(5)
        .collect();
    println!("{:?}", powers_of_two); // [1, 2, 4, 8, 16]
}
```

## Performance

Iterator chains compile down to the same machine code as a hand-written loop in most cases. Each adapter is a small struct, and the optimizer inlines the `next` calls. In some cases iterators are faster than indexed loops, because iterating a slice avoids per-element bounds checks.

The things that do cost something:

- `collect()` allocates. Avoid collecting into a `Vec` just to iterate it again; keep the chain going instead.
- `clone()` or `cloned()` on items you could borrow.
- Boxing iterators (`Box<dyn Iterator<Item = T>>`) prevents inlining. Use `impl Iterator<Item = T>` in return position when you can.

## Gotchas

- An adapter chain with no consumer does nothing. The compiler warns about this because adapters are marked `#[must_use]`.
- Calling `.iter()` on a `Vec<i32>` gives `&i32` items, which is why closures often need `|&x|` or `|x| *x`.
- An iterator is consumed as you use it. To iterate twice, create it twice or `clone()` it (most std iterators implement `Clone`).

## Further reading

- [`Iterator` trait documentation](https://doc.rust-lang.org/std/iter/trait.Iterator.html)
- [`std::iter` module overview](https://doc.rust-lang.org/std/iter/index.html)
- [The Rust Book: Processing a Series of Items with Iterators](https://doc.rust-lang.org/book/ch13-02-iterators.html)
