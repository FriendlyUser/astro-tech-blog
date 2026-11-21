---
title: "Serde attributes in Rust: rename, default, flatten and enum tagging"
description: "The serde attributes that shape your JSON: rename_all, default, skip_serializing_if, flatten, deny_unknown_fields, the four enum representations, and with."
tags: ["Rust", "Serde", "JSON", "Serialization", "serde_json"]
pubDate: "2026-04-01T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_serde_attributes.webp"
imgAlt: "A code panel showing one Rust enum serialized four ways: external, internal, adjacent and untagged JSON"
---

Deriving `Serialize` and `Deserialize` gets a Rust struct to and from JSON with field names copied verbatim and enums in serde's default shape. Real APIs rarely match that: they use camelCase, omit fields, nest things differently, and tag variants with a `"type"` key. Serde's attributes close that gap without hand-written impls.

This post goes through the attributes I use most, with the JSON each one produces. If you're new to serde itself, start with the [serde_json basics post](/posts/tech/rust/how_to_use_serde_json/). Examples use serde 1.0.228 and serde_json 1.0.149.

## Setup

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Every snippet below goes in one `src/lib.rs` with these imports at the top. Each one comes with a test, so `cargo test` checks the JSON shown.

```rust
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::time::Duration;
```

The tests compare `serde_json::Value`s built with `json!`, so key order doesn't matter. (`to_string` writes fields in declaration order, if you're curious.)

## Renaming fields: `rename_all`, `rename`, `alias`

Rust fields are snake_case, JavaScript-facing APIs are usually camelCase. `rename_all` on the container converts every field, and `rename` on a field overrides a single name:

```rust
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub user_id: u64,
    pub display_name: String,
    #[serde(rename = "e-mail")]
    pub email: String,
}

#[test]
fn renames() {
    let user = User {
        user_id: 1,
        display_name: "Ada".into(),
        email: "ada@example.com".into(),
    };
    assert_eq!(
        serde_json::to_value(&user).unwrap(),
        json!({ "userId": 1, "displayName": "Ada", "e-mail": "ada@example.com" })
    );
}
```

The accepted cases are `lowercase`, `UPPERCASE`, `PascalCase`, `camelCase`, `snake_case`, `SCREAMING_SNAKE_CASE`, `kebab-case` and `SCREAMING-KEBAB-CASE`. On an enum, `rename_all` renames the *variants*. `rename_all_fields` renames the fields inside struct variants.

Two related tools:

- `#[serde(alias = "mail")]` accepts an extra name when deserializing, but always serializes the main name. It's useful when an API renames a field and you need to read both old and new payloads.
- `#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]` handles the rare API that is inconsistent between requests and responses.

## Missing fields: `default`

By default, a missing field is an error, except for `Option<T>` fields, which become `None`. `#[serde(default)]` on a field fills it from `Default::default()`, and `default = "path"` calls a function you name:

```rust
#[derive(Deserialize, Debug)]
pub struct ServerConfig {
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub verbose: bool,
}

fn default_port() -> u16 {
    8080
}

#[test]
fn field_defaults() {
    let config: ServerConfig = serde_json::from_str(r#"{ "host": "localhost" }"#).unwrap();
    assert_eq!(config.port, 8080);
    assert!(config.tags.is_empty());
    assert!(!config.verbose);
}
```

On the container, `#[serde(default)]` takes every missing field from the struct's own `Default` impl. That's the better choice when the defaults depend on each other, or when you already have a `Default` impl:

```rust
#[derive(Deserialize, Debug, PartialEq)]
#[serde(default)]
pub struct RetryPolicy {
    pub attempts: u32,
    pub backoff_ms: u64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        RetryPolicy { attempts: 3, backoff_ms: 200 }
    }
}

#[test]
fn container_default() {
    let policy: RetryPolicy = serde_json::from_str(r#"{ "attempts": 5 }"#).unwrap();
    assert_eq!(policy, RetryPolicy { attempts: 5, backoff_ms: 200 });
}
```

`default` only covers *missing* fields. An explicit `null` for a non-`Option` field is still an error.

## Leaving fields out: `skip_serializing_if` and `skip`

For PATCH-style payloads, or to keep responses small, leave out fields that have nothing in them:

```rust
#[derive(Serialize)]
pub struct Patch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub labels: Vec<String>,
}

#[test]
fn skips_empty_fields() {
    let empty = Patch { title: None, labels: vec![] };
    assert_eq!(serde_json::to_string(&empty).unwrap(), "{}");

    let partial = Patch { title: Some("New title".into()), labels: vec![] };
    assert_eq!(serde_json::to_value(&partial).unwrap(), json!({ "title": "New title" }));
}
```

