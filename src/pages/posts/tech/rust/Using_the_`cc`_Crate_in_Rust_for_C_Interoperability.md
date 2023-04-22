---
title: Using the `cc` Crate in Rust for C Interoperability
pubDate: "2023-04-22T16:25:05.026Z"
description: "In this article, we'll cover how to use the `cc` crate to compile C code and integrate it with your Rust project."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using the `cc` Crate in Rust for C Interoperability

When working with Rust, a systems programming language that aims for safety, speed, and concurrency, there might be times when you need to interface with C libraries or code. The `cc` crate is a popular choice to help you compile C code and link it to your Rust project.

In this article, we'll cover how to use the `cc` crate to compile C code and integrate it with your Rust project. We'll go through a step-by-step process, starting with a simple example and moving toward more advanced use cases.

## Prerequisites

To follow along, you'll need the following:

- Rust installed on your system (you can get it from [the official Rust website](https://www.rust-lang.org/tools/install))
- A basic understanding of Rust syntax and concepts
- Familiarity with C programming

## Getting started

First, create a new Rust project:

```bash
$ cargo new cc_example
$ cd cc_example
```

Next, add the `cc` crate to your `Cargo.toml` file:

```toml
[dependencies]
cc = "1.0"
```

## Simple example

Suppose we have a simple C function that we want to call from Rust. Create a file named `src/foo.c` with the following content:

```c
#include <stdint.h>

int32_t add(int32_t a, int32_t b) {
    return a + b;
}
```

Now, we want to compile this C code and link it with our Rust project. To do that, create a new file named `build.rs` in the project root:

```rust
use cc::Build;

fn main() {
    Build::new().file("src/foo.c").compile("foo");
}
```

This simple build script tells the `cc` crate to compile the `foo.c` file and produce a library named `foo`.

Next, we'll create a Rust function that calls the C `add` function. In `src/lib.rs`, add the following code:

```rust
extern "C" {
    fn add(a: i32, b: i32) -> i32;
}

pub fn add_numbers(a: i32, b: i32) -> i32 {
    unsafe { add(a, b) }
}
```

Here, we declare an extern function with the C calling convention, and then wrap it in a safe Rust function.

Finally, let's test our integration. In `src/main.rs`, add the following code:

```rust
use cc_example::add_numbers;

fn main() {
    let result = add_numbers(5, 7);
    println!("The result is: {}", result);
}
```

Now, build and run your project:

```bash
$ cargo run
```

You should see the output:

```
The result is: 12
```

## Advanced example

In a more complex scenario, you might have multiple C files and header files. Let's create a new header file, `src/foo.h`, with the following content:

```c
#ifndef FOO_H
#define FOO_H

#include <stdint.h>

int32_t add(int32_t a, int32_t b);
int32_t multiply(int32_t a, int32_t b);

#endif // FOO_H
```

Now, create a new C file, `src/foo_multiply.c`, with the following content:

```c
#include "foo.h"

int32_t multiply(int32_t a, int32_t b) {
    return a * b;
}
```

Update your `build.rs` to include the new C file and specify the include directory:

```rust
use cc::Build;

fn main() {
    Build::new()
        .file("src/foo.c")
        .file("src/foo_multiply.c")
        .include("src")
        .compile("foo");
}
```

Now, update `src/lib.rs` to call the new `multiply` function:

```rust
extern "C" {
    fn add(a: i32, b: i32) -> i32;
    fn multiply(a: i32, b: i32) -> i32;
}

pub fn add_numbers(a: i32, b: i32) -> i32 {
    unsafe { add(a, b) }
}

pub fn multiply_numbers(a: i32, b: i32) -> i32 {
    unsafe { multiply(a, b) }
}
```

Finally, update `src/main.rs` to use the new function:

```rust
use cc_example::{add_numbers, multiply_numbers};

fn main() {
    let sum = add_numbers(5, 7);
    let product = multiply_numbers(5, 7);
    println!("The sum is: {}", sum);
    println!("The product is: {}", product);
}
```

Build and run your project:

```bash
$ cargo run
```

You should see theoutput:

```
The sum is: 12
The product is: 35
```

## Conclusion

In this article, we've demonstrated how to use the `cc` crate in Rust for C interoperability. We started with a simple example of calling a C function from Rust and then moved on to a more advanced example with multiple C files and header files.

The `cc` crate provides a convenient way to compile C code and link it with your Rust projects, enabling you to leverage existing C libraries and code bases while still benefiting from Rust's safety and performance features.
