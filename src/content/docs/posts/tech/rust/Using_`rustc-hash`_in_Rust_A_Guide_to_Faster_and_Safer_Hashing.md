---
title: Using `rustc-hash` in Rust A Guide to Faster and Safer Hashing
pubDate: "2023-04-22T16:25:04.921Z"
description: "This article will discuss the benefits of using `rustc-hash` and provide a tutorial on how to use it in your Rust projects."
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using `rustc-hash` in Rust: A Guide to Faster and Safer Hashing

Rust is known for its focus on performance and memory safety. However, when it comes to hashing, the standard library's `std::collections::HashMap` can sometimes lead to performance bottlenecks. This is where the `rustc-hash` crate comes into play. This article will discuss the benefits of using `rustc-hash` and provide a tutorial on how to use it in your Rust projects.

## Why Use `rustc-hash`?

`rustc-hash` is a fast, non-cryptographic hashing library that was initially developed for use within the Rust compiler. It has since been extracted into a standalone crate, making it available for general use. Its key benefits include:

1. **Performance**: `rustc-hash` uses the FxHash algorithm, which is optimized for performance on small keys, such as integers and strings. This makes it well-suited for many common use cases.

2. **Deterministic output**: Unlike some other hashing algorithms, FxHash produces the same output across different platforms and Rust versions. This can help you avoid hard-to-debug issues due to non-deterministic behavior.

3. **Minimal dependencies**: `rustc-hash` has no dependencies, which is a major advantage for projects that want to minimize their dependency tree.

## How to Use `rustc-hash`

To start using `rustc-hash` in your Rust project, you'll need to add it to your `Cargo.toml` file:

```toml
[dependencies]
rustc-hash = "1.1.0"
```

Next, let's see how to utilize `rustc-hash` in your Rust code. First, import the necessary items:

```rust
use rustc_hash::FxHashMap;
use std::collections::hash_map::Entry;
```

Now, let's create a simple example that demonstrates the usage of `FxHashMap`:

```rust
fn main() {
    let mut word_count = FxHashMap::default();

    let text = "the quick brown fox jumps over the lazy dog";
    for word in text.split_whitespace() {
        let count = word_count.entry(word).or_insert(0);
        *count += 1;
    }

    println!("{:?}", word_count);
}
```

In this example, we create a word count dictionary using `FxHashMap`. The code iterates over the words in the given `text` and updates the count of each word in the `word_count` map. When run, the program will output the following:

```
{
    "the": 2, "quick": 1, "brown": 1, "fox": 1, "jumps": 1, "over": 1, "lazy": 1, "dog": 1
}
```

## Comparing `rustc-hash` to `std::collections::HashMap`

To better understand the performance difference between `rustc-hash` and the standard `HashMap`, we can create a simple benchmark comparing the two.

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use rand::Rng;
use rustc_hash::FxHashMap;
use std::collections::HashMap;

fn benchmark(c: &mut Criterion) {
    let mut rng = rand::thread_rng();
    let keys: Vec<i32> = (0..10_000).map(|_| rng.gen_range(0..1_000_000)).collect();

    c.bench_function("rustc-hash", |b| {
        b.iter(|| {
            let mut map = FxHashMap::default();
            for &key in &keys {
                *map.entry(key).or_insert(0) += 1;
            }
            black_box(&map);
        })
    });

    c.bench_function("std::collections::HashMap", |b| {
        b.iter(|| {
            let mut map = HashMap::new();
            for &key in &keys {
                *map.entry(key).or_insert(0) += 1;
            }
            black_box(&map);
        })
    });
}

criterion_group!(benches, benchmark);
criterion_main!(benches);
```

Running this benchmark will likely show that `rustc-hash` outperforms the standard `HashMap` for this use case.

It's important to note that `rustc-hash` is not suitable for all applications. For example, if you need a cryptographically secure hash, you should use a dedicated cryptographic hashing library instead. Additionally, FxHash may be susceptible to hash collision attacks in untrusted contexts.

In conclusion, `rustc-hash` is an excellent choice for many Rust applications requiring fast, deterministic hashing with minimal dependencies. By leveraging its performance characteristics, you can optimize your Rust applications for various use cases.
