---
title: "Error handling in Rust: Result, the ? operator and custom error types"
pubDate: "2023-11-14T02:27:01.000Z"
lastUpdated: 2026-11-14
description: "How Rust handles errors with Result and panic!, how to propagate errors with ?, and how to define a custom error type that wraps other errors."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1678591372-a-blade-in-the-desert-under-the-sun.webp
---

Rust has no exceptions. A function that can fail says so in its return type with `Result<T, E>`, and the caller has to deal with the error before it can get at the value. For bugs and states the program can't recover from, there's `panic!`. This post covers both, plus the `?` operator and writing your own error type.

## Recoverable vs unrecoverable errors

- **`Result<T, E>`** is for failures the caller might reasonably handle: a missing file, a network timeout, invalid input.
- **`panic!`** is for bugs: an index out of bounds, a broken invariant. It unwinds the current thread (or aborts, depending on the build profile). `unwrap()` and `expect()` panic when called on an error, which is fine in tests and quick scripts, but in library code it takes the decision away from the caller.

`Option<T>` is related but isn't an error type: `None` means "no value", not "something went wrong". It comes up below because `?` works with it too.

## Result

`Result` is an ordinary enum from the standard library:

```rust
enum Result<T, E> {
    Ok(T),
    Err(E),
}
```

`Ok` holds the success value of type `T`, and `Err` holds the error of type `E`. `File::open` is a typical example: it returns `Result<File, std::io::Error>`.

### Handling a Result with match

```rust
use std::fs::File;

fn main() {
    match File::open("example.txt") {
        Ok(file) => println!("Opened: {file:?}"),
        Err(e) => println!("Failed to open file: {e}"),
    }
}
```

`match` forces you to handle both variants. You can also match on the error kind, for example to create the file if it doesn't exist:

```rust
use std::fs::File;
use std::io::ErrorKind;

fn main() {
    let file = match File::open("example.txt") {
        Ok(f) => f,
        Err(e) if e.kind() == ErrorKind::NotFound => {
            File::create("example.txt").expect("could not create file")
        }
        Err(e) => panic!("could not open file: {e}"),
    };
    println!("{file:?}");
}
```

### Propagating errors with ?

Most of the time a function can't do anything useful with an error except pass it to its caller. The `?` operator does that: on `Ok(v)` it evaluates to `v`, and on `Err(e)` it returns `Err(e)` from the current function immediately.

```rust
use std::fs::File;
use std::io::{self, Read};

fn read_file_contents(file_name: &str) -> Result<String, io::Error> {
    let mut file = File::open(file_name)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

fn main() {
    match read_file_contents("example.txt") {
        Ok(contents) => println!("File contents: {contents}"),
        Err(e) => println!("Failed to read file: {e}"),
    }
}
```

(For this particular task, `std::fs::read_to_string` does the same thing in one call.)

`?` can only be used in a function that returns a `Result` (or `Option`, for `Option` values). That includes `main`, which can return `Result<(), E>` for any `E: Debug`:

```rust
use std::error::Error;
use std::fs;

fn main() -> Result<(), Box<dyn Error>> {
    let contents = fs::read_to_string("example.txt")?;
    let number: i32 = contents.trim().parse()?;
    println!("{number}");
    Ok(())
}
```

`Box<dyn Error>` accepts any error type, so `?` works on both the I/O error and the parse error here. If `main` returns an `Err`, the program prints its `Debug` form and exits with a non-zero status.

## Custom error types

`Box<dyn Error>` is convenient, but callers can't easily tell which error happened. In a library you usually want an enum with one variant per failure, implementing `std::error::Error` and `Display`:

```rust
use std::error::Error;
use std::fmt;
use std::fs::File;
use std::io::{self, Read};
use std::num::ParseIntError;

#[derive(Debug)]
enum CustomError {
    Io(io::Error),
    Parse(ParseIntError),
}

impl fmt::Display for CustomError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CustomError::Io(_) => write!(f, "could not read the file"),
            CustomError::Parse(_) => write!(f, "file did not contain a valid number"),
        }
    }
}

impl Error for CustomError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            CustomError::Io(err) => Some(err),
            CustomError::Parse(err) => Some(err),
        }
    }
}

// These From impls let `?` convert the underlying errors automatically
impl From<io::Error> for CustomError {
    fn from(err: io::Error) -> Self {
        CustomError::Io(err)
    }
}

impl From<ParseIntError> for CustomError {
    fn from(err: ParseIntError) -> Self {
        CustomError::Parse(err)
    }
}

fn read_file_and_parse_number(file_name: &str) -> Result<i32, CustomError> {
    let mut file = File::open(file_name)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let number: i32 = contents.trim().parse()?;
    Ok(number)
}

fn main() {
    match read_file_and_parse_number("example.txt") {
        Ok(number) => println!("Parsed number: {number}"),
        Err(e) => {
            println!("Error: {e}");
            if let Some(cause) = e.source() {
                println!("Caused by: {cause}");
            }
        }
    }
}
```

When `?` sees an `io::Error` in a function returning `Result<_, CustomError>`, it calls `CustomError::from` to convert it. The caller can `match` on `CustomError::Io` vs `CustomError::Parse` to react differently, and `source()` exposes the original error for logging.

A convention worth following: either include the inner error in your `Display` message or return it from `source()`, not both, otherwise error reporters that walk the chain print the same message twice.

## Less boilerplate

Writing `Display`, `Error` and `From` by hand gets repetitive. Two widely used crates handle it:

- [`thiserror`](https://docs.rs/thiserror) derives those impls for your own error enums. It's a good fit for libraries, where callers need to match on specific errors.
- [`anyhow`](https://docs.rs/anyhow) gives you a single `anyhow::Error` type plus `.context("...")` for adding messages. It's a good fit for applications, where you mostly want to report the error and exit.

## Further reading

- [The Rust Book: Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [`std::result` module docs](https://doc.rust-lang.org/std/result/)
