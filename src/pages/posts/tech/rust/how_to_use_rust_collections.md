---
title: How to use Rust Collections
description: In this article, we will build a program that uses Rust's collections, specifically HashMap and HashSet, to perform operations such as counting the frequency of words in a text file.
pubDate: Saturday, 26 December 2024 13:00:00 GMT
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

Rust's collections provide a powerful set of data structures for working with complex data in Rust. In this article, we will build a program that uses Rust's collections, specifically HashMap and HashSet, to perform operations such as counting the frequency of words in a text file.

First, let's start with a simple text file that we want to analyze. We will use the following text file as an example:


```
the quick brown fox jumps over the lazy dog
```
Our goal is to count the frequency of each word in this text file.

To do this, we will use Rust's HashMap collection, which provides a way to store key-value pairs. In this case, the keys will be the words in the text file and the values will be the frequency of each word.

Here's the code:

```rust
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader};

fn main() {
    let file = File::open("text.txt").expect("Unable to open file");
    let reader = BufReader::new(file);

    let mut word_count = HashMap::new();

    for line in reader.lines() {
        for word in line.unwrap().split_whitespace() {
            let count = word_count.entry(word.to_string()).or_insert(0);
            *count += 1;
        }
    }

    for (word, count) in word_count.iter() {
        println!("{}: {}", word, count);
    }
}
```

Let's go through the code line by line to understand what's happening.

First, we import the HashMap collection from the std::collections module, as well as the File and BufRead types from the std::fs and std::io modules, respectively.

Next, we open the text file using the File::open function and create a BufReader to read the file line by line.

We create a new HashMap called word_count to store the word frequencies.

We then iterate over each line in the text file using the lines method of the BufReader. For each line, we iterate over each word using the split_whitespace method. We then use the entry method of the HashMap to either retrieve the frequency of the word or insert a new entry with a frequency of 0. We then increment the frequency count of the word.

Finally, we iterate over the word_count HashMap using the iter method and print out the word and its frequency.

When we run this program with the text file, we get the following output:

```
brown: 1
jumps: 1
over: 1
fox: 1
dog: 1
lazy: 1
quick: 1
the: 2
```

This program demonstrates the power and simplicity of Rust's collections. By using a HashMap, we are able to efficiently store and manipulate the word frequencies, making it easy to perform complex data analysis tasks such as counting the frequency of words in a text file.