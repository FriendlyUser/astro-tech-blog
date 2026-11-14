---
title: "Rust text processing: String, &str and the regex crate"
pubDate: "2024-07-16T02:35:36.000Z"
lastUpdated: 2026-11-14
description: "How Rust's String and &str differ, the standard methods for building and splitting text, why len() counts bytes, and matching with the regex crate."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1693067648.png
---

Rust has two everyday string types and a small set of standard-library methods that cover most text work. When you need pattern matching, the `regex` crate fills the gap. This post walks through both, with examples you can paste into `cargo run`.

## `String` vs `&str`

Both hold UTF-8 encoded text. The difference is ownership:

- `String` is an owned, growable buffer on the heap. Use it when you build or modify text.
- `&str` is a borrowed view into UTF-8 bytes owned by something else: a `String`, a string literal (which is `&'static str`), or a slice of either. Use it for read-only access, and prefer `&str` for function parameters, because a `&String` coerces to `&str` automatically.

## Building a `String`

The common methods live on the `String` type in `std::string`:

- `String::new()` creates an empty string; `String::from("...")` or `"...".to_string()` copies a literal.
- `push_str(&str)` appends a slice; `push(char)` appends one character.
- `pop()` removes and returns the last `char`, or `None` if the string is empty.
- `format!` builds a new `String` from a template, which is usually clearer than many pushes.

```rust
fn main() {
    let mut greeting = String::new();
    greeting.push_str("Hello, ");
    greeting.push_str("Rust");
    greeting.push('!');
    println!("{greeting}"); // Hello, Rust!

    let last = greeting.pop();
    println!("{last:?} {greeting}"); // Some('!') Hello, Rust

    let name = "Ferris";
    let message = format!("{greeting} and {name}");
    println!("{message}"); // Hello, Rust and Ferris
}
```

## Reading and splitting `&str`

Methods on `str` work on both `&str` and `String` (through deref):

- `trim()` removes leading and trailing whitespace and returns a subslice, with no allocation.
- `split(pat)` splits on a `char`, `&str` or closure; `split_whitespace()` splits on any run of Unicode whitespace.
- `lines()` iterates over lines, handling both `\n` and `\r\n`.
- `chars()` iterates over Unicode scalar values (`char`); `bytes()` iterates over raw `u8`.

```rust
fn main() {
    let input = "  Hello,   Rust! \n";

    // split(' ') would yield empty strings for the repeated spaces;
    // split_whitespace() skips them.
    let words: Vec<&str> = input.trim().split_whitespace().collect();
    println!("{words:?}"); // ["Hello,", "Rust!"]

    let csv = "name,age\nAda,36\r\nLinus,54";
    for line in csv.lines().skip(1) {
        let fields: Vec<&str> = line.split(',').collect();
        println!("{} is {}", fields[0], fields[1]);
    }
}
```

## `len()` counts bytes, not characters

This is the gotcha that catches most people coming from other languages:

```rust
fn main() {
    let s = "héllo";
    println!("{}", s.len());           // 6: 'é' takes two bytes in UTF-8
    println!("{}", s.chars().count()); // 5

    // Slicing uses byte offsets and panics if an offset falls inside a character:
    println!("{}", &s[0..1]);          // "h"
    // println!("{}", &s[0..2]);       // panics: byte index 2 is not a char boundary

    // Use get() when you're not sure; it returns None instead of panicking.
    println!("{:?}", s.get(0..2));     // None
}
```

A `char` is a Unicode scalar value, not a user-perceived character. An emoji with a skin-tone modifier, or a letter with a combining accent, is several `char`s. If you need grapheme clusters (for cursor movement or truncating text for display), use the [`unicode-segmentation`](https://crates.io/crates/unicode-segmentation) crate.

## Pattern matching with `regex`

The standard library has no regular expressions. The [`regex`](https://crates.io/crates/regex) crate, maintained by the Rust project, is the usual choice. Add it with `cargo add regex`, or in `Cargo.toml`:

```toml
[dependencies]
regex = "1.12"
```

The main API:

- `Regex::new(pattern)` compiles a pattern and returns `Result<Regex, regex::Error>`.
- `is_match(text)` checks whether the pattern matches anywhere.
- `find_iter(text)` yields each match; `captures(text)` / `captures_iter(text)` give access to capture groups.
- `replace_all(text, rep)` returns a `Cow<str>`, which only allocates if something was replaced.

```rust
use regex::Regex;

fn main() {
    let text = "I have 3 apples and 4 oranges.";

    let digits = Regex::new(r"\d+").unwrap();
    println!("{}", digits.is_match(text));         // true
    println!("{}", digits.replace_all(text, "X")); // I have X apples and X oranges.

    // Named capture groups: (?<name>...) is supported since regex 1.9.
    let item = Regex::new(r"(?<count>\d+) (?<fruit>\w+)").unwrap();
    for caps in item.captures_iter(text) {
        let count: u32 = caps["count"].parse().unwrap();
        println!("{} -> {}", &caps["fruit"], count);
    }
    // apples -> 3
    // oranges -> 4
}
```

## Gotchas

- **Compile a regex once.** `Regex::new` is relatively expensive. Don't call it inside a loop or a hot function; store it in a struct or a `static` using `std::sync::LazyLock` (stable since Rust 1.80).
- **No look-around or backreferences.** The `regex` crate guarantees linear-time matching, so it leaves out features that need backtracking. If you need them, [`fancy-regex`](https://crates.io/crates/fancy-regex) adds them on top.
- **Plain substring work doesn't need regex.** `contains`, `starts_with`, `find`, `replace` and `split` on `str` are simpler and faster for fixed strings.

## Further reading

- [`String` docs](https://doc.rust-lang.org/std/string/struct.String.html) and [`str` docs](https://doc.rust-lang.org/std/primitive.str.html)
- [The Rust Book: Storing UTF-8 Encoded Text with Strings](https://doc.rust-lang.org/book/ch08-02-strings.html)
- [`regex` crate documentation](https://docs.rs/regex)
