---
title: "Cow<str> in Rust: borrow when you can, allocate when you must"
description: "How Rust's Cow<str> lets a function return its input untouched or a new String: a whitespace normaliser, into_owned, to_mut, Cow fields, and from_utf8_lossy."
tags: ["Rust", "Strings", "Cow", "Borrowing", "Standard Library"]
pubDate: "2026-10-29T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_cow_strings.webp"
imgAlt: "Character cells of two strings: a borrowed trimmed slice pointing into the first, and the second copied into a new owned String with its whitespace collapsed"
---

`std::borrow::Cow` ("clone on write") is an enum that holds either a borrowed reference or an owned value. `Cow<'a, str>` is either a `&'a str` or a `String`. It's for functions that *usually* return their input unchanged but *sometimes* have to build a new string. With `Cow`, the common case costs no allocation, and the caller handles both cases through the same type.

This post builds a text normaliser that returns `Cow`, shows the methods you'll actually use (`into_owned`, `to_mut`, deref), puts `Cow` in a struct with a lifetime, and looks at `String::from_utf8_lossy`, the standard library function you've probably already met returning one. Everything is standard library only, using the 2024 edition. If lifetimes in struct definitions are new to you, the [lifetimes post](/posts/tech/rust/intro_to_rust_lifetimes/) covers the background.

## The problem

Say you clean up user-supplied text by trimming it and collapsing runs of whitespace into single spaces. The obvious signature is:

```rust
fn normalize_whitespace(input: &str) -> String
```

That allocates a new `String` for every call, even though most real input (names, tags, header values) is already clean. Returning `&str` doesn't work either, because when the text *does* need changes, the result is new data that the input doesn't contain.

`Cow` covers both:

```rust
pub enum Cow<'a, B: ?Sized + ToOwned + 'a> {
    Borrowed(&'a B),
    Owned(<B as ToOwned>::Owned),
}
```

For `B = str`, the owned type is `String`. `Cow` implements `Deref<Target = str>`, so callers can use the result like a `&str` without caring which variant they got.

## A normaliser that returns `Cow`

```rust
use std::borrow::Cow;

/// Trims the input and collapses each run of whitespace into one space.
/// Allocates only when the trimmed input contains something to collapse.
pub fn normalize_whitespace(input: &str) -> Cow<'_, str> {
    let trimmed = input.trim();
    let already_clean = !trimmed.contains("  ")
        && !trimmed.contains(|c: char| c.is_whitespace() && c != ' ');
    if already_clean {
        // Possibly a shorter slice of the input, but still a borrow.
        return Cow::Borrowed(trimmed);
    }

    let mut out = String::with_capacity(trimmed.len());
    for word in trimmed.split_whitespace() {
        if !out.is_empty() {
            out.push(' ');
        }
        out.push_str(word);
    }
    Cow::Owned(out)
}
```

The check up front is the important part. If the trimmed text has no double spaces and no whitespace other than plain spaces, collapsing would change nothing. So we return a borrow, and the borrow can be a sub-slice: trimming never needs an allocation, because the trimmed text is a contiguous part of the input.

`Cow<'_, str>` ties the result's lifetime to `input`, just as a `&str` return would. The compiler won't let a `Cow::Borrowed` outlive the string it points into.

Tests that pin down which case allocates:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clean_input_is_borrowed() {
        assert!(matches!(normalize_whitespace("hello world"), Cow::Borrowed("hello world")));
        // Trimming alone still borrows: it's a slice of the input.
        assert!(matches!(normalize_whitespace("  hello world "), Cow::Borrowed("hello world")));
    }

    #[test]
    fn messy_input_is_owned() {
        let out = normalize_whitespace("hello \t  world");
        assert_eq!(out, "hello world");
        assert!(matches!(out, Cow::Owned(_)));
    }
}
```

`Cow<str>` compares equal to `&str` and `String`, so `assert_eq!` works directly. `matches!` checks the variant.

## Using a `Cow`

Most of the time you don't touch the variants at all.

**Read it as a `&str`.** Thanks to `Deref`, `out.len()`, `out.starts_with("x")` and passing `&out` to a function that takes `&str` all work. Writing `&*out` gives you a plain `&str` explicitly.

**`into_owned()` when you need a `String`.** It returns the `String` inside an `Owned` without copying, and clones the data in a `Borrowed`. Call it at the point where you actually need ownership, such as storing the value in a long-lived struct, not "just in case" right after the call. That would throw away the saving.

**`to_mut()` to modify it.** `to_mut()` returns `&mut String`. If the `Cow` is borrowed, it first clones the data into an owned `String` and switches to `Owned`. If it's already owned, it hands out the existing `String`, with no copy. That makes it the right tool for chaining steps that each modify the text only sometimes:

```rust
/// Normalised whitespace, ASCII-lowercased. Allocates at most once.
pub fn normalize_key(input: &str) -> Cow<'_, str> {
    let mut key = normalize_whitespace(input);
    if key.bytes().any(|b| b.is_ascii_uppercase()) {
        key.to_mut().make_ascii_lowercase();
    }
    key
}
```

There are three cases:

- `"content-type"`: clean and lowercase, so it's borrowed all the way through. No allocation.
- `"Content-Type"`: borrowed after the first step, then `to_mut` clones it once and lowercases in place.
- `"Content  Type"`: the first step already allocated, so `to_mut` reuses that `String`. Still one allocation in total.

Only call `to_mut` once you know you're going to change something. Calling it unconditionally forces a clone even when nothing changes, which brings back the cost `Cow` was meant to avoid.

## `Cow` in struct fields

A struct can hold `Cow` fields with a lifetime parameter. Each field is then either borrowed from some input or owned, independently:

```rust
#[derive(Debug)]
pub struct Header<'a> {
    pub name: Cow<'a, str>,
    pub value: Cow<'a, str>,
}

