---
title: "Rust's Threads: Building a Program to Calculate Pi Using Multithreading"
description: In this article, we will learn how to calculate pi using Rust's threads and the Monte Carlo method.
pubDate: Saturday, 26 December 2024 13:00:00 GMT
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3611036737.png'
---

# Rust's Threads: Building a Program to Calculate Pi Using Multithreading
Rust is a systems programming language that emphasizes safety, performance, and concurrency. One of the powerful features of Rust is its support for multithreading, which allows you to run multiple threads concurrently and take full advantage of multi-core processors. In this article, we'll explore how to build a program in Rust that uses threads to perform a computationally-intensive task—calculating the value of pi—and returns the result to the user.

## Introducing Threads in Rust
Rust provides a built-in module called std::thread to work with threads. It offers a simple and safe API to spawn and manage threads. To create a new thread, you can use the thread::spawn function, which takes a closure as an argument and returns a JoinHandle. The JoinHandle allows you to wait for the thread to finish and retrieve its result using the join method.

## Calculating Pi Using the Monte Carlo Method
One way to calculate pi is by using the Monte Carlo method, a statistical approach that relies on random sampling. The algorithm is based on the ratio of the areas of a square and a circle inscribed within the square. We'll use this method in our example program.

## The Program
Here's a step-by-step guide to building a Rust program that calculates pi using threads and the Monte Carlo method:

1. Import relevant libraries

First, import the necessary modules:

```rust
use std::thread;
use std::sync::{Arc, Mutex};
use rand::Rng;
```

We'll use the rand crate for generating random numbers, so be sure to add it to your Cargo.toml:
```rust
[dependencies]
rand = "0.8"
```

2. Define the Monte Carlo function

Create a function called monte_carlo_pi that takes the number of iterations as a parameter and returns an estimate of pi:

```rust
fn monte_carlo_pi(iterations: u64) -> f64 {
    let mut rng = rand::thread_rng();
    let mut in_circle = 0;

    for _ in 0..iterations {
        let x: f64 = rng.gen_range(-1.0..=1.0);
        let y: f64 = rng.gen_range(-1.0..=1.0);

        if x * x + y * y <= 1.0 {
            in_circle += 1;
        }
    }

    4.0 * (in_circle as f64) / (iterations as f64)
}
```

3. Create a function to spawn threads and calculate pi

Define a function called calculate_pi that takes the number of iterations and the number of threads as parameters. This function will spawn the specified number of threads, divide the iterations among the threads, and calculate pi using the monte_carlo_pi function:

```rust
fn calculate_pi(iterations: u64, num_threads: usize) -> f64 {
    let iterations_per_thread = iterations / num_threads as u64;

    let result = Arc::new(Mutex::new(0.0));

    let mut join_handles = vec![];

    for _ in 0..num_threads {
        let result_clone = Arc::clone(&result);
        let handle = thread::spawn(move || {
            let pi_estimate = monte_carlo_pi(iterations_per_thread);
            let mut result_lock = result_clone.lock().unwrap();
            *result_lock += pi_estimate;
        });

        join_handles.push(handle);
    }

    for handle in join_handles {
        handle.join().unwrap();
    }

    let result_lock = result.lock().unwrap();
    *result_lock / num_threads as f64
}
```

Note the use of Arc (Atomic Reference Counting) and Mutex (Mutual Exclusion) to safely share and mutate the result across threads.

4. Call the calculate_pi function in the main function

Finally, call the calculate_pi function in the main function, providing the desired number of iterations and threads:

```rust
fn main() {
    let iterations = 1_000_000;
    let num_threads = 8;

    let pi_estimate = calculate_pi(iterations, num_threads);
    println!("Estimated value of pi: {:.6}", pi_estimate);
}
```

Now you have a Rust program that calculates the value of pi using threads and the Monte Carlo method. You can adjust the number of iterations and threads to see how they affect the accuracy and performance of the calculation. Keep in mind that increasing the number of threads may improve performance on multi-core processors, but it may also introduce overhead due to context switching and synchronization.