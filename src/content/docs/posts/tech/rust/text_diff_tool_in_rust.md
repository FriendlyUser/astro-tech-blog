---
tags: ['rust']
title: Building a Text Diff Tool in Rust
description: In this tutorial, we will build a system tool in Rust that performs text diffing between two text files and outputs them nicely to the console. This tool will be similar to the `diff` command in Linux.
pubDate: Fri, 21 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.png"
---

Building a Text Diff Tool in Rust

In this tutorial, we will build a system tool in Rust that performs text diffing between two text files and outputs them nicely to the console. This tool will be similar to the `diff` command in Linux.

Step 1: Setup

The first step is to set up a new Rust project. We will be using the `structopt` and `text_diff` libraries for parsing command-line arguments and performing text diffing, respectively. Add the following lines to your `Cargo.toml` file:

```toml
[dependencies]
structopt = "0.3.21"
text_diff = "0.2.2"
```

The `structopt` library provides a convenient way to define and parse command-line arguments. The `text_diff` library provides a convenient way to perform text diffing.

Step 2: Define the Command-Line Arguments

Next, we need to define the command-line arguments for our tool. We will define two arguments, which are the paths to the two text files that we want to compare. Here is the code to define the arguments using the `structopt` library:

```rust
use std::path::PathBuf;
use structopt::StructOpt;

#[derive(StructOpt)]
struct Cli {
    #[structopt(parse(from_os_str))]
    file1: PathBuf,

    #[structopt(parse(from_os_str))]
    file2: PathBuf,
}
```

Step 3: Read the Files and Perform Text Diffing

Next, we need to read the two text files and perform text diffing. We will use the `text_diff` library for this. Here is the code to read the files and perform text diffing:

```rust
use std::fs::File;
use std::io::{BufRead, BufReader};
use text_diff::diff;

fn read_file(path: &std::path::PathBuf) -> Vec<String> {
    let file = File::open(path).expect("failed to open file");
    let reader = BufReader::new(file);
    reader.lines().map(|l| l.unwrap()).collect()
}

fn main() {
    let args = Cli::from_args();
    let file1_lines = read_file(&args.file1);
    let file2_lines = read_file(&args.file2);
    let comparison = diff(&file1_lines, &file2_lines, "\n");

    println!("{}", comparison);
}
```

The `read_file` function reads a file and returns its contents as a vector of lines. The `main` function uses `Cli::from_args()` to parse the command-line arguments. We then call `read_file` to read the contents of the two files. Finally, we use `diff` from the `text_diff` library to perform text diffing between the two files.

Step 4: Output the Results

Finally, we need to output the results of our text diffing to the console. Here is the code to output the results to the console:

```rust
use std::fmt;

impl fmt::Display for Change {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Change::Insert(s) => write!(f, "\x1b[32m{}\x1b[0m", s),
            Change::Delete(s) => write!(f, "\x1b[31m{}\x1b[0m", s),
            Change::Equal(s) => write!(f, "{}", s),
        }
    }
}

impl fmt::Display for TextDiff<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        for change in self.iter_all_changes() {
            writeln!(f, "{}", change)?;
        }
        Ok(())
    }
}
```

We use `impl fmt::Display` to define how to display the changes between the two files. We use ANSI color codes to highlight insertions in green and deletions in red. We then use `impl fmt::Display` to define how to display the entire text diff.

Conclusion

In this tutorial, we have built a system tool in Rust that performs text diffing between two text files and outputs them nicely to the console. We have used the `structopt` and `text_diff` libraries to define and parse command-line arguments and perform text diffing. With this knowledge, you can build powerful system tools in Rust for a variety of tasks.