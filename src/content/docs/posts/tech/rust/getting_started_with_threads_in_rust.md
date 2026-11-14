---
title: Estimating pi with threads in Rust using the Monte Carlo method
description: "Split a Monte Carlo estimate of pi across std::thread workers, collect results through JoinHandle, and compare with sharing state via Arc and Mutex."
pubDate: Saturday, 26 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3611036737.png'
---

Estimating pi by random sampling is a good first multithreading exercise: the work splits evenly, each chunk is independent, and the only coordination is adding the results at the end. This post builds it with `std::thread`, then shows the `Arc<Mutex<_>>` variant for when threads have to write into shared state.

## The Monte Carlo method

Pick random points in the square from (-1, -1) to (1, 1). The unit circle inside it has area π and the square has area 4, so the fraction of points that land inside the circle approaches π / 4. Multiply that fraction by 4 and you have an estimate of π. The error shrinks roughly with 1/√n, so each extra correct digit costs about 100 times more samples.

## Setup

```bash
cargo new pi_threads
cd pi_threads
cargo add rand
```

This post uses rand 0.10. `cargo add` writes the current version into `Cargo.toml`:

```toml
[dependencies]
rand = "0.10"
```

rand 0.9 renamed `thread_rng()` to `rng()` and `gen_range` to `random_range`, and 0.10 moved those methods to the `RngExt` trait. Older examples using `rand::thread_rng().gen_range(..)` won't compile against current rand.

## Counting hits in one thread

Each worker counts how many of its samples fall inside the circle. Returning the hit count (rather than a per-thread estimate of π) keeps the final combination exact even when threads get different numbers of samples.

```rust
use rand::RngExt;

fn count_hits(samples: u64) -> u64 {
    let mut rng = rand::rng(); // thread-local generator, one per thread
    let mut hits = 0;
    for _ in 0..samples {
        let x: f64 = rng.random_range(-1.0..=1.0);
        let y: f64 = rng.random_range(-1.0..=1.0);
        if x * x + y * y <= 1.0 {
            hits += 1;
        }
    }
    hits
}
```

## Spawning threads and joining results

`thread::spawn` takes a closure and returns a `JoinHandle<T>`, where `T` is whatever the closure returns. `join()` blocks until that thread finishes and gives back `Result<T, _>` (an `Err` means the thread panicked). That's all the communication this program needs, so there's no shared state at all.

```rust
use std::thread;

fn estimate_pi(samples: u64, num_threads: u64) -> f64 {
    let per_thread = samples / num_threads;
    let remainder = samples % num_threads;

    let handles: Vec<_> = (0..num_threads)
        .map(|i| {
            // Give the leftover samples to the first thread so none are dropped.
            let n = if i == 0 { per_thread + remainder } else { per_thread };
            thread::spawn(move || count_hits(n))
        })
        .collect();

    let hits: u64 = handles
        .into_iter()
        .map(|h| h.join().expect("worker thread panicked"))
        .sum();

    4.0 * hits as f64 / samples as f64
}

fn main() {
    let samples = 100_000_000;
    let num_threads = thread::available_parallelism()
        .map(|n| n.get() as u64)
        .unwrap_or(4);

    let pi = estimate_pi(samples, num_threads);
    println!("{num_threads} threads, {samples} samples: pi ≈ {pi:.6}");
}
```

Build with `cargo run --release`. Debug builds are many times slower for tight loops like this one, which hides the effect of adding threads.

`available_parallelism()` returns an estimate of how many threads can run at once (usually the number of logical CPUs). Spawning more threads than that won't make a CPU-bound job like this faster; the extra threads just take turns on the same cores.

## Sharing state with `Arc<Mutex<T>>`

If the threads need to update one value as they go rather than return a result, wrap it in a `Mutex` for exclusive access and an `Arc` so each thread can own a reference to it:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn estimate_pi_shared(samples: u64, num_threads: u64) -> f64 {
    let per_thread = samples / num_threads;
    let total_hits = Arc::new(Mutex::new(0u64));

    let handles: Vec<_> = (0..num_threads)
        .map(|_| {
            let total_hits = Arc::clone(&total_hits);
            thread::spawn(move || {
                let hits = count_hits(per_thread);
                *total_hits.lock().unwrap() += hits;
            })
        })
        .collect();

    for h in handles {
        h.join().unwrap();
    }

    let hits = *total_hits.lock().unwrap();
    4.0 * hits as f64 / (per_thread * num_threads) as f64
}
```

Each thread locks once, at the end, so contention is negligible. Locking inside the sampling loop would make it slower than the single-threaded version. For a plain counter, `AtomicU64` with `fetch_add` does the same job without a lock.

## Further reading

- [`std::thread` documentation](https://doc.rust-lang.org/std/thread/)
- [Fearless Concurrency, The Rust Programming Language, chapter 16](https://doc.rust-lang.org/book/ch16-00-concurrency.html)
- [`std::thread::scope`](https://doc.rust-lang.org/std/thread/fn.scope.html), for threads that borrow local data instead of needing `move` and `Arc`
- [rand on docs.rs](https://docs.rs/rand)
