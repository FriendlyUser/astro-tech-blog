---
title: "Cargo basics: creating Rust projects and managing dependencies"
pubDate: "2025-05-17T10:03:29.000Z"
lastUpdated: 2026-11-14
description: Create a Rust project with Cargo, add crates with cargo add, understand Cargo.toml version requirements and Cargo.lock, and the commands you use daily.
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2861854918.webp
---

Cargo is Rust's build tool and package manager. It creates projects, downloads dependencies from [crates.io](https://crates.io), compiles, runs tests and builds documentation. It's installed alongside the compiler when you install Rust with [rustup](https://www.rust-lang.org/tools/install); check it with `cargo --version`.

## Creating a project

```bash
cargo new hello_cargo
cd hello_cargo
cargo run
```

`cargo new` creates:

- `Cargo.toml`, the manifest with the package name, version, edition (2024 by default on current Cargo) and dependencies.
- `src/main.rs`, a "Hello, world!" program. Use `cargo new --lib` for a library with `src/lib.rs` instead.
- A Git repository and `.gitignore`, unless the directory is already inside a repository.

`cargo run` compiles the project into `target/debug/` and runs it.

## Adding dependencies

Libraries in Rust are called crates. Add them with `cargo add`, which edits `Cargo.toml` for you:

```bash
cargo add serde --features derive
cargo add serde_json
```

That produces a `[dependencies]` section like this (`cargo add` writes the latest version number at the time you run it):

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

Now use them in `src/main.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct Config {
    name: String,
    retries: u32,
}

fn main() -> Result<(), serde_json::Error> {
    let config = Config { name: "demo".to_string(), retries: 3 };

    let json = serde_json::to_string(&config)?;
    println!("{json}");

    let parsed: Config = serde_json::from_str(&json)?;
    println!("{parsed:?}");
    Ok(())
}
```

`cargo run` downloads and builds the crates, then prints:

```text
{"name":"demo","retries":3}
Config { name: "demo", retries: 3 }
```

## Version requirements and Cargo.lock

A version string in `Cargo.toml` is a requirement, not an exact pin. `"1"` and `"1.0"` both mean "any semver-compatible 1.x release", the same as `^1.0`. Use `"=1.0.100"` for an exact version or `">=1.2, <1.5"` for a range.

The exact versions Cargo picked are recorded in `Cargo.lock`, so every build uses the same dependency tree until you change it. Commit `Cargo.lock` to version control.

To move to newer compatible versions:

```bash
cargo update            # everything, within the ranges in Cargo.toml
cargo update -p serde   # just one crate
```

`cargo update` never crosses a major version. To go from 1.x to 2.x, change the requirement in `Cargo.toml` (or run `cargo add` again).

## Commands you'll use daily

| Command | What it does |
| --- | --- |
| `cargo check` | Type-checks without producing a binary. Much faster than `build`, so use it while editing. |
| `cargo build` | Debug build. Add `--release` for an optimised build in `target/release/`. |
| `cargo run` | Build and run. Arguments after `--` go to your program. |
| `cargo test` | Run unit, integration and doc tests. |
| `cargo fmt` | Format code with rustfmt. |
| `cargo clippy` | Run the Clippy linter. |
| `cargo doc --open` | Build HTML docs for your crate and its dependencies and open them. |
| `cargo tree` | Show the dependency tree, useful for finding why a crate is pulled in. |
| `cargo publish` | Upload a library to crates.io (needs an API token from `cargo login`). |

`cargo help <command>` shows the options for any of these.

## Further reading

- [The Cargo Book](https://doc.rust-lang.org/cargo/)
- [Specifying dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)
