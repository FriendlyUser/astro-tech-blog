---
title: "Rust data structures: tuples, arrays, slices, std collections, structs and enums"
pubDate: "2025-01-25T04:10:36.000Z"
lastUpdated: 2026-11-14
description: "A tour of Rust's core data structures, from tuples, arrays and slices to Vec, String, HashMap and HashSet, plus custom structs and enums."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/492664568.png
---

This post walks through the data structures you'll use most in Rust: the primitive compound types built into the language, the main collections in the standard library, and your own structs and enums. Each snippet compiles on stable Rust when placed inside `fn main()`.

## Built-in compound types

### Tuples

A tuple is a fixed-size group of values that can have different types. Access elements by position or destructure them:

```rust
let tuple = (1, "hello", 2.5);

let first = tuple.0;
let (_, second, third) = tuple;
println!("{first} {second} {third}"); // 1 hello 2.5
```

Tuples are handy for returning more than one value from a function. Once the fields need names, use a struct.

### Arrays

An array has a fixed length that's part of its type (`[i32; 5]`) and lives inline, on the stack for a local variable:

```rust
let array: [i32; 5] = [1, 2, 3, 4, 5];
let zeros = [0u8; 16]; // 16 zeros

println!("{} {}", array[0], zeros.len()); // 1 16
```

Indexing is bounds-checked: `array[10]` with a runtime index panics instead of reading past the end. Use `array.get(i)`, which returns an `Option`, when the index might be out of range.

### Slices

A slice, `&[T]`, is a borrowed view into a contiguous sequence: an array, a `Vec`, or part of either. It's a pointer plus a length, so taking one doesn't copy any elements:

```rust
let array = [1, 2, 3, 4, 5];
let slice: &[i32] = &array[1..4];
println!("{slice:?}"); // [2, 3, 4]
```

Write functions to take `&[T]` rather than `&Vec<T>` or `&[T; N]`, so they accept any of those.

## Standard library collections

The collections live in [`std::collections`](https://doc.rust-lang.org/std/collections/index.html), except `Vec` and `String`, which are in the prelude.

### Vec

`Vec<T>` is a growable array stored contiguously on the heap. It's the default choice for a list of things:

```rust
let mut vec = Vec::new();
vec.push(1);
vec.push(2);
vec.push(3);

let doubled: Vec<i32> = vec.iter().map(|x| x * 2).collect();
println!("{doubled:?}"); // [2, 4, 6]
```

If you know roughly how many elements you'll add, `Vec::with_capacity(n)` avoids repeated reallocations.

### String

`String` is a growable, owned, UTF-8 string; internally it's a `Vec<u8>` that's guaranteed to hold valid UTF-8. `&str` is the borrowed slice equivalent:

```rust
let mut s = String::from("hello");
s.push_str(", world!");
println!("{s} has {} bytes", s.len()); // hello, world! has 13 bytes
```

Because characters can take more than one byte, you can't index a `String` with `s[0]`. Use `s.chars()` to iterate characters, or slice on byte ranges that fall on character boundaries.

### HashMap

`HashMap<K, V>` maps keys to values with average O(1) inserts, lookups and removals:

```rust
use std::collections::HashMap;

let mut map = HashMap::new();
map.insert("key1", "value1");
map.insert("key2", "value2");

if let Some(value) = map.get("key1") {
    println!("{value}"); // value1
}

// Count words with the entry API
let mut counts: HashMap<&str, u32> = HashMap::new();
for word in "a b a c a".split_whitespace() {
    *counts.entry(word).or_insert(0) += 1;
}
println!("{:?}", counts.get("a")); // Some(3)
```

`get` returns an `Option` because the key might be missing. The default hasher (SipHash) is chosen to resist hash-flooding attacks rather than for raw speed; iteration order is unspecified.

### HashSet

`HashSet<T>` stores unique values, again with average O(1) operations:

```rust
use std::collections::HashSet;

let mut set = HashSet::new();
set.insert(1);
set.insert(2);
set.insert(2); // already present, returns false

println!("{} {}", set.len(), set.contains(&1)); // 2 true
```

### Other collections

- `VecDeque`: a ring buffer, for queues that push and pop at both ends.
- `BTreeMap` / `BTreeSet`: sorted by key, with O(log n) operations and range queries.
- `BinaryHeap`: a max-heap priority queue.

## Custom data structures

### Structs

Structs group named fields. Add behaviour with an `impl` block:

```rust
#[derive(Debug, Clone, Copy)]
struct Point {
    x: f64,
    y: f64,
}

impl Point {
    fn distance_to(&self, other: &Point) -> f64 {
        ((self.x - other.x).powi(2) + (self.y - other.y).powi(2)).sqrt()
    }
}

fn main() {
    let a = Point { x: 0.0, y: 0.0 };
    let b = Point { x: 3.0, y: 4.0 };
    println!("{}", a.distance_to(&b)); // 5
}
```

### Enums

Enums are sum types: a value is exactly one of the variants, and each variant can carry its own data. `match` must handle every variant, so adding a variant later produces compile errors everywhere you forgot to handle it:

```rust
enum Shape {
    Circle(f64),
    Rectangle(f64, f64),
}

fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle(r) => std::f64::consts::PI * r * r,
        Shape::Rectangle(w, h) => w * h,
    }
}

fn main() {
    let shapes = [Shape::Circle(1.0), Shape::Rectangle(2.0, 3.0)];
    for s in &shapes {
        println!("{:.2}", area(s)); // 3.14, then 6.00
    }
}
```

## Where the safety comes from

None of the types above are special; the guarantees come from the ownership rules that apply to all of them:

- **Ownership**: each value has one owner, and it's dropped (its memory freed) when the owner goes out of scope. There's no garbage collector.
- **Borrowing**: you can have either any number of shared references (`&T`) or one mutable reference (`&mut T`) at a time. This is why you can't push to a `Vec` while iterating over it.
- **Lifetimes**: the compiler checks that a reference never outlives the data it points to, so a slice of a `Vec` can't survive the `Vec` being dropped.

The same rules, together with the `Send` and `Sync` traits, are what stop you from sharing a collection between threads without synchronisation: to mutate a `HashMap` from several threads you have to wrap it in something like `Arc<Mutex<HashMap<_, _>>>`, and the compiler rejects the code otherwise.

## Further reading

- [The Rust Book: common collections](https://doc.rust-lang.org/book/ch08-00-common-collections.html)
- [`std::collections` docs](https://doc.rust-lang.org/std/collections/index.html), including guidance on which collection to pick
