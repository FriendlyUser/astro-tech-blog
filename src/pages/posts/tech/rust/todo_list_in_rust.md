---
tags: ['rust']
title: Todo list in Rust
description:  Rust is a systems programming language that is designed for speed, safety, and concurrency. It provides low-level control over hardware resources while ensuring memory safety and preventing common programming errors.
pubDate: Fri, 21 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/267929881.png"
---



Introduction

To-do lists are an essential tool for organizing and managing tasks. In this article, we will explore how to create a simple to-do list application in Rust. Rust is a systems programming language that is designed for speed, safety, and concurrency. It provides low-level control over hardware resources while ensuring memory safety and preventing common programming errors.

In this tutorial, we will use Rust and the Rust standard library to create a command-line interface (CLI) to-do list application. The application will allow users to add, remove, and view tasks in a list.

Setting up the Project

Before we get started, we need to set up a new Rust project. To create a new Rust project, open a terminal window and run the following command:

```
$ cargo new todo_list
```

This command will create a new Rust project named `todo_list`. The project will contain a `Cargo.toml` file that describes the project's dependencies and a `src` directory that contains the project's source code.

The `Cargo.toml` file will look like this:

```toml
[package]
name = "todo_list"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2018"

[dependencies]
```

We will add dependencies to the `Cargo.toml` file as we need them.

Creating the CLI Interface

To create a CLI interface for our to-do list application, we will use the Rust standard library's `std::io` module. This module provides functions and types for working with input and output.

We will create a function named `run` that will handle the user's input and output. The function will loop indefinitely until the user enters the `quit` command.

Let's start by creating a skeleton of the `run` function:

```rust
fn run() {
    loop {
        // Get user input
        // Handle user input
    }
}
```

In the `run` function, we will use the `std::io` module's `stdin()` function to get user input from the command line. We will use the `read_line()` function to read a line of text from the user.

```rust
use std::io;

fn run() {
    loop {
        let mut input = String::new();

        io::stdin().read_line(&mut input).unwrap();

        // Handle user input
    }
}
```

The `read_line()` function reads the user's input and stores it in the `input` variable. The `&mut` operator is used to pass a mutable reference to the `input` variable to the `read_line()` function.

Handling User Input

Now that we can get user input, we need to handle it. We will create a `match` statement to handle the user's input. The `match` statement will match the user's input to a command and call the appropriate function.

```rust
fn run() {
    let mut todo_list = Vec::new();

    loop {
        let mut input = String::new();

        io::stdin().read_line(&mut input).unwrap();

        let command = input.trim();

        match command {
            "quit" => break,
            "list" => list_tasks(&todo_list),
            "add" => add_task(&mut todo_list),
            "remove" => remove_task(&mut todo_list),
            _ => println!("Unknown command: {}", command),
        }
    }
}
```

In this `match` statement, we match the user's input to four commands: `quit`, `list`, `add`, and `remove`. If the user enters the `quit` command, the loop will break and the program will exit. If the user enters the `list` command, the `list_tasks` function will be called to display the tasks in the to-do list. If the user enters the `add` command, the `add_task` function will be called to add a new task to the to-do list. If the user enters the `remove` command, the `remove_task` function will be called to remove a task from the to-do list. If the user enters an unknown command, a message will be printed to the console.

Implementing the Functions

Now that we can handle the user's input, we need to implement the functions that will perform the appropriate actions.

The `list_tasks` function will display the tasks in the to-do list. We will loop through the tasks in the list and print each one to the console.

```rust
fn list_tasks(todo_list: &Vec<String>) {
    println!("Tasks:");

    for task in todo_list {
        println!(" - {}", task);
    }
}
```

The `add_task` function will add a new task to the to-do list. We will use the `std::io` module's `stdout()` function to prompt the user to enter a new task. We will use the `push()` method to add the new task to the end of the to-do list.

```rust
fn add_task(todo_list: &mut Vec<String>) {
    let mut input = String::new();

    print!("Enter task: ");
    io::stdout().flush().unwrap();

    io::stdin().read_line(&mut input).unwrap();
    let task = input.trim().to_string();

    todo_list.push(task);

    println!("Task added!");
}
```

The remove_task function will remove a task from the to-do list. We will use the std::io module's stdout() function to prompt the user to enter the index of the task to be removed. We will use the remove() method to remove the task at the specified index.

```rust
fn remove_task(todo_list: &mut Vec<String>) {
    let mut input = String::new();

    print!("Enter task index to remove: ");
    io::stdout().flush().unwrap();

    io::stdin().read_line(&mut input).unwrap();
    let index = input.trim().parse::<usize>().unwrap();

    if index >= todo_list.len() {
        println!("Invalid index!");
    } else {
        todo_list.remove(index);
        println!("Task removed!");
    }
}
```
Testing the Application

Now that we have implemented the to-do list application, we can test it by running the run function. To run the application, open a terminal window, navigate to the project directory, and run the following command:

```bash
$ cargo run
```

This command will compile and run the to-do list application. The application will prompt the user to enter a command. The user can enter one of the following commands:

list: Displays the tasks in the to-do list.
add: Prompts the user to enter a new task and adds it to the to-do list.
remove: Prompts the user to enter the index of the task to be removed and removes it from the to-do list.
quit: Exits the application.

Conclusion

In this article, we have explored how to create a simple to-do list application in Rust using the Rust standard library. We have used Rust's strong type system and memory safety features to create a robust and efficient application. We have also used Rust's concise syntax and powerful pattern matching capabilities to create a clean and easy-to-read code. With this knowledge, you can now create your own Rust applications and explore the full potential of this powerful programming language.