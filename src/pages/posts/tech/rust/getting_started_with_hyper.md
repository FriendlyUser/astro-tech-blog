---
tags: ['rust']
title: Using Hyper in Rust for Asynchronous HTTP
description: This article will introduce Hyper, explore its core features, and demonstrate how to use it to build a simple asynchronous HTTP server.
pubDate: Fri, 29 November 2023
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2459005241.png
---


# Using Hyper in Rust for Asynchronous HTTP

Hyper is a versatile, fast, and safe HTTP library for Rust. It provides both client and server components, making it ideal for building web applications, APIs, and more. This article will introduce Hyper, explore its core features, and demonstrate how to use it to build a simple asynchronous HTTP server.

## Introduction to Hyper

Hyper is built on top of the Tokio asynchronous runtime, which allows it to be highly concurrent and performant. It supports HTTP/1 and HTTP/2 out of the box and follows the zero-cost abstractions principle, ensuring that unused features do not affect your binary size or performance.

To start working with Hyper, add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
hyper = "0.14"
tokio = { version = "1", features = ["full"] }
```

## Creating a Simple HTTP Server

In this section, we will create a simple HTTP server that listens on port 8080 and responds with a "Hello, World!" message. To do this, follow these steps:

1. **Import the Required Libraries**

Add the necessary imports to your `main.rs` file:

```rust
use hyper::service::{make_service_fn, service_fn};
use hyper::{Body, Request, Response, Server};
use std::convert::Infallible;
use std::net::SocketAddr;
```

2. **Implement the Request Handler**

Create a request handler function that takes a `Request` object and returns a `Response` object wrapped in a `Result`:

```rust
async fn handle_request(_req: Request<Body>) -> Result<Response<Body>, Infallible> {
    let response = Response::builder()
        .status(200)
        .header("Content-Type", "text/plain")
        .body(Body::from("Hello, World!"))
        .unwrap();

    Ok(response)
}
```

3. **Create the Server**

Create a server that binds to a socket address and uses the request handler function to process incoming requests:

```rust
async fn main() {
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));

    let make_svc = make_service_fn(|_conn| {
        let service = service_fn(handle_request);
        async { Ok::<_, Infallible>(service) }
    });

    let server = Server::bind(&addr).serve(make_svc);

    if let Err(e) = server.await {
        eprintln!("Server error: {}", e);
    }
}
```

4. **Run the Server**

To run the server, execute the following command in your terminal:

```sh
cargo run
```

Now, if you visit `http://127.0.0.1:8080` in your browser or use a tool like `curl`, you should see the "Hello, World!" message.

## Conclusion

In this article, we have demonstrated how to use Hyper in Rust to create a simple asynchronous HTTP server. Although this example is minimal, Hyper provides a wide range of features and customization options that make it an excellent choice for building web applications, APIs, and more in Rust.

As you dive deeper into Hyper, you may want to explore its support for HTTP/2, streaming requests and responses, and other powerful features. The official [Hyper documentation](https://docs.rs/hyper) is a valuable resource to get started.