---
title: "Hashbrown in Rust: what it adds over std HashMap and where the speed comes from"
pubDate: "2023-04-22T16:25:05.078Z"
lastUpdated: 2026-11-14
description: "std's HashMap is already built on hashbrown. Here is what the crate still offers (no_std, a faster default hasher) and how to benchmark it fairly."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
`hashbrown` is a Rust port of Google's SwissTable hash map. It is worth knowing about, but not for the reason usually given: since Rust 1.36, `std::collections::HashMap` *is* hashbrown internally. Swapping one for the other does not change the table algorithm. What changes is the default hasher, and whether you need the standard library at all.

## What the crate gives you

- **A faster default hasher.** std's `HashMap` uses SipHash-1-3 by default, which resists HashDoS attacks (an attacker choosing keys that all collide). hashbrown defaults to [foldhash](https://crates.io/crates/foldhash), which is much faster but, per the hashbrown README, does not give the same level of HashDoS resistance.
- **`no_std` support.** hashbrown works without `std`, needing only the `alloc` crate and a global allocator, so you can use it in embedded code or kernels.
- **APIs std doesn't expose**, such as `HashTable` (a raw table where you supply the hash and equality yourself) and optional `rayon` and `serde` integration behind Cargo features.

## Using it

Add the dependency (0.17.1 is the current release at the time of writing):

```toml
[dependencies]
hashbrown = "0.17"
```

The types are drop-in replacements for the std ones:

```rust
use hashbrown::{HashMap, HashSet};

fn main() {
    let mut map = HashMap::new();
    map.insert("key", "value");

    let mut set = HashSet::new();
    set.insert("element");

    println!("{:?}, {:?}", map, set);
}
```

## Comparing performance fairly

The original version of this post timed one million inserts into std's `HashMap` and hashbrown's and printed numbers that were never measured. Because both maps use the same table, the gap you see in a test like that comes almost entirely from SipHash versus foldhash. You can confirm this by adding a third map: std's `HashMap` with foldhash as the hasher.

```toml
[dependencies]
hashbrown = "0.17"
foldhash = "0.2"
```

```rust
use std::collections::HashMap as StdHashMap;
use std::hint::black_box;
use std::time::{Duration, Instant};

use foldhash::{HashMap as StdFoldHashMap, HashMapExt};
use hashbrown::HashMap as HbHashMap;

const N: u64 = 1_000_000;

fn time(label: &str, mut insert_all: impl FnMut()) {
    let start = Instant::now();
    insert_all();
    let elapsed: Duration = start.elapsed();
    println!("{label:<24} {elapsed:?}");
}

fn main() {
    time("std (SipHash)", || {
        let mut m = StdHashMap::new();
        for i in 0..N {
            m.insert(i, i);
        }
        black_box(m);
    });

    time("std + foldhash", || {
        let mut m = StdFoldHashMap::new();
        for i in 0..N {
            m.insert(i, i);
        }
        black_box(m);
    });

    time("hashbrown (foldhash)", || {
        let mut m = HbHashMap::new();
        for i in 0..N {
            m.insert(i, i);
        }
        black_box(m);
    });
}
```

Run it with `cargo run --release`; debug builds are not meaningful for this. Expect the two foldhash maps to land close together and the SipHash map to be slower. Exact numbers depend on your CPU, key type and map size, so measure your own workload. For anything you plan to act on, use a benchmarking harness such as [criterion](https://crates.io/crates/criterion), which runs many iterations and reports variance; a single `Instant` timing is easily skewed by allocation and cache warm-up.

## When to use which

- **You only want faster hashing in a normal `std` program:** keep `std::collections::HashMap` and plug in a faster hasher (`foldhash`, or `rustc-hash` for integer keys). No new map type leaks into your public API.
- **Keys come from untrusted input** (HTTP headers, user-supplied JSON keys): keep std's default SipHash, or choose a hasher with HashDoS resistance.
- **`no_std`, or you need `HashTable` or the extra entry APIs:** use `hashbrown` directly.

## Further reading

- [hashbrown on GitHub](https://github.com/rust-lang/hashbrown)
- [hashbrown on docs.rs](https://docs.rs/hashbrown)
- [`std::collections::HashMap` docs](https://doc.rust-lang.org/std/collections/struct.HashMap.html)
