---
title: "Using Rust's type system to catch bugs: newtypes, enums and traits"
pubDate: "2024-10-20T17:44:24.000Z"
lastUpdated: 2026-11-14
description: "Three Rust type-system techniques that turn runtime bugs into compile errors: newtypes for units, enums for errors, and traits for shared behaviour."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2851628136.webp
---

Rust checks a lot at compile time: types, exhaustive `match` arms, ownership and borrowing, and whether a value can be sent between threads (`Send`/`Sync`). You can push more of your own rules into that checking by choosing types carefully. This post walks through three common techniques.

A note on inference: Rust's type inference is in the Hindley-Milner family, but it works only inside function bodies. Function signatures must spell out their types, which keeps errors local and makes signatures double as documentation.

## Newtypes for values that shouldn't be mixed

A newtype is a tuple struct with one field. It wraps an existing type to give it a distinct identity. `Celsius` and `Fahrenheit` are both `f64` underneath, but the compiler treats them as unrelated types:

```rust
#[derive(Debug, Clone, Copy)]
struct Celsius(f64);

#[derive(Debug, Clone, Copy)]
struct Fahrenheit(f64);

impl From<Fahrenheit> for Celsius {
    fn from(f: Fahrenheit) -> Self {
        Celsius((f.0 - 32.0) * 5.0 / 9.0)
    }
}

fn average(a: Celsius, b: Celsius) -> Celsius {
    Celsius((a.0 + b.0) / 2.0)
}

fn main() {
    let indoor = Celsius(21.0);
    let outdoor = Fahrenheit(50.0);

    // average(indoor, outdoor);
    // error[E0308]: mismatched types: expected `Celsius`, found `Fahrenheit`

    let avg = average(indoor, outdoor.into());
    println!("{avg:?}"); // Celsius(15.5)
}
```

The wrapper usually compiles to the same code as a bare `f64`, so there's no runtime cost. Add `#[repr(transparent)]` if you need the layout to be guaranteed identical, for example across FFI.

The protection only applies where the types are used. Code that can see the `.0` field can still write `Celsius(c.0 + f.0)`, and that will compile happily. To make the rule hard to break, put the newtype in its own module, keep the field private, and expose only constructors and conversions like the `From` impl above.

## Enums for errors

An enum lists every way an operation can fail, and `match` forces callers to handle each case:

```rust
use std::num::ParseIntError;

#[derive(Debug)]
enum ReadIntError {
    Parse(ParseIntError),
    OutOfRange(i32),
}

fn read_percent(s: &str) -> Result<i32, ReadIntError> {
    let n = s.trim().parse::<i32>().map_err(ReadIntError::Parse)?;
    if (0..=100).contains(&n) {
        Ok(n)
    } else {
        Err(ReadIntError::OutOfRange(n))
    }
}

fn main() {
    for input in ["42", "250", "abc"] {
        match read_percent(input) {
            Ok(n) => println!("{input}: ok ({n})"),
            Err(ReadIntError::Parse(e)) => println!("{input}: not a number ({e})"),
            Err(ReadIntError::OutOfRange(n)) => println!("{input}: {n} is outside 0-100"),
        }
    }
}
```

If you add a variant later, every `match` that doesn't handle it stops compiling. That points you to each call site that needs updating. In a larger codebase, implement `std::fmt::Display` and `std::error::Error` for the enum, or derive them with the [`thiserror`](https://crates.io/crates/thiserror) crate. An `impl From<ParseIntError> for ReadIntError` would also let `?` do the conversion without `map_err`.

## Traits for shared behaviour

A trait declares behaviour that several types implement. A generic function bounded by that trait accepts any of them, and the compiler checks every call:

```rust
use std::f64::consts::PI;

trait Area {
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Rectangle {
    width: f64,
    height: f64,
}

impl Area for Circle {
    fn area(&self) -> f64 {
        PI * self.radius * self.radius
    }
}

impl Area for Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }
}

fn combined_area(a: &impl Area, b: &impl Area) -> f64 {
    a.area() + b.area()
}

fn main() {
    let c = Circle { radius: 1.0 };
    let r = Rectangle { width: 2.0, height: 3.0 };
    println!("{:.3}", combined_area(&c, &r)); // 9.142
}
```

Generic functions are monomorphized: the compiler emits a specialized copy for each concrete type, so calls are static and can be inlined. If you need a single collection that holds different shapes, use `Vec<Box<dyn Area>>`, which trades that for a runtime vtable lookup.

## Further reading

- [The Rust Book: using the newtype pattern](https://doc.rust-lang.org/book/ch20-02-advanced-traits.html#using-the-newtype-pattern-to-implement-external-traits-on-external-types)
- [The Rust Book: recoverable errors with `Result`](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html)
- [Rust API Guidelines: type safety](https://rust-lang.github.io/api-guidelines/type-safety.html)
