---
title: "Formatting Rust code with rustfmt and cargo fmt"
pubDate: "2023-04-20T14:45:32.893Z"
lastUpdated: 2026-11-14
description: "Install rustfmt, run cargo fmt locally and in CI, configure it with rustfmt.toml, and set up format-on-save in your editor."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/633020239.webp
---

rustfmt is the official formatter for Rust. It rewrites your source to follow the [Rust style guide](https://doc.rust-lang.org/style-guide/), so code reviews don't get bogged down in brace placement and line wrapping. Almost every Rust project runs it, which also means most Rust code you read looks the same.

## Installing

rustfmt ships as a rustup component and is included in the default profile, so you probably have it already:

```sh
cargo fmt --version
```

If that fails, add it:

```sh
rustup component add rustfmt
```

## Running it

From the root of a Cargo project (or workspace), format every crate:

```sh
cargo fmt
```

To check formatting without changing files, which is what you want in CI:

```sh
cargo fmt --check
```

It exits with a non-zero status and prints a diff if anything would change. A minimal GitHub Actions step is just `run: cargo fmt --all --check` (`--all` covers every package in a workspace).

You can also run `rustfmt` on a single file:

```sh
rustfmt src/main.rs
```

One gotcha: `cargo fmt` passes the crate's edition from `Cargo.toml` to rustfmt, but calling `rustfmt` directly does not, and it defaults to the 2015 edition. Code using newer syntax (such as `async fn`) can then fail to parse. Pass `--edition 2024` (or whichever edition you use), or set `edition` in `rustfmt.toml`.

## Configuration

Most projects use the defaults. If you want to change something, put a `rustfmt.toml` or `.rustfmt.toml` in the project root. rustfmt looks in the current directory and then its parents, and uses the first file it finds.

```toml
edition = "2024"
max_width = 100
hard_tabs = false
tab_spaces = 4
newline_style = "Auto"
use_small_heuristics = "Default"
```

The values above are all the defaults except `edition`, so this file only shows where the knobs are:

- `edition`: the Rust edition used to parse the code (`"2015"`, `"2018"`, `"2021"`, `"2024"`). `cargo fmt` sets it from `Cargo.toml`.
- `style_edition`: which version of the style guide to format with. Like `edition`, `cargo fmt` infers it from your crate's edition, so you rarely set it.
- `max_width`: maximum line width. Default `100`.
- `hard_tabs` / `tab_spaces`: indent with tabs or with this many spaces. Defaults `false` and `4`.
- `newline_style`: `"Auto"` (default), `"Native"`, `"Unix"` or `"Windows"`.
- `use_small_heuristics`: how aggressively short expressions (function calls, struct literals, chains) are kept on one line. `"Default"`, `"Off"` or `"Max"`. `"Max"` packs as much onto one line as `max_width` allows.

Some popular options are still unstable, for example `imports_granularity` and `group_imports` for organizing `use` statements. They only take effect on the nightly toolchain:

```sh
cargo +nightly fmt
```

If you set unstable options in `rustfmt.toml` and run stable `cargo fmt`, rustfmt prints a warning and ignores them.

To leave a specific item alone, mark it with `#[rustfmt::skip]`. This is useful for hand-aligned tables or matrices.

The full list of options, with which are stable, is in the [rustfmt configuration docs](https://rust-lang.github.io/rustfmt/).

## Editor integration

Most editors run rustfmt through rust-analyzer, the Rust language server:

- **VS Code**: install the [rust-analyzer extension](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) and enable `editor.formatOnSave`. The older `rust-lang.rust` extension is deprecated.
- **JetBrains**: RustRover (or the Rust plugin in other JetBrains IDEs) can use rustfmt instead of its built-in formatter. Turn this on in the Rustfmt settings page.
- **Sublime Text**: [LSP-rust-analyzer](https://packagecontrol.io/packages/LSP-rust-analyzer) or [Rust Enhanced](https://packagecontrol.io/packages/Rust%20Enhanced).
- **Vim/Neovim**: [rust.vim](https://github.com/rust-lang/rust.vim) provides `:RustFmt` and `let g:rustfmt_autosave = 1` for format-on-save. Neovim users with an LSP setup can format through rust-analyzer instead.

Formatting on save plus `cargo fmt --check` in CI is enough to keep formatting out of code review.
