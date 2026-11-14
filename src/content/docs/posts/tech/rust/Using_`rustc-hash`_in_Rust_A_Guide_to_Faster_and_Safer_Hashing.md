---
title: Faster hash maps in Rust with rustc-hash (FxHashMap)
pubDate: "2023-04-22T16:25:04.921Z"
lastUpdated: 2026-11-14
description: "Swap std's SipHash-based HashMap for rustc-hash's FxHashMap, benchmark the two with Criterion, and know when the faster non-DoS-resistant hasher is a bad idea."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

`std::collections::HashMap` hashes keys with SipHash 1-3 and a random seed. That makes it
resistant to hash-flooding (HashDoS) attacks, but it is relatively slow for small keys such as
integers. [`rustc-hash`](https://crates.io/crates/rustc-hash) is the hasher the Rust compiler
uses instead: a fast, non-cryptographic hash, exposed as `FxHashMap` and `FxHashSet`. The
compiler doesn't hash untrusted input, so it trades DoS resistance for speed.

The hasher is still called `FxHasher` because the crate originally used the "Fx" hash from
Firefox. Since 2.0 the algorithm has been replaced by a polynomial hash designed by Orson
Peters (with a separate, wyhash-inspired function for strings and byte slices); the name stayed
for compatibility.

## Adding the crate

```toml
[dependencies]
rustc-hash = "2.1"
```

The examples were checked against rustc-hash 2.1.3. The crate has no required dependencies (`rand` is
optional, behind the `rand` feature) and works in `no_std` with `default-features = false`.

## Using `FxHashMap`

`FxHashMap<K, V>` is a type alias for `HashMap<K, V, FxBuildHasher>`, so it has the full
`HashMap` API. The one difference: create it with `default()` (or
`with_capacity_and_hasher`), because `HashMap::new()` only exists for the default `RandomState`
hasher.

```rust
use rustc_hash::FxHashMap;

fn main() {
    let mut word_count: FxHashMap<&str, u32> = FxHashMap::default();

    let text = "the quick brown fox jumps over the lazy dog";
    for word in text.split_whitespace() {
        *word_count.entry(word).or_insert(0) += 1;
    }

    println!("{:?}", word_count);
    assert_eq!(word_count["the"], 2);
}
```

This prints all eight words with their counts on one line, for example
`{"the": 2, "fox": 1, ...}`. Iteration order is unspecified, so don't rely on it.

To size the map up front:

```rust
use rustc_hash::{FxBuildHasher, FxHashMap};

fn main() {
    let mut map: FxHashMap<u64, u64> =
        FxHashMap::with_capacity_and_hasher(10_000, FxBuildHasher);
    map.insert(1, 2);
    assert!(map.capacity() >= 10_000);
}
```

## Benchmarking against `std::collections::HashMap`

Don't take speed-up claims on trust; measure with your own key types. A
[Criterion](https://crates.io/crates/criterion) benchmark needs a dev-dependency and a `[[bench]]`
entry with the default test harness turned off:

```toml
[dev-dependencies]
criterion = "0.8"

[[bench]]
name = "hashmaps"
harness = false
```

Then create `benches/hashmaps.rs`:

```rust
use std::collections::HashMap;
use std::hint::black_box;

use criterion::{criterion_group, criterion_main, Criterion};
use rustc_hash::FxHashMap;

/// 10,000 pseudo-random keys from a simple LCG, so no `rand` dependency is needed.
fn keys() -> Vec<u32> {
    let mut x: u32 = 12_345;
    (0..10_000)
        .map(|_| {
            x = x.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
            x % 1_000_000
        })
        .collect()
}

fn benchmark(c: &mut Criterion) {
    let keys = keys();

    c.bench_function("FxHashMap", |b| {
        b.iter(|| {
            let mut map = FxHashMap::default();
            for &key in &keys {
                *map.entry(key).or_insert(0u32) += 1;
            }
            black_box(map)
        })
    });

    c.bench_function("std HashMap", |b| {
        b.iter(|| {
            let mut map = HashMap::new();
            for &key in &keys {
                *map.entry(key).or_insert(0u32) += 1;
            }
            black_box(map)
        })
    });
}

criterion_group!(benches, benchmark);
criterion_main!(benches);
```

Run it with `cargo bench`. Criterion 0.8 deprecates its own `black_box` in favour of
`std::hint::black_box`, which is what the example uses. For small integer keys like these,
`FxHashMap` is typically noticeably faster, but the size of the gap depends on your CPU, key type
and map size.

## When not to use it

- **Untrusted keys.** `FxHasher` is not seeded randomly, so anyone who can choose the keys
  (HTTP headers, JSON object keys, user IDs from the network) can craft collisions and turn
  O(1) lookups into O(n). Keep the default `HashMap` there. The crate's optional `rand` feature adds
  `FxHashMapRand` with a random seed, but that doesn't make the hash cryptographically strong.
- **Cryptographic use.** It is not a cryptographic hash. Use a crate such as `sha2` or `blake3`.
- **Persisted or cross-platform hash values.** The output depends on pointer width (32-bit and
  64-bit targets use different constants) and has changed between crate versions (2.0 replaced the
  algorithm and 2.1.1 changed it again). Don't store `FxHasher` values or send them between
  machines.

## Further reading

- [rustc-hash on docs.rs](https://docs.rs/rustc-hash)
- [rustc-hash changelog](https://github.com/rust-lang/rustc-hash/blob/main/CHANGELOG.md)
- [The Rust Performance Book: Hashing](https://nnethercote.github.io/perf-book/hashing.html)
