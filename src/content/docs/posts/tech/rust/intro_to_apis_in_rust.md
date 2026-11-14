---
title: Build a JSON API in Rust with Rocket 0.5 and connect it to PostgreSQL with Diesel
description: Create a small Rocket 0.5 web server with JSON GET and POST routes, then open a PostgreSQL connection with Diesel 2 and dotenvy.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

[Rocket](https://rocket.rs) is a Rust web framework built on Tokio. Routes are plain functions annotated with attributes like `#[get("/")]`, and request data (path segments, query strings, JSON bodies) is parsed into typed function arguments for you. This post builds a minimal JSON API with it and then connects to PostgreSQL with [Diesel](https://diesel.rs).

It's written against Rocket 0.5.2 and Diesel 2.4.0, which run on stable Rust. Older tutorials for Rocket 0.4 needed nightly Rust and `#![feature(proc_macro_hygiene, decl_macro)]`; drop that line if you see it.

## Project setup

Install Rust from [rustup.rs](https://rustup.rs) if you haven't, then:

```bash
cargo new api-server
cd api-server
```

Add Rocket with its `json` feature to `Cargo.toml`. Rocket re-exports Serde, so you don't need a separate `serde` dependency for this:

```toml
[dependencies]
rocket = { version = "0.5.2", features = ["json"] }
```

## A JSON route

Replace `src/main.rs` with:

```rust
#[macro_use]
extern crate rocket;

use rocket::serde::json::Json;
use rocket::serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(crate = "rocket::serde")]
struct Message {
    content: String,
}

#[get("/")]
fn index() -> Json<Message> {
    Json(Message {
        content: "Hello, world!".to_string(),
    })
}

#[post("/echo", format = "json", data = "<message>")]
fn echo(message: Json<Message>) -> Json<Message> {
    message
}

#[launch]
fn rocket() -> _ {
    rocket::build().mount("/", routes![index, echo])
}
```

What's going on:

- `#[serde(crate = "rocket::serde")]` tells the derive macros to use Rocket's re-exported Serde instead of a top-level `serde` crate.
- `index` returns `Json<Message>`, which Rocket serializes and sends with `Content-Type: application/json`.
- `echo` takes a `Json<Message>` request body. If the body isn't valid JSON for `Message`, Rocket rejects the request with an error status before your function runs.
- `#[launch]` generates the `main` function and starts the async runtime.

Run it:

```bash
cargo run
```

Rocket listens on `http://127.0.0.1:8000` by default. Try both routes:

```bash
curl http://127.0.0.1:8000/
# {"content":"Hello, world!"}

curl -X POST http://127.0.0.1:8000/echo \
  -H "Content-Type: application/json" \
  -d '{"content":"ping"}'
# {"content":"ping"}
```

The port and address can be changed with `ROCKET_PORT` / `ROCKET_ADDRESS` environment variables or a `Rocket.toml` file.

## Connecting to PostgreSQL with Diesel

Add Diesel with the `postgres` feature, plus [`dotenvy`](https://crates.io/crates/dotenvy) to load a `.env` file. (`dotenvy` is the maintained fork of the `dotenv` crate, which is no longer maintained.) The `postgres` feature links against `libpq`, so you need the PostgreSQL client library installed.

```toml
[dependencies]
rocket = { version = "0.5.2", features = ["json"] }
diesel = { version = "2.4.0", features = ["postgres"] }
dotenvy = "0.15.7"
```

Create a `.env` file in the project root (and keep it out of version control):

```text
DATABASE_URL=postgres://user:password@localhost/database_name
```

Then a function to open a connection:

```rust
use diesel::pg::PgConnection;
use diesel::prelude::*;
use std::env;

fn establish_connection() -> PgConnection {
    dotenvy::dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    PgConnection::establish(&database_url)
        .unwrap_or_else(|e| panic!("Error connecting to {database_url}: {e}"))
}
```

`dotenvy::dotenv()` loads `.env` into the process environment if the file exists (`.ok()` ignores a missing file, so real environment variables still work in production). `PgConnection::establish` comes from the `Connection` trait in `diesel::prelude` and returns a `ConnectionResult`. Diesel 2 query methods take `&mut PgConnection`, so bind the result with `let mut conn = establish_connection();`.

A single blocking connection is fine for a script, but don't open one per request inside Rocket's async handlers. Use a connection pool instead; the [Databases section of the Rocket guide](https://rocket.rs/guide/v0.5/state/#databases) covers `rocket_db_pools`, and `rocket_sync_db_pools` for blocking ORMs like Diesel.

## Next steps

- [Rocket guide](https://rocket.rs/guide/v0.5/): requests, responders, state and testing with `rocket::local::blocking::Client`
- [Diesel getting started](https://diesel.rs/guides/getting-started): the `diesel` CLI, migrations, and generating `schema.rs`
