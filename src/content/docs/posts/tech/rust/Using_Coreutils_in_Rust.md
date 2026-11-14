---
title: "Writing simple cat, wc and ls clones in Rust"
pubDate: "2023-04-20T14:45:32.838Z"
lastUpdated: 2026-11-14
description: "Build minimal versions of the cat, wc and ls coreutils in Rust using only the standard library, and see how uutils does it for real."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/326029388.png
---

Coreutils are the basic Unix command-line tools: `ls`, `cat`, `wc`, `cp`, `mv`, `rm` and friends. They're a
good first systems project in Rust because each one is small and exercises files, I/O and error handling.

This post builds stripped-down versions of three of them with only the standard library. If you want a
complete Rust implementation, look at [uutils coreutils](https://github.com/uutils/coreutils), a
cross-platform, MIT-licensed reimplementation of GNU coreutils that Ubuntu has shipped by default since 25.10.

## Project layout

Put each tool in `src/bin/` so one Cargo project builds three binaries:

```sh
cargo new rust_coreutils
cd rust_coreutils
mkdir src/bin
```

```text
rust_coreutils
├── Cargo.toml
└── src
    ├── main.rs
    └── bin
        ├── cat.rs
        ├── ls.rs
        └── wc.rs
```

Run one with `cargo run --bin cat -- file.txt`.

## `cat`

`cat` concatenates files to standard output. Two details matter: it handles several files, and it must not
assume the input is UTF-8 (binary files are fine). Reading into a `String` would fail on non-UTF-8 input, so
stream raw bytes with `io::copy`:

```rust
// src/bin/cat.rs
use std::env;
use std::fs::File;
use std::io::{self, Write};

fn main() -> io::Result<()> {
    let files: Vec<String> = env::args().skip(1).collect();
    let stdout = io::stdout();
    let mut out = stdout.lock();

    if files.is_empty() {
        // Like the real cat, read stdin when no files are given.
        io::copy(&mut io::stdin().lock(), &mut out)?;
    }

    for path in &files {
        let mut file = File::open(path)?;
        io::copy(&mut file, &mut out)?;
    }

    out.flush()
}
```

`io::copy` uses a fixed-size buffer, so large files don't get loaded into memory.

## `wc`

`wc` prints line, word and byte counts. GNU `wc` counts *newline characters*, so a file whose last line has
no trailing newline reports one fewer line than `str::lines()` would give. Counting on bytes also avoids the
UTF-8 problem:

```rust
// src/bin/wc.rs
use std::env;
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    let path = match env::args().nth(1) {
        Some(p) => p,
        None => {
            eprintln!("Usage: wc <file>");
            std::process::exit(1);
        }
    };

    let bytes = fs::read(&path)?;
    let lines = bytes.iter().filter(|&&b| b == b'\n').count();
    let words = bytes
        .split(|b| b.is_ascii_whitespace())
        .filter(|w| !w.is_empty())
        .count();

    println!("{lines} {words} {} {path}", bytes.len());
    Ok(())
}
```

Word splitting here only treats ASCII whitespace as separators; GNU `wc` also considers the locale, so counts
can differ for text with non-ASCII spaces.

## `ls`

`ls` lists a directory, defaulting to the current one. `fs::read_dir` returns entries in no particular order,
so sort them like `ls` does:

```rust
// src/bin/ls.rs
use std::env;
use std::fs;
use std::io;

fn main() -> io::Result<()> {
    let dir = env::args().nth(1).unwrap_or_else(|| ".".to_string());

    let mut names: Vec<String> = fs::read_dir(&dir)?
        .map(|entry| entry.map(|e| e.file_name().to_string_lossy().into_owned()))
        .collect::<io::Result<_>>()?;
    names.sort();

    for name in names {
        // Real ls hides dotfiles unless you pass -a.
        if !name.starts_with('.') {
            println!("{name}");
        }
    }
    Ok(())
}
```

`DirEntry::file_name()` returns an `OsString`; `to_string_lossy` replaces any non-UTF-8 bytes with `�` for
display.

## Where to go next

- Add flags with [`clap`](https://docs.rs/clap) (`wc -l`, `ls -a`, `cat -n`).
- Print errors as `cat: missing.txt: No such file or directory` and keep going instead of stopping at the
  first failure; the `?` operator above aborts on the first bad file.
- Read how uutils structures its utilities, tests them against the GNU test suite, and handles platform
  differences: [uutils/coreutils on GitHub](https://github.com/uutils/coreutils).
