---
title: Building a web app in Rust with Actix Web (routing, logging, Postgres and templates)
description: Build an Actix Web 4 app step by step, with path parameters, request logging, inserting rows into Postgres with sqlx, Tera templates and static files.
tags: ["rust", "bash"]
pubDate: Saturday, 29 April 2024 13:00:00 GMT
lastUpdated: 2026-11-14
layout: '@/templates/BasePost.astro'
imgSrc: "/imgs/2023/nature_0.jpeg"
---

[Actix Web](https://actix.rs/) is an async web framework for Rust. You register handler functions
on routes; handlers take typed extractors (path segments, JSON bodies, shared state) as arguments
and return anything that implements `Responder`. Since version 4 it runs on the Tokio-based
`actix-rt` runtime and no longer depends on the Actix actor framework.

This post builds up a small app: a hello-world route, a path parameter, request logging, a
Postgres insert with `sqlx`, and an HTML page rendered with Tera plus static files. The examples
were checked against actix-web 4.19.0.

## Hello world

```sh
cargo new my_web_app
cd my_web_app
```

Add to `Cargo.toml`:

```toml
[dependencies]
actix-web = "4"
```

Replace `src/main.rs`:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().route("/", web::get().to(index)))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
```

Run `cargo run` and open `http://127.0.0.1:8080`. `HttpServer::new` takes a closure because it
builds a separate `App` for each worker thread.

## Routing and path parameters

Path segments in `{braces}` are extracted with `web::Path<T>`, which parses the segment into `T`
and returns 404 if it doesn't parse:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

async fn user_detail(user_id: web::Path<i32>) -> impl Responder {
    let user_id = user_id.into_inner();
    HttpResponse::Ok().body(format!("User detail for user {user_id}"))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(index))
            .route("/users/{user_id}", web::get().to(user_detail))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

`http://127.0.0.1:8080/users/42` returns "User detail for user 42". For groups of routes under a
common prefix, use `web::scope("/api")`; for several methods on one path, use `web::resource`.

## Middleware: request logging

Middleware wraps the app (or a scope or resource) with `.wrap()`. The built-in `Logger` writes one
line per request through the `log` crate, so you also need a logger implementation such as
`env_logger`, otherwise nothing is printed:

```toml
[dependencies]
actix-web = "4"
env_logger = "0.11"
```

```rust
use actix_web::{middleware::Logger, web, App, HttpResponse, HttpServer, Responder};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .route("/", web::get().to(index))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

## Database access with sqlx

[sqlx](https://github.com/launchbadge/sqlx) is an async SQL toolkit. The connection pool is shared
with handlers through `web::Data`, which wraps it in an `Arc`. The dependencies (checked against
sqlx 0.9.0):

```toml
[dependencies]
actix-web = "4"
serde = { version = "1", features = ["derive"] }
sqlx = { version = "0.9", features = ["runtime-tokio", "postgres", "uuid"] }
uuid = { version = "1", features = ["v4", "serde"] }
```

```rust
use actix_web::{post, web, App, HttpResponse, HttpServer, Responder};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize)]
struct NewUser {
    name: String,
}

#[post("/users")]
async fn create_user(payload: web::Json<NewUser>, pool: web::Data<PgPool>) -> impl Responder {
    let user_id = Uuid::new_v4();
    let result = sqlx::query("INSERT INTO users (id, name) VALUES ($1, $2)")
        .bind(user_id)
        .bind(payload.into_inner().name)
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(_) => HttpResponse::Created().json(user_id),
        Err(e) => {
            eprintln!("insert failed: {e}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // e.g. postgres://username:password@localhost/db_name
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPool::connect(&database_url)
        .await
        .expect("failed to connect to Postgres");

    sqlx::query("CREATE TABLE IF NOT EXISTS users (id UUID PRIMARY KEY, name TEXT NOT NULL)")
        .execute(&pool)
        .await
        .expect("failed to create users table");

    let pool = web::Data::new(pool);
    HttpServer::new(move || App::new().app_data(pool.clone()).service(create_user))
        .bind(("127.0.0.1", 8080))?
        .run()
        .await
}
```

```sh
curl -X POST http://127.0.0.1:8080/users \
  -H 'Content-Type: application/json' \
  -d '{"name": "Ada"}'
```

The handler returns `201 Created` with the new UUID as JSON. Notes:

- `web::Data::new` is created once, outside the `HttpServer::new` closure, and cloned into each
  worker. Creating it inside the closure would give every worker its own pool.
- The id is generated in Rust, so the table needs no `DEFAULT`. If you want Postgres to generate
  it, `gen_random_uuid()` is built in from Postgres 13; `uuid_generate_v4()` needs the
  `uuid-ossp` extension.
- The `sqlx::query!` macro checks SQL against a real database at compile time, which means
  `DATABASE_URL` must be set (or offline data prepared with `sqlx-cli`) when you build. The
  plain `sqlx::query` used here is checked only at runtime.
- In a real app, create tables with migrations (`sqlx migrate`) rather than at startup.

## HTML templates and static files

Actix Web doesn't render templates itself. This example uses [Tera](https://keats.github.io/tera/)
1.x for templates and [`actix-files`](https://crates.io/crates/actix-files) for static files:

```toml
[dependencies]
actix-files = "0.7"
actix-web = "4"
env_logger = "0.11"
tera = "1.20"
```

Tera 2 has since been released with a different API; the code below is for Tera 1.x.

Create `templates/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Actix Web App</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <h1>Hello from {{ name }}!</h1>
</body>
</html>
```

and a `static/style.css` next to it:

```text
my_web_app/
├── Cargo.toml
├── src/main.rs
├── static/
│   └── style.css
└── templates/
    └── index.html
```

Then `src/main.rs`:

```rust
use actix_files::Files;
use actix_web::{get, middleware::Logger, web, App, HttpResponse, HttpServer, Responder};
use tera::{Context, Tera};

#[get("/")]
async fn index(tmpl: web::Data<Tera>) -> impl Responder {
    let mut ctx = Context::new();
    ctx.insert("name", "Actix Web");

    match tmpl.render("index.html", &ctx) {
        Ok(html) => HttpResponse::Ok()
            .content_type("text/html; charset=utf-8")
            .body(html),
        Err(e) => {
            eprintln!("template error: {e}");
            HttpResponse::InternalServerError().finish()
        }
    }
}

async fn not_found() -> HttpResponse {
    HttpResponse::NotFound().body("Not found")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let tera = Tera::new("templates/**/*").expect("failed to parse templates");
    let tera = web::Data::new(tera);

    HttpServer::new(move || {
        App::new()
            .app_data(tera.clone())
            .wrap(Logger::default())
            .service(index)
            .service(Files::new("/static", "static"))
            .default_service(web::to(not_found))
    })
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}
```

`Files::new("/static", "static")` serves the `static` directory at `/static/`, so `style.css` is
at `/static/style.css`. Static files are not served unless you register a `Files` service. Unknown
routes fall through to `default_service`, which returns 404.

## Gotchas

- `App::data()` from older tutorials was removed in Actix Web 4; use
  `.app_data(web::Data::new(...))`. A handler asking for `web::Data<T>` that was never registered
  gets a 500 error at request time, not a compile error.
- The `templates/**/*` glob and the `static` directory are relative to the working directory, so
  run the binary from the project root (or build absolute paths with `env!("CARGO_MANIFEST_DIR")`).
- `#[get]`, `#[post]` and friends must be imported (`use actix_web::{get, post}`) and the
  handlers registered with `.service()`, not `.route()`.

## Further reading

- [Actix Web documentation](https://actix.rs/docs/)
- [actix/examples repository](https://github.com/actix/examples)
- [sqlx documentation](https://docs.rs/sqlx)
- [Tera 1.x documentation](https://docs.rs/tera/1.20.1/tera/)
