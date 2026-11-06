---
title: "Building Web Applications with Rocket for Rust"
description: In this tutorial, we'll explore how to build a web application using the Rocket web framework for the Rust programming language. Rocket is a fast, type-safe, and easy-to-use framework that allows us to build web applications quickly, leveraging the power and safety of the Rust language.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.png'
---


# Building Web Applications with Rocket for Rust

In this tutorial, we'll explore how to build a web application using the Rocket web framework for the Rust programming language. Rocket is a fast, type-safe, and easy-to-use framework that allows us to build web applications quickly, leveraging the power and safety of the Rust language.

## Setting up the Environment

Before we start, make sure you have the following prerequisites installed:

- Rust: You can install Rust using rustup by following the instructions on the [official Rust website](https://www.rust-lang.org/tools/install).
- Cargo: Cargo is the Rust package manager, and it is included in the Rust installation.

## Creating a New Project

To create a new Rocket project, we'll first create a new Rust binary project using Cargo. Open a terminal and run the following command:

```sh
cargo new rocket_example --bin
```

This command creates a new binary project named `rocket_example`. Change into the project directory using:

```sh
cd rocket_example
```

## Adding Dependencies

To use Rocket, we need to add it as a dependency in our `Cargo.toml` file. Open `Cargo.toml` and add the following lines under `[dependencies]`:

```toml
rocket = "0.5"
rocket_dyn_templates = "0.5"
serde = { version = "1.0", features = ["derive"] }
```

Here, we're adding the `rocket`, `rocket_dyn_templates`, and `serde` dependencies. `rocket_dyn_templates` is a dynamic template rendering engine, while `serde` is a serialization and deserialization library.

## Writing a Simple Web Application

Now that we have our dependencies set up, let's build a simple web application. Open `src/main.rs` and replace its contents with the following code:

```rust
#![feature(proc_macro_hygiene, decl_macro)]

#[macro_use] extern crate rocket;

use rocket::Request;
use rocket_dyn_templates::Template;

#[get("/")]
fn index() -> Template {
    let context = std::collections::HashMap::<String, String>::new();
    Template::render("index", &context)
}

#[catch(404)]
fn not_found(req: &Request) -> String {
    format!("Oops! The path '{}' was not found.", req.uri())
}

#[launch]
fn rocket() -> _ {
    rocket::build()
        .mount("/", routes![index])
        .register("/", catchers![not_found])
        .attach(Template::fairing())
}
```

In this code, we:

1. Enable the required features: `proc_macro_hygiene` and `decl_macro`.
2. Import the necessary types and macros from the `rocket` and `rocket_dyn_templates` crates.
3. Define an `index` function that returns a `Template` and is decorated with the `#[get("/")]` attribute, which associates the function with the root path ("/").
4. Define a `not_found` function that returns a custom 404 error message.
5. Define the `rocket` function, which launches our Rocket application, mounts the index route, registers the 404 catcher, and attaches the template fairing.

## Creating a Template

Now, let's create an `index` template. In your project's root directory, create a new folder named `templates`. Inside the `templates` folder, create a new file named `index.html.tera` with the following content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rocket Example</title>
</head>
<body>
    <h1>Welcome to the Rocket Example!</h1>
</body>
</html>
```

This simple HTML file will be used as our template when rendering the index route.

## Running the Application

To run the application, open a terminal in the project's root directory and execute the following command:

```sh
cargo run
```

This command compiles and runs our web application. You should see output similar to the following:

```
🔧 Configured for development.
    => address: localhost
    => port: 8000
🛰  Mounting /:
    => GET / (index)
🚀 Rocket has launched from http://localhost:8000
```

Open a web browser and navigate to `http://localhost:8000`. You should see our "Welcome to the Rocket Example!" message.

## Conclusion

In this tutorial, we have learned how to set up a simple web application using the Rocket framework for Rust. We've seen how to create routes, catchers, and use templates to render HTML. You can now use these basic concepts to build more complex web applications with Rocket and Rust.