---
title: Finding and using third-party Rust crates with Cargo
pubDate: "2023-12-06T11:46:48.000Z"
lastUpdated: 2026-11-14
description: "How to find Rust crates on crates.io, add them with cargo add, choose versions and features, and call an async HTTP client (reqwest with tokio)."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/stars-falling-on-the-moon.webp"
---

Rust's standard library is deliberately small. HTTP clients, async runtimes, serialization and CLI parsing all come from third-party crates, which you pull in with Cargo, Rust's build tool and package manager. This post covers finding a crate, adding it to a project, and using it.

## Crates and packages

A *crate* is the unit the compiler builds: either a binary (with a `main` function) or a library. A *package* is what Cargo manages: a directory with a `Cargo.toml` that contains one or more crates, with at most one library crate. When people say "add the `reqwest` crate" they mean the library crate in the `reqwest` package published on crates.io.

## Finding crates

[crates.io](https://crates.io/) is the public registry. You can also search it from the terminal:

```sh
cargo search http client
```

Each crate's API docs are generated automatically on [docs.rs](https://docs.rs/). Before adding a dependency, check how recently it was released, its download count, its open issues, and which crates depend on it. [lib.rs](https://lib.rs/) is an unofficial index that groups crates by category, which helps when you don't know the name you're looking for.

## Adding a dependency

The easiest way is `cargo add`, which edits `Cargo.toml` for you:

```sh
cargo add reqwest
cargo add tokio --features macros,rt-multi-thread
```

That produces something like this (the versions are current as of this update):

```toml
[dependencies]
reqwest = "0.13.5"
tokio = { version = "1.54.1", features = ["macros", "rt-multi-thread"] }
```

A version like `"0.13.5"` is a caret requirement: Cargo will accept any semver-compatible release, here `>=0.13.5, <0.14.0`. The exact versions it resolved are recorded in `Cargo.lock`. `cargo update` moves to newer compatible versions. Crossing a breaking boundary (0.13 to 0.14, or 1.x to 2.x) means editing `Cargo.toml`.

Many crates put optional functionality behind *features* to keep compile times down. Tokio enables almost nothing by default, which is why the line above turns on `macros` (for `#[tokio::main]`) and `rt-multi-thread` (for the runtime). A crate's docs.rs page lists its features.

Cargo downloads and compiles dependencies the next time you run `cargo build` or `cargo run`.

## Using the crate

You don't need a `use` statement just to make a crate available. Once it's in `Cargo.toml`, you can refer to it by path (`reqwest::get`). Add `use` when you want to shorten names.

`reqwest` is async, so it needs a runtime. Tokio provides one:

```rust
async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let body = reqwest::get(url).await?.text().await?;
    Ok(body)
}

#[tokio::main]
async fn main() {
    match fetch_data("https://www.example.com/").await {
        Ok(body) => println!("Fetched {} bytes", body.len()),
        Err(e) => eprintln!("Error fetching data: {e}"),
    }
}
```

`reqwest::get` is a shortcut that builds a new client for each call. If you're making more than one request, create a `reqwest::Client` once and reuse it, so connections are pooled.

## Things to watch

- **Compile times and binary size.** Every dependency brings its own dependencies. Run `cargo tree` to see what you've actually pulled in.
- **Duplicate versions.** If two dependencies need incompatible versions of the same crate, both get compiled. `cargo tree -d` lists the duplicates.
- **Security advisories.** [`cargo-audit`](https://crates.io/crates/cargo-audit) checks `Cargo.lock` against the RustSec advisory database.

## Further reading

- [The Cargo Book: specifying dependencies](https://doc.rust-lang.org/cargo/reference/specifying-dependencies.html)
- [The Rust Book: packages and crates](https://doc.rust-lang.org/book/ch07-01-packages-and-crates.html)
- [reqwest on docs.rs](https://docs.rs/reqwest)
