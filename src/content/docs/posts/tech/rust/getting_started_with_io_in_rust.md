---
title: "Rust's IO: Build a program that reads in a CSV file and performs operations such as sorting and filtering on the data."
description: In this article, we'll explore how to build a program in Rust that reads in a CSV file, performs operations such as sorting and filtering on the data, and writes the results to a new file..
pubDate: Saturday, 26 December 2024 13:00:00 GMT
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/2886495853.png'
---


# Rust's I/O: Reading and Manipulating CSV Data

Rust is a systems programming language that focuses on safety, performance, and concurrency. It provides excellent support for working with files and handling I/O operations. In this article, we'll explore how to build a program in Rust that reads in a CSV file, performs operations such as sorting and filtering on the data, and writes the results to a new file.

## Introducing CSV in Rust

To work with CSV files in Rust, we'll use the `csv` crate, which provides a fast and flexible interface for reading and writing CSV data. In addition, we'll use the `serde` crate for deserializing the CSV data into Rust structs. To include these crates in your project, add them to your `Cargo.toml`:

```toml
[dependencies]
csv = "1.1"
serde = { version = "1.0", features = ["derive"] }
```

## The CSV Data

For this example, let's assume that we have a CSV file named `data.csv` with the following content:

```
id,name,age
1,Alice,30
2,Bob,25
3,Carol,27
4,David,22
5,Eve,35
```

We'll build a Rust program that reads this CSV file, filters the records based on a given age threshold, sorts the results by the age column, and writes the output to a new CSV file.

## Defining the Data Structure

First, we need to define a struct to represent the data in our CSV file:

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct Person {
    id: u32,
    name: String,
    age: u32,
}

impl Person {
    fn from_record(record: csv::StringRecord) -> Result<Self, csv::Error> {
        let person: Person = record.deserialize(None)?;
        Ok(person)
    }
}
```

In this code, we define a `Person` struct with fields for `id`, `name`, and `age`. We derive the `Deserialize` trait from the `serde` crate, which allows us to deserialize CSV records directly into `Person` instances.

## Reading the CSV File

Next, let's create a function to read the CSV file and return a `Vec<Person>`:

```rust
use std::error::Error;
use std::fs::File;
use std::path::Path;

fn read_csv<P: AsRef<Path>>(path: P) -> Result<Vec<Person>, Box<dyn Error>> {
    let file = File::open(path)?;
    let mut reader = csv::Reader::from_reader(file);

    let mut persons: Vec<Person> = Vec::new();

    for result in reader.records() {
        let record = result?;
        let person = Person::from_record(record)?;
        persons.push(person);
    }

    Ok(persons)
}
```

This function opens the given file, creates a `csv::Reader` to read the contents, and iterates over the records to deserialize them into `Person` instances. The function returns a `Result<Vec<Person>, Box<dyn Error>>`, allowing the caller to handle any errors that may occur.

## Sorting and Filtering the Data

Now that we can read the CSV data into a `Vec<Person>`, we can implement the sorting and filtering operations. Let's define a function that takes a slice of `Person`, an age threshold, and returns a new, sorted `Vec<Person>` that only includes people older than the given age:

```rust
fn filter_and_sort(persons: &[Person], age_threshold: u32) -> Vec<Person> {
    let mut filtered_persons: Vec<Person> = persons
        .iter()
        .filter(|person| person.age > age_threshold)
        .cloned()
        .collect();

    filtered_persons.sort_by_key(|person| person.age);

    filtered_persons
}
```

This function uses Rust's iterator methods to filter and sort the data. The `filter` method removes any `Person` with an age less than or equal to the age threshold, and the `sort_by_key` method sorts the remaining records by age.

## Writing the Output CSV

Finally, let's create a function to write the filtered and sorted data to a new CSV file:

```rust
use std::io::Write;

fn write_csv<P: AsRef<Path>>(persons: &[Person], path: P) -> Result<(), Box<dyn Error>> {
    let file = File::create(path)?;
    let mut writer = csv::Writer::from_writer(file);

    for person in persons {
        writer.serialize(person)?;
    }

    writer.flush()?;

    Ok(())
}
```

This function creates a new CSV file, initializes a `csv::Writer`, and serializes the `Person` instances to the writer. It then flushes the writer to ensure that all data is written to disk.

## Bringing It All Together

With all the necessary functions defined, we can now bring everything together in a main function to read in the CSV data, filter and sort it, and write the output to a new file:
```rust
use std::error::Error;
use std::fs::File;
use std::path::Path;

#[derive(Debug, serde::Deserialize, serde::Serialize)]
struct Person {
    name: String,
    age: u32,
}

fn main() -> Result<(), Box<dyn Error>> {
    let filename = "input.csv";
    let age_threshold = 30;

    let persons = read_csv(filename)?;
    let filtered_persons = filter_and_sort(&persons, age_threshold);
    write_csv(&filtered_persons, "output.csv")?;

    Ok(())
}
```
This main function reads in the input CSV file, filters and sorts the data using the filter_and_sort function, and writes the output to a new CSV file using the write_csv function. It uses Rust's error handling mechanisms to propagate any errors that occur during the execution of the program.

In summary, we have implemented a simple program in Rust to read in CSV data, filter and sort it based on a given age threshold, and write the output to a new CSV file. By using Rust's strong type system and functional programming features, we can write concise and efficient code that is easy to reason about and maintain.