---
tags: ['rust']
title: "Building a colored line diff CLI in Rust with clap and similar"
description: "Build a small diff-like command-line tool in Rust that compares two text files line by line and prints insertions and deletions in color."
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.webp"
---

:::caution
An earlier version of this post used `structopt` and `text_diff`. `structopt` is in maintenance mode (its derive API was merged into `clap`), and `text_diff` hasn't had a release since 2015. The code also didn't compile. This version uses `clap`'s derive API and the `similar` crate instead.
:::

This post builds a small command-line tool that compares two text files line by line and prints the result with `-` for removed lines (red) and `+` for added lines (green), similar to `diff -u` without the hunk headers.

Two crates do the work:

- [`clap`](https://docs.rs/clap) parses the command-line arguments from a struct definition.
- [`similar`](https://docs.rs/similar) computes the diff. It uses the Myers algorithm by default, the same family of algorithm as `diff` and `git diff`.

## Setup

```sh
cargo new difftool
cd difftool
cargo add clap --features derive
cargo add similar
```

The code below was written against `clap` 4.6 and `similar` 3.2.

## Defining the arguments

With `clap`'s derive API, each struct field is a positional argument, and the doc comments become the `--help` text:

```rust
use std::path::PathBuf;

use clap::Parser;

/// Compare two text files line by line.
#[derive(Parser)]
#[command(version)]
struct Cli {
    /// The original file
    old: PathBuf,
    /// The changed file
    new: PathBuf,
}
```

`Cli::parse()` reads `std::env::args()`, prints usage and exits if the arguments are wrong, and handles `--help` and `--version` for you.

## Diffing and printing

The complete `src/main.rs`:

```rust
use std::fs;
use std::io;
use std::path::PathBuf;
use std::process::ExitCode;

use clap::Parser;
use similar::{ChangeTag, TextDiff};

/// Compare two text files line by line.
#[derive(Parser)]
#[command(version)]
struct Cli {
    /// The original file
    old: PathBuf,
    /// The changed file
    new: PathBuf,
}

const RED: &str = "\x1b[31m";
const GREEN: &str = "\x1b[32m";
const RESET: &str = "\x1b[0m";

fn main() -> io::Result<ExitCode> {
    let cli = Cli::parse();
    let old = fs::read_to_string(&cli.old)?;
    let new = fs::read_to_string(&cli.new)?;

    let diff = TextDiff::from_lines(old.as_str(), new.as_str());
    let mut changed = false;

    for change in diff.iter_all_changes() {
        let (sign, color) = match change.tag() {
            ChangeTag::Delete => ("-", RED),
            ChangeTag::Insert => ("+", GREEN),
            ChangeTag::Equal => (" ", ""),
        };
        if change.tag() != ChangeTag::Equal {
            changed = true;
        }

        // Each change includes its line ending; strip it so the
        // reset code goes before the newline.
        let line = change.to_string_lossy();
        println!("{color}{sign}{}{RESET}", line.trim_end_matches(['\r', '\n']));
    }

    // Like `diff`: exit 0 if the files match, 1 if they differ.
    Ok(if changed { ExitCode::from(1) } else { ExitCode::SUCCESS })
}
```

What's going on:

- `fs::read_to_string` reads each file in one go. If a file is missing or isn't valid UTF-8, the `?` returns the error from `main`, which prints it and exits with a non-zero status.
- `TextDiff::from_lines` splits both inputs into lines and diffs them. `iter_all_changes` yields every line, tagged as `Delete`, `Insert`, or `Equal`.
- The colors are plain ANSI escape codes. They work in Linux and macOS terminals and in Windows Terminal; if you need to turn them off when output is piped, check `std::io::IsTerminal` or use a crate such as `anstream`.
- Returning an `ExitCode` makes the tool usable in scripts, e.g. `difftool a.txt b.txt > /dev/null || echo "files differ"`.

## Running it

```sh
printf 'apple\nbanana\ncherry\n' > a.txt
printf 'apple\nblueberry\ncherry\ndate\n' > b.txt
cargo run -- a.txt b.txt
```

Output (without the colors):

```text
 apple
-banana
+blueberry
 cherry
+date
```

## Where to go from here

- Printing every unchanged line gets noisy on large files. `TextDiff` has a `unified_diff()` method that produces standard unified-diff output with context lines and `@@` hunk headers.
- `similar` can also diff by words or characters (`TextDiff::from_words`, `TextDiff::from_chars`), which is useful for highlighting the changed part of a modified line.
- `read_to_string` loads both files into memory, which is fine for source files and config, but not for multi-gigabyte logs.

## Further reading

- [`similar` documentation](https://docs.rs/similar)
- [`clap` derive tutorial](https://docs.rs/clap/latest/clap/_derive/_tutorial/index.html)
