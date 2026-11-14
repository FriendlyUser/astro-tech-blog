---
tags: ['mongodb', 'rust']
title: "MongoDB CRUD in Rust with the official mongodb driver"
description: "Connect to MongoDB from Rust with the official mongodb 3.x driver, map documents to serde structs, and insert, find, update and delete them."
pubDate: Fri, 24 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/118660664.webp"
---

:::note
This post was first written against version 2 of the driver. Version 3 removed the trailing `options` argument from methods like `insert_one(doc, None)`, so the code below has been updated for 3.x (checked against 3.10).
:::

The [`mongodb`](https://docs.rs/mongodb) crate is MongoDB's official Rust driver. It's async and runs on Tokio. You describe your documents as structs that derive serde's `Serialize` and `Deserialize`, and the driver converts them to and from BSON for you.

This post connects to a local MongoDB server, then inserts, finds, updates and deletes a document.

## Prerequisites

- Rust, from [rustup](https://www.rust-lang.org/tools/install).
- A MongoDB server on `localhost:27017`. Either [install it](https://www.mongodb.com/docs/manual/installation/) or run `docker run -d -p 27017:27017 mongo`.

## Project setup

```bash
cargo new mongodb_rust_example
cd mongodb_rust_example
```

```toml
[dependencies]
mongodb = "3"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
```

The driver re-exports the `bson` crate as `mongodb::bson`, so you don't need a separate `bson` dependency for the `doc!` macro.

## The full example

`src/main.rs`:

```rust
use mongodb::{
    bson::doc,
    error::Result,
    results::{DeleteResult, InsertOneResult, UpdateResult},
    Client, Collection,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct User {
    name: String,
    age: i32,
}

fn users_collection(client: &Client) -> Collection<User> {
    client.database("rust_mongodb_example").collection::<User>("users")
}

async fn insert_user(users: &Collection<User>, user: &User) -> Result<InsertOneResult> {
    users.insert_one(user).await
}

async fn find_user_by_name(users: &Collection<User>, name: &str) -> Result<Option<User>> {
    users.find_one(doc! { "name": name }).await
}

async fn update_user_age(users: &Collection<User>, name: &str, new_age: i32) -> Result<UpdateResult> {
    users
        .update_one(doc! { "name": name }, doc! { "$set": { "age": new_age } })
        .await
}

async fn delete_user_by_name(users: &Collection<User>, name: &str) -> Result<DeleteResult> {
    users.delete_one(doc! { "name": name }).await
}

#[tokio::main]
async fn main() -> Result<()> {
    let client = Client::with_uri_str("mongodb://localhost:27017").await?;
    let users = users_collection(&client);

    let alice = User { name: "Alice".to_string(), age: 30 };

    let inserted = insert_user(&users, &alice).await?;
    println!("Inserted with _id {}", inserted.inserted_id);

    let found = find_user_by_name(&users, "Alice").await?;
    println!("Found: {found:?}");

    let updated = update_user_age(&users, "Alice", 35).await?;
    println!("Matched {}, modified {}", updated.matched_count, updated.modified_count);

    let found = find_user_by_name(&users, "Alice").await?;
    println!("After update: {found:?}");

    let deleted = delete_user_by_name(&users, "Alice").await?;
    println!("Deleted {}", deleted.deleted_count);

    Ok(())
}
```

Run it with `cargo run`.

## How it works

**Connecting.** `Client::with_uri_str` parses the connection string and builds a client. It doesn't open a connection yet; the first operation does, so a wrong host shows up as an error on `insert_one`, not here. If the server isn't reachable, that operation fails after server selection times out (30 seconds by default). Create one `Client` and reuse it: it holds a connection pool and is cheap to clone.

**Collections.** `database(...).collection::<User>(...)` returns a typed handle. Neither the database nor the collection has to exist; MongoDB creates them on the first insert. The struct has no `_id` field, so the server generates an `ObjectId` and the driver ignores `_id` when reading documents back. Add `#[serde(rename = "_id", skip_serializing_if = "Option::is_none")] id: Option<mongodb::bson::oid::ObjectId>` if you need it.

**Queries.** Filters and updates are BSON documents built with `doc!`. `find_one` returns `Ok(None)` when nothing matches. `update_one` and `delete_one` affect at most one matching document; use `update_many` / `delete_many` for more.

**Options.** In 3.x, options are set with builder methods before `.await`, for example `users.find_one(filter).sort(doc! { "age": -1 }).await`.

**Integer types.** BSON has no unsigned integers, which is why `age` is `i32` here rather than `u32`.

## Next steps

- Use `find(filter)` for multiple results. It returns a `Cursor<User>`; collect it with `futures::TryStreamExt::try_collect`, which needs the `futures` crate.
- Add a unique index on `name` with `users.create_index(...)` if names should be unique, since nothing stops duplicate inserts right now.
- There is a blocking API behind the `sync` feature if you can't use async.

## Further reading

- [MongoDB Rust driver documentation](https://www.mongodb.com/docs/drivers/rust/current/)
- [mongodb crate API docs](https://docs.rs/mongodb)
