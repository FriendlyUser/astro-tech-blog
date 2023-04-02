---
title: Image manipulation in Rust
description: In this article, we will explore how to create a command-line utility to batch rename files in a directory based on user-defined patterns or rules. We will use Rust's standard library and the regex crate to handle complex renaming patterns.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/424066448.png'
---


Introduction

In this article, we will explore how to create a command-line utility to batch rename files in a directory based on user-defined patterns or rules. We will use Rust's standard library and the regex crate to handle complex renaming patterns.

Setting up the Project

To get started, we need to set up a new Rust project. To create a new Rust project, open a terminal window and run the following command:

```
$ cargo new file_renamer
```

This command will create a new Rust project named `file_renamer`. The project will contain a `Cargo.toml` file that describes the project's dependencies and a `src` directory that contains the project's source code.

The `Cargo.toml` file will look like this:

```toml
[package]
name = "file_renamer"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2018"

[dependencies]
```

We will add dependencies to the `Cargo.toml` file as we need them.

Renaming Files

To rename files, we will use Rust's standard library to handle basic file I/O and the regex crate to handle complex renaming patterns.

We will create a function named `rename_files` that will take a directory path and a pattern string as parameters. The function will read all files in the directory, apply the pattern to each file, and rename the file accordingly.

```rust
use regex::Regex;
use std::fs;
use std::path::Path;

fn rename_files(dir_path: &str, pattern: &str) {
    let dir = Path::new(dir_path);

    let re = Regex::new(pattern).unwrap();

    for entry in fs::read_dir(dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();

        if path.is_file() {
            let file_name = path.file_name().unwrap().to_str().unwrap();

            let new_file_name = re.replace_all(file_name, "");

            let new_path = path.with_file_name(new_file_name);

            fs::rename(path, new_path).unwrap();
        }
    }
}
```

In this function, we use the `Path` struct to represent the directory path and the `Regex` struct from the regex crate to represent the renaming pattern.

We use a `for` loop to iterate over all entries in the directory and check if each entry represents a file. If the entry is a file, we extract the file name from the `Path` object and apply the pattern to it using the `replace_all` method of the `Regex` object. We then use the `with_file_name` method of the `Path` object to create a new `Path` object with the new file name.

Finally, we use the `rename` method of the `fs` module to rename the file.

Command-Line Interface

To create a command-line interface for our utility, we will use the clap crate. We will create a subcommand named `rename` that takes two arguments: the directory path and the renaming pattern.

```rust
use clap::{App, Arg};

fn main() {
    let matches = App::new("File Renamer")
        .version("0.1.0")
        .author("Your Name <your.email@example.com>")
        .about("Batch rename files in a directory based on user-defined patterns or rules")
        .subcommand(
            App::new("rename")
                .about("Rename files in a directory")
                .arg(
                    Arg::new("directory")
                        .about("The directory containing the files to rename")
                        .required(true)
                        .index(1),
                )
                .arg(
                    Arg::new("pattern")
                        .about("The renaming pattern")
                        .required(true)
                        .index(2),
                ),
        )
        .get_matches();

    if let Some(matches) = matches.subcommand_matches("rename") {
        let dir_path = matches.value_of("directory").unwrap();
        let pattern = matches.value_of("pattern").unwrap();

        rename_files(dir_path, pattern);
    }
}
```

In this code, we use the `App` struct from the clap crate to create a new command-line interface. We create a subcommand named `rename` that takes two arguments: `directory` and `pattern`. We use the `value_of` method of the `ArgMatches` object to extract the values of these arguments and pass them to the `rename_files` function.

Conclusion

In this article, we have explored how to create a command-line utility to batch rename files in a directory based on user-defined patterns or rules. We have used Rust's standard library to handle basic file I/O and the regex crate to handle complex renaming patterns. We have also used the clap crate to create a command-line interface for our utility. With this knowledge, you can now create your own Rust command-line utilities and automate tedious tasks.