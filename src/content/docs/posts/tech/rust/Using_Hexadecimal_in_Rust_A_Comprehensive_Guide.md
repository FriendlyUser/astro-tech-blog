---
title: "Hexadecimal in Rust: literals, formatting, parsing and the hex crate"
pubDate: "2023-04-22T16:25:04.990Z"
lastUpdated: 2026-11-14
description: "Write hex literals, format integers as hex with {:x} and {:#X}, parse hex strings with from_str_radix, and encode or decode bytes with the hex crate."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

Hexadecimal is base 16: digits `0`–`9` then `a`–`f` (or `A`–`F`). One hex digit is exactly four bits, so a
byte is always two hex digits, which is why hex is the usual way to show memory addresses, colours, hashes and
raw bytes. For example, `0x4A3B` is:

```text
(4 × 16³) + (10 × 16²) + (3 × 16¹) + (11 × 16⁰) = 19035
```

## Hex literals

Prefix an integer literal with `0x`. Underscores are allowed as separators, and a type suffix can go at the end:

```rust
fn main() {
    let n = 0x4A3B;
    let mask: u32 = 0xFFFF_0000;
    let byte = 0x7fu8;
    println!("{n} {mask} {byte}"); // 19035 4294901760 127
}
```

Rust also has `0b` (binary) and `0o` (octal) literals.

## Formatting integers as hex

The formatting macros (`format!`, `println!`, …) take `x` for lowercase hex and `X` for uppercase. Add `#` for
a `0x` prefix and a width with `0` to zero-pad:

```rust
fn main() {
    let n = 19035;
    println!("{:x}", n);    // 4a3b
    println!("{:X}", n);    // 4A3B
    println!("{:#x}", n);   // 0x4a3b
    println!("{:#08X}", n); // 0x004A3B  (width includes the 0x)
    println!("{:02x}", 10u8); // 0a
    println!("{:b}", 0x4A3Bu16); // 100101000111011
}
```

Note that `{:x}` is lowercase; use `{:X}` if you want `4A3B`. For negative signed integers, `{:x}` prints the
two's-complement bits (`format!("{:x}", -1i8)` is `ff`), not a minus sign.

## Parsing hex strings

Use `from_str_radix` on the integer type you need:

```rust
use std::num::ParseIntError;

fn main() -> Result<(), ParseIntError> {
    let n = u32::from_str_radix("4A3B", 16)?; // case-insensitive
    println!("{n}"); // 19035

    // from_str_radix does not accept a 0x prefix, so strip it first.
    let input = "0x4a3b";
    let n = u32::from_str_radix(input.trim_start_matches("0x"), 16)?;
    println!("{n}"); // 19035

    // Values that don't fit the target type are an error, not a wraparound.
    assert!(u8::from_str_radix("1FF", 16).is_err());
    Ok(())
}
```

## Encoding and decoding bytes with the `hex` crate

For converting byte buffers (hashes, keys, binary payloads) to and from hex strings, the
[`hex`](https://docs.rs/hex) crate is the common choice (0.4.3 at the time of writing):

```toml
[dependencies]
hex = "0.4"
```

```rust
fn main() {
    let encoded = hex::encode(b"Hello, world!");
    println!("{encoded}"); // 48656c6c6f2c20776f726c6421

    let upper = hex::encode_upper([0xdeu8, 0xad, 0xbe, 0xef]);
    println!("{upper}"); // DEADBEEF

    let bytes = hex::decode("48656c6c6f2c20776f726c6421").expect("invalid hex");
    let text = String::from_utf8(bytes).expect("invalid UTF-8");
    println!("{text}"); // Hello, world!
}
```

`hex::decode` returns `Result<Vec<u8>, FromHexError>` and fails on an odd number of digits or a non-hex
character. Like `from_str_radix`, it doesn't strip a `0x` prefix.

If you only need to print bytes and don't want a dependency, formatting each byte with `{:02x}` does the same
as `hex::encode`:

```rust
fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
```

## Further reading

- [`std::fmt` formatting syntax](https://doc.rust-lang.org/std/fmt/index.html)
- [`u32::from_str_radix`](https://doc.rust-lang.org/std/primitive.u32.html#method.from_str_radix)
- [`hex` crate docs](https://docs.rs/hex)
