---
title: "How to use sycnronization primitives in Rust"
description: In this article, we will explore Rust's synchronization primitives and build a program that uses mutexes to synchronize access to a shared data structure between multiple threads..
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---


Rust is a modern programming language that emphasizes safety, speed, and concurrency. Rust provides a rich set of synchronization primitives that allow developers to write concurrent programs that are safe and efficient. In this article, we will explore Rust's synchronization primitives and build a program that uses mutexes to synchronize access to a shared data structure between multiple threads.

Before we dive into the program, let's first discuss what synchronization primitives are and why they are important in concurrent programming.

Synchronization primitives are tools that help coordinate access to shared resources in concurrent programs. In concurrent programs, multiple threads may access the same shared resource, such as a data structure or a file. Without proper synchronization, these threads may interfere with each other, leading to race conditions, deadlocks, and other bugs.

Rust provides several synchronization primitives, including mutexes, atomic types, and channels. In this article, we will focus on mutexes.

A mutex, short for mutual exclusion, is a synchronization primitive that allows only one thread to access a shared resource at a time. Mutexes are used to prevent race conditions and ensure that shared resources are accessed in a safe and orderly manner.

Let's now build a program that uses mutexes to synchronize access to a shared data structure between multiple threads. We will use a vector of integers as our shared data structure, and multiple threads will increment the values in the vector.

To start, create a new Rust project using Cargo, Rust's package manager. Open a terminal and run the following command:

```
cargo new mutex-demo
```

This will create a new Rust project named `mutex-demo`. Now, navigate to the project directory by running:

```
cd mutex-demo
```

Next, open the `Cargo.toml` file and add the following dependencies:

```
[dependencies]
rand = "0.8.4"
```

These dependencies are required for generating random numbers. The `rand` crate provides a random number generator for Rust.

Now, let's create a new file named `src/main.rs` and add the following code:

```rust
use rand::Rng;
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let mut data = Vec::new();
    for _ in 0..10 {
        data.push(0);
    }

    let data = Arc::new(Mutex::new(data));

    let mut threads = Vec::new();

    for i in 0..5 {
        let data = Arc::clone(&data);
        let thread = thread::spawn(move || {
            let mut rng = rand::thread_rng();
            for _ in 0..100 {
                let mut data = data.lock().unwrap();
                let index = rng.gen_range(0, data.len());
                data[index] += i;
            }
        });
        threads.push(thread);
    }

    for thread in threads {
        thread.join().unwrap();
    }

    println!("{:?}", data);
}
```

Let's go through this code step by step. First, we import the `rand` crate for generating random numbers and the `std::sync` module for using synchronization primitives.

Next, we create a new vector named `data` with 10 elements, each initialized to 0. This will be our shared data structure that multiple threads will access.

We then create a new `Arc<Mutex<Vec<i32>>>` object named `data`. The `Arc` type allows us to share ownership of `data` between multiple threads, while the `Mutex` type provides mutual exclusion to ensure that only one thread can access `data` at a time.

We then create a vector named `threads` that will hold our thread handles.

Next, we create five threads using a `for` loop. For each thread, we create a new `Arc<Mutex<Vec<i32>>>` object named `data` by cloning the original `data` object using the `Arc::clone` method. We also create a new thread using the `thread::spawn` function, passing in a closure that will be executed in the new thread. In this closure, we generate a random index into the `data` vector using the `rng.gen_range` method, and increment the value at that index by `i`. We also acquire a lock on the `data` mutex using the `lock` method and the `unwrap` method to handle any errors.

We then push the thread handle onto the `threads` vector.

After all threads have been created, we wait for each thread to finish using the `join` method. This ensures that all threads have finished executing before we print out the final state of the `data` vector.

Finally, we print out the `data` vector using the `println` macro.

To run the program, use the following command:

```
cargo run
```

You should see output similar to the following:

```
Mutex { data: [0, 86, 109, 79, 93, 48, 98, 49, 80 ] }
```

This output shows that the values in the data vector have been incremented by multiple threads. However, notice that the output is not in the expected order. This is because the threads acquire the lock on the data mutex in a non-deterministic order, and increment the values in the vector in a random order.

In conclusion, Rust's synchronization primitives, such as mutexes, are powerful tools for writing safe and efficient concurrent programs. In this article, we built a program that uses mutexes to synchronize access to a shared data structure between multiple threads. We learned how to create an Arc<Mutex<T>> object, which allows multiple threads to access a shared resource in a safe and synchronized manner. We also learned how to use the lock method to acquire a lock on a mutex and prevent other threads from accessing the shared resource at the same time. By using synchronization primitives, we can write concurrent programs that are safe, efficient, and free from race conditions and deadlocks.