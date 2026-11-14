---
title: "Reading, filtering, sorting and writing CSV files in Rust"
description: "Use the csv and serde crates to read a CSV file into Rust structs, filter and sort the rows, and write the result to a new CSV file."
pubDate: Saturday, 26 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/2886495853.png'
---

This post builds a small Rust program that reads a CSV file, keeps only the rows above an age threshold, sorts them by age, and writes them to a new CSV file. It uses the [`csv`](https://docs.rs/csv) crate for parsing and writing, and [`serde`](https://serde.rs/) to map each row onto a struct so you work with typed fields instead of strings.

## Dependencies

```sh
cargo new csv_example
cd csv_example
```

Add to `Cargo.toml`:

```toml
[dependencies]
csv = "1.4"
serde = { version = "1", features = ["derive"] }
```

## Input data

Save this as `data.csv` in the project root (next to `Cargo.toml`, since `cargo run` uses that as the working directory):

```csv
id,name,age
1,Alice,30
2,Bob,25
3,Carol,27
4,David,22
5,Eve,35
```

## The program

Here is the whole `src/main.rs`. The sections below walk through each function.

```rust
use std::error::Error;
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
struct Person {
    id: u32,
    name: String,
    age: u32,
}

fn read_csv<P: AsRef<Path>>(path: P) -> Result<Vec<Person>, Box<dyn Error>> {
    let mut reader = csv::Reader::from_path(path)?;
    let mut persons = Vec::new();

    for result in reader.deserialize() {
        let person: Person = result?;
        persons.push(person);
    }

    Ok(persons)
}

fn filter_and_sort(persons: Vec<Person>, age_threshold: u32) -> Vec<Person> {
    let mut filtered: Vec<Person> = persons
        .into_iter()
        .filter(|person| person.age > age_threshold)
        .collect();

    filtered.sort_by_key(|person| person.age);
    filtered
}

fn write_csv<P: AsRef<Path>>(persons: &[Person], path: P) -> Result<(), Box<dyn Error>> {
    let mut writer = csv::Writer::from_path(path)?;

    for person in persons {
        writer.serialize(person)?;
    }

    writer.flush()?;
    Ok(())
}

fn main() -> Result<(), Box<dyn Error>> {
    let age_threshold = 25;

    let persons = read_csv("data.csv")?;
    let filtered = filter_and_sort(persons, age_threshold);
    write_csv(&filtered, "output.csv")?;

    println!("Wrote {} rows to output.csv", filtered.len());
    Ok(())
}
```

## Reading

`csv::Reader::from_path` opens the file and treats the first row as headers by default. `reader.deserialize()` returns an iterator of `Result<Person, csv::Error>`, matching columns to struct fields by header name, so the column order in the file doesn't have to match the struct. A row with a non-numeric `age` produces an error that names the line, and `?` passes it up to `main`.

If your file has no header row, build the reader with `csv::ReaderBuilder::new().has_headers(false).from_path(path)` and fields are matched by position instead.

## Filtering and sorting

`filter_and_sort` takes the `Vec` by value and uses `into_iter()`, so the kept rows are moved rather than cloned. `sort_by_key` is a stable sort, so people with the same age keep their original order. To sort by something that isn't `Copy`, such as the name, use `sort_by(|a, b| a.name.cmp(&b.name))` to avoid cloning each key.

## Writing

`csv::Writer::from_path` creates (or truncates) the output file. Because `Person` derives `Serialize`, `writer.serialize` writes a header row automatically before the first record. The writer buffers its output, so call `flush()` at the end. Dropping it also flushes, but any error during that flush is silently ignored.

## Result

With a threshold of 25, `cargo run` writes this `output.csv`:

```csv
id,name,age
3,Carol,27
1,Alice,30
5,Eve,35
```

## Notes

- This loads the whole file into memory, which is fine for files up to a few hundred MB. For larger files, filter while reading and write each matching row immediately. Sorting still needs all the kept rows in memory, though.
- For anything more than filter-and-sort (joins, group-by, aggregations), a dataframe library like [Polars](https://docs.rs/polars) will save you code.
- The [csv crate tutorial](https://docs.rs/csv/latest/csv/tutorial/index.html) covers delimiters, quoting, and borrowing records to avoid allocations.
