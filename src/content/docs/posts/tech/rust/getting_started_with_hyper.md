---
tags: ['rust']
title: "Hello world HTTP server with hyper 1.x in Rust"
description: "Build a minimal async HTTP/1 server with hyper 1.x, hyper-util and Tokio, and see what changed from the hyper 0.14 Server API."
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/getting-started-with-hyper.webp"
---

:::caution
This post originally used hyper 0.14. hyper 1.0 removed `hyper::Server`, `make_service_fn` and `hyper::Body`, so the old code no longer compiles against current hyper. The example below targets hyper 1.x.
:::

[hyper](https://hyper.rs/) is a low-level HTTP library for Rust with client and server support for HTTP/1 and HTTP/2. Frameworks such as axum are built on it. You'd use hyper directly when you want control over connection handling, or you're writing a library rather than an app; for most web apps, a framework on top of hyper is less work.

Since 1.0, hyper only provides the protocol implementation. Things like the Tokio integration and convenience body types live in two companion crates: `hyper-util` and `http-body-util`.

## Dependencies

```toml
[dependencies]
hyper = { version = "1", features = ["full"] }
hyper-util = { version = "0.1", features = ["full"] }
http-body-util = "0.1"
tokio = { version = "1", features = ["full"] }
```

`full` is the easy option for an example. In a real project you can narrow it down, e.g. `hyper = { version = "1", features = ["server", "http1"] }` and `hyper-util = { version = "0.1", features = ["tokio"] }`. This was checked against hyper 1.12 and hyper-util 0.1.21.

## The server

`src/main.rs`:

```rust
use std::convert::Infallible;
use std::net::SocketAddr;

use http_body_util::Full;
use hyper::body::{Bytes, Incoming};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;

async fn handle_request(_req: Request<Incoming>) -> Result<Response<Full<Bytes>>, Infallible> {
    let response = Response::builder()
        .status(200)
        .header("Content-Type", "text/plain")
        .body(Full::new(Bytes::from("Hello, World!")))
        .unwrap();

    Ok(response)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    let listener = TcpListener::bind(addr).await?;
    println!("Listening on http://{addr}");

    loop {
        let (stream, _) = listener.accept().await?;
        // Adapts a Tokio TcpStream to hyper's own IO traits.
        let io = TokioIo::new(stream);

        // One task per connection so connections are served concurrently.
        tokio::task::spawn(async move {
            if let Err(err) = http1::Builder::new()
                .serve_connection(io, service_fn(handle_request))
                .await
            {
                eprintln!("Error serving connection: {err:?}");
            }
        });
    }
}
```

What each piece does:

- `handle_request` is the service. It takes a `Request<Incoming>` (the streaming request body) and returns a response whose body is `Full<Bytes>`, a body that is sent in one chunk. The `.unwrap()` on the builder only fails if you pass an invalid header or status, which is a programming error here.
- `TcpListener` accepts connections. hyper 1.x no longer does this for you; the accept loop is your code.
- `TokioIo` bridges Tokio's `AsyncRead`/`AsyncWrite` to hyper's runtime-agnostic IO traits.
- `http1::Builder::serve_connection` runs HTTP/1 on one connection and calls the service for each request on it.

## Running it

```sh
cargo run
curl -i http://127.0.0.1:8080
```

You should get a `200 OK` with `Hello, World!` as the body.

## Gotchas and next steps

- This server only speaks HTTP/1. To accept both HTTP/1 and HTTP/2 on the same port, use `hyper_util::server::conn::auto::Builder` in place of `http1::Builder`.
- There is no graceful shutdown: Ctrl+C drops in-flight connections. hyper-util has a `GracefulShutdown` helper for this.
- Routing, middleware, and JSON extraction are not hyper's job. If you need them, use axum (built on hyper) or add `tower` services yourself.

## Further reading

- [hyper guides](https://hyper.rs/guides/1/)
- [hyper 0.14 to 1.0 upgrade guide](https://hyper.rs/guides/1/upgrading/)
- [hyper API docs](https://docs.rs/hyper)
- [hyper-util API docs](https://docs.rs/hyper-util)
