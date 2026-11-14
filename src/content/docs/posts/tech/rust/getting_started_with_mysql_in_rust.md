---
title: "Connecting to MySQL from Rust with the mysql crate"
description: "Use the synchronous mysql crate to open a connection pool, create a table, insert rows with parameterised queries and map results into Rust structs."
alt: my first blog post
tags: ["mysql","rust"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 Feb 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/2126341537_forest.png'
---

The [`mysql`](https://docs.rs/mysql) crate is a synchronous MySQL driver written in Rust. It handles connection pooling, prepared statements, and conversion between MySQL values and Rust types. If your application is async, use its sibling [`mysql_async`](https://docs.rs/mysql_async) or [`sqlx`](https://docs.rs/sqlx) instead; the API ideas below carry over.

## Prerequisites

- Rust, from [rustup](https://www.rust-lang.org/tools/install).
- A MySQL server you can connect to, with an empty database to experiment in. [Install MySQL](https://dev.mysql.com/downloads/mysql/) or run `docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=my_database mysql`.

## Dependency

```toml
[dependencies]
mysql = "28"
```

This post was checked against mysql 28.0. TLS is off by default; enable the `native-tls` or `rustls-tls` feature if your server requires encrypted connections.

## The full example

`src/main.rs`:

```rust
use mysql::prelude::*;
use mysql::*;

#[derive(Debug)]
struct User {
    id: u32,
    username: String,
    email: String,
}

fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let url = "mysql://username:password@localhost:3306/my_database";
    let pool = Pool::new(url)?;
    let mut conn = pool.get_conn()?;

    // Create a table
    conn.query_drop(
        r"CREATE TABLE IF NOT EXISTS users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL
        )",
    )?;

    // Insert a row with a parameterised query
    conn.exec_drop(
        r"INSERT INTO users (username, email) VALUES (?, ?)",
        ("Alice", "alice@example.com"),
    )?;
    println!("Inserted id {}", conn.last_insert_id());

    // Read rows back into structs
    let users: Vec<User> = conn.query_map(
        "SELECT id, username, email FROM users ORDER BY id",
        |(id, username, email)| User { id, username, email },
    )?;

    for user in users {
        println!("{user:?}");
    }

    Ok(())
}
```

Replace `username`, `password` and `my_database` in the URL with your own values. Running it twice fails on the second `INSERT`, because `email` is `UNIQUE`; that's the database doing its job, and the error comes back through `?` as a `mysql::Error`.

## How it works

### Connection pool

`Pool::new` takes a connection URL (or an `Opts` value built with `OptsBuilder`) and creates a pool. `pool.get_conn()` hands out a `PooledConn` that returns to the pool when dropped. `Pool` is cheap to clone and safe to share between threads, so create it once at startup.

The URL embeds the password, so in real code read it from an environment variable or config file rather than hard-coding it.

### Running statements

The query methods come from two traits in `mysql::prelude`:

- `Queryable::query_*` methods (`query_drop`, `query_map`, `query_first`, …) send plain SQL text. Use them only for SQL with no user input.
- `Queryable::exec_*` methods (`exec_drop`, `exec_map`, `exec_first`, …) prepare the statement and send parameters separately. Use these whenever values come from outside, because parameters can't be interpreted as SQL. Parameters are positional (`?` with a tuple) or named (`:name` with the `params!` macro).

The `_drop` suffix means "discard the result set", which suits `CREATE` and `INSERT`.

### Mapping rows

`query_map` converts each row into the closure's argument type, here a `(u32, String, String)` tuple inferred from the `User` fields. If a column can be `NULL`, use `Option<T>` for that field or the conversion fails at runtime. The `id` column is `INT UNSIGNED` so it maps cleanly to `u32`.

## Next steps

- `conn.exec_batch` runs one prepared statement for many parameter sets, which is the efficient way to insert a list of rows.
- `conn.start_transaction(TxOpts::default())` gives you a `Transaction` with the same query methods; call `commit()` on it, or it rolls back when dropped.
- The [crate documentation](https://docs.rs/mysql) has more detail on the pool options, type conversions, and TLS setup.
