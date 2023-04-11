---
title: Building Web Applications with Rust using Actix Web
description: In this article, we will introduce you to building web apps with Rust and discuss topics like routing, middleware, and database access using the Actix Web framework.
tags: ["rust", "bash"]
pubDate: Saturday, 29 April 2024 13:00:00 GMT
layout: '@/templates/BasePost.astro'
imgSrc: "/imgs/2023/nature_0.jpeg"
---

# Building Web Applications with Rust using Actix Web

Rust is a systems programming language that offers many benefits for web application development. Its speed, safety, and strong type system make it an excellent choice for building modern web applications. In this article, we will introduce you to building web apps with Rust and discuss topics like routing, middleware, and database access using the Actix Web framework.

## Introduction to Actix Web

[Actix Web](https://actix.rs/) is a powerful, pragmatic, and flexible framework for Rust that makes it easy to build web applications. It is built on the [Actix actor system](https://actix.rs/actix/), which provides a high-performance and concurrent foundation. Actix Web offers features like routing, middleware, and various integrations with other libraries, making it a popular choice among Rust developers.

## Getting Started

To start building a web application with Rust and Actix Web, you need to have Rust installed on your system. Visit the [official Rust website](https://www.rust-lang.org/tools/install) for instructions on how to install Rust.

Once you have Rust installed, create a new project using the following command:

```sh
$ cargo new my_web_app
$ cd my_web_app
```

Add Actix Web as a dependency by opening `Cargo.toml` and adding the following line under `[dependencies]`:

```toml
actix-web = "4.0"
```

Now, you can create a basic Actix Web application. Open `src/main.rs` and replace its contents with the following code:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

Run the application using `cargo run`. Visit `http://127.0.0.1:8080` in your browser, and you should see the message "Hello, Actix Web!"

## Routing

Actix Web provides a flexible and type-safe routing system. In the example above, we defined a single route for the root path ("/") using the `route` method. You can also define more complex routes using `resource` and `scope`. Here's an example:

```rust
use actix_web::{web, App, HttpResponse, HttpServer, Responder};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

async fn user_detail(user_id: web::Path<i32>) -> impl Responder {
    HttpResponse::Ok().body(format!("User detail for user {}", user_id))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/", web::get().to(index))
            .route("/users/{user_id}", web::get().to(user_detail))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

Now, when you visit `http://127.0.0.1:8080/users/42`, you should see "User detail for user 42".

## Middleware

Middleware is a way to process incoming requests and outgoing responses at various stages of the request-response lifecycle. Actix Web middleware can be added using the `wrap` method on the `App` or `Resource` objects.

Here's an example of a simple logging middleware:

```rust
use actix_web::{
    web, middleware, App, HttpResponse, HttpServer, Responder
};

async fn index() -> impl Responder {
    HttpResponse::Ok().body("Hello, Actix Web!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .wrap(middleware::Logger::default())
            .route("/", web::get().to(index))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
```

Now, when you run the application and make requests, you will see log messages in the console.

## Database Access
Actix Web can integrate with various database libraries, like Diesel, sqlx, and others. In this example, we will use [sqlx](https://github.com/launchbadge/sqlx), an async and type-safe PostgreSQL library.  

First, add the following dependencies to your `Cargo.toml`:

```toml
sqlx = { version = "0.5", features = ["runtime-tokio", "postgres"] }
tokio = { version = "1", features = ["full"] }
uuid = { version = "0.8", features = ["v4"] }
```

Next, we'll set up our database schema and connection pool:

```rust
use sqlx::postgres::PgPool;

#[tokio::main] 
async fn main() -> Result<(), sqlx::Error> {
    let db_url = "postgres://username:password@localhost/db_name";
    let pool = PgPool::connect(&db_url).await?;

    // Create `users` table
    sqlx::query!("CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), 
        name TEXT NOT NULL
    )")
        .execute(&pool)
        .await?;
}
```

Now we can define a handler to insert a new user into the database:

```rust
#[derive(serde::Deserialize)]
struct NewUser {
    name: String, 
}

#[post("/users")]
async fn create_user(
    payload: web::Json<NewUser>, 
    pool: web::Data<PgPool>
) -> impl Responder {
    let user_id = uuid::Uuid::new_v4();
    sqlx::query!(
        "INSERT INTO users (id, name) VALUES ($1, $2)",
        user_id,
        &payload.name
    )
    .execute(&pool)
    .await
    .unwrap();

    HttpResponse::Created().json(user_id)
}
```

This handler accepts a JSON payload with a `name` field, generates a random `user_id`, inserts a new user into the `users` table using `sqlx`, and returns the `user_id` in the response.


## Serving Html Pages
Actix Web can also serve HTML pages and other static assets. Let's add a `templates` directory with an `index.html` file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Actix Web App</title>
</head>
<body>
    <h1>Hello from Actix Web!</h1>
</body> 
</html>
```

Then we can define a handler to serve this template:

```rust
use actix_web::web;

#[get("/")]
async fn index(tmpl: web::Data<tera::Tera>) -> impl Responder {
    let html = tmpl
        .render("index.html", &tera::context!())
        .expect("Template render failed");
    HttpResponse::Ok().body(html)
}
```

We use the [Tera](https://github.com/Keats/tera) templating engine to render the template, and return the rendered HTML in the response.

To serve static files like CSS, JavaScript, and images, simply add a `static` folder to your project:

```
static/
└── style.css
``` 

The `static` folder contents will be served at the `/static/` endpoint. So `style.css` would be available at `/static/style.css`.

In your templates, you can link to these static assets like so:

```html
<link rel="stylesheet" href="/static/style.css">
```

Actix Web will handle serving these static files for you.

To tie it all together, our full example would look something like this:

```rust
use actix_web::{web, App, HttpResponse, HttpServer};
use tera::Tera;

#[get("/")]
async fn index(tmpl: web::Data<Tera>) -> impl Responder {
    // ...
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "actix_web=info");
    env_logger::init();

    let tera = Tera::new("templates/**/*");

    HttpServer::new(|| {
        App::new()
            .data(tera)
            .service(index)
            .default_service(web::get().to(|| HttpResponse::NotFound()))
    })
    .bind("127.0.0.1:8000")?
    .run()
    .await
}
```

This starts an Actix Web server with a `/` route that serves the `index.html` template, and a default 404 handler for unknown routes.