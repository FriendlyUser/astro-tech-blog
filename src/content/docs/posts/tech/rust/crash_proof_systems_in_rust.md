---
tags: ['rust', 'reliable']
title: How Rust's compiler helps you build reliable programs (and where it can't)
description: "Rust features that remove whole classes of bugs: ownership and borrowing, Result and Option, exhaustive match, and thread-safe sharing, plus what Rust doesn't prevent."
pubDate: Fri, 10 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1246994641.png"
---

Rust is a compiled, statically typed systems language whose compiler rejects several kinds of bugs that C and C++ only catch at runtime, if at all: use-after-free, dangling references, and data races. No language makes a program "crash-proof", but Rust moves a lot of failure modes from production to compile time. This post walks through the features that do that, and ends with the failures Rust still allows.

Rust was announced by Mozilla in 2010; version 1.0 shipped in May 2015.

## Ownership and borrowing

Every value has one owner. When the owner goes out of scope the value is dropped, so you never call `free` yourself and can't free something twice.

The borrow checker enforces one rule at compile time: at any moment you can have either one mutable reference to a value or any number of shared references, but not both. That rule is what rules out dangling references and data races in safe code.

```rust
fn main() {
    let mut data = vec![1, 2, 3, 4, 5];
    double_all(&mut data);
    // The mutable borrow ended when double_all returned, so `data` is usable again.
    println!("{:?}", data); // [2, 4, 6, 8, 10]
}

fn double_all(data: &mut Vec<i32>) {
    for x in data.iter_mut() {
        *x *= 2;
    }
}
```

Try holding a reference into the vector (`let first = &data[0];`) across the `double_all(&mut data)` call and printing it afterwards: the code no longer compiles, because the push-or-reallocate that a `&mut Vec` allows could leave `first` dangling.

## Errors are values: `Result` and `Option`

Rust has no exceptions and no null references. A function that can fail returns `Result<T, E>`; a value that might be absent is an `Option<T>`. The compiler won't let you use the `T` inside without dealing with the other case, and an ignored `Result` triggers a `#[must_use]` warning.

```rust
use std::fs;
use std::io;

fn read_config(path: &str) -> Result<String, io::Error> {
    let text = fs::read_to_string(path)?; // `?` returns the error to the caller
    Ok(text.trim().to_string())
}

fn main() {
    match read_config("example.txt") {
        Ok(config) => println!("config: {config}"),
        Err(error) => eprintln!("could not read config: {error}"),
    }
}
```

The escape hatch is `unwrap()` / `expect()`, which turn an error into a panic. They're fine in tests and prototypes; in long-running services, grep for them.

## Exhaustive `match` on enums

Enums can carry data, and `match` must cover every variant. If you add a variant later, every `match` that doesn't handle it stops compiling, so you can't forget a state.

```rust
enum State {
    Initializing,
    Running(u64), // number of tasks
    Terminating,
}

fn describe(state: &State) -> String {
    match state {
        State::Initializing => "System is initializing.".to_string(),
        State::Running(count) => format!("System is running with {count} tasks."),
        State::Terminating => "System is terminating.".to_string(),
    }
}

fn main() {
    println!("{}", describe(&State::Running(42)));
}
```

## Sharing data between threads

The `Send` and `Sync` marker traits tell the compiler which types can move to or be shared with another thread. `Rc<T>` isn't `Send`, so trying to pass one to `thread::spawn` is a compile error; you have to use `Arc<T>`, and to mutate shared data you wrap it in a `Mutex` (or use an atomic type).

### `Arc<Mutex<T>>`

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap()); // Result: 10
}
```

`lock()` returns an error only if another thread panicked while holding the lock (the mutex is "poisoned"), which is why `unwrap()` is the usual choice here. For a simple counter, `std::sync::atomic::AtomicUsize` avoids the lock entirely.

### Channels

`std::sync::mpsc` (multiple producer, single consumer) lets threads pass ownership of values instead of sharing them. Once a value is sent, the sending thread can't touch it again, which the compiler checks.

```rust
use std::sync::mpsc;
use std::thread;

fn main() {
    let (tx, rx) = mpsc::channel();

    let handle = thread::spawn(move || {
        let val = String::from("Hello from the thread");
        tx.send(val).unwrap();
        // println!("{val}"); // compile error: `val` was moved into send()
    });

    let received = rx.recv().unwrap();
    println!("Received: {received}");

    handle.join().unwrap();
}
```

## What Rust does not prevent

Knowing the limits matters as much as knowing the guarantees:

- **Panics are still crashes.** `unwrap()` on `None`/`Err`, out-of-bounds indexing (`v[10]`), division by zero, and `RefCell` borrow conflicts all panic at runtime. Bounds are checked, so you get a panic instead of a buffer overflow, but the thread still dies. Integer overflow panics in debug builds and wraps silently in release builds by default.
- **Memory leaks are safe.** `Box::leak`, `std::mem::forget`, and `Rc`/`Arc` reference cycles all leak without any `unsafe`.
- **Deadlocks and race conditions.** The compiler prevents data races (unsynchronised access to the same memory), not logic races or two threads locking two mutexes in opposite order.
- **`unsafe` code and FFI.** The guarantees only hold for safe Rust. Bugs inside `unsafe` blocks or C libraries you call can still corrupt memory.

## Further reading

- [The Rust Programming Language: Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [The Rust Programming Language: Fearless Concurrency](https://doc.rust-lang.org/book/ch16-00-concurrency.html)
- [The Rustonomicon: what unsafe Rust can and can't do](https://doc.rust-lang.org/nomicon/)
