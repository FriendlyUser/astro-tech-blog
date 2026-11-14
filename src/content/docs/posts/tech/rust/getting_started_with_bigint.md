---
tags: ['rust', 'num-bigint']
title: Arbitrary-precision integers in Rust with num-bigint
description: How to create, parse, compare and do arithmetic on arbitrarily large integers in Rust with num-bigint's BigInt and BigUint types.
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3563897667.webp
---

Rust's primitive integers top out at 128 bits (`i128`/`u128`), and overflowing them panics in debug builds and wraps in release builds. When you need integers of any size, such as for cryptography, exact factorials, or parsing huge numeric strings, the standard crate is [`num-bigint`](https://crates.io/crates/num-bigint). It provides `BigInt` (signed) and `BigUint` (unsigned), which grow their storage as needed.

The examples were written against num-bigint 0.5.1, num-traits 0.2.19 and num-integer 0.1.47.

## Dependencies

```toml
[dependencies]
num-bigint = "0.5"
num-traits = "0.2"
num-integer = "0.1"
```

`num-traits` provides traits such as `Zero`, `One` and `FromPrimitive`; `num-integer` provides the `Integer` trait with `gcd`, `lcm` and friends. The 0.5 release of num-bigint only changed the optional `rand` integration, so the code below also works on 0.4.

## Creating values

```rust
use num_bigint::{BigInt, BigUint};
use num_traits::FromPrimitive;

fn main() {
    // From primitive integers via the From trait
    let a = BigInt::from(-100);
    let b: BigInt = 200i64.into();
    let c = BigUint::from(3000u32);

    // FromPrimitive returns an Option (None for negative values into BigUint)
    let d = BigUint::from_i64(3000).unwrap();
    let e = BigUint::from_i64(-1); // None

    // From a decimal string
    let f: BigInt = "-123456789012345678901234567890".parse().unwrap();

    println!("{a} {b} {c} {d} {e:?} {f}");
}
```

`BigUint` only implements `From` for unsigned primitives, so an unsuffixed literal like `BigUint::from(3000)` fails to compile: Rust falls back to `i32` for the literal, and there's no `From<i32>` for `BigUint`. Add a suffix (`3000u32`) or use `FromPrimitive`.

## Arithmetic

The usual operators work on owned values and on references. Using references (`&a + &b`) avoids moving or cloning the operands:

```rust
use num_bigint::BigInt;
use num_traits::Zero;

fn main() {
    let a: BigInt = "12345678901234567890".parse().unwrap();
    let b: BigInt = "98765432109876543210".parse().unwrap();

    let sum = &a + &b;
    let difference = &b - &a;
    let product = &a * &b;

    // Division by zero panics, just like with primitive integers
    let quotient = if b.is_zero() { None } else { Some(&b / &a) };

    println!("Sum: {sum}");
    println!("Difference: {difference}");
    println!("Product: {product}");
    println!("Quotient: {quotient:?}");
}
```

Output:

```text
Sum: 111111111011111111100
Difference: 86419753208641975320
Product: 1219326311370217952237463801111263526900
Quotient: Some(8)
```

Division truncates toward zero, as it does for `i64`. Use `a.div_rem(&b)` from `num_integer::Integer` to get the quotient and remainder together.

## Comparisons

`BigInt` and `BigUint` implement `PartialOrd`, `Ord` and `Eq`, so `<`, `>`, `==` and `sort()` work as expected:

```rust
use num_bigint::BigInt;

fn main() {
    let a = BigInt::from(100);
    let b = BigInt::from(200);

    if a < b {
        println!("a is less than b");
    } else if a > b {
        println!("a is greater than b");
    } else {
        println!("a is equal to b");
    }
}
```

## Remainder, GCD and powers

```rust
use num_bigint::{BigInt, BigUint};
use num_integer::Integer;
use num_traits::One;

fn main() {
    let a = BigInt::from(12345);
    let b = BigInt::from(67890);

    let remainder = &a % &b;          // sign follows the dividend, like `%` on i64
    let gcd = a.gcd(&b);              // from num_integer::Integer
    let shifted = BigUint::one() << 100; // 2^100 via a bit shift
    let power = BigUint::from(2u32).pow(100); // the same value via pow
    let modpow = BigUint::from(4u32).modpow(&BigUint::from(13u32), &BigUint::from(497u32));

    println!("Remainder: {remainder}");
    println!("GCD: {gcd}");
    println!("2^100: {shifted}");
    println!("equal: {}", shifted == power);
    println!("4^13 mod 497: {modpow}");
}
```

Output:

```text
Remainder: 12345
GCD: 15
2^100: 1267650600228229401496703205376
equal: true
4^13 mod 497: 445
```

`modpow` computes `(base ^ exponent) % modulus` without building the full power first, which is what you want for RSA-style arithmetic.

## Things to know

- **Performance.** Every operation allocates, so `BigInt` is much slower than primitive integers. Use it only where values can actually exceed 128 bits. If you need the fastest possible big-number arithmetic, [`rug`](https://crates.io/crates/rug) wraps GMP, at the cost of a C dependency and an LGPL licence.
- **Not constant-time.** num-bigint's operations take time that depends on the values, so don't use it for production cryptography with secret data. Use a dedicated crate such as [`crypto-bigint`](https://crates.io/crates/crypto-bigint).
- **Random numbers.** The `rand` integration moved behind versioned features in 0.5 (`rand_0_9`, `rand_0_10`); check the [release notes](https://github.com/rust-num/num-bigint/blob/master/RELEASES.md) if you're upgrading from 0.4.

## Further reading

- [num-bigint documentation](https://docs.rs/num-bigint)
- [num-integer `Integer` trait](https://docs.rs/num-integer/latest/num_integer/trait.Integer.html)
