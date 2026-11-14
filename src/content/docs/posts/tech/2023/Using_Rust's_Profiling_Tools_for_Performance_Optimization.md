---
title: Profiling Rust code with perf, Criterion and cargo-flamegraph
pubDate: "2023-12-24T16:18:46.000Z"
lastUpdated: 2026-11-14
description: "How to find slow code in a Rust program: sample it with perf, draw a flamegraph with cargo-flamegraph, and measure changes with Criterion benchmarks."
tags: ['rust']
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/270485010-forest.webp
---

Rust gives you fast code by default, but "fast by default" doesn't tell you where your program actually spends its time. Three tools cover most of what you need:

- **`perf`**: the Linux sampling profiler. It records call stacks while your program runs and tells you which functions are hot.
- **`cargo-flamegraph`**: wraps `perf` (or the platform equivalent) and renders the samples as an interactive SVG flamegraph.
- **Criterion**: a benchmarking library. Once you know *what* is slow, it tells you whether your fix made it faster, with statistics to separate real changes from noise.

A typical loop is: profile the whole program, find the hot function, write a benchmark for it, change the code, and re-run the benchmark.

## Build with debug symbols

`cargo build --release` does not include debug info by default, so profilers show addresses or inlined mush instead of function names. Turn it on for the release profile:

```toml
[profile.release]
debug = true
```

This doesn't change optimisation level; it only adds symbols. You can also set it per command with the environment variable `CARGO_PROFILE_RELEASE_DEBUG=true`.

## Profiling with perf

On Ubuntu, install `perf` with the package that matches your running kernel:

```bash
sudo apt-get install linux-tools-common linux-tools-generic linux-tools-$(uname -r)
```

Build, then record. `--call-graph dwarf` uses the debug info to unwind stacks, which works even though release builds omit frame pointers:

```bash
cargo build --release
perf record --call-graph dwarf ./target/release/my_app
perf report
```

`perf report` opens an interactive view in the terminal, sorted by the share of samples in each function. Expand an entry to see who called it.

If `perf record` fails with a permissions error as a normal user, the kernel's `perf_event_paranoid` setting is blocking it. You can lower it for the current boot (this loosens a security setting, so don't do it on shared machines):

```bash
echo -1 | sudo tee /proc/sys/kernel/perf_event_paranoid
```

## Flamegraphs with cargo-flamegraph

Install the cargo subcommand:

```bash
cargo install flamegraph
```

Then run your binary through it:

```bash
cargo flamegraph --bin my_app
```

It builds in release mode, profiles the run, and writes `flamegraph.svg` to the current directory. Open it in a browser: the width of each box is the share of samples, so wide boxes near the top of a stack are where the time goes. Click a box to zoom in.

On Linux it uses `perf`; on macOS it uses `xctrace`; on Windows it has built-in support (or uses `dtrace` if installed). See the [flamegraph README](https://github.com/flamegraph-rs/flamegraph) for options such as profiling a benchmark with `--bench`.

## Benchmarking with Criterion

Criterion needs your code to be in a library crate (`src/lib.rs`) so the benchmark can import it. Add it as a dev-dependency and register a bench target with the default test harness turned off:

```toml
[dev-dependencies]
criterion = "0.8"

[[bench]]
name = "my_function_benchmark"
harness = false
```

Without `harness = false`, Cargo uses the built-in benchmark harness and Criterion's `main` never runs.

Create `benches/my_function_benchmark.rs`:

```rust
use criterion::{criterion_group, criterion_main, Criterion};
use std::hint::black_box;
use my_app::my_function;

fn my_function_benchmark(c: &mut Criterion) {
    c.bench_function("my_function", |b| {
        b.iter(|| my_function(black_box(42)))
    });
}

criterion_group!(benches, my_function_benchmark);
criterion_main!(benches);
```

`black_box` stops the compiler from constant-folding the call away, which would otherwise give you a benchmark of nothing. Use `std::hint::black_box`; Criterion's own `criterion::black_box` is deprecated.

Run it:

```bash
cargo bench
```

Criterion reports a confidence interval for the time per iteration and, on later runs, whether the change from the previous run is statistically significant. Results are saved under `target/criterion/`; for HTML reports with charts, enable the crate's `html_reports` feature (`criterion = { version = "0.8", features = ["html_reports"] }`).

## Gotchas

- Profile release builds. Debug builds have very different hot spots (bounds checks, no inlining) and will send you after the wrong code.
- Benchmarks on a laptop are noisy. Close other programs and treat small changes (a few percent) with suspicion even when Criterion calls them significant.
- A micro-benchmark can improve while the whole program doesn't. Re-profile the full program after a fix.

## Further reading

- [The Rust Performance Book: Profiling](https://nnethercote.github.io/perf-book/profiling.html)
- [Criterion.rs user guide](https://criterion-rs.github.io/book/)
- [cargo-flamegraph](https://github.com/flamegraph-rs/flamegraph)
