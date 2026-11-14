---
title: "Regular expressions in Rust: matching, capturing and replacing with the regex crate"
pubDate: "2023-12-24T05:05:33.000Z"
lastUpdated: 2026-11-14
description: "How to compile, match, capture and replace with Rust's regex crate, compile patterns once with LazyLock, and when to reach for fancy-regex."
tags:
  - rust
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1096284488.webp
---

The [`regex`](https://docs.rs/regex) crate is the standard way to do regular expressions in Rust. It is maintained by the Rust project, guarantees linear-time searching, and covers the usual tasks: checking for a match, pulling out capture groups, and search-and-replace. This post walks through those with one running example, a US Social Security number pattern like `123-45-6789`.

## Adding the crate

```toml
[dependencies]
regex = "1.13"
```

The examples were checked against the API of `regex` 1.13.1. `LazyLock` in the last section needs Rust 1.80 or newer.

## Compiling and matching

`Regex::new` parses and compiles a pattern and returns `Result<Regex, regex::Error>`. It fails on invalid syntax, so in real code handle the error or use `expect` with a message when the pattern is a hard-coded literal.

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"\d{3}-\d{2}-\d{4}").expect("valid regex");
    let text = "My SSN is 123-45-6789.";

    assert!(re.is_match(text));

    if let Some(m) = re.find(text) {
        println!("found {} at {}..{}", m.as_str(), m.start(), m.end());
    }
}
```

The `r"..."` raw string means backslashes don't need escaping. `is_match` only answers yes or no; `find` returns the matched text and its byte offsets.

Note that `\d` is Unicode-aware by default, so it also matches digits from other scripts. If you only want ASCII digits, write `[0-9]` or turn Unicode off for that class with `(?-u:\d)`.

## Capture groups

Wrap parts of the pattern in parentheses to capture them. `captures` returns the groups for the first match, and `extract` gives you the full match plus a fixed-size array of the groups:

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(\d{3})-(\d{2})-(\d{4})").expect("valid regex");
    let text = "My SSN is 123-45-6789.";

    if let Some(caps) = re.captures(text) {
        let (_full, [area, group, serial]) = caps.extract();
        println!("Area: {area}, Group: {group}, Serial: {serial}");
    }
}
```

`extract` panics if the array length doesn't match the number of groups in the pattern, so it's best for patterns where every group always participates. Otherwise index with `caps.get(1)`, which returns an `Option`. Indexing with `&caps[1]` also works but panics if the group didn't match.

Named groups make longer patterns easier to read:

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(?<area>\d{3})-(?<group>\d{2})-(?<serial>\d{4})").expect("valid regex");
    let caps = re.captures("123-45-6789").unwrap();
    println!("serial = {}", &caps["serial"]);
}
```

To handle every match rather than the first, use `captures_iter` (or `find_iter` if you don't need groups):

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(\d{3})-(\d{2})-(\d{4})").expect("valid regex");
    let text = "First SSN: 123-45-6789, Second SSN: 987-65-4321.";

    for caps in re.captures_iter(text) {
        let (_, [area, group, serial]) = caps.extract();
        println!("Area: {area}, Group: {group}, Serial: {serial}");
    }
}
```

## Replacing

`replace` changes the first match, `replace_all` changes every match, and `replacen` changes the first `n`. In the replacement string, `$1` or `${1}` refers to a numbered group and `$name` or `${name}` to a named one:

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(\d{3})-(\d{2})-(\d{4})").expect("valid regex");
    let text = "First SSN: 123-45-6789, Second SSN: 987-65-4321.";

    let redacted = re.replace_all(text, "XXX-XX-$3");
    println!("{redacted}"); // First SSN: XXX-XX-6789, Second SSN: XXX-XX-4321.
}
```

One trap: the group name after `$` is as long as possible, so `$1a` means "the group named `1a`" (which doesn't exist, so it's replaced with an empty string). Use `${1}a` when a group reference is followed by letters, digits or underscores. If you want a literal `$`, write `$$`, or wrap the replacement in `regex::NoExpand`.

The replace methods return `Cow<str>`, so no new string is allocated when nothing matched.

## Compile once, reuse everywhere

Compiling a regex is much more expensive than running it, so don't call `Regex::new` inside a loop or in a function that runs on every request. Older code used the `lazy_static` crate for this. Since Rust 1.80 the standard library's `LazyLock` does the same job without a dependency:

```rust
use regex::Regex;
use std::sync::LazyLock;

static SSN: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(\d{3})-(\d{2})-(\d{4})").expect("valid regex"));

fn redact(text: &str) -> String {
    SSN.replace_all(text, "XXX-XX-$3").into_owned()
}

fn main() {
    println!("{}", redact("SSN 123-45-6789"));
}
```

The pattern is compiled the first time `SSN` is used and shared by every later call, including across threads.

## What the regex crate won't do

The crate guarantees that a single search runs in worst-case O(m × n) time (m is the size of the compiled regex, n the length of the text). It gets that by using finite automata instead of backtracking, so a hostile pattern or input can't make it hang the way some backtracking engines can. Iterating over all matches with `find_iter` or `captures_iter` can be O(m × n²) in the worst case.

The cost of that guarantee is that it doesn't support look-around (`(?=...)`, `(?<=...)`) or backreferences (`\1`). If you need those, the [`fancy-regex`](https://docs.rs/fancy-regex) crate adds them with a backtracking engine and hands simple patterns off to `regex`. You lose the linear-time guarantee for patterns that use those features, so be careful running it on untrusted input.

## Further reading

- [`regex` crate documentation](https://docs.rs/regex/latest/regex/)
- [Regex syntax reference](https://docs.rs/regex/latest/regex/#syntax)
- [`std::sync::LazyLock`](https://doc.rust-lang.org/std/sync/struct.LazyLock.html)