impl<'a> Header<'a> {
    /// Parses `Name: value`, normalising both parts.
    pub fn parse(line: &'a str) -> Option<Header<'a>> {
        let (name, value) = line.split_once(':')?;
        Some(Header {
            name: normalize_key(name),
            value: normalize_whitespace(value),
        })
    }

    /// Detaches the header from the input it was parsed from.
    pub fn into_owned(self) -> Header<'static> {
        Header {
            name: Cow::Owned(self.name.into_owned()),
            value: Cow::Owned(self.value.into_owned()),
        }
    }
}
```

Parsing a few thousand headers out of a buffer this way mostly borrows. The type also accepts both literals and computed values when you build headers yourself:

```rust
let fixed = Header { name: Cow::Borrowed("accept"), value: Cow::Borrowed("*/*") };
let computed = Header {
    name: Cow::Borrowed("content-length"),
    value: Cow::Owned(1024.to_string()),
};
```

Both are `Header<'static>`, since string literals live for `'static` and owned data borrows nothing.

The `into_owned` method is the usual escape hatch. A `Header<'a>` can't outlive the buffer it was parsed from, so you can't send it to `thread::spawn`, return it after the buffer is dropped, or keep it in a long-lived cache. `into_owned` copies only the fields that are still borrowed (the `into_owned()` on an `Owned` field just moves its `String`) and returns a `Header<'static>` with no ties to the input.

To accept either a `&str` or a `String` in a constructor, take `impl Into<Cow<'a, str>>`. Both types convert into `Cow` for free:

```rust
impl<'a> Header<'a> {
    pub fn new(name: impl Into<Cow<'a, str>>, value: impl Into<Cow<'a, str>>) -> Self {
        Header { name: name.into(), value: value.into() }
    }
}

let a = Header::new("accept", "*/*");               // borrows
let b = Header::new("x-request-id", format!("{}", 42)); // owns
```

## `String::from_utf8_lossy` returns `Cow`

The standard library uses `Cow` where an operation usually changes nothing. `String::from_utf8_lossy` takes bytes that are probably UTF-8. If they are valid, it returns `Cow::Borrowed` pointing at the same bytes as a `&str`. If not, it builds a new `String` with each invalid sequence replaced by U+FFFD, the replacement character.

```rust
use std::borrow::Cow;

fn main() {
    let valid = b"hello";
    let invalid = b"caf\xE9"; // 0xE9 is Latin-1 for e-acute, invalid on its own in UTF-8

    assert!(matches!(String::from_utf8_lossy(valid), Cow::Borrowed("hello")));
    assert_eq!(String::from_utf8_lossy(invalid), "caf\u{FFFD}");
    println!("from_utf8_lossy: borrowed when valid, owned when repaired");
}
```

So reading a file of mostly valid UTF-8 log lines with `from_utf8_lossy` costs an allocation only for the broken lines. `Path::to_string_lossy` and `OsStr::to_string_lossy` work the same way.

## A runnable example

Put `normalize_whitespace`, `normalize_key` and `Header` (with `use std::borrow::Cow;` at the top) into `src/main.rs` and add:

```rust
fn main() {
    let inputs = ["already clean", "  padded  ", "tabs\tand  doubles", ""];
    for input in inputs {
        let out = normalize_whitespace(input);
        let kind = match &out {
            Cow::Borrowed(_) => "borrowed",
            Cow::Owned(_) => "owned",
        };
        println!("{input:?} -> {out:?} ({kind})");
    }

    let raw = "Content-Type:  text/html;   charset=utf-8";
    let header = Header::parse(raw).expect("has a colon");
    println!("{header:?}");

    // Outlive `raw` by detaching it first.
    let stored: Header<'static> = header.into_owned();
    println!("{} = {}", stored.name, stored.value);
}
```

Only the third input should report `owned`, and the header's name and value both end up owned, because each needed a change.

## When not to bother

- **When the function almost always allocates.** If nearly every input gets modified, `Cow` adds a branch and a more complicated type for no gain. Return `String`.
- **When every caller needs a `String` anyway.** If each call site does `.into_owned()` straight away, the borrow never survives long enough to save anything.
- **On cold paths.** Saving an allocation in a function that runs ten times per request isn't worth the extra lifetime parameter on your API. `Cow` pays off in loops over many small strings: parsers, normalisers, serializers.

One case where I do reach for it without thinking: `Cow<'static, str>` for names and messages that are usually literals but sometimes formatted. A literal costs nothing, and a `format!` result fits the same field.

## Further reading

- [`std::borrow::Cow`](https://doc.rust-lang.org/std/borrow/enum.Cow.html)
- [`String::from_utf8_lossy`](https://doc.rust-lang.org/std/string/struct.String.html#method.from_utf8_lossy)
- [`ToOwned`](https://doc.rust-lang.org/std/borrow/trait.ToOwned.html), the trait that defines what "owned" means for each borrowed type
