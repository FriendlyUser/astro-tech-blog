---
title: "Concurrency and parallelism in Rust: threads, channels, atomics, locks and Rayon"
pubDate: "2025-03-21T00:02:41.000Z"
lastUpdated: 2026-11-14
description: "Working examples of Rust's standard concurrency tools (threads, scoped threads, channels, atomics, Mutex, RwLock) and data parallelism with Rayon."
tags:
  - rust
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1373682361.png
---

Rust's selling point for concurrent code is that data races are compile-time errors. You still use threads, locks and channels like in other languages, but the type system (through the `Send` and `Sync` traits and the borrow checker) refuses to compile code that shares data between threads unsafely. This post goes through the standard library's tools and then Rayon for data parallelism.

A quick definition: *concurrency* is structuring a program as several tasks whose lifetimes overlap; *parallelism* is actually running work at the same time on several cores. Threads give you both. Async Rust (Tokio and similar) is a third option for I/O-heavy concurrency and isn't covered here.

## Threads

`std::thread::spawn` runs a closure on a new OS thread and returns a `JoinHandle`. Call `join` to wait for it; if you don't, the thread is cut off when `main` returns.

```rust
use std::thread;
use std::time::Duration;

fn main() {
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("thread: {i}");
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("main: {i}");
        thread::sleep(Duration::from_millis(1));
    }

    handle.join().unwrap();
}
```

The output interleaves differently on each run. `join` returns `Err` if the thread panicked, which is why it's unwrapped here.

A spawned thread can outlive the function that created it, so its closure must own everything it uses (`move`) and the data must be `'static`. When you just want to split work over some local data and wait for it, **scoped threads** (stable since Rust 1.63) are simpler: every thread is joined before `thread::scope` returns, so they can borrow local variables.

```rust
use std::thread;

fn main() {
    let numbers: Vec<u64> = (1..=1_000).collect();
    let (left, right) = numbers.split_at(numbers.len() / 2);

    let (a, b) = thread::scope(|s| {
        let h1 = s.spawn(|| left.iter().sum::<u64>());
        let h2 = s.spawn(|| right.iter().sum::<u64>());
        (h1.join().unwrap(), h2.join().unwrap())
    });

    println!("sum = {}", a + b); // 500500
}
```

No `Arc`, no cloning: the borrow checker knows `numbers` outlives both threads.

## Channels

`std::sync::mpsc` ("multiple producer, single consumer") passes values between threads. Sending moves ownership of the value to the receiver, so the sender can't touch it afterwards.

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    for id in 0..3 {
        let tx = tx.clone();
        thread::spawn(move || {
            tx.send(format!("hello from worker {id}")).unwrap();
        });
    }
    drop(tx); // drop the original sender so the loop below can end

    for msg in rx {
        println!("{msg}");
    }
}
```

Iterating over `rx` ends once every `Sender` has been dropped. Forgetting the `drop(tx)` is a common bug: the main thread waits forever because it's still holding a sender itself.

## Shared state with `Arc` and `Mutex`

To share data that several threads modify, wrap it in a `Mutex` and share the mutex with `Arc` (an atomically reference-counted pointer). `lock()` returns a guard that unlocks when it goes out of scope.

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..1000 {
                *counter.lock().unwrap() += 1;
            }
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Counter: {}", *counter.lock().unwrap()); // 10000
}
```

If you try this with `Rc` instead of `Arc`, or a plain integer instead of a `Mutex`, it doesn't compile. That's the "fearless" part: the compiler catches the unsafe version. It doesn't prevent deadlocks or logic bugs, though, so you still need to think about lock ordering.

`lock()` returns `Err` if another thread panicked while holding the lock (the mutex is "poisoned"); unwrapping is fine for examples.

### `RwLock`

`RwLock` allows many readers at once or one writer. It helps when reads are much more common than writes:

```rust
use std::sync::{Arc, RwLock};
use std::thread;

fn main() {
    let data = Arc::new(RwLock::new(vec![0; 10]));
    let mut handles = vec![];

    for _ in 0..5 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let mut v = data.write().unwrap();
            for x in v.iter_mut() {
                *x += 1;
            }
        }));
    }

    for _ in 0..5 {
        let data = Arc::clone(&data);
        handles.push(thread::spawn(move || {
            let v = data.read().unwrap();
            println!("Read data: {:?}", *v);
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }
}
```

The readers may print the vector at different stages, since nothing orders them relative to the writers.

## Atomics

For a single counter or flag, an atomic type from `std::sync::atomic` avoids a lock entirely:

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            for _ in 0..1000 {
                counter.fetch_add(1, Ordering::Relaxed);
            }
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Counter: {}", counter.load(Ordering::Relaxed)); // 10000
}
```

`Ordering::Relaxed` is enough for a standalone counter, because nothing else depends on the order of the increments, and `join` already makes all the threads' writes visible to `main`. Use `Acquire`/`Release` (or `SeqCst` if unsure) when an atomic guards other data, for example a "ready" flag that says another value has been written. Once you have more than one value to keep consistent, a `Mutex` is usually easier to get right.

## Data parallelism with Rayon

[Rayon](https://docs.rs/rayon) is the standard crate for CPU-bound parallel loops. It runs work on a global thread pool sized to the number of CPUs and balances it with work stealing. In many cases you switch `iter()` to `par_iter()` and you're done.

```toml
[dependencies]
rayon = "1.12"
```

```rust
use rayon::prelude::*;

fn main() {
    let input: Vec<u64> = (0..100_000).collect();

    let squares: Vec<u64> = input.par_iter().map(|&x| x * x).collect();
    let sum_of_squares: u64 = input.par_iter().map(|&x| x * x).sum();

    println!("first five: {:?}", &squares[..5]);
    println!("sum of squares: {sum_of_squares}");
}
```

The element type matters here: with Rust's default `i32`, `99_999 * 99_999` overflows (and panics in a debug build), so the input is `u64`. `collect` keeps the original order even though the work is split across threads.

Rayon is a good fit when each item does a meaningful amount of CPU work. For something as cheap as squaring a number, the overhead of splitting the work can make the parallel version no faster than a plain loop, so measure before and after. It's also the wrong tool for blocking I/O, which would tie up the pool's threads.

## Picking a tool

- One-off background work, or a few long-running threads: `thread::spawn`.
- Split work over local data and wait for all of it: `thread::scope`.
- Pipelines and worker queues: channels (the `crossbeam-channel` crate adds multi-consumer channels and `select!`).
- A shared counter or flag: atomics.
- Shared structured data: `Arc<Mutex<T>>` or `Arc<RwLock<T>>`.
- Parallel loops over collections: Rayon.

## Further reading

- [The Rust Book, chapter 16: Fearless Concurrency](https://doc.rust-lang.org/book/ch16-00-concurrency.html)
- [`std::thread::scope`](https://doc.rust-lang.org/std/thread/fn.scope.html)
- [Rayon documentation](https://docs.rs/rayon/latest/rayon/)
