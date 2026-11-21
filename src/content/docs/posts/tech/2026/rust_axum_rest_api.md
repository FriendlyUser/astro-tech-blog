---
title: "A REST API in Rust with Axum 0.8 and SQLx"
description: "Build a small todo API with Axum 0.8 and SQLx on SQLite: routing with /{id} paths, State and Json extractors, migrations, an error type, and oneshot tests."
tags: ["Rust", "Axum", "SQLx", "SQLite", "REST API", "Tokio"]
pubDate: "2026-01-15T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_axum_rest_api.webp"
imgAlt: "A request flowing from a router through a handler and SQLx into a SQLite database, drawn as connected boxes"
---

Axum is the HTTP framework from the Tokio project. Handlers are plain async functions, and their arguments ("extractors") declare what they need from the request. SQLx is an async SQL toolkit that talks to SQLite, Postgres and MySQL without an ORM. Together they make a small, testable REST service with very little framework code.

This post builds a todo API with create, read, update and delete endpoints, an error type that turns failures into JSON responses, and tests that call the router directly without opening a socket. The examples were written against Axum 0.8.8, SQLx 0.8.6, Tokio 1.49 and tower 0.5, using the 2024 edition.

## Project setup

```bash
cargo new todo-api
cd todo-api
mkdir migrations
```

`Cargo.toml`:

```toml
[package]
name = "todo-api"
version = "0.1.0"
edition = "2024"

[dependencies]
axum = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite"] }
tokio = { version = "1", features = ["full"] }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
```

SQLx's default features already include `macros` and `migrate`, which the `migrate!` macro below needs. The `sqlite` feature bundles SQLite, so there is nothing to install. `tower` is only a dev dependency, for `ServiceExt::oneshot` in the tests.

## The migration

SQLx runs plain SQL files from `migrations/`, in order of their numeric prefix, and records what it has applied in a `_sqlx_migrations` table. Create `migrations/20260115000000_create_todos.sql`:

```sql
CREATE TABLE IF NOT EXISTS todos (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  BOOLEAN NOT NULL DEFAULT 0
);
```

`sqlx::migrate!()` embeds every file in `./migrations` into the binary at compile time, so the deployed binary doesn't need the SQL files next to it. The flip side: if you add a migration and nothing else changes, Cargo may not rebuild. The `sqlx-cli` command `sqlx migrate build-script` writes a `build.rs` that fixes that.

## The application

Here is the whole of `src/main.rs` apart from the tests. It is about 130 lines, and I'll go through the parts after the listing.

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};

#[derive(Clone)]
struct AppState {
    pool: SqlitePool,
}

#[derive(Serialize, sqlx::FromRow)]
struct Todo {
    id: i64,
    title: String,
    done: bool,
}

#[derive(Deserialize)]
struct NewTodo {
    title: String,
}

#[derive(Deserialize)]
struct UpdateTodo {
    title: Option<String>,
    done: Option<bool>,
}

enum AppError {
    NotFound,
    Validation(String),
    Database(sqlx::Error),
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        AppError::Database(err)
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "todo not found".to_string()),
            AppError::Validation(msg) => (StatusCode::UNPROCESSABLE_ENTITY, msg),
            AppError::Database(err) => {
                eprintln!("database error: {err}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal server error".to_string(),
                )
            }
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

async fn fetch_todo(pool: &SqlitePool, id: i64) -> Result<Todo, AppError> {
    sqlx::query_as::<_, Todo>("SELECT id, title, done FROM todos WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or(AppError::NotFound)
}

async fn list_todos(State(state): State<AppState>) -> Result<Json<Vec<Todo>>, AppError> {
    let todos = sqlx::query_as::<_, Todo>("SELECT id, title, done FROM todos ORDER BY id")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(todos))
}

async fn get_todo(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Todo>, AppError> {
    Ok(Json(fetch_todo(&state.pool, id).await?))
}

async fn create_todo(
    State(state): State<AppState>,
    Json(input): Json<NewTodo>,
) -> Result<(StatusCode, Json<Todo>), AppError> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err(AppError::Validation("title must not be empty".to_string()));
    }
    let id = sqlx::query("INSERT INTO todos (title) VALUES (?)")
        .bind(title)
        .execute(&state.pool)
        .await?
        .last_insert_rowid();
    let todo = fetch_todo(&state.pool, id).await?;
    Ok((StatusCode::CREATED, Json(todo)))
}

