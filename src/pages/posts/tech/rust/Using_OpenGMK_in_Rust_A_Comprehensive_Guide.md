---
tags: ['rust']
title: Using OpenGMK in Rust
description:  In this article, we will explore how to use OpenGMK in Rust with the help of `opengmk-rs`, a Rust library that provides a convenient interface for working with OpenGMK documents.
pubDate: Fri, 21 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1340975325.png"
---
# Using OpenGMK in Rust: A Comprehensive Guide

## Introduction

Open Generalized Markup Language (OpenGMK) is a powerful and flexible markup language designed for general-purpose data representation. Rust, a systems programming language focused on safety, speed, and concurrency, is an excellent choice for working with OpenGMK data. In this article, we will explore how to use OpenGMK in Rust with the help of `opengmk-rs`, a Rust library that provides a convenient interface for working with OpenGMK documents.

## Prerequisites

To follow along, you will need:

1. Basic knowledge of Rust programming language.
2. Rust and Cargo installed on your system.

## Installing the Library

To start using `opengmk-rs`, add the following dependency to your project's `Cargo.toml` file:

```toml
[dependencies]
opengmk-rs = "0.1"
```

Next, run `cargo build` to download and compile the library.

## Reading an OpenGMK Document

Let's look at how to read an OpenGMK document using the `opengmk-rs` library. Suppose we have the following OpenGMK document named `example.gmk`:

```gmk
<root>
    <person>
        <name>John Doe</name>
        <age>30</age>
    </person>
    <person>
        <name>Jane Doe</name>
        <age>28</age>
    </person>
</root>
```

To read the document, use the following code:

```rust
use opengmk_rs::parse;

fn main() {
    let input = std::fs::read_to_string("example.gmk").expect("Failed to read file");
    let parsed_document = parse(&input).expect("Failed to parse document");
    println!("{:?}", parsed_document);
}
```

The `parse` function returns a `Result` containing the root node of the document. If the parsing was successful, you can traverse the nodes and their attributes using the provided methods.

## Traversing Nodes

To traverse the nodes in the document, you can use the `children`, `parent`, and `siblings` methods provided by the `Node` struct:

```rust
use opengmk_rs::{parse, Node};

fn main() {
    let input = std::fs::read_to_string("example.gmk").expect("Failed to read file");
    let parsed_document = parse(&input).expect("Failed to parse document");

    if let Node::Element(root) = &parsed_document {
        for person in root.children() {
            if let Node::Element(person) = person {
                let name = person
                    .get_child_by_name("name")
                    .and_then(Node::as_text)
                    .unwrap_or("<unknown>");
                let age = person
                    .get_child_by_name("age")
                    .and_then(Node::as_text)
                    .unwrap_or("0");

                println!("Name: {}, Age: {}", name, age);
            }
        }
    }
}
```

This code will output:

```
Name: John Doe, Age: 30
Name: Jane Doe, Age: 28
```

## Creating an OpenGMK Document

You can also create an OpenGMK document from scratch using the `opengmk-rs` library. Here's how you can create the same document as above:

```rust
use opengmk_rs::{Document, Element};

fn main() {
    let mut root = Element::new("root");
    let mut person1 = Element::new("person");
    let mut person2 = Element::new("person");

    person1.add_child(Element::new_with_text("name", "John Doe"));
    person1.add_child(Element::new_with_text("age", "30"));

    person2.add_child(Element::new_with_text("name", "Jane Doe"));
    person2.add_child(Element::new_with_text("age", "28"));

    root.add_child(person1);
    root.add_child(person2);

    let document = Document::new(root);
    println!("{}", document);
}
```

This code will output the same OpenGMK document we used earlier:

```gmk
<root>
    <person>
        <name>John Doe</name>
        <age>30</age>
    </person>
    <person>
        <name>Jane Doe</name>
        <age>28</age>
    </person>
</root>
```

## Conclusion

In this article, we've covered how to use OpenGMK in Rust using the `opengmk-rs` library. We've seen how to read, traverse, and create OpenGMK documents, providing you with the necessary tools to work with OpenGMK data in your Rust applications. The `opengmk-rs` library is an excellent choice for Rust developers who need to work with OpenGMK documents and provides a safe, fast,and convenient interface for doing so.

As you continue working with OpenGMK in Rust, consider exploring more advanced features of the `opengmk-rs` library, such as error handling, support for editing documents, or even contributing to the library to help improve its functionality.

