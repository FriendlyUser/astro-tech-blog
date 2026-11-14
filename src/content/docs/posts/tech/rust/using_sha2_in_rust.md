---
title: "Hashing strings with SHA-256 and SHA-512 in Rust using the sha2 crate"
description: "A small Rust program that reads a line from stdin and prints its SHA-256 and SHA-512 digests as hex, using the RustCrypto sha2 and hex crates."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.png'
---

The [`sha2`](https://crates.io/crates/sha2) crate from the RustCrypto project is a pure-Rust implementation of the SHA-2 family: SHA-224, SHA-256, SHA-384, SHA-512, SHA-512/224 and SHA-512/256. SHA-2 was designed by the NSA and is standardised by NIST in FIPS 180-4. SHA-256 and SHA-512 are the two you'll see most often, for checksums, content addressing, and as building blocks inside HMAC and signature schemes.

This post builds a small program that reads a line from stdin and prints both digests in hex.

## Set up the project

```sh
cargo new sha2_example
cd sha2_example
cargo add sha2 hex
```

`cargo add` writes the latest versions into `Cargo.toml`. At the time of this update that was:

```toml
[dependencies]
hex = "0.4.3"
sha2 = "0.11.1"
```

`sha2` returns digests as fixed-size byte arrays; the `hex` crate turns them into the lowercase hex strings you see from tools like `sha256sum`.

## Compute SHA-256 and SHA-512

Replace `src/main.rs` with:

```rust
use sha2::{Digest, Sha256, Sha512};
use std::io::{self, Write};

fn main() {
    print!("Enter a string to hash: ");
    io::stdout().flush().unwrap();

    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();
    // read_line keeps the trailing newline ("\n" or "\r\n"); strip it so the
    // hash matches what you'd get from `printf 'hello world' | sha256sum`.
    let input = input.trim_end_matches(['\r', '\n']);

    // Incremental API: create a hasher, feed it data, then finalize.
    let mut sha256 = Sha256::new();
    sha256.update(input.as_bytes());
    let sha256_result = sha256.finalize();

    // One-shot API: same result in a single call.
    let sha512_result = Sha512::digest(input.as_bytes());

    println!("SHA-256: {}", hex::encode(sha256_result));
    println!("SHA-512: {}", hex::encode(sha512_result));
}
```

The `Digest` trait has to be in scope: it provides `new`, `update`, `finalize` and `digest`. The incremental form is what you want for large inputs such as files, because you can call `update` once per chunk instead of loading everything into memory. For a single in-memory value, `Sha256::digest(bytes)` is shorter.

Run it:

```sh
cargo run
```

Entering `hello world` should print:

```text
SHA-256: b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
SHA-512: 309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f
```

These match the test vectors in the `sha2` README, which is a quick way to confirm you're hashing exactly the bytes you think you are.

## Gotchas

- **Trailing newlines.** Forgetting to strip the newline from `read_line` is the most common reason a Rust hash doesn't match `sha256sum` or an online tool. On Windows the line ends in `\r\n`, so trimming only `\n` isn't enough.
- **Don't hash passwords with plain SHA-2.** SHA-256 is fast by design, which makes brute-forcing stored password hashes cheap. Use a password hashing function such as Argon2 (the RustCrypto `argon2` crate) instead.
- **Use HMAC for authentication.** If you need to prove a message came from someone holding a secret key, use HMAC-SHA256 (the `hmac` crate), not `sha256(key + message)`.

## Further reading

- [`sha2` on docs.rs](https://docs.rs/sha2)
- [`digest` crate docs](https://docs.rs/digest), which define the traits shared by all RustCrypto hashes
- [RustCrypto hashes repository](https://github.com/RustCrypto/hashes)
