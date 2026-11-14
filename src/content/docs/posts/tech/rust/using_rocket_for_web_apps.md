---
title: "Getting started with Rocket 0.5: routes, catchers and Tera templates"
description: "Set up a Rocket 0.5 web app in Rust on stable: define routes, add a custom 404 catcher, and render HTML with rocket_dyn_templates and Tera."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.webp'
---

[Rocket](https://rocket.rs) is a Rust web framework built around attribute macros: you write ordinary functions, annotate them with `#[get("/path")]`, and Rocket generates the routing and request parsing. Since 0.5 it runs on stable Rust and is async, built on Tokio.

This post sets up a small app with two routes, a custom 404 page, and HTML templates rendered with Tera.

## Create the project

You need a Rust toolchain from [rustup](https://www.rust-lang.org/tools/install), which includes Cargo.

```sh
cargo new rocket_example
cd rocket_example
```

## Dependencies

Add to `Cargo.toml`:

```toml
[dependencies]
rocket = "0.5.2"
rocket_dyn_templates = { version = "0.2.0", features = ["tera"] }
```

Note that `rocket_dyn_templates` has its own version numbering (0.2.x pairs with Rocket 0.5), and you have to enable at least one template engine as a feature: `tera`, `handlebars`, or `minijinja`.

## The application

Replace `src/main.rs` with:

```rust
#[macro_use]
extern crate rocket;

use rocket::Request;
use rocket_dyn_templates::{context, Template};

#[get("/")]
fn index() -> Template {
    Template::render("index", context! { title: "Rocket Example" })
}

#[get("/hello/<name>")]
fn hello(name: &str) -> Template {
    Template::render("hello", context! { name: name })
}

#[catch(404)]
fn not_found(req: &Request) -> String {
    format!("Oops! The path '{}' was not found.", req.uri())
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index, hello])
        .register("/", catchers![not_found])
        .attach(Template::fairing())
}
```

What each piece does:

- `#[macro_use] extern crate rocket;` imports Rocket's macros (`get`, `catch`, `launch`, `routes!`, `catchers!`) crate-wide. You can import them individually with `use rocket::{get, routes, ...}` instead.
- `#[get("/hello/<name>")]` declares a dynamic path segment. Rocket parses the segment into the function parameter with the same name; here it's a `&str`, but it could be a `u32`, in which case a non-numeric segment would not match the route.
- `context!` builds a serializable map for the template without defining a struct. For larger pages, pass any type that implements `serde::Serialize`.
- `#[catch(404)]` handles requests that no route matched. `register("/", ...)` applies the catcher to every path under `/`.
- `#[launch]` generates the `main` function and the async runtime. The function returns `Rocket<Build>`; the `_` return type lets the macro fill that in.
- `Template::fairing()` loads and compiles the templates when the app starts. If a template has a syntax error, Rocket logs it and refuses to launch.

Older Rocket tutorials start with `#![feature(proc_macro_hygiene, decl_macro)]` and `rocket::ignite()`. Those are from Rocket 0.4, which required nightly Rust; neither is used in 0.5.

## Templates

Templates live in a `templates/` directory in the project root by default (configurable with `template_dir`). The file name must end in the engine's extension, and you refer to it without the last two extensions, so `index.html.tera` is rendered as `"index"`.

`templates/index.html.tera`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{{ title }}</title>
</head>
<body>
    <h1>Welcome to the {{ title }}!</h1>
    <p>Try <a href="/hello/rustacean">/hello/rustacean</a>.</p>
</body>
</html>
```

`templates/hello.html.tera`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello</title>
</head>
<body>
    <h1>Hello, {{ name }}!</h1>
</body>
</html>
```

Tera auto-escapes variables in `.html` templates, so a name like `<script>` in the URL is rendered as text rather than executed.

## Run it

```sh
cargo run
```

In debug builds Rocket listens on `127.0.0.1:8000` and logs its configuration, the mounted routes, and the address once it has launched. Open:

- `http://127.0.0.1:8000/` for the index page
- `http://127.0.0.1:8000/hello/ferris` for the greeting
- `http://127.0.0.1:8000/nope` for the custom 404 message

## Gotchas

- **Templates are read from disk at runtime**, relative to where you run the binary. Ship the `templates/` directory alongside the binary when you deploy, or set `template_dir` to an absolute path.
- **Port and address** come from `Rocket.toml` or environment variables such as `ROCKET_PORT=8080` and `ROCKET_ADDRESS=0.0.0.0`. Inside a container you need `0.0.0.0`, or the app won't be reachable from outside.
- **Template edits reload automatically in debug builds**; in release builds they are loaded once at startup.

## Further reading

- [Rocket v0.5 guide](https://rocket.rs/guide/v0.5/)
- [`rocket_dyn_templates` docs](https://docs.rs/rocket_dyn_templates)
- [Tera documentation](https://keats.github.io/tera/)
