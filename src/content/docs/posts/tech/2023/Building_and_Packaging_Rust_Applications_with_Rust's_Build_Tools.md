---
title: "Cargo basics: building, testing, packaging and cross-compiling Rust apps"
pubDate: "2024-08-05T13:07:48.000Z"
lastUpdated: 2026-11-14
description: "The Cargo commands you use day to day: create a project, add dependencies, build debug and release binaries, run tests, publish to crates.io and cross-compile."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2773787557.png
---

Cargo is Rust's build tool and package manager. It ships with the toolchain when you install Rust through `rustup`, reads project settings and dependencies from `Cargo.toml`, downloads crates from [crates.io](https://crates.io/), and drives `rustc` for you. Most Rust projects never call `rustc` directly.

## Create a project

```bash
cargo new my_rust_app
cd my_rust_app
```

This creates `Cargo.toml`, a hello-world `src/main.rs`, and initializes a Git repository with a `.gitignore` for `target/`. Use `cargo new --lib` for a library crate (`src/lib.rs`) instead.

## Build and run

```bash
cargo build            # debug build: target/debug/my_rust_app
cargo build --release  # optimized build: target/release/my_rust_app
cargo run              # build if needed, then run the debug binary
cargo run --release -- --some-arg   # args after -- go to your program
```

Debug builds compile faster and include debug assertions and overflow checks; release builds are optimized. Benchmark or ship the release build, not the debug one.

`cargo check` type-checks without producing a binary, and is much faster than `cargo build` while you're editing.

## Add dependencies

Use `cargo add` rather than editing `Cargo.toml` by hand:

```bash
cargo add serde --features derive
cargo add serde_json
```

That adds entries to `[dependencies]` with the newest version number written out. At the time of writing that was:

```toml
[dependencies]
serde = { version = "1.0.229", features = ["derive"] }
serde_json = "1.0.154"
```

A requirement such as `"1.0.229"` is a caret requirement: it allows any later `1.x.y` release, but not `2.0`. The exact versions Cargo picked are recorded in `Cargo.lock`. Commit `Cargo.lock` for applications so every build uses the same versions. `cargo update` moves to newer compatible versions.

## Test

```bash
cargo test
```

This runs unit tests (functions marked `#[test]`, usually in a `#[cfg(test)] mod tests` block next to the code), integration tests in `tests/`, and the code examples in your doc comments. `cargo test some_name` runs only tests whose names contain `some_name`.

## Install the binary locally

```bash
cargo install --path .
```

This builds in release mode and copies the binary into `~/.cargo/bin`, which `rustup` puts on your `PATH`.

## Package and publish to crates.io

```bash
cargo package
```

`cargo package` builds the `.crate` archive that would be uploaded (in `target/package/`) and verifies that it compiles on its own. It's a dry run for publishing; people don't install `.crate` files directly. They install from a registry with `cargo install <name>` or add your crate as a dependency.

Before publishing, `Cargo.toml` needs at least `license` (or `license-file`) and `description`. Then:

1. Log in to crates.io with your GitHub account, verify your email address, and create an API token in your account settings.
2. Run `cargo login` and paste the token.
3. Run `cargo publish`.

A published version can't be deleted or overwritten, only yanked (`cargo yank --version x.y.z`), which stops new projects from depending on it. See [Publishing on crates.io](https://doc.rust-lang.org/cargo/reference/publishing.html).

## Cross-compile

`rustup target add` installs the standard library for another target:

```bash
rustup target add x86_64-unknown-linux-musl
cargo build --release --target x86_64-unknown-linux-musl
```

The output goes to `target/x86_64-unknown-linux-musl/release/`. The musl target above, built on Linux, gives a statically linked binary that runs on most Linux distributions.

Adding the target is often not enough. Rust still needs a linker (and for some targets a C toolchain) for the target platform. Building a Linux binary on Windows or macOS, or an ARM binary on x86, will usually fail at the link step until you install a cross linker and point Cargo at it in `.cargo/config.toml`:

```toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"
```

The [`cross`](https://github.com/cross-rs/cross) tool avoids that setup by running the build in a container that already has the right toolchain: `cross build --release --target aarch64-unknown-linux-gnu`.

## Further reading

- [The Cargo Book](https://doc.rust-lang.org/cargo/)
- [Platform support](https://doc.rust-lang.org/rustc/platform-support.html) for the list of targets