The value is a path to any function that takes `&T` and returns `bool`, so you can write your own predicates.

`#[serde(skip)]` drops a field in both directions. When deserializing, the field is filled from `Default`. `skip_serializing` and `skip_deserializing` do one direction each.

:::caution
`skip_serializing_if` is fine for JSON, YAML and other self-describing formats. Don't use it with formats like bincode or postcard. They don't write field names, so the deserializer can't tell that a field was left out, and it reads the wrong bytes.
:::

## Changing nesting: `flatten`

`flatten` pulls a nested struct's fields up into the parent object. That's handy for shared pieces like pagination:

```rust
#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Pagination {
    pub page: u32,
    pub per_page: u32,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct UserList {
    pub users: Vec<String>,
    #[serde(flatten)]
    pub pagination: Pagination,
}

#[test]
fn flatten_struct() {
    let list = UserList {
        users: vec!["ada".into()],
        pagination: Pagination { page: 2, per_page: 50 },
    };
    assert_eq!(
        serde_json::to_value(&list).unwrap(),
        json!({ "users": ["ada"], "page": 2, "per_page": 50 })
    );
}
```

Flattening a map collects every key that no other field claimed. It's a good way to keep the parts of a payload you don't model:

```rust
#[derive(Deserialize, Debug)]
pub struct Event {
    pub kind: String,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

#[test]
fn flatten_extra_fields() {
    let event: Event = serde_json::from_str(r#"{ "kind": "click", "x": 10, "y": 20 }"#).unwrap();
    assert_eq!(event.kind, "click");
    assert_eq!(event.extra["x"], 10);
    assert_eq!(event.extra.len(), 2);
}
```

`flatten` has costs. To deserialize, serde buffers the object's contents before handing pieces to each field, which is slower and allocates more. Error messages also get vaguer. And it doesn't combine with `deny_unknown_fields`, which is next.

## Rejecting typos: `deny_unknown_fields`

By default serde ignores keys it doesn't recognise. For config files, that means a typo silently falls back to the default value. `deny_unknown_fields` turns it into an error:

```rust
#[derive(Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct Limits {
    pub max_items: u32,
}

#[test]
fn rejects_unknown_fields() {
    let err = serde_json::from_str::<Limits>(r#"{ "max_items": 5, "max_itmes": 10 }"#)
        .unwrap_err();
    assert!(err.to_string().contains("unknown field `max_itmes`"));
}
```

I'd use it for config files and anything a person edits by hand. I'd avoid it for API responses you consume, because then a new field added on the server side breaks your client.

## Enum representations

This is where the attributes matter most, because there's no single obvious way to write a Rust enum as JSON. Take one enum and look at it four ways:

```rust
// 1. Externally tagged (the default)
#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub enum External {
    Circle { radius: u32 },
    Empty,
}

// 2. Internally tagged
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Internal {
    Circle { radius: u32 },
    Empty,
}

// 3. Adjacently tagged
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(tag = "t", content = "c")]
pub enum Adjacent {
    Circle { radius: u32 },
    Empty,
}

// 4. Untagged
#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(untagged)]
pub enum Untagged {
    Circle { radius: u32 },
    Empty,
}

#[test]
fn enum_representations() {
    fn to<T: Serialize>(value: &T) -> serde_json::Value {
        serde_json::to_value(value).unwrap()
    }

    assert_eq!(to(&External::Circle { radius: 3 }), json!({ "Circle": { "radius": 3 } }));
    assert_eq!(to(&External::Empty), json!("Empty"));

    assert_eq!(to(&Internal::Circle { radius: 3 }), json!({ "type": "circle", "radius": 3 }));
    assert_eq!(to(&Internal::Empty), json!({ "type": "empty" }));

    assert_eq!(to(&Adjacent::Circle { radius: 3 }), json!({ "t": "Circle", "c": { "radius": 3 } }));
    assert_eq!(to(&Adjacent::Empty), json!({ "t": "Empty" }));

    assert_eq!(to(&Untagged::Circle { radius: 3 }), json!({ "radius": 3 }));
    assert_eq!(to(&Untagged::Empty), json!(null));
}
```

How to choose:

- **Externally tagged** works with every variant kind and every format, and deserializing is fast, because the tag comes first. The shape (`{"Circle": {...}}`) is unusual in hand-written APIs, though.
- **Internally tagged** (`{"type": "circle", ...}`) is what most JSON APIs and event formats look like. It can't represent tuple variants like `Point(i32, i32)`, and serde rejects that combination at compile time. Deserializing buffers the object, since the tag may not be the first key.
- **Adjacently tagged** (`{"t": ..., "c": ...}`) handles every variant kind and keeps the payload separate from the tag. Use it when the format you are matching does exactly that.
- **Untagged** has no tag at all. Serde tries each variant in order and keeps the first one that deserializes. That's right for "this field is a number or a string", and wrong for most other things.

Here is the untagged case done well, followed by the trap:

```rust
#[derive(Deserialize, Debug, PartialEq)]
#[serde(untagged)]
pub enum IdOrName {
    Id(u64),
    Name(String),
}

#[derive(Deserialize, Debug, PartialEq)]
#[serde(untagged)]
pub enum Number {
    Float(f64),
    Int(i64),
}

#[test]
fn untagged_order_matters() {
    assert_eq!(serde_json::from_str::<IdOrName>("42").unwrap(), IdOrName::Id(42));
    assert_eq!(
        serde_json::from_str::<IdOrName>(r#""ada""#).unwrap(),
        IdOrName::Name("ada".into())
    );

    // f64 happily accepts an integer, so Int is never chosen.
    assert_eq!(serde_json::from_str::<Number>("5").unwrap(), Number::Float(5.0));
}
```

Put the narrowest variant first. And when nothing matches, the error just says the data didn't match any variant, without saying why each one failed. For anything bigger than a two-way choice, an explicit tag gives users much better errors.

## Custom formats for one field: `with`

Sometimes one field needs a different representation. `std::time::Duration`, for instance, serializes as `{"secs": ..., "nanos": ...}`, but config files usually want plain seconds. `#[serde(with = "module")]` points at a module with `serialize` and `deserialize` functions:

```rust
mod duration_secs {
    use serde::{Deserialize, Deserializer, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(value: &Duration, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u64(value.as_secs())
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let secs = u64::deserialize(deserializer)?;
        Ok(Duration::from_secs(secs))
    }
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
pub struct Job {
    pub name: String,
    #[serde(with = "duration_secs")]
    pub timeout: Duration,
}

#[test]
fn with_module() {
    let job = Job { name: "backup".into(), timeout: Duration::from_secs(90) };
    let value = serde_json::to_value(&job).unwrap();
    assert_eq!(value, json!({ "name": "backup", "timeout": 90 }));
    assert_eq!(serde_json::from_value::<Job>(value).unwrap(), job);
}
```

If you only need one direction, `serialize_with` and `deserialize_with` take a single function. A common use is accepting sloppy input, like a port written as either `8080` or `"8080"`:

```rust
fn port_from_number_or_string<'de, D>(deserializer: D) -> Result<u16, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Raw {
        Num(u16),
        Str(String),
    }

    match Raw::deserialize(deserializer)? {
        Raw::Num(n) => Ok(n),
        Raw::Str(s) => s.parse().map_err(serde::de::Error::custom),
    }
}

#[derive(Deserialize, Debug)]
pub struct Listen {
    #[serde(deserialize_with = "port_from_number_or_string")]
    pub port: u16,
}

#[test]
fn lenient_port() {
    let a: Listen = serde_json::from_str(r#"{ "port": 8080 }"#).unwrap();
    let b: Listen = serde_json::from_str(r#"{ "port": "8080" }"#).unwrap();
    assert_eq!(a.port, b.port);
    assert!(serde_json::from_str::<Listen>(r#"{ "port": "http" }"#).is_err());
}
```

Before writing these modules yourself, check the [serde_with](https://docs.rs/serde_with) crate. It has ready-made adapters for durations, timestamps, "anything that implements `Display`/`FromStr`", and more.

## Gotchas

- **`deserialize_with` and missing fields.** A field with `deserialize_with` no longer gets the automatic "missing `Option` means `None`" behaviour. Add `#[serde(default)]` alongside it.
- **Attributes are checked at compile time, paths are not checked for meaning.** A misspelled attribute name is a compile error, but `skip_serializing_if = "Vec::is_empty"` on a field that isn't a `Vec` gives a type error pointing into generated code. Read those errors from the bottom.
- **Renames are part of your API.** Once clients depend on `userId`, renaming the Rust field is safe, but changing `rename_all` is a breaking change. Snapshot tests of the JSON, like the ones in this post, catch that.

## Further reading

- [Serde attributes reference](https://serde.rs/attributes.html): container, variant and field attributes
- [Enum representations](https://serde.rs/enum-representations.html) in the serde book
- [serde_with documentation](https://docs.rs/serde_with)
