---
tags: ['python', 'requests', 'bs4', 'rust']
title: Regular expressions in Rust with the regex crate
description: Match, find, capture and replace text in Rust with the regex crate, plus what its syntax leaves out compared with PCRE and how to compile a pattern once.
pubDate: Fri, 3 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3702590653.webp"
---

Rust's standard library has no regular expressions. The [`regex`](https://docs.rs/regex) crate, maintained by the rust-lang project, is the usual choice. Examples here use regex 1.x (1.13 at the time of writing).

## Setup

```bash
cargo add regex
```

```toml
[dependencies]
regex = "1"
```

## Syntax: close to Perl, with two big omissions

The syntax will look familiar if you know Perl, PCRE or Python's `re`: character classes, `\d`, `\w`, `\s`, quantifiers, alternation, `(?i)` flags, named groups `(?<name>...)`. It is **not** PCRE, though. The crate deliberately has no look-around (`(?=...)`, `(?<=...)`) and no backreferences (`\1`). In exchange it guarantees that matching runs in time linear in the size of the input, so a malicious pattern or input can't cause catastrophic backtracking. If you really need those features, the [`fancy-regex`](https://docs.rs/fancy-regex) crate adds them on top of `regex`.

Write patterns as raw strings (`r"..."`). In a raw string a backslash is just a backslash, so `r"\d+"` is the regex `\d+`. With a normal string literal you'd have to write `"\\d+"`.

## Matching and finding

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"hello, (world|universe)!").unwrap();

    // Does it match anywhere in the input?
    assert!(re.is_match("say hello, world!"));

    // First match: Option<Match>, with the matched text and byte offsets
    if let Some(m) = re.find("say hello, world!") {
        println!("{} at {}..{}", m.as_str(), m.start(), m.end()); // hello, world! at 4..17
    }

    // All non-overlapping matches
    let all: Vec<&str> = re
        .find_iter("hello, world! hello, universe!")
        .map(|m| m.as_str())
        .collect();
    println!("{all:?}"); // ["hello, world!", "hello, universe!"]
}
```

`Regex::new` returns a `Result`, because the pattern is compiled at runtime and may be invalid. `unwrap()` is fine for a hard-coded pattern you've tested; for user-supplied patterns, handle the error.

`is_match` and `find` are unanchored: they look for the pattern anywhere in the string. Add `^` and `$` to require a whole-string match.

## Capture groups

`captures` returns `Option<Captures>`. Group 0 is the whole match, and groups are numbered from 1 in the order of their opening parenthesis. `&caps[1]` panics if the group didn't participate in the match; `caps.get(1)` returns an `Option` instead.

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})").unwrap();

    if let Some(caps) = re.captures("released on 2024-01-03") {
        println!("whole match: {}", &caps[0]);      // 2024-01-03
        println!("year: {}", &caps["year"]);        // 2024
        println!("month: {:?}", caps.get(2).map(|m| m.as_str())); // Some("01")
    }

    // Every match, with its groups
    let text = "2023-12-25 and 2024-01-01";
    for caps in re.captures_iter(text) {
        let (_, [y, m, d]) = caps.extract();
        println!("{d}/{m}/{y}");
    }
}
```

`Captures::extract` (added in regex 1.9) returns the whole match plus an array of the groups. It only works when every group always participates in the match, which is true here.

## Replacing

```rust
use regex::Regex;

fn main() {
    let re = Regex::new(r"(?<y>\d{4})-(?<m>\d{2})-(?<d>\d{2})").unwrap();
    let out = re.replace_all("2023-12-25 and 2024-01-01", "$d/$m/$y");
    println!("{out}"); // 25/12/2023 and 01/01/2024
}
```

In the replacement string, `$name` or `$1` refers to a group. Use `${name}` when the group name is directly followed by letters or digits, and `$$` for a literal dollar sign.

## Compile once

Compiling a regex is far more expensive than running it, so don't call `Regex::new` inside a loop or a function that runs many times. Store it in a `static` with `std::sync::LazyLock` (stable since Rust 1.80):

```rust
use regex::Regex;
use std::sync::LazyLock;

static DATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\d{4}-\d{2}-\d{2}").unwrap());

fn has_date(s: &str) -> bool {
    DATE.is_match(s)
}
```

A `Regex` is `Send + Sync`, so one instance can be shared across threads.

## Further reading

- [regex crate documentation](https://docs.rs/regex/latest/regex/)
- [Supported syntax](https://docs.rs/regex/latest/regex/#syntax)
