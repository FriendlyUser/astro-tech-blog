---
title: "Getting started with the tracing crate in Rust: spans, events and tokio-console"
pubDate: "2023-04-22T16:25:04.953Z"
lastUpdated: 2026-11-14
description: "Add structured spans and events to a Rust program with tracing and tracing-subscriber, time spans, and inspect async tasks with tokio-console."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

[`tracing`](https://docs.rs/tracing) is the Tokio project's library for structured, contextual diagnostics.
Where a plain logger records isolated lines, `tracing` records **spans** (a period of time, like a function
call or a request) and **events** (a point in time inside a span), so every log line knows which request or
task it belongs to. You instrument your code once, then choose at startup what to do with the data:
print it, filter it, time it, or ship it to another tool.

## Setup

`tracing` provides the macros you put in your code; a *subscriber* decides what happens to the data.
`tracing-subscriber` provides the usual one.

```toml
[dependencies]
tracing = "0.1"
tracing-subscriber = "0.3"
```

(The crate name uses a hyphen; you refer to it as `tracing_subscriber` in code. This post was checked against
`tracing` 0.1.44 and `tracing-subscriber` 0.3.23.)

```rust
use tracing::{info, instrument};

fn main() {
    // Install a global subscriber that prints events to stdout.
    tracing_subscriber::fmt::init();

    some_function(42);
}

#[instrument]
fn some_function(id: u32) {
    info!("doing some work");
}
```

`fmt::init()` installs a formatting subscriber globally (it panics if one is already installed). With the
default features it prints events at `INFO` and above; if you enable the `env-filter` feature it reads the
filter from `RUST_LOG` instead, e.g. `RUST_LOG=debug cargo run`.

`#[instrument]` wraps the function body in a span named after the function and records its arguments as
fields using their `Debug` impls, so the event above prints with `some_function{id=42}` as context. Use
`#[instrument(skip(big_arg))]` for arguments that are large or don't implement `Debug`.

## Spans and events

- A **span** has a start and end, can carry fields, and nests inside other spans.
- An **event** is a single point in time. It is recorded inside whatever span is current.

Create a span manually with `span!` (or the level shortcuts `info_span!`, `debug_span!`, …) and enter it:

```rust
use tracing::{info, info_span};

fn main() {
    tracing_subscriber::fmt::init();

    let span = info_span!("load_config", path = "app.toml");
    let _guard = span.enter();

    info!(entries = 3, "config loaded"); // recorded inside load_config
} // span exited when _guard drops
```

Events take structured fields (`entries = 3`) in addition to the message, which is what makes the output
filterable and machine-readable (`tracing_subscriber::fmt().json()` with the `json` feature).

:::caution
Don't hold the guard from `span.enter()` across an `.await`. When the task yields, the span stays "entered"
on that thread and gets attached to unrelated work. For async code use `#[instrument]` on the `async fn`,
or `future.instrument(span)` from the `tracing::Instrument` trait.
:::

## Timing spans

For quick performance checks you don't need extra tools. Ask the `fmt` subscriber to log when spans close;
it adds `time.busy` (time spent inside the span) and `time.idle` (time the span existed but wasn't entered):

```rust
use tracing::instrument;
use tracing_subscriber::fmt::format::FmtSpan;

fn main() {
    tracing_subscriber::fmt()
        .with_span_events(FmtSpan::CLOSE)
        .init();

    slow();
}

#[instrument]
fn slow() {
    std::thread::sleep(std::time::Duration::from_millis(200));
}
```

The `idle` time is mostly useful for async code, where it shows how long a future spent waiting rather
than running.

## Inspecting async tasks with tokio-console

For Tokio applications, [tokio-console](https://github.com/tokio-rs/console) is a terminal UI ("top for
tasks") that shows every task, how long it has been busy or idle, and how often it has been polled. It
needs three things:

1. The `console-subscriber` crate (0.5.0 at the time of writing) in your app:

   ```toml
   [dependencies]
   console-subscriber = "0.5"
   tokio = { version = "1", features = ["full", "tracing"] }
   ```

2. A call to `console_subscriber::init()` at the top of `main` (instead of `tracing_subscriber::fmt::init()`):

   ```rust
   #[tokio::main]
   async fn main() {
       console_subscriber::init();

       // your application code
   }
   ```

3. Tokio's unstable instrumentation turned on at build time, either with
   `RUSTFLAGS="--cfg tokio_unstable" cargo run` or in `.cargo/config.toml`:

   ```toml
   [build]
   rustflags = ["--cfg", "tokio_unstable"]
   ```

Then install and run the console in another terminal. It connects to `http://127.0.0.1:6669` by default:

```sh
cargo install --locked tokio-console
tokio-console
```

## Further reading

- [`tracing` docs](https://docs.rs/tracing)
- [`tracing-subscriber` docs](https://docs.rs/tracing-subscriber)
- [tokio-console repository](https://github.com/tokio-rs/console)
- [Tokio's tracing guide](https://tokio.rs/tokio/topics/tracing)
