---
title: Using the `log` Crate in Rust
description: . In Rust, one of the most popular logging libraries is the `log` crate.
pubDate: Saturday, 2 June 2023 13:00:00 GMT
tags: ["rust", "log"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/DALL·E 2022-12-26 21.10.41 - decentralized network diagram simple bobble heads.png'
---

# Using the `log` Crate in Rust

Rust is a powerful systems programming language that prioritizes safety, performance, and concurrent programming. Logging is a vital aspect of any application, as it provides valuable information during development, debugging, and production. In Rust, one of the most popular logging libraries is the `log` crate.

In this article, we'll explore how to use the `log` crate in Rust to create a flexible and extensible logging system.

## Prerequisites
To follow this tutorial, you need to have Rust installed. If you don't have it already, you can follow the official installation guide [here](https://www.rust-lang.org/tools/install).

## Getting Started
To begin, create a new Rust project:

```bash
$ cargo new log_example
$ cd log_example
```

Now, open the `Cargo.toml` file and add the following dependencies:

```toml
[dependencies]
log = "0.4"

[dev-dependencies]
env_logger = "0.9"
```

Here, we're adding the `log` crate and the `env_logger` crate. The `log` crate provides logging macros, while the `env_logger` crate provides a simple logging implementation that outputs logs to the terminal based on environment variables.

## Setting Up the Logger
Next, we'll set up the logger. In the `src/main.rs` file, add the following lines:

```rust
extern crate log;
extern crate env_logger;

use log::{info, trace, warn, error};
use env_logger::Env;

fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("info"))
        .init();

    info!("Logger initialized!");
}
```

Here, we import the `log` and `env_logger` crates, along with the logging macros from the `log` crate. We then create a new `env_logger::Builder` instance, using the `from_env` function to configure the logging filter based on environment variables. The `default_filter_or` function sets a default log level if no environment variable is provided.

Now, run the application:

```bash
$ cargo run
```

You should see the following output:

```
INFO [log_example] Logger initialized!
```

## Logging Messages
With our logger initialized, we can now log messages at different levels. Let's examine the various log levels:

- `trace!`: Very detailed logs, mostly used for development and debugging.
- `debug!`: Detailed logs, used to provide context during debugging.
- `info!`: General informational logs, used to inform users about the application's status.
- `warn!`: Warning logs, used to indicate potential issues or problems.
- `error!`: Error logs, used to indicate critical failures or problems in the application.

Add the following lines to `src/main.rs`:

```rust
fn main() {
    // ...

    trace!("This is a trace log!");
    debug!("This is a debug log!");
    info!("This is an info log!");
    warn!("This is a warning log!");
    error!("This is an error log!");
}
```

By default, our logger is set to the `info` level. If you run the application again, you'll see logs for `info`, `warn`, and `error`:

```bash
$ cargo run
```

```
INFO [log_example] Logger initialized!
INFO [log_example] This is an info log!
WARN [log_example] This is a warning log!
ERROR [log_example] This is an error log!
```

## Changing Log Levels
To change the log level, set the `RUST_LOG` environment variable. For example, if you want to display logs for `debug` and higher levels, run:

```bash
$ RUST_LOG=debug cargo run
```

You'll now see logs for `debug`, `info`, `warn`, and `error`.

## Conclusion
In this article, we explored how to use the `log` crate in Rust to create a flexible and extensible logging system. By leveraging the `env_logger` crate, we can easily control the log level at runtime using environment variables. Now, you can integrate logging into your Rust applications and enhance your development, debugging, and production monitoring experiences.