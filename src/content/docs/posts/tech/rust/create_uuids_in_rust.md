---
tags: ['rust']
title: Generating UUIDs in Rust with the uuid crate
description: How to generate random (v4), name-based (v5) and time-ordered (v7) UUIDs in Rust with the uuid crate, including the Cargo features each one needs.
pubDate: Mon, 30 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: '/imgs/2023/2421950579.png'
---

A UUID (Universally Unique Identifier) is a 128-bit value, usually written as 32 hex digits in five hyphenated groups. Because they can be generated independently on any machine with a negligible chance of collision, they're handy as database keys and request IDs in distributed systems. In Rust, the standard choice is the [`uuid`](https://crates.io/crates/uuid) crate.

This post was written against `uuid` 1.29.2.

## Set up the project

```bash
cargo new uuid_example
cd uuid_example
```

## Add the dependency

Since 1.0, each way of *generating* a UUID sits behind a Cargo feature, so you have to enable the versions you use. Parsing and formatting work without any features.

```toml
[dependencies]
uuid = { version = "1.29", features = ["v4", "v5", "v7"] }
```

Or from the command line:

```bash
cargo add uuid --features v4,v5,v7
```

Without the `v4` feature, `Uuid::new_v4()` simply doesn't exist and you'll get a "no function or associated item named `new_v4`" error.

## Generate UUIDs

Replace `src/main.rs` with:

```rust
use uuid::Uuid;

fn main() {
    // Version 4: random
    let random_uuid = Uuid::new_v4();
    println!("v4 (random):     {random_uuid}");

    // Version 5: SHA-1 hash of a namespace UUID and a name
    let name_based = Uuid::new_v5(&Uuid::NAMESPACE_DNS, b"example.com");
    println!("v5 (name-based): {name_based}");

    // Version 7: Unix timestamp in milliseconds + random bits
    let time_ordered = Uuid::now_v7();
    println!("v7 (time-ordered): {time_ordered}");

    // Parsing needs no feature flags
    let parsed = Uuid::parse_str("67e55044-10b1-426f-9247-bb680e5fe0c8").unwrap();
    println!("parsed version:  {:?}", parsed.get_version());
}
```

Run it:

```bash
cargo run
```

Example output:

```text
v4 (random):     76aeed4f-90d3-4660-a4b5-9a18dd75c0c1
v5 (name-based): cfbff0d1-9375-5685-968c-48ce8b15ae17
v7 (time-ordered): 019a8b2c-7d41-7f3e-9c5a-3b1e2f4d6a80
parsed version:  Some(Random)
```

The v4 and v7 values change every run. The v5 value does not: the same namespace and name always produce the same UUID, so `cfbff0d1-9375-5685-968c-48ce8b15ae17` is what every v5 implementation returns for DNS + `example.com` (Python's `uuid.uuid5(uuid.NAMESPACE_DNS, "example.com")` gives the same result).

## Which version to use

- **v4** has 122 random bits. Use it when you just need an opaque unique ID.
- **v5** is deterministic. Use it to derive a stable ID from something that already identifies the item (a URL, a DNS name) so that re-importing the same data produces the same IDs. (`v3` is the same idea with MD5; prefer v5.)
- **v7** starts with a millisecond timestamp, so values sort roughly by creation time. That keeps B-tree indexes from fragmenting the way random v4 keys do, which makes v7 a better default for database primary keys. It's defined in [RFC 9562](https://www.rfc-editor.org/rfc/rfc9562).

UUIDs are unique in practice, not by guarantee: v4 collisions are astronomically unlikely, but v5 will happily give two items the same ID if you feed it the same name twice.

## Further reading

- [`uuid` documentation on docs.rs](https://docs.rs/uuid)
- [RFC 9562: Universally Unique IDentifiers](https://www.rfc-editor.org/rfc/rfc9562)
