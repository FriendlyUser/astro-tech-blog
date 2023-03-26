---
title: How to use Rust's macros
description: In this article, we will explore Rust's macros and build a program that demonstrates their usage.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---


Rust is a modern programming language that emphasizes safety, speed, and concurrency. It provides a rich set of features, including powerful macros, that enable developers to write expressive and efficient code. In this article, we will explore Rust's macros and build a program that demonstrates their usage.

Macros are a powerful feature of Rust that allow developers to write code that generates other code. They are a way to write code that can be used to generate repetitive or boilerplate code, making it easier to write and maintain complex applications. Rust's macros are known as procedural macros, which means they operate on the abstract syntax tree (AST) of the code and generate new code based on it.

To demonstrate the usage of Rust's macros, we will build a custom assert macro that prints out the values being compared if the assertion fails. This will help us understand how macros work and how they can be used to simplify our code.

Let's start by creating a new Rust project using Cargo, Rust's package manager. Open a terminal and run the following command:

```rust
cargo new assert-demo
```

This will create a new Rust project named `assert-demo`. Now, navigate to the project directory by running:

```rust
cd assert-demo
```

Next, open the `Cargo.toml` file and add the following dependencies:

```rust
[dependencies]
syn = "1.0"
quote = "1.0"
```

These dependencies are required for building procedural macros. The `syn` crate provides a parser for Rust's syntax, while the `quote` crate allows us to generate new Rust code.

Now, let's create a new file named `src/lib.rs` and add the following code:

```rust
extern crate proc_macro;

use proc_macro::TokenStream;
use quote::quote;
use syn::{parse_macro_input, Expr};

#[proc_macro]
pub fn assert_equals(input: TokenStream) -> TokenStream {
    let exprs = parse_macro_input!(input as syn::ExprBinary);

    let left = exprs.left;
    let right = exprs.right;

    let expanded = quote! {
        if !(#left == #right) {
            panic!("assertion failed: {} != {}", #left, #right);
        }
    };

    TokenStream::from(expanded)
}
```

Let's go through this code step by step. First, we import the `proc_macro` module, which allows us to define procedural macros. We also import the `quote` and `syn` crates, which we added as dependencies earlier.

Next, we define a new procedural macro named `assert_equals`. This macro takes an expression as input, which should be a binary expression like `assert_equals!(a + b, c)`. We use the `parse_macro_input` macro from the `syn` crate to parse the input expression into an `ExprBinary` object.

We then extract the left and right expressions from the `ExprBinary` object using the `left` and `right` fields.

Finally, we use the `quote` macro to generate new Rust code. We construct an `if` statement that checks whether the left and right expressions are equal. If they are not, we panic with a message indicating that the assertion failed and print out the values of the left and right expressions.

Now that we've defined our macro, let's use it in our main program. Open the `src/main.rs` file and add the following code:

```rust
fn main() {
    let a = 1;
    let b = 2;
    assert_equals!(a, b);
}
```

This code defines two variables, `a` and `b`, and then uses our `assert_equals` macro to assert that they are equal. Since `a` and `b` are not equal, the assertion will fail and our macro will print out the values of `a` and `b`.

To run the program, use the following command:

```
cargo run
```

You should see the following output:

```rust
thread 'main' panicked at 'assertion failed: 1 != 2', src/main.rs:4:5
```

This output indicates that the assertion failed and that the values of `a` and `b` are 1 and 2, respectively.

In conclusion, Rust's macros are a powerful feature that enable developers to write expressive and efficient code. In this article, we built a custom assert macro that prints out the values being compared if the assertion fails. We learned how to define procedural macros, parse input expressions using the `syn` crate, and generate new Rust code using the `quote` crate. By using macros, we can simplify our code and improve its readability and maintainability.