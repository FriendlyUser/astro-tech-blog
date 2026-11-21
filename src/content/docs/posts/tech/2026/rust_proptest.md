---
title: "Property-based testing in Rust with proptest"
description: "Use proptest to test a Rust run-length encoder: the proptest! macro, strategies, prop_assert, how shrinking finds a minimal failing input, and regression files."
tags: ["Rust", "Testing", "proptest", "Property-Based Testing"]
pubDate: "2026-08-15T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_proptest.webp"
imgAlt: "A bar chart of failing input sizes shrinking step by step down to a single minimal case"
---

Example-based tests check the inputs you thought of. Property-based tests describe a rule that should hold for *every* input ("decoding an encoded value gives back the original"), then generate hundreds of random inputs to try to break it. When one fails, the library shrinks it to a minimal failing case before showing it to you.

proptest is the main property-testing crate for Rust, inspired by Python's Hypothesis. This post uses it on a small run-length encoder that has a bug its unit test misses, then covers strategies, shrinking, configuration and the regression files proptest writes. Examples use proptest 1.11.

## The code under test

Run-length encoding replaces runs of a repeated character with a count and the character: `"aaab"` becomes `"3a1b"`. Here's a first version, in `src/lib.rs`:

```rust
pub fn encode(input: &str) -> String {
    let mut out = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        let mut run = 1;
        while chars.peek() == Some(&c) {
            chars.next();
            run += 1;
        }
        out.push_str(&run.to_string());
        out.push(c);
    }
    out
}

pub fn decode(input: &str) -> Option<String> {
    let mut out = String::new();
    let mut count = String::new();
    for c in input.chars() {
        if c.is_ascii_digit() {
            count.push(c);
        } else {
            let n: usize = count.parse().ok()?;
            out.extend(std::iter::repeat(c).take(n));
            count.clear();
        }
    }
    if count.is_empty() { Some(out) } else { None }
}
```

And the kind of test most of us would write:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encodes_and_decodes_an_example() {
        assert_eq!(encode("aaab"), "3a1b");
        assert_eq!(decode("3a1b").as_deref(), Some("aaab"));
    }
}
```

It passes. Ship it?

## The first property

Add proptest as a dev dependency:

```toml
[dev-dependencies]
proptest = "1.11"
```

The property for any encoder is the round trip: decoding what you encoded gives back the input. In proptest that reads almost like the sentence:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn round_trip(s in any::<String>()) {
            let encoded = encode(&s);
            prop_assert_eq!(decode(&encoded), Some(s));
        }
    }
}
```

The `proptest!` macro turns each function into a normal `#[test]`. `s in any::<String>()` means "generate `s` from the strategy `any::<String>()`", which produces arbitrary Unicode strings. By default each property runs 256 cases.

Run `cargo test` and it fails. The report shows the assertion that failed and a "minimal failing input": a very short string with a digit in it, usually nothing but the digit.

That's the bug. The format can't tell a count digit from a data digit. `encode("7")` produces `"17"`, which `decode` reads as a count of 17 with no character after it. The example test only used letters, so it couldn't see this. Any input containing a digit fails, and proptest found one in a few hundred random strings without being told digits were interesting.

### What shrinking did

The first failing input proptest generated was probably a long string of random Unicode with a digit somewhere in it, which is hard to debug. Before reporting, proptest *shrinks* it: it tries simpler versions of the input and keeps any that still fail. For strings and collections, simpler means fewer elements. For individual values it means closer to a simple value, such as zero for integers. It stops when no simpler version fails.

Every strategy knows how to shrink the values it generates, and that includes strategies you compose yourself (below). You don't write shrinking code. This is the main practical difference from just looping over random inputs in a normal test.

## Fixing the encoder

Put a separator between the count and the character, so the decoder always knows where the count ends: `"aaab"` becomes `"3:a1:b"`. The character after the colon is taken literally, even if it's a digit or another colon.

```rust
pub fn encode(input: &str) -> String {
    let mut out = String::new();
    let mut chars = input.chars().peekable();
    while let Some(c) = chars.next() {
        let mut run = 1;
        while chars.peek() == Some(&c) {
            chars.next();
            run += 1;
        }
        out.push_str(&run.to_string());
        out.push(':');
        out.push(c);
    }
    out
}

pub fn decode(input: &str) -> Option<String> {
    let mut out = String::new();
    let mut chars = input.chars();
    loop {
        // Read the count up to the ':' separator.
        let mut count = String::new();
        loop {
            match chars.next() {
                None if count.is_empty() => return Some(out),
                None => return None,
                Some(':') => break,
                Some(d) if d.is_ascii_digit() => count.push(d),
                Some(_) => return None,
            }
        }
        let n: usize = count.parse().ok()?;
        // Exactly one character follows, whatever it is.
        let c = chars.next()?;
        out.extend(std::iter::repeat(c).take(n));
    }
}
```

Update the example test to expect `"3:a1:b"`, and `round_trip` passes.

## Strategies

A strategy describes how to generate (and shrink) values. You'll mostly combine a handful of building blocks:

- `any::<T>()` for any type implementing `Arbitrary`: integers, `char`, `String`, `Vec<T>`, tuples, `Option<T>`, and more.
- Ranges: `0..100u32`, `1..=10usize`.
- String literals are regexes: `"[a-z]{1,8}"` generates strings matching the pattern.
- `prop::collection::vec(strategy, 0..50)` for vectors of a given size range, with `hash_map`, `btree_set` and friends alongside.
- `Just(value)` for a constant, and `prop_oneof![a, b, c]` to pick between strategies.
- `.prop_map(f)` to transform generated values, and `.prop_filter("reason", pred)` to reject some.

Random Unicode rarely contains long runs of the same character, which is exactly what an RLE encoder exists for. So it's worth adding strategies that aim at the interesting cases:

```rust
proptest! {
    // Strings made of the characters that matter to the format: digits and ':'.
    #[test]
    fn round_trip_format_chars(s in "[ab0-9:]{0,40}") {
        prop_assert_eq!(decode(&encode(&s)), Some(s.clone()));
    }

    // Strings built from long runs of arbitrary characters.
    #[test]
    fn round_trip_long_runs(
        s in prop::collection::vec((any::<char>(), 1..20usize), 0..10)
            .prop_map(|runs| {
                runs.into_iter()
                    .map(|(c, n)| c.to_string().repeat(n))
                    .collect::<String>()
            })
    ) {
        prop_assert_eq!(decode(&encode(&s)), Some(s.clone()));
    }
}
```

The second strategy generates up to ten `(char, length)` pairs and expands them into a string. Because it's built from `vec`, tuples and `prop_map`, it still shrinks: proptest removes pairs and shortens runs while the test keeps failing.

The broken first version fails `round_trip_format_chars` almost immediately, because nearly every input contains a digit. Narrow, targeted strategies like that one tend to find bugs faster than `any::<T>()`, so I usually write one of each.

For your own types, implement `Arbitrary` by hand, write a function returning `impl Strategy<Value = MyType>`, or use the [proptest-derive](https://docs.rs/proptest-derive) crate's `#[derive(Arbitrary)]`.

## `prop_assert!` and friends

Inside `proptest!`, use `prop_assert!`, `prop_assert_eq!` and `prop_assert_ne!`. They return an error from the test case instead of panicking. Plain `assert!` also works, because proptest catches the panic, but every panic during shrinking prints a message, and the output gets noisy.

`prop_assume!(condition)` discards the current case without failing, for inputs your property doesn't apply to. Use it sparingly: if most generated cases are discarded, proptest gives up with a "too many rejects" error. A strategy that only generates valid inputs is better than filtering after the fact.

## Configuration

Change the number of cases for one block with `proptest_config`:

```rust
proptest! {
    #![proptest_config(ProptestConfig::with_cases(2000))]

    #[test]
    fn round_trip_many(s in any::<String>()) {
        prop_assert_eq!(decode(&encode(&s)), Some(s.clone()));
    }
}
```

Or for a whole run, with an environment variable:

```bash
PROPTEST_CASES=10000 cargo test --release
```

I keep the default 256 cases for everyday `cargo test`, and run a nightly CI job with a much higher count.

## Regression files

When a property fails, proptest saves the seed of the failing case in a file next to your sources. For a test in `src/lib.rs`, that's `proptest-regressions/lib.txt` in the crate root. Each line starts with `cc` and a hex seed, followed by a comment showing the shrunk input.

On every later run, proptest replays the saved seeds *before* generating new random cases. So once a bug has been found, it's tested on every run, even though the rest of the inputs are random. Commit the `proptest-regressions` directory to version control. Deleting it throws away bugs you already paid to find.

## Gotchas

- **Random means not reproducible by default.** Two runs see different inputs. The regression file covers past failures, but a flaky property (one that depends on time, ordering of a `HashMap`, or global state) is still flaky.
- **Expensive tests multiply.** A property that takes 50 ms per case takes over 12 seconds at 256 cases. Keep properties fast, or lower the case count for the slow ones.
- **Don't reimplement the code in the test.** A property that recomputes the expected output with the same algorithm will happily agree with a bug. Prefer round trips, invariants ("output is sorted", "length is preserved"), and comparisons against a simpler, obviously correct implementation.
- **Shrinking needs a deterministic failure.** If the test only fails some of the time for the same input, shrinking wanders and the "minimal" case may not fail on its own.

## Further reading

- [The proptest book](https://proptest-rs.github.io/proptest/)
- [proptest API docs](https://docs.rs/proptest/1.11.0/proptest/)
- [proptest-derive](https://docs.rs/proptest-derive)