async fn update_todo(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(input): Json<UpdateTodo>,
) -> Result<Json<Todo>, AppError> {
    let result = sqlx::query(
        "UPDATE todos SET title = COALESCE(?, title), done = COALESCE(?, done) WHERE id = ?",
    )
    .bind(input.title)
    .bind(input.done)
    .bind(id)
    .execute(&state.pool)
    .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(Json(fetch_todo(&state.pool, id).await?))
}

async fn delete_todo(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, AppError> {
    let result = sqlx::query("DELETE FROM todos WHERE id = ?")
        .bind(id)
        .execute(&state.pool)
        .await?;
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound);
    }
    Ok(StatusCode::NO_CONTENT)
}

fn app(pool: SqlitePool) -> Router {
    Router::new()
        .route("/todos", get(list_todos).post(create_todo))
        .route(
            "/todos/{id}",
            get(get_todo).patch(update_todo).delete(delete_todo),
        )
        .with_state(AppState { pool })
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let options = SqliteConnectOptions::new()
        .filename("todos.db")
        .create_if_missing(true);
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;
    sqlx::migrate!().run(&pool).await?;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000").await?;
    println!("listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app(pool)).await?;
    Ok(())
}
```

### Routing and the `{id}` path syntax

Axum 0.8 changed path parameters from `/:id` to `/{id}`, and wildcards from `/*rest` to `/{*rest}`. Routes still using the old syntax panic when the router is built, so a forgotten one shows up on startup. If you are upgrading from 0.7, search for `":` in your route strings.

`get(list_todos).post(create_todo)` builds one `MethodRouter` that dispatches on the HTTP method. A request with a method you didn't register gets `405 Method Not Allowed` automatically.

### Extractors and their order

A handler's arguments are extractors. `State<AppState>` hands you a clone of the state passed to `with_state`, `Path<i64>` parses the `{id}` segment, and `Json<T>` deserializes the body with serde.

Two rules matter in practice:

- **The body extractor goes last.** `Json` consumes the request body, so it must be the final argument. Putting it earlier is a compile error, though the message is a long trait-bound error rather than "move `Json` to the end".
- **Extractors reject requests before your code runs.** A non-numeric id gives `400 Bad Request`, a body without `Content-Type: application/json` gives `415 Unsupported Media Type`, malformed JSON gives `400`, and valid JSON that doesn't fit `NewTodo` gives `422 Unprocessable Entity`. Those responses are plain text, not the JSON shape your own errors use. If that matters for your clients, wrap the extractor in your own type, or use `axum-extra`'s `WithRejection`.

State must be `Clone`, because Axum clones it for each request. `SqlitePool` is a cheap handle around an `Arc`, so cloning it is fine. If your state grows, put the fields in a struct as here rather than passing the pool alone. Adding a config value later then doesn't change every handler signature.

### Queries without compile-time checking

I used `sqlx::query` and `sqlx::query_as` instead of the `query!` macros. The macros check your SQL against a real database at compile time, which is great, but they need `DATABASE_URL` set during the build, or an offline cache generated by `cargo sqlx prepare`. The function versions check nothing at compile time. Column types are matched against your struct when the row is decoded, and a mismatch becomes a `sqlx::Error` at runtime. Start with the functions, and move to the macros once the schema settles.

`#[derive(sqlx::FromRow)]` maps columns to fields by name. SQLite has no real boolean type, so `done` is stored as an integer, and SQLx decodes it into `bool`.

### One error type for every handler

Every handler returns `Result<T, AppError>`. Axum accepts that as long as both `T` and `AppError` implement `IntoResponse`. The `From<sqlx::Error>` impl is what lets `?` work on database calls.

The `Database` arm logs the real error and sends the client a generic message. Database errors can contain table names, constraint names, or bits of the query, and none of that belongs in a response body. In a real service, use `tracing::error!` instead of `eprintln!`.

## Running it

```bash
cargo run
```

In another terminal:

```bash
curl -i -X POST localhost:3000/todos \
  -H 'content-type: application/json' \
  -d '{"title":"buy milk"}'
curl localhost:3000/todos
curl -X PATCH localhost:3000/todos/1 \
  -H 'content-type: application/json' \
  -d '{"done":true}'
curl -i -X DELETE localhost:3000/todos/1
curl -i localhost:3000/todos/1
```

The last request gets a 404 with `{"error":"todo not found"}` as the body.

## Testing with `oneshot`

`Router` implements tower's `Service` trait, so a test can build a `Request`, send it to the router with `ServiceExt::oneshot`, and inspect the `Response`. No port, no HTTP client, and each test gets its own in-memory database. Add this to the bottom of `main.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::{to_bytes, Body},
        http::Request,
    };
    use serde_json::Value;
    use tower::ServiceExt; // for `oneshot`

    async fn test_app() -> Router {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!().run(&pool).await.unwrap();
        app(pool)
    }

    async fn body_json(response: Response) -> Value {
        let bytes = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        serde_json::from_slice(&bytes).unwrap()
    }

    fn post_json(uri: &str, body: &'static str) -> Request<Body> {
        Request::builder()
            .method("POST")
            .uri(uri)
            .header("content-type", "application/json")
            .body(Body::from(body))
            .unwrap()
    }

    #[tokio::test]
    async fn create_then_fetch() {
        let app = test_app().await;

        let response = app
            .clone()
            .oneshot(post_json("/todos", r#"{"title":"write tests"}"#))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CREATED);
        let created = body_json(response).await;
        assert_eq!(created["title"], "write tests");
        assert_eq!(created["done"], false);

        let uri = format!("/todos/{}", created["id"]);
        let response = app
            .oneshot(Request::builder().uri(uri).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(body_json(response).await["title"], "write tests");
    }

    #[tokio::test]
    async fn missing_todo_is_404() {
        let response = test_app()
            .await
            .oneshot(Request::builder().uri("/todos/999").body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        assert_eq!(body_json(response).await["error"], "todo not found");
    }

    #[tokio::test]
    async fn blank_title_is_rejected() {
        let response = test_app()
            .await
            .oneshot(post_json("/todos", r#"{"title":"   "}"#))
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    }
}
```

Run them with `cargo test`.

A few details:

- `oneshot` takes the service by value, so `create_then_fetch` clones the router for the first request. Cloning a `Router` is cheap.
- `axum::body::to_bytes` collects a response body. The second argument is a size limit, and `usize::MAX` means no limit, which is fine in tests.
- With SQLx, each `connect("sqlite::memory:")` call creates a new, separate in-memory database, shared by the connections in that pool. The database disappears when its last connection closes. I set `max_connections(1)` so there is only ever one connection. That keeps the database alive for the whole test and avoids locking surprises between connections.

## Things to watch for

- **Old path syntax.** `/:id` routes panic at startup in 0.8. Many blog posts and answers online still use it.
- **SQLite and concurrent writes.** SQLite allows one writer at a time. SQLx sets a 5 second busy timeout by default, so a blocked writer waits before failing, but under write-heavy load you'll still see "database is locked" errors. Switching to WAL with `.journal_mode(SqliteJournalMode::Wal)` on `SqliteConnectOptions` lets readers carry on while a write is in progress. If writes are the main workload, move to Postgres. With SQLx that mostly means changing the pool type and the `?` placeholders to `$1`, `$2`.
- **Graceful shutdown.** `axum::serve(...).with_graceful_shutdown(signal)` takes a future, typically one that waits on `tokio::signal::ctrl_c()`. Use it so in-flight requests finish before the process exits.
- **Rejection format.** As mentioned above, the built-in extractor rejections are plain text. Decide early whether your API promises JSON errors everywhere.

## Further reading

- [Axum documentation](https://docs.rs/axum/0.8) and the [examples directory](https://github.com/tokio-rs/axum/tree/main/examples), which includes a testing example
- [SQLx on GitHub](https://github.com/launchbadge/sqlx), including the `sqlx-cli` README
- [Axum 0.8 announcement](https://tokio.rs/blog/2025-01-01-announcing-axum-0-8-0) on the Tokio blog
