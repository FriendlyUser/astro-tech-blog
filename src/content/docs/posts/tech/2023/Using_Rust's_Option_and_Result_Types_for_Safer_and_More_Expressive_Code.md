---
title: "Working with Option and Result in Rust: matching, combinators and conversions"
pubDate: "2024-01-06T06:30:05.000Z"
lastUpdated: 2026-11-14
description: "Use Rust's Option and Result types with match, combinators such as map, and_then and unwrap_or, the ? operator, and conversions like ok_or and transpose."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3431403716.webp
---

Rust has no null and no exceptions. Instead, a value that might be missing has type `Option<T>`, and an operation that might fail returns `Result<T, E>`. Because these are ordinary enums, the compiler makes you handle the missing or failed case before you can use the value. This post shows how to work with both without drowning in `match` statements.

## Option

`Option` is defined in the standard library as:

```rust
pub enum Option<T> {
    None,
    Some(T),
}
```

An `Option<&str>` is either `Some` with a string slice or `None`. You can't call string methods on it directly, so you can't forget to check for the missing case the way you can with a null pointer.

### Returning an Option

Here's a function that looks up a user's name by ID:

```rust
struct User {
    id: u32,
    name: String,
}

fn find_user_name(users: &[User], id: u32) -> Option<&str> {
    for user in users {
        if user.id == id {
            return Some(user.name.as_str());
        }
    }
    None
}

fn main() {
    let users = vec![
        User { id: 1, name: "Alice".to_string() },
        User { id: 42, name: "Bob".to_string() },
    ];

    match find_user_name(&users, 42) {
        Some(name) => println!("Found user: {name}"),
        None => println!("User not found"),
    }
}
```

With iterator methods, the lookup is one expression: `find` already returns an `Option`, and `map` transforms the value inside it:

```rust
fn find_user_name(users: &[User], id: u32) -> Option<&str> {
    users.iter().find(|u| u.id == id).map(|u| u.name.as_str())
}
```

If you only care about one case, `if let` is shorter than `match`:

```rust
if let Some(name) = find_user_name(&users, 42) {
    println!("Found user: {name}");
}
```

### Option combinators

These methods let you transform an `Option` without unpacking it:

```rust
let doubled = Some(2).map(|x| x * 2);                       // Some(4)
let checked = Some(2u32).and_then(|x| x.checked_sub(5));    // None (would underflow)
let filtered = Some(7).filter(|x| x % 2 == 0);              // None
let value = None.unwrap_or(0);                              // 0
let computed = None::<i32>.unwrap_or_else(|| 40 + 2);        // 42
```

- `map` applies a function to the value inside `Some` and leaves `None` alone.
- `and_then` is for functions that themselves return an `Option`, so you don't end up with `Option<Option<T>>`.
- `unwrap_or` supplies a default. Its argument is always evaluated, so use `unwrap_or_else` when the default is expensive to compute.

## Result

`Result` represents success or failure:

```rust
pub enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

### Returning a Result

Reading a file can fail because it doesn't exist, because of permissions, or because of other I/O errors, so `File::open` returns a `Result`:

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file_contents(path: &str) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file_contents("file.txt") {
        Ok(contents) => println!("File contents: {contents}"),
        Err(error) => println!("Error reading file: {error}"),
    }
}
```

The `?` after an expression means: if it's `Err`, return that error from this function now; otherwise unwrap the `Ok` value and continue. `Result` is also marked `#[must_use]`, so the compiler warns if you call a function returning one and ignore the result.

### Result combinators

`Result` has the same family of methods, plus some that act on the error side. The type annotations are needed here because a bare `Ok(2)` doesn't tell the compiler what the error type is:

```rust
use std::num::ParseIntError;

let ok: Result<i32, String> = Ok(2);
let doubled = ok.clone().map(|x| x * 2);                       // Ok(4)
let positive = ok.clone().and_then(|x| {
    if x > 0 { Ok(x) } else { Err("not positive".to_string()) }
});                                                            // Ok(2)

let err: Result<i32, String> = Err("boom".to_string());
let value = err.clone().unwrap_or(0);                          // 0
let message = err.map_err(|e| format!("failed: {e}"));         // Err("failed: boom")

let parsed: Result<i32, ParseIntError> = "abc".parse::<i32>();
println!("{}", parsed.is_err());                               // true
```

`map_err` is the one you'll reach for most often in practice: it converts a low-level error into the error type your function returns, so `?` can propagate it.

## Converting between Option and Result

These conversions come up constantly at the boundary between "might be missing" and "might fail":

```rust
let maybe_port: Option<&str> = Some("8080");

// Option -> Result: turn None into a specific error
let port_str: Result<&str, String> = maybe_port.ok_or("PORT not set".to_string());

// Result -> Option: discard the error
let port: Option<u16> = "8080".parse::<u16>().ok();   // Some(8080)
```

`ok_or_else` is the lazy version of `ok_or`, for when building the error is expensive.

### transpose

Sometimes you have an optional value that needs a fallible operation, such as an optional config field that has to be parsed. Mapping the parse over the `Option` gives you `Option<Result<T, E>>`, which is awkward to use with `?`. `transpose` swaps the layers into `Result<Option<T>, E>`:

```rust
use std::num::ParseIntError;

fn parse_optional_port(raw: Option<&str>) -> Result<Option<u16>, ParseIntError> {
    raw.map(|s| s.parse::<u16>()).transpose()
}

fn main() {
    println!("{:?}", parse_optional_port(Some("8080"))); // Ok(Some(8080))
    println!("{:?}", parse_optional_port(None));         // Ok(None)
    println!("{}", parse_optional_port(Some("abc")).is_err()); // true
}
```

A missing value is fine (`Ok(None)`), but a present value that doesn't parse is an error the caller can propagate with `?`.

## Gotchas

- `unwrap()` and `expect()` panic on `None` or `Err`. They're fine in tests and prototypes; in real code prefer `?`, a default, or an explicit `match`. If you do use one, `expect("why this can't fail")` documents your reasoning.
- `?` on an `Option` only works inside a function that returns `Option`, and `?` on a `Result` only inside one that returns `Result`. Use `ok_or` or `.ok()` to convert at the boundary.

## Further reading

- [`std::option` module docs](https://doc.rust-lang.org/std/option/), including a table of all the combinators
- [`std::result` module docs](https://doc.rust-lang.org/std/result/)
