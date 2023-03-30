---
tags: ['rust']
title: Building a File Size Tool in Rust
description: In this tutorial, we will build a system tool in Rust that determines the size of files in a directory and outputs them nicely to the console. This tool will be similar to the `du` command in Linux.
pubDate: Fri, 14 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4039349639.png
---

Building a File Size Tool in Rust

In this tutorial, we will build a system tool in Rust that determines the size of files in a directory and outputs them nicely to the console. This tool will be similar to the `du` command in Linux.

Step 1: Setup

The first step is to set up a new Rust project. We will be using the `structopt` library for parsing command-line arguments. Add the following lines to your `Cargo.toml` file:

```toml
[dependencies]
structopt = "0.3.21"
```

The `structopt` library provides a convenient way to define and parse command-line arguments. It is similar to the `argparse` library in Python.

Step 2: Define the Command-Line Arguments

Next, we need to define the command-line arguments for our tool. We will define a single argument, which is the path to the directory whose files we want to measure. We will also define an optional argument to specify the depth of the directory tree to traverse. Here is the code to define the arguments using the `structopt` library:

```rust
use structopt::StructOpt;

#[derive(StructOpt)]
struct Cli {
    #[structopt(parse(from_os_str))]
    path: std::path::PathBuf,

    #[structopt(short = "d", long = "depth")]
    depth: Option<usize>,
}
```

Step 3: Traverse the Directory Tree and Measure File Sizes

Next, we need to traverse the directory tree and measure the sizes of the files. We will use the `walkdir` library for this. Add the following line to your `Cargo.toml` file:

```toml
[dependencies]
walkdir = "2.3.2"
```

The `walkdir` library provides a convenient way to traverse directory trees. Here is the code to traverse the directory tree and measure the sizes of the files:

```rust
use walkdir::{DirEntry, WalkDir};

fn measure_file(entry: &DirEntry) -> u64 {
    entry.metadata().map(|m| m.len()).unwrap_or(0)
}

fn measure_dir(path: &std::path::Path, depth: Option<usize>) -> u64 {
    WalkDir::new(path)
        .max_depth(depth.unwrap_or(std::usize::MAX))
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| measure_file(&e))
        .sum()
}
```

The `measure_file` function measures the size of a single file. The `measure_dir` function uses `WalkDir` to traverse the directory tree and measure the sizes of the files. We use the `max_depth` method to limit the depth of the directory tree traversal.

Step 4: Output the Results

Finally, we need to output the results of our measurements to the console. We will use the `humansize` library to format the file sizes in a human-readable format. Add the following line to your `Cargo.toml` file:

```toml
[dependencies]
humansize = "1.1.0"
```

The `humansize` library provides a convenient way to format file sizes in a human-readable format. Here is the code to output the results to the console:

```rust
use humansize::{file_size_opts as options, FileSize};

fn main() {
    let args = Cli::from_args();
    let total_size = measure_dir(&args.path, args.depth);

    println!(
        "{} {}",
        total_size.file_size(options::CONVENTIONAL).unwrap(),
        args.path.display()
    );
}
```

We use `Cli::from_args()` to parse the command-line arguments. We then call `measure_dir` to measure the sizes of the files in the directory tree. Finally, we use `file_size` from the `humansize` library to format the total size of the files in a human-readable format.

Conclusion

In this tutorial, we have built a system tool in Rust that determines the size of files in a directory and outputs them nicely to the console. We have used the `structopt`, `walkdir`, and `humansize` libraries to define and parse command-line arguments, traverse the directory tree, and format file sizes in a human-readable format. With this knowledge, you can build powerful system tools in Rust for a variety of tasks.