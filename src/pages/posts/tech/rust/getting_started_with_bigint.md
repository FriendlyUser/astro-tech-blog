---
tags: ['rust', 'num-bigint']
title: Working with Large Integers in Rust using the num-bigint Library
description:  In this article, we'll explore how to use num-bigint to perform various operations on large integers.
pubDate: Fri, 14 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3563897667.png
---

# Working with Large Integers in Rust using the `num-bigint` Library

When working with integers in Rust, we usually use primitive types like `i32`, `i64`, or `u64`. However, these types have limitations when it comes to representing very large integers, as they can only store fixed-size values. If you need to work with arbitrarily large integers, the `num-bigint` library comes in handy. In this article, we'll explore how to use `num-bigint` to perform various operations on large integers.

## Setting up the Environment

First, let's add the `num-bigint` and `num-traits` crates to our project. Add the following dependencies to your `Cargo.toml` file:

```toml
[dependencies]
num-bigint = "0.4"
num-traits = "0.2"
```

Now, you can use the `BigInt` and `BigUint` types in your Rust code, as well as various traits provided by `num-traits`.

## Creating and Initializing BigInt and BigUint

`BigInt` represents a signed arbitrary precision integer, while `BigUint` represents an unsigned arbitrary precision integer. To create and initialize these types, we can use the following methods:

```rust
use num_bigint::{BigInt, BigUint};
use num_traits::FromPrimitive;

fn main() {
    let a: BigInt = 100.into();
    let b: BigInt = BigInt::from(200);
    let c: BigInt = BigInt::from_i64(300).unwrap();

    let d: BigUint = 1000.into();
    let e: BigUint = BigUint::from(2000);
    let f: BigUint = BigUint::from_u64(3000).unwrap();
}
```

Here, we're using the `From` trait to convert primitive integers to `BigInt` and `BigUint` values. The `FromPrimitive` trait provides methods for converting primitive types to `BigInt` and `BigUint` and returns an `Option` that needs to be unwrapped.

## Arithmetic Operations

`num-bigint` supports various arithmetic operations like addition, subtraction, multiplication, and division. Here's an example of how you can perform these operations:

```rust
use num_bigint::{BigInt, BigUint};
use num_traits::Zero;

fn main() {
    let a: BigInt = 12345678901234567890_i64.into();
    let b: BigInt = 98765432109876543210_i64.into();

    let sum = &a + &b;
    let difference = &b - &a;
    let product = &a * &b;

    // Ensure b is not zero before dividing
    let quotient = if !b.is_zero() {
        Some(&a / &b)
    } else {
        None
    };

    println!("Sum: {}", sum);
    println!("Difference: {}", difference);
    println!("Product: {}", product);
    println!("Quotient: {:?}", quotient);
}
```

## Comparisons

You can compare `BigInt` and `BigUint` values using standard comparison operators, such as `<`, `>`, `==`, `!=`, `<=`, and `>=`. For example:

```rust
use num_bigint::{BigInt, BigUint};

fn main() {
    let a: BigInt = 100.into();
    let b: BigInt = 200.into();

    if a < b {
        println!("a is less than b");
    } else if a > b {
        println!("a is greater than b");
    } else {
        println!("a is equal to b");
    }
}
```

## Other Operations

`num-bigint` also provides methods for other mathematical operations, such as modulo, exponentiation, and greatest common divisor (GCD).

```rust
use num_bigint::{BigInt, BigUint};
use num_traits::One;

fn main() {
    let a: BigInt = 12345.into();
    let b: BigInt = 67890.into();

    let modulo = &a % &b;
    let gcd = a.gcd(&b);
    let exp = BigUint::one() << 100; // 2^100

    println!("Modulo: {}", modulo);
    println!("GCD: {}", gcd);
    println!("2^100: {}", exp);
}
```

In this example, we're using the `%` operator to calculate the modulo, the `gcd` method to find the greatest common divisor, and bit-shifting to calculate 2 raised to the power of 100.

## Conclusion

The `num-bigint` library provides an easy-to-use and efficient way to work with arbitrarily large integers in Rust. With support for a wide range of operations, from basic arithmetic to advanced mathematical functions, it's an invaluable tool for any Rust developer who needs to handle large numbers.