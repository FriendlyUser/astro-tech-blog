---
title: Rust's borrowing rules
description: In this article, we will explore Rust's borrowing rules by building a program that uses a borrowed reference to a vector of integers to determine the average value of the integers.
pubDate: Saturday, 24 December 2024 13:00:00 GMT
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

Rust is a modern programming language that was designed with safety, concurrency, and performance in mind. One of the features that sets Rust apart from other programming languages is its borrowing rules, which ensure that programs are memory-safe and free from data races. In this article, we will explore Rust's borrowing rules by building a program that uses a borrowed reference to a vector of integers to determine the average value of the integers.

Rust's borrowing rules: Build a program that uses a borrowed reference to a vector of integers to determine the average value of the integers.

Let's start by creating a new Rust project using the cargo tool. Open a terminal window and run the following command:

```rust
cargo new average
```
This will create a new Rust project called average in a directory with the same name. Next, we will define a main function in the src/main.rs file that will prompt the user for a list of integers, compute the average of those integers, and print the result. Here's what the main function should look like:

```rust
use std::io;

fn main() {
    let mut nums = Vec::new();

    loop {
        let mut input = String::new();

        println!("Enter a number (or \"done\" to finish):");

        io::stdin()
            .read_line(&mut input)
            .expect("Failed to read line");

        if input.trim() == "done" {
            break;
        }

        let num: i32 = match input.trim().parse() {
            Ok(num) => num,
            Err(_) => {
                println!("Invalid input, please try again");
                continue;
            }
        };

        nums.push(num);
    }

    let sum: i32 = nums.iter().sum();
    let count = nums.len();

    let average = if count > 0 {
        sum / count as i32
    } else {
        0
    };

    println!("The average is: {}", average);
}
```

Let's go over this code and explain how Rust's borrowing rules work.

The main function starts by creating a new Vec called nums to store the user's input. We use a loop to repeatedly prompt the user for input until they enter the string "done". Each time through the loop, we read a line of input from the user using the read_line method of the io::stdin object. This method takes a mutable reference to a String as an argument, which allows it to store the user's input in the string.

Next, we check if the input is equal to "done". If it is, we break out of the loop. Otherwise, we parse the input as an i32 using the parse method of the String type. This method returns a Result that contains the parsed integer if successful, or an error if the input is not a valid integer. We use a match expression to handle these two cases. If parsing is successful, we add the integer to the nums vector using the push method. If parsing fails, we print an error message and continue with the next iteration of the loop.

After the loop finishes, we use the iter method of the Vec type to create an iterator over the elements of the vector. We then use the sum method of the Iterator trait to compute the sum of the integers. We also use the len method of the Vec type to get the number of elements in the vector.

To compute the average, we first check if the number of elements is greater than zero. If it is, we compute the average as the sum divided by the number of elements. We use the as keyword to convert the length to an i32, which allows us to perform integer division.