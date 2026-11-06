---
tags: ['mongodb', 'rust']
title: Using MongoDB in Rust
description: In this article, we will explore how to use MongoDB, a popular NoSQL database, in Rust, a systems programming language known for its safety and performance. We'll cover the basics of setting up a MongoDB connection, creating a collection, and performing basic CRUD operations.
pubDate: Fri, 24 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/118660664.png"
---

# Using MongoDB in Rust

In this article, we will explore how to use MongoDB, a popular NoSQL database, in Rust, a systems programming language known for its safety and performance. We'll cover the basics of setting up a MongoDB connection, creating a collection, and performing basic CRUD operations.

To interact with MongoDB in Rust, we'll be using the `mongodb` crate. This crate provides a Rust driver for MongoDB, allowing for seamless integration of MongoDB in Rust applications.

## Prerequisites

Before we begin, ensure you have the following installed on your system:

1. Rust: Follow the [official Rust installation guide](https://www.rust-lang.org/tools/install) to set up Rust on your machine.
2. MongoDB: Follow the [official MongoDB installation guide](https://docs.mongodb.com/manual/installation/) to set up MongoDB on your machine.

## Setting up a Rust project

Create a new Rust project by running:

```bash
$ cargo new --bin mongodb_rust_example
$ cd mongodb_rust_example
```

Now, edit the `Cargo.toml` file to include the necessary dependencies:

```toml
[dependencies]
mongodb = "2.0"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

- `mongodb`: The Rust MongoDB driver.
- `tokio`: The async runtime.
- `serde`: A serialization/deserialization library to handle JSON data.

## Connecting to MongoDB

To connect to a MongoDB server, we'll use the `mongodb::Client` struct. The following function establishes a connection to a local MongoDB server:

```rust
use mongodb::{options::ClientOptions, Client};

async fn get_mongo_client() -> Result<Client, mongodb::error::Error> {
    let client_options = ClientOptions::parse("mongodb://localhost:27017").await?;
    let client = Client::with_options(client_options)?;
    Ok(client)
}
```

## Creating a Collection

To interact with MongoDB, we need to create a `Collection`. In this example, we'll create a `users` collection. 

```rust
use mongodb::Collection;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
struct User {
    name: String,
    age: u32,
}

fn get_users_collection(client: &Client) -> Collection<User> {
    let database = client.database("rust_mongodb_example");
    let users = database.collection::<User>("users");
    users
}
```

Here, we define a `User` struct and implement `Serialize` and `Deserialize` using the `serde` crate. The `get_users_collection` function takes a reference to a `Client` and returns a `Collection<User>`.

## CRUD Operations

### 1. Inserting a Document

To insert a document into a collection, we use the `insert_one` method. Let's create a function to insert a user:

```rust
use mongodb::error::Result as MongoResult;

async fn insert_user(collection: &Collection<User>, user: User) -> MongoResult<mongodb::results::InsertOneResult> {
    collection.insert_one(user, None).await
}
```

### 2. Finding a Document

To find a document, we use the `find_one` method. The following function finds a user by their name:

```rust
use bson::doc;

async fn find_user_by_name(collection: &Collection<User>, name: &str) -> MongoResult<Option<User>> {
    collection.find_one(doc! { "name": name }, None).await
}
```

### 3. Updating a Document

To update a document, we use the `update_one` method. The following function updates a user's age:

```rust
async fn update_user_age(collection: &Collection<User>, name: &str, new_age: u32) -> MongoResult<mongodb::results::UpdateResult> {
    collection.update_one(doc! { "name": name }, doc! { "$set": { "age": new_age } }, None).await
}
```

### 4. Deleting a Document

To delete a document, we use the `delete_one` method. The following function deletes a user by their name:

```rust
async fn delete_user_by_name(collection: &Collection<User>, name: &str) -> MongoResult<mongodb::results::DeleteResult> {
    collection.delete_one(doc! { "name": name }, None).await
}
```

## Example Usage

Now let's use these functions in the `main` function:

```rust
#[tokio::main]
async fn main() {
    let client = get_mongo_client().await.unwrap();
    let users = get_users_collection(&client);

    let user = User {
        name: "Alice".to_string(),
        age: 30,
    };

    // Insert user
    insert_user(&users, user).await.unwrap();

       // Find user
    let found_user = find_user_by_name(&users, "Alice").await.unwrap();
    println!("Found user: {:?}", found_user);

    // Update user age
    update_user_age(&users, "Alice", 35).await.unwrap();

    // Find updated user
    let updated_user = find_user_by_name(&users, "Alice").await.unwrap();
    println!("Updated user: {:?}", updated_user);

    // Delete user
    delete_user_by_name(&users, "Alice").await.unwrap();
}
```

To run the example, execute `cargo run` in your terminal.

## Conclusion

In this article, we demonstrated how to use MongoDB in Rust. We covered connecting to a MongoDB server, creating a collection, and performing basic CRUD operations. The `mongodb` crate provides a powerful and easy-to-use API for working with MongoDB in Rust, making it a great choice for developing high-performance applications.

Remember that the `mongodb` crate is built on top of the async ecosystem in Rust, so using it effectively will require understanding asynchronous programming with Rust. While this article provided a basic introduction, there is much more to learn about MongoDB and Rust. Make sure to consult the [official MongoDB Rust driver documentation](https://docs.rs/mongodb/2.0.0/mongodb/) for more advanced topics and best practices.