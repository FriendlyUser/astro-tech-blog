---
tags: ['rust']
title: "Building a command-line to-do list in Rust"
description: "Build an interactive to-do list in Rust with only the standard library: reading commands from stdin, matching on them, and editing a Vec of tasks."
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/267929881.png"
---

This post builds a small interactive to-do list that runs in the terminal. It uses only the standard library and covers the basics of a Rust CLI loop: reading lines from stdin, matching on commands, and passing a `Vec` around by shared and mutable reference.

The program supports four commands:

- `list` shows the tasks with their numbers
- `add` asks for a task and appends it
- `remove` asks for a task number and deletes it
- `quit` exits

## Setup

```sh
cargo new todo_list
cd todo_list
```

No dependencies are needed. Everything below goes in `src/main.rs`.

## Reading a line

Every command needs to print a prompt and read a line, so start with a helper:

```rust
use std::io::{self, Write};

/// Print `message`, then read one line from stdin.
/// Returns `None` at end of input (Ctrl+D, or Ctrl+Z then Enter on Windows).
fn prompt(message: &str) -> Option<String> {
    print!("{message}");
    io::stdout().flush().ok()?;

    let mut input = String::new();
    match io::stdin().read_line(&mut input) {
        Ok(0) | Err(_) => None,
        Ok(_) => Some(input.trim().to_string()),
    }
}
```

Two details matter here:

- `print!` doesn't end with a newline, and stdout is line-buffered, so without `flush()` the prompt wouldn't appear until after the user typed something. `flush` comes from the `Write` trait, which is why it has to be imported.
- `read_line` returns `Ok(0)` at end of input. If you ignore that, the main loop spins forever on empty input when stdin is closed or piped from a file.

## The command loop

```rust
fn run() {
    let mut todo_list: Vec<String> = Vec::new();

    while let Some(command) = prompt("> ") {
        match command.as_str() {
            "list" => list_tasks(&todo_list),
            "add" => add_task(&mut todo_list),
            "remove" => remove_task(&mut todo_list),
            "quit" => break,
            "" => {}
            other => println!("Unknown command: {other}. Try list, add, remove or quit."),
        }
    }
}

fn main() {
    run();
}
```

`match` on a `String` needs `as_str()`, because the patterns are string literals (`&str`). The loop ends either on `quit` or when `prompt` returns `None`.

## Listing tasks

```rust
fn list_tasks(todo_list: &[String]) {
    if todo_list.is_empty() {
        println!("No tasks.");
        return;
    }
    for (i, task) in todo_list.iter().enumerate() {
        println!("{}. {task}", i + 1);
    }
}
```

The parameter is `&[String]` rather than `&Vec<String>`: a slice accepts a `&Vec<String>` (through deref coercion) and also arrays and sub-slices. The tasks are numbered from 1, since that's what the user will type when removing one.

## Adding a task

```rust
fn add_task(todo_list: &mut Vec<String>) {
    match prompt("Task: ") {
        Some(task) if !task.is_empty() => {
            todo_list.push(task);
            println!("Added.");
        }
        _ => println!("Nothing added."),
    }
}
```

## Removing a task

The user might type something that isn't a number, or a number that's out of range. The original version of this post called `parse().unwrap()`, which crashes the program on `abc`. Handle both cases instead:

```rust
fn remove_task(todo_list: &mut Vec<String>) {
    let Some(input) = prompt("Task number: ") else { return };

    match input.parse::<usize>() {
        Ok(n) if (1..=todo_list.len()).contains(&n) => {
            let task = todo_list.remove(n - 1);
            println!("Removed: {task}");
        }
        Ok(_) => println!("No task with that number."),
        Err(_) => println!("Please enter a number."),
    }
}
```

`Vec::remove` shifts every later element down by one, so the remaining tasks are renumbered on the next `list`.

## Running it

```sh
cargo run
```

```text
> add
Task: write blog post
Added.
> add
Task: review PR
Added.
> list
1. write blog post
2. review PR
> remove
Task number: 1
Removed: write blog post
> list
1. review PR
> quit
```

## Next steps

The list lives in memory and disappears when the program exits. Natural next steps:

- **Persist it.** Write one task per line to a file with `std::fs::write` on each change and read it back at startup with `std::fs::read_to_string`, or use `serde_json` for structured tasks.
- **Mark tasks done** instead of deleting them, by storing a small struct (`struct Task { text: String, done: bool }`) rather than a `String`.
- **Use subcommands instead of a prompt** (`todo add "write blog post"`), with [`clap`](https://docs.rs/clap) parsing the arguments. That makes the tool scriptable.
