---
title: "Sharing data between threads in Rust with Arc and Mutex"
description: "Use Arc<Mutex<T>> to let several threads update one Vec safely, plus when an atomic or a channel is the better synchronization primitive."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

When several threads need to change the same data, Rust won't compile the program until you say how that access is coordinated. The standard library gives you a few tools for this in `std::sync`: `Mutex` and `RwLock` for locking, atomic types for single values, and channels (`mpsc`) for passing data instead of sharing it.

This post builds a small program where five threads update one shared `Vec` through an `Arc<Mutex<Vec<i32>>>`.

## What `Arc` and `Mutex` each do

- `Mutex<T>` allows one thread at a time to access the `T` inside. `lock()` blocks until the lock is free and returns a guard; the lock is released when the guard is dropped.
- `Arc<T>` is a reference-counted pointer that is safe to share across threads. A `Mutex` on its own can't be moved into several threads, so you wrap it in an `Arc` and give each thread a clone of the `Arc`.

Without the `Mutex`, the compiler rejects mutation through an `Arc`. Without the `Arc`, the compiler rejects moving the same value into more than one `thread::spawn` closure.

## Project setup

```sh
cargo new mutex-demo
cd mutex-demo
cargo add rand
```

The `rand` crate is only used to pick a random index. This example was written against `rand` 0.10, where `rand::random_range` uses the thread-local generator.

## The program

Replace `src/main.rs` with:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Ten counters, all starting at zero.
    let data = Arc::new(Mutex::new(vec![0; 10]));

    let mut handles = Vec::new();

    for i in 0..5 {
        let data = Arc::clone(&data);
        let handle = thread::spawn(move || {
            for _ in 0..100 {
                let mut data = data.lock().unwrap();
                let index = rand::random_range(0..data.len());
                data[index] += i;
            } // the guard is dropped here each iteration, releasing the lock
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    let data = data.lock().unwrap();
    let total: i32 = data.iter().sum();
    println!("{:?}", *data);
    println!("total = {total}");
}
```

How it works:

1. `vec![0; 10]` is the shared data, moved into a `Mutex` and then into an `Arc`.
2. Each loop iteration clones the `Arc` (this only increments a reference count) and moves the clone into a new thread.
3. Inside the thread, `data.lock()` returns a `MutexGuard`, which dereferences to the `Vec`. The guard is created inside the inner `for` loop, so the lock is held for one update at a time and the threads interleave.
4. `lock()` returns a `Result` because a mutex becomes *poisoned* if a thread panics while holding it. `unwrap()` is fine for a demo; in real code decide whether to propagate the error or recover the data with `into_inner()` on the `PoisonError`.
5. After `join()`ing every thread, `main` locks the mutex one last time to print the result.

## Running it

```sh
cargo run
```

The distribution changes on every run, because the indices are random and the threads are scheduled in a different order each time:

```text
[93, 112, 105, 87, 120, 96, 101, 94, 88, 104]
total = 1000
```

The total is always 1000: thread `i` adds `i` a hundred times, and `100 × (0 + 1 + 2 + 3 + 4) = 1000`. That fixed total is the point of the mutex. No update is lost even though five threads are writing to the same `Vec`.

Print `*data` (the `Vec` behind the guard) rather than the `Arc` itself. Debug-printing `Arc<Mutex<_>>` gives you something like `Mutex { data: [...], poisoned: false, .. }`.

## Gotchas and alternatives

- **Keep critical sections short.** Holding a guard across slow work (I/O, sleeping, another lock) blocks every other thread. If you need the value after unlocking, copy it out and drop the guard first.
- **Lock ordering.** If code ever holds two mutexes at once, always take them in the same order, or two threads can deadlock waiting on each other. Rust's type system prevents data races, but not deadlocks.
- **Atomics for single numbers.** If the shared state is a single counter, `AtomicUsize::fetch_add` avoids locking entirely.
- **`RwLock` for read-heavy data.** It allows many readers or one writer at a time.
- **Scoped threads.** If the threads don't outlive the function, `std::thread::scope` lets them borrow a `Mutex` from the stack, so you don't need the `Arc`.
- **Channels.** If threads only produce results for one consumer, sending values over `std::sync::mpsc` is often simpler than sharing a structure.

## Further reading

- [`std::sync` module docs](https://doc.rust-lang.org/std/sync/index.html)
- [The Rust Book: Shared-State Concurrency](https://doc.rust-lang.org/book/ch16-03-shared-state.html)
