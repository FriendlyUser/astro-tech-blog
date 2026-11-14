---
title: "serde_json basics: converting Rust structs to and from JSON"
description: Add serde and serde_json to a Rust project, derive Serialize and Deserialize, and convert structs to and from JSON strings with error handling.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/294668704.webp'
---

[serde_json](https://docs.rs/serde_json) is the JSON format for [Serde](https://serde.rs), Rust's serialization framework. Serde provides the `Serialize` and `Deserialize` traits (and derive macros for them); serde_json turns anything that implements those traits into JSON and back.

## Installation

serde_json is a library, so you add it to your project's dependencies rather than installing it with `cargo install`. You also need `serde` itself with the `derive` feature:

```bash
cargo add serde --features derive
cargo add serde_json
```

That adds something like this to `Cargo.toml` (serde_json 1.0.154 and serde 1.0.229 at the time of writing):

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

## Serializing a struct

Derive `Serialize` on the struct, then call `serde_json::to_string`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Person {
    name: String,
    age: u8,
}

fn main() -> Result<(), serde_json::Error> {
    let person = Person {
        name: "John Doe".to_string(),
        age: 30,
    };

    let json = serde_json::to_string(&person)?;
    println!("{json}");

    // Indented output for humans
    println!("{}", serde_json::to_string_pretty(&person)?);
    Ok(())
}
```

The first `println!` prints:

```json
{"name":"John Doe","age":30}
```

Fields are written in the order they're declared in the struct.

## Deserializing into a struct

`serde_json::from_str` parses a string into any type that implements `Deserialize`. You tell it which type with an annotation or turbofish:

```rust
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct Person {
    name: String,
    age: u8,
}

fn main() {
    let json = r#"{"name":"John Doe","age":30}"#;

    match serde_json::from_str::<Person>(json) {
        Ok(person) => println!("{} is {}", person.name, person.age),
        Err(e) => eprintln!("invalid JSON: {e}"),
    }
}
```

Output:

```text
John Doe is 30
```

Parsing fails with a descriptive error (including line and column) if a field is missing, has the wrong type, or the JSON is malformed. For example, `"age":300` fails because 300 doesn't fit in a `u8`. Unknown extra fields are ignored by default; add `#[serde(deny_unknown_fields)]` to the struct to reject them.

## JSON without a struct

When the shape isn't known ahead of time, parse into `serde_json::Value`, or build one with the `json!` macro:

```rust
use serde_json::{json, Value};

fn main() -> Result<(), serde_json::Error> {
    let v: Value = serde_json::from_str(r#"{"name":"John Doe","tags":["a","b"]}"#)?;
    println!("{}", v["name"]);    // "John Doe"
    println!("{}", v["tags"][1]); // "b"
    println!("{}", v["missing"]); // null (indexing never panics)

    let built = json!({ "name": "Jane", "age": 41 });
    println!("{built}");
    Ok(())
}
```

## Further reading

- [serde_json API docs](https://docs.rs/serde_json)
- [Serde derive guide](https://serde.rs/derive.html) and [field attributes](https://serde.rs/field-attrs.html) (`rename`, `default`, `skip_serializing_if`, and so on)
