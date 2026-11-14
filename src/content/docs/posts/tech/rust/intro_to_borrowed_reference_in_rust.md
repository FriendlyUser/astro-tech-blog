---
title: "Rust borrowing rules by example: averaging a Vec through a shared reference"
description: A small Rust program that reads integers from stdin and averages them through a borrowed slice, showing shared and mutable borrows and the compile error you get when they overlap.
pubDate: Saturday, 24 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

Every value in Rust has one owner. Other code can use the value without taking ownership by *borrowing* it through a reference, and the compiler enforces two rules on those references:

1. At any moment you can have **either** one mutable reference (`&mut T`) **or** any number of shared references (`&T`), not both.
2. A reference must never outlive the value it points to.

These rules are checked at compile time and are what rule out data races and dangling pointers in safe Rust. This post builds a small program that reads integers from the user and averages them, passing the vector to a function by reference.

## Setup

```bash
cargo new average
cd average
```

## The program

`src/main.rs`:

```rust
use std::io;

/// Average of the numbers, or None if there aren't any.
fn average(nums: &[i32]) -> Option<f64> {
    if nums.is_empty() {
        return None;
    }
    let sum: i64 = nums.iter().map(|&n| i64::from(n)).sum();
    Some(sum as f64 / nums.len() as f64)
}

fn main() {
    let mut nums: Vec<i32> = Vec::new();

    loop {
        println!("Enter a number (or \"done\" to finish):");

        let mut input = String::new();
        let bytes = io::stdin()
            .read_line(&mut input)
            .expect("Failed to read line");

        // 0 bytes means end of input (Ctrl+D / Ctrl+Z, or a closed pipe)
        if bytes == 0 || input.trim() == "done" {
            break;
        }

        match input.trim().parse::<i32>() {
            Ok(num) => nums.push(num),
            Err(_) => println!("Invalid input, please try again"),
        }
    }

    match average(&nums) {
        Some(avg) => println!("The average of {} numbers is {avg:.2}", nums.len()),
        None => println!("No numbers entered"),
    }
}
```

Running it:

```text
Enter a number (or "done" to finish):
1
Enter a number (or "done" to finish):
2
Enter a number (or "done" to finish):
done
The average of 2 numbers is 1.50
```

## Where the borrows are

**`read_line(&mut input)`** takes a mutable borrow of `input` so it can append the line to it. While that call runs, nothing else can read or write `input`. When it returns, the borrow ends and `main` can use `input` again (`input.trim()`).

**`nums.push(num)`** also borrows `nums` mutably, just for the duration of the call. `push` takes `&mut self`, and Rust inserts the `&mut` for you.

**`average(&nums)`** passes a shared borrow. The function signature takes `&[i32]`, a slice, and `&Vec<i32>` converts to it automatically (deref coercion). Taking a slice instead of `&Vec<i32>` means the same function also works on arrays and parts of vectors. Because it's a shared borrow:

- `average` can read the numbers but can't modify them. Calling `nums.push(0)` inside it would not compile.
- `main` still owns `nums`, so it can use `nums.len()` afterwards. If `average` took `Vec<i32>` by value, `nums` would be moved into it and unusable after the call.

Two small correctness fixes compared with a naive version: the sum is accumulated as `i64`, so adding many large `i32` values can't overflow, and the division is done in floating point, so the average of 1 and 2 is 1.5 rather than 1.

## Breaking the rules on purpose

Here's what rule 1 looks like when you break it. Holding a shared reference into the vector while pushing to it:

```rust
fn main() {
    let mut nums = vec![1, 2, 3];
    let first = &nums[0];   // shared borrow starts
    nums.push(4);           // needs a mutable borrow
    println!("{first}");    // shared borrow still in use here
}
```

fails with:

```text
error[E0502]: cannot borrow `nums` as mutable because it is also borrowed as immutable
```

This isn't the compiler being fussy. `push` may need to reallocate the vector's buffer, which would leave `first` pointing at freed memory, a classic use-after-free bug in C++. Move the `println!` above the `push` and it compiles: the compiler sees that `first` is no longer used, so the shared borrow has ended before the mutable one starts.

## Further reading

- [References and Borrowing in The Rust Programming Language](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html)
- [The Slice Type](https://doc.rust-lang.org/book/ch04-03-slices.html)
