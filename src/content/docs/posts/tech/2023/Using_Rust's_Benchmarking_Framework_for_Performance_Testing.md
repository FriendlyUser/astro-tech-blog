---
title: "Benchmarking Rust code with Criterion.rs"
pubDate: "2024-10-21T20:16:40.000Z"
lastUpdated: 2026-11-14
description: "Set up Criterion.rs to benchmark Rust code on stable: a first benchmark, parameterised inputs, throughput, baselines and HTML reports."
tags: ["rust", "testing"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/nature_0.jpeg
---

Rust's built-in `#[bench]` attribute and `test::Bencher` are still unstable and only work on nightly. On stable Rust, the usual choice is [Criterion.rs](https://github.com/criterion-rs/criterion.rs), a statistics-driven benchmarking library. It warms up your code, takes many samples, reports a confidence interval, and compares each run against the previous one to tell you whether performance actually changed.

## Setup

Add Criterion as a **dev-dependency** (it's only needed for `cargo bench`, not in your library) and register a benchmark target with the default harness turned off:

```toml
[dev-dependencies]
criterion = { version = "0.8", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

`harness = false` tells Cargo to let Criterion provide `main` instead of the built-in test harness. The examples here use Criterion 0.8.2, which needs Rust 1.86 or newer. The `html_reports` feature is optional; it's covered at the end.

## A first benchmark

Say your crate is called `my_lib` and `src/lib.rs` has a function you want to measure:

```rust
pub fn fibonacci(n: u64) -> u64 {
    match n {
        0 => 0,
        1 => 1,
        n => fibonacci(n - 1) + fibonacci(n - 2),
    }
}
```

Create `benches/my_benchmark.rs` (the file name must match the `name` in `[[bench]]`):

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use my_lib::fibonacci;
use std::hint::black_box;

fn bench_fibonacci(c: &mut Criterion) {
    c.bench_function("fibonacci 20", |b| b.iter(|| fibonacci(black_box(20))));
}

criterion_group!(benches, bench_fibonacci);
criterion_main!(benches);
```

- `b.iter` runs the closure many times and times it.
- `black_box` hides the value from the optimiser, so the compiler can't precompute `fibonacci(20)` at compile time and leave you timing nothing. Use `std::hint::black_box`; `criterion::black_box` is deprecated.
- `criterion_group!` bundles benchmark functions into a group, and `criterion_main!` generates the `main` function that runs the groups. Benchmarks run one after another, not in parallel, so they don't disturb each other's timings.

## Running it

```bash
cargo bench
```

`cargo bench` builds with the `bench` profile, which inherits from `release`, so you're measuring optimised code. The output looks like this (your numbers will differ):

```text
fibonacci 20            time:   [25.342 µs 25.581 µs 25.845 µs]
                        change: [-0.8184% +0.7545% +2.1880%] (p = 0.32 > 0.05)
                        No change in performance detected.
Found 4 outliers among 100 measurements (4.00%)
  2 (2.00%) high mild
  2 (2.00%) high severe
```

The three `time` values are the lower bound, estimate and upper bound of the confidence interval. The `change` line only appears from the second run onwards, when there's a previous result to compare against. Criterion also reports outliers; lots of them usually means something else on the machine was competing for CPU.

To run a subset, pass a filter after `--`:

```bash
cargo bench -- fibonacci
```

## Comparing inputs and measuring throughput

Use a benchmark group with `bench_with_input` to run the same code over several input sizes. Setting a `Throughput` makes Criterion report elements (or bytes) per second as well as time:

```rust
use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion, Throughput};

fn bench_sum(c: &mut Criterion) {
    let mut group = c.benchmark_group("sum");
    for size in [1_000u64, 10_000, 100_000] {
        let data: Vec<u64> = (0..size).collect();
        group.throughput(Throughput::Elements(size));
        group.bench_with_input(BenchmarkId::from_parameter(size), &data, |b, data| {
            b.iter(|| data.iter().sum::<u64>())
        });
    }
    group.finish();
}

criterion_group!(benches, bench_sum);
criterion_main!(benches);
```

The input is built outside `b.iter`, so only the summing is timed, and `bench_with_input` already passes the input through `black_box`.

## Tuning the statistics

The defaults are 100 samples, a significance level of 0.05 and a noise threshold of 1%, meaning changes smaller than 1% are reported as noise. For a noisy machine you can raise the sample count and noise threshold:

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use std::hint::black_box;

fn bench_fibonacci(c: &mut Criterion) {
    c.bench_function("fibonacci 20", |b| b.iter(|| my_lib::fibonacci(black_box(20))));
}

criterion_group! {
    name = benches;
    config = Criterion::default().sample_size(200).noise_threshold(0.03);
    targets = bench_fibonacci
}
criterion_main!(benches);
```

## Baselines and reports

By default each run is compared with the previous one. To compare a branch against `main`, save a named baseline and compare against it later:

```bash
git switch main
cargo bench -- --save-baseline main
git switch my-branch
cargo bench -- --baseline main
```

With the `html_reports` feature enabled, Criterion writes charts and a summary to `target/criterion/report/index.html`. It uses gnuplot if it's installed and falls back to the `plotters` crate otherwise.

## Gotchas

- Microbenchmarks measure one function in a hot loop, with warm caches and a predictable branch history. They're good for comparing two implementations, not for predicting how a whole program will behave.
- Laptops on battery, thermal throttling and background processes all add noise. Run benchmarks you want to compare on the same machine under the same conditions.
- If a benchmark reports a time close to zero, the optimiser has probably removed the work. Check your `black_box` usage.

## Further reading

- [Criterion.rs user guide](https://criterion-rs.github.io/book/index.html)
- [API documentation on docs.rs](https://docs.rs/criterion/latest/criterion/)
