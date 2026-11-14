---
tags: ['rust']
title: Building a du-style directory size tool in Rust with clap, walkdir and humansize
description: A small Rust CLI that adds up the size of every file under a directory, with an optional depth limit, using clap, walkdir and humansize.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4039349639.webp
---

:::caution
The original version of this post used `structopt` for argument parsing. `structopt` is in maintenance mode: its derive API was merged into `clap` 3, so new code should use `clap`'s `derive` feature instead. The code below has been updated to `clap` 4 and `humansize` 2.
:::

This post builds a small command-line tool that walks a directory tree, adds up the size of every file in it, and prints the total in human-readable units, roughly like `du -sh --apparent-size`. It uses three crates:

- [`clap`](https://crates.io/crates/clap) to parse command-line arguments,
- [`walkdir`](https://crates.io/crates/walkdir) to traverse the directory tree,
- [`humansize`](https://crates.io/crates/humansize) to format byte counts.

## Set up the project

```bash
cargo new dirsize
cd dirsize
```

Add the dependencies to `Cargo.toml` (all under a single `[dependencies]` table):

```toml
[dependencies]
clap = { version = "4.6", features = ["derive"] }
walkdir = "2.5"
humansize = "2.1"
```

These are the current releases at the time of writing (clap 4.6.7, walkdir 2.5.0, humansize 2.1.3).

## The code

Put this in `src/main.rs`:

```rust
use std::path::{Path, PathBuf};

use clap::Parser;
use humansize::{format_size, BINARY};
use walkdir::WalkDir;

/// Print the total size of the files under a directory.
#[derive(Parser)]
struct Cli {
    /// Directory to measure
    path: PathBuf,

    /// How many directory levels to descend (default: unlimited)
    #[arg(short, long)]
    depth: Option<usize>,
}

fn measure_dir(path: &Path, depth: Option<usize>) -> u64 {
    WalkDir::new(path)
        .max_depth(depth.unwrap_or(usize::MAX))
        .into_iter()
        .filter_map(|entry| entry.ok()) // skip entries we can't read
        .filter(|entry| entry.file_type().is_file())
        .filter_map(|entry| entry.metadata().ok())
        .map(|metadata| metadata.len())
        .sum()
}

fn main() {
    let args = Cli::parse();
    let total = measure_dir(&args.path, args.depth);
    println!("{}\t{}", format_size(total, BINARY), args.path.display());
}
```

How it fits together:

- `#[derive(Parser)]` generates the argument parser from the struct. The field without an attribute becomes a required positional argument; `#[arg(short, long)]` creates `-d` / `--depth`. The doc comments become the `--help` text.
- `WalkDir::new(path)` yields every entry under `path`. `max_depth(0)` means only the starting path itself, `max_depth(1)` adds its direct children, and so on.
- Entries that error (for example, permission denied) are skipped by `filter_map(|entry| entry.ok())`. Directories are filtered out because their own metadata size isn't the size of their contents.
- `format_size(total, BINARY)` formats with powers of 1024 and IEC units (`KiB`, `MiB`). Use `DECIMAL` for powers of 1000 (`MB`, `GB`).

## Run it

```bash
cargo run -- ~/projects
cargo run -- ~/projects --depth 1
cargo run -- --help
```

The first command prints something like `1.42 GiB	/home/you/projects`. With `--depth 1`, only files directly inside the directory are counted.

## How it differs from `du`

- **Apparent size vs disk usage.** `metadata.len()` is the file's length in bytes. `du` by default reports allocated disk blocks, which is larger for many small files and smaller for sparse files. That's why this tool matches `du --apparent-size` rather than plain `du`.
- **Symlinks.** `walkdir` doesn't follow symbolic links by default, and a symlink's `file_type()` isn't a file, so links aren't counted. Call `.follow_links(true)` if you want to follow them (walkdir detects loops).
- **Hard links** are counted once per path, so a file with two hard links is counted twice. `du` counts it once.
- **Errors are silent.** A real tool should report skipped entries to stderr instead of dropping them.

## Further reading

- [clap derive tutorial](https://docs.rs/clap/latest/clap/_derive/_tutorial/index.html)
- [walkdir documentation](https://docs.rs/walkdir)
- [humansize documentation](https://docs.rs/humansize)
