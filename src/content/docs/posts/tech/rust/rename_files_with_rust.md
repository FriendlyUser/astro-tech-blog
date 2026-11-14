---
title: Batch renaming files with regex in Rust
description: Build a small Rust CLI with clap and the regex crate that renames every file in a directory using a regex pattern and replacement, with a dry-run mode.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/424066448.webp'
---

Renaming a folder of files by hand (`IMG_0001.jpg` to `holiday_0001.jpg`, stripping a prefix, swapping date formats) is tedious. This post builds a small command-line tool that does it with a regular expression: it matches each file name against a pattern and replaces the match with a replacement string that can reuse capture groups.

It uses Rust's standard library for file operations, the [`regex`](https://crates.io/crates/regex) crate for matching, and [`clap`](https://crates.io/crates/clap) for argument parsing.

## Setting up the project

```sh
cargo new file_renamer
cd file_renamer
cargo add clap --features derive
cargo add regex
```

`Cargo.toml` ends up roughly like this (versions current as of November 2026; edition 2024 needs Rust 1.85 or later):

```toml
[package]
name = "file_renamer"
version = "0.1.0"
edition = "2024"

[dependencies]
clap = { version = "4.6", features = ["derive"] }
regex = "1.13"
```

## The code

Everything fits in `src/main.rs`:

```rust
use clap::Parser;
use regex::Regex;
use std::error::Error;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

/// Batch rename files in a directory using a regex
#[derive(Parser)]
#[command(version, about)]
struct Args {
    /// Directory containing the files to rename
    directory: PathBuf,

    /// Regex matched against each file name
    pattern: String,

    /// Replacement text; can use capture groups like $1 or ${name}
    #[arg(default_value = "")]
    replacement: String,

    /// Print the planned renames without changing anything
    #[arg(long)]
    dry_run: bool,
}

fn rename_files(dir: &Path, re: &Regex, replacement: &str, dry_run: bool) -> io::Result<()> {
    for entry in fs::read_dir(dir)? {
        let path = entry?.path();
        if !path.is_file() {
            continue;
        }

        // Skip names that aren't valid UTF-8 instead of panicking.
        let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
            continue;
        };

        let new_name = re.replace_all(name, replacement);
        if new_name == name || new_name.is_empty() {
            continue;
        }

        let new_path = path.with_file_name(&*new_name);
        if new_path.exists() {
            eprintln!("skipping {name}: {} already exists", new_path.display());
            continue;
        }

        println!("{name} -> {new_name}");
        if !dry_run {
            fs::rename(&path, &new_path)?;
        }
    }
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let args = Args::parse();
    let re = Regex::new(&args.pattern)?;
    rename_files(&args.directory, &re, &args.replacement, args.dry_run)?;
    Ok(())
}
```

How it works:

- `#[derive(Parser)]` generates the argument parser from the `Args` struct. Doc comments become the `--help` text, and `#[command(version, about)]` pulls the version from `Cargo.toml` and the description from the struct's doc comment.
- `Regex::new` compiles the pattern once. An invalid pattern returns an error from `main` instead of panicking.
- `replace_all` returns a `Cow<str>`: it only allocates when something matched, so unchanged names are cheap to skip.
- The tool refuses to overwrite an existing file and skips names that end up empty. `fs::rename` would otherwise silently replace an existing file with the same name.
- `--dry-run` prints the plan without touching the disk. Run it first.

The replacement defaults to an empty string, so with only a pattern the tool deletes whatever matches.

## Using it

Preview renaming `IMG_0001.jpg` to `holiday_0001.jpg`:

```sh
cargo run -- ./photos 'IMG_(\d+)' 'holiday_$1' --dry-run
```

Drop `--dry-run` to apply it. Strip a ` (copy)` suffix from every file:

```sh
cargo run -- ./docs ' \(copy\)'
```

Use single quotes so your shell doesn't expand `$1` itself.

## Gotchas

- **`$1` followed by letters, digits or `_`.** The `regex` crate reads `$1_old` as a group named `1_old`, which doesn't exist, so it expands to nothing. Write `${1}_old` instead.
- **Case-only renames.** On case-insensitive filesystems (the Windows and macOS defaults), `Report.txt` to `report.txt` looks like the target already exists, so the tool skips it.
- **Not recursive.** `fs::read_dir` only lists the top level. For subdirectories, use the [`walkdir`](https://crates.io/crates/walkdir) crate.
- **Anchor your patterns.** `\d+` matches anywhere in the name, including the extension. Use `^` and `$` (for example `^IMG_(\d+)\.jpg$`) when you mean the whole name.

## Further reading

- [`regex` replacement syntax](https://docs.rs/regex/latest/regex/struct.Regex.html#method.replace)
- [clap derive tutorial](https://docs.rs/clap/latest/clap/_derive/_tutorial/index.html)
