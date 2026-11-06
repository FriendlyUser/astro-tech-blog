---
title: "Secure Hashing with SHA-2 in Rust using the `sha2` Crate"
description: In this technical article, we will explore how to use the `sha2` crate in Rust to compute secure hash values using the SHA-2 family of cryptographic hashing algorithms.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.png'
---


# Secure Hashing with SHA-2 in Rust using the `sha2` Crate

In this technical article, we will explore how to use the `sha2` crate in Rust to compute secure hash values using the SHA-2 family of cryptographic hashing algorithms. The Secure Hash Algorithm 2 (SHA-2) is a set of cryptographic hash functions designed by the National Security Agency (NSA) and published in 2001. SHA-2 includes different digest sizes: 224, 256, 384, and 512 bits. The most commonly used variants are SHA-256 and SHA-512.

## Prerequisites

To follow along, you should have a basic understanding of Rust programming language and familiarity with `car, Rust's package manager.

## Setting Up a New Project

First, let's create a new Rust project using `car:

```sh
$ cargo new sha2_example
$ cd sha2_example
```

Next, open the `Cargo.toml` file and add the `sha2` crate as a dependency:

```toml
[dependencies]
sha2 = "0.9.5"
```

Now, we can use the `sha2` crate in our project.

## Computing the SHA-256 and SHA-512 Hashes

Let's create a Rust program that computes the SHA-256 and SHA-512 hash of a given input string. Open the `src/main.rs` file and replace its content with the following code:

```rust
extern crate sha2;

use sha2::{Digest, Sha256, Sha512};
use std::io::{self, Write};

fn main() {
    // Prompt the user for input
    print!("Enter a string to hash: ");
    io::stdout().flush().unwrap();
    let mut input = String::new();
    io::stdin().read_line(&mut input).unwrap();

    // Compute the SHA-256 and SHA-512 hashes
    let mut sha256 = Sha256::new();
    let mut sha512 = Sha512::new();
    sha256.update(input.as_bytes());
    sha512.update(input.as_bytes());
    let sha256_result = sha256.finalize();
    let sha512_result = sha512.finalize();

    // Display the resulting hashes
    println!("SHA-256: {:?}", hex::encode(sha256_result));
    println!("SHA-512: {:?}", hex::encode(sha512_result));
}
```

In this example, we first import the necessary modules and structs from the `sha2` crate. We then prompt the user for input and read a line from the stdin. Next, we create instances of the `Sha256` and `Sha512` structs and update them with the input bytes. After that, we finalize the hash computation and store the resulting hash values as byte arrays. Finally, we display the computed hashes using hex encoding.

To run the example, execute:

``sh
$ cargo run
```

Now you should be able to enter a string and see the SHA-256 and SHA-512 hash values for that string.

## Conclusion

In this article, we've shown how to use the `sha2` crate in Rust to compute the SHA-256 and SHA-512 hash values of a given input string. The `sha2` crate is part of the RustCrypto project and provides a simple, easy-to-use interface for computing hash values using the SHA-2 family of algorithms. This can be useful for various applications, such as verifying the integrity of data, creating unique identifiers, or generating digital signatures.