---
title: "Write a procedural macro in Rust: a custom assert_equals! with syn and quote"
description: Build a function-like procedural macro that compares two expressions and prints both values on failure, and compare it with a macro_rules! version.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.webp'
---

Rust macros generate code at compile time. There are two kinds:

- **Declarative macros** (`macro_rules!`) match on token patterns and expand to a template. Most macros you use day to day, like `vec!` and `println!`, are this kind.
- **Procedural macros** are Rust functions that take a `TokenStream` and return a new one. They come in three flavours: function-like (`my_macro!(...)`), derive (`#[derive(MyTrait)]`) and attribute (`#[my_attr]`).

This post builds a function-like procedural macro, `assert_equals!(a, b)`, that panics with both expressions and their values when they differ.

## Project layout

A procedural macro has to live in its own crate with `proc-macro = true`, and that crate can only export macros. So we need two crates: the macro crate and a binary that uses it.

```bash
cargo new assert-demo
cd assert-demo
cargo new --lib assert_macros
```

In `assert_macros/Cargo.toml`, mark the crate as a proc-macro crate and add `syn` and `quote`:

```toml
[lib]
proc-macro = true

[dependencies]
syn = { version = "2", features = ["full"] }
quote = "1"
```

`syn` parses the incoming tokens into a syntax tree; `quote` turns Rust-like templates back into tokens. The `full` feature lets `syn` parse any Rust expression, not just the subset needed for derive macros. This example is written against `syn` 2 (2.0.119) and `quote` 1.0.47; `syn` 3 has since been released and may need small changes.

In the top-level `Cargo.toml`, depend on the macro crate by path:

```toml
[dependencies]
assert_macros = { path = "assert_macros" }
```

## The macro

Replace `assert_macros/src/lib.rs` with:

```rust
use proc_macro::TokenStream;
use quote::quote;
use syn::parse::{Parse, ParseStream};
use syn::{parse_macro_input, Expr, Token};

/// Two comma-separated expressions, with an optional trailing comma.
struct Args {
    left: Expr,
    right: Expr,
}

impl Parse for Args {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let left = input.parse()?;
        input.parse::<Token![,]>()?;
        let right = input.parse()?;
        input.parse::<Option<Token![,]>>()?;
        Ok(Args { left, right })
    }
}

#[proc_macro]
pub fn assert_equals(input: TokenStream) -> TokenStream {
    let Args { left, right } = parse_macro_input!(input as Args);

    let expanded = quote! {
        match (&(#left), &(#right)) {
            (left_val, right_val) => {
                if !(*left_val == *right_val) {
                    panic!(
                        "assertion failed: `{} == {}`\n  left: {:?}\n right: {:?}",
                        stringify!(#left),
                        stringify!(#right),
                        left_val,
                        right_val,
                    );
                }
            }
        }
    };

    expanded.into()
}
```

How it works:

- `Args` implements `syn::parse::Parse`, so `parse_macro_input!` can turn the input tokens into two `Expr` values. If the input isn't `expr, expr`, `parse_macro_input!` returns a compile error pointing at the bad tokens instead of panicking inside the compiler.
- `quote!` builds the output. `#left` and `#right` splice the parsed expressions back in.
- Each expression is evaluated once and borrowed (`&(#left)`), the same trick the standard `assert_eq!` uses, so `assert_equals!(v.pop(), Some(3))` doesn't call `pop()` twice and non-`Copy` values aren't moved.
- `stringify!` keeps the source text of each expression for the message, and `{:?}` prints the values, so both sides need to implement `PartialEq` and `Debug`.

## Using it

`src/main.rs`:

```rust
use assert_macros::assert_equals;

fn main() {
    let a = 1;
    let b = 2;
    assert_equals!(a, b);
}
```

`cargo run` panics with:

```text
thread 'main' panicked at src/main.rs:6:5:
assertion failed: `a == b`
  left: 1
 right: 2
```

To see what the macro expanded to, install [`cargo-expand`](https://github.com/dtolnay/cargo-expand) and run `cargo expand`.

## You probably don't need a proc macro for this

Everything above can be done with a declarative macro in a few lines, with no extra crate and no `syn` compile time:

```rust
macro_rules! assert_equals {
    ($left:expr, $right:expr $(,)?) => {
        match (&$left, &$right) {
            (left_val, right_val) => {
                if !(*left_val == *right_val) {
                    panic!(
                        "assertion failed: `{} == {}`\n  left: {:?}\n right: {:?}",
                        stringify!($left),
                        stringify!($right),
                        left_val,
                        right_val,
                    );
                }
            }
        }
    };
}
```

And the standard library's `assert_eq!` already prints both values. Reach for procedural macros when you need to inspect the structure of the input, such as generating trait impls from a struct's fields with a derive macro, which `macro_rules!` can't do.

## Further reading

- [Macros chapter of The Rust Programming Language](https://doc.rust-lang.org/book/ch20-05-macros.html)
- [Procedural macros in the Rust Reference](https://doc.rust-lang.org/reference/procedural-macros.html)
- [`syn` documentation](https://docs.rs/syn)
