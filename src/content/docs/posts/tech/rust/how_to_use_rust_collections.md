---
title: Counting words in Rust with HashMap, HashSet and BTreeMap
description: Build a word-frequency counter in Rust with HashMap's entry API, find unique words with HashSet, and get sorted output with BTreeMap or a sorted Vec.
pubDate: Saturday, 26 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.webp'
---

Counting how often each word appears in a file is a small program that touches the most-used parts of `std::collections`: `HashMap` for counts, `HashSet` for membership, and `BTreeMap` when you need the keys in order.

Put this in `text.txt` next to `Cargo.toml` (`cargo run` uses the package root as the working directory):

```text
the quick brown fox jumps over the lazy dog
```

## Counting with `HashMap`

```rust
use std::collections::HashMap;
use std::fs::File;
use std::io::{self, BufRead, BufReader};

fn main() -> io::Result<()> {
    let reader = BufReader::new(File::open("text.txt")?);

    let mut word_count: HashMap<String, usize> = HashMap::new();

    for line in reader.lines() {
        let line = line?;
        for word in line.split_whitespace() {
            *word_count.entry(word.to_lowercase()).or_insert(0) += 1;
        }
    }

    for (word, count) in &word_count {
        println!("{word}: {count}");
    }
    Ok(())
}
```

What each piece does:

- `BufRead` is a trait, not a type. It has to be imported for `reader.lines()` to be available.
- `lines()` yields `io::Result<String>` for each line, so reading errors (for example invalid UTF-8) are passed up with `?` instead of panicking.
- `split_whitespace()` splits on any run of Unicode whitespace and skips empty pieces.
- `entry(key).or_insert(0)` returns a mutable reference to the existing count, inserting `0` first if the word is new. This does one hash lookup instead of a `get` followed by an `insert`.
- `to_lowercase()` makes "The" and "the" count as the same word. Punctuation is not stripped, so "dog." and "dog" are still different keys; use `word.trim_matches(|c: char| !c.is_alphanumeric())` if that matters.

Output:

```text
fox: 1
the: 2
lazy: 1
quick: 1
over: 1
dog: 1
jumps: 1
brown: 1
```

`HashMap` iteration order is unspecified, and the standard hasher is randomly seeded per run, so the order changes between runs.

## Sorted output

If you want the words in alphabetical order, swap `HashMap` for `BTreeMap`. The entry API is the same, and iteration is in key order:

```rust
use std::collections::BTreeMap;

let mut word_count: BTreeMap<String, usize> = BTreeMap::new();
```

To list the most frequent words first, collect into a `Vec` and sort it:

```rust
let mut by_count: Vec<(&String, &usize)> = word_count.iter().collect();
// Highest count first; ties broken alphabetically so the output is stable
by_count.sort_by(|a, b| b.1.cmp(a.1).then(a.0.cmp(b.0)));

for (word, count) in by_count.iter().take(3) {
    println!("{word}: {count}");
}
// the: 2
// brown: 1
// dog: 1
```

## Unique words and stop words with `HashSet`

A `HashSet` stores keys without values. It's the right tool for "have I seen this?" and for filtering against a fixed list:

```rust
use std::collections::HashSet;

fn main() {
    let text = "the quick brown fox jumps over the lazy dog";

    let stop_words: HashSet<&str> = ["the", "a", "an", "over"].into_iter().collect();

    let unique: HashSet<&str> = text
        .split_whitespace()
        .filter(|w| !stop_words.contains(w))
        .collect();

    println!("{} unique non-stop words", unique.len()); // 6
}
```

`HashSet::insert` also returns `false` when the value was already present, which is a cheap way to deduplicate while keeping the original order:

```rust
let mut seen = HashSet::new();
let first_occurrences: Vec<&str> = text
    .split_whitespace()
    .filter(|w| seen.insert(*w))
    .collect();
// ["the", "quick", "brown", "fox", "jumps", "over", "lazy", "dog"]
```

## Choosing between them

- `HashMap` / `HashSet`: average O(1) lookups, no ordering. The default choice.
- `BTreeMap` / `BTreeSet`: O(log n) lookups, keys kept sorted, supports range queries.
- `Vec` of pairs: often fastest for a handful of items, and the only option here that you can sort by value.

## Further reading

- [`std::collections` module docs](https://doc.rust-lang.org/std/collections/), which include a guide on which collection to use
- [Storing Keys with Associated Values in Hash Maps, The Rust Programming Language](https://doc.rust-lang.org/book/ch08-03-hash-maps.html)
