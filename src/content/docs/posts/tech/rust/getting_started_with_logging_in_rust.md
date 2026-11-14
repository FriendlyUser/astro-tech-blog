---
title: "Logging in Rust with the log crate and env_logger"
description: "Add logging to a Rust program with the log facade and env_logger, use the five log levels, and control output with the RUST_LOG variable."
pubDate: Saturday, 2 June 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "log"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-26-21-10-41-decentralized-network-diagram-simple-bobble-heads.webp'
---

The [`log`](https://docs.rs/log) crate is Rust's standard logging facade. It gives you the `trace!`, `debug!`, `info!`, `warn!` and `error!` macros, but doesn't print anything by itself. A separate logger implementation decides where messages go and which ones are shown. That split is the point: libraries depend only on `log`, and the application picks one logger for everything.

This post uses [`env_logger`](https://docs.rs/env_logger), the simplest logger, which writes to stderr and is configured through the `RUST_LOG` environment variable.

## Setup

```bash
cargo new log_example
cd log_example
```

Add both crates to `Cargo.toml`:

```toml
[dependencies]
log = "0.4"
env_logger = "0.11"
```

`env_logger` has to go under `[dependencies]`, not `[dev-dependencies]`: `main.rs` uses it, and dev-dependencies are only available to tests, examples, and benchmarks.

## Initialising the logger

`src/main.rs`:

```rust
use env_logger::Env;
use log::{debug, error, info, trace, warn};

fn main() {
    // Use RUST_LOG if it is set; otherwise show `info` and above.
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    info!("Logger initialized!");

    trace!("This is a trace log!");
    debug!("This is a debug log!");
    info!("This is an info log!");
    warn!("This is a warning log!");
    error!("This is an error log!");
}
```

Initialise the logger once, as early as possible in `main`. Any log calls before that are dropped. If you don't need a default level, `env_logger::init()` is the one-line version; without `RUST_LOG` set, it shows only `error` messages.

The levels, from most to least verbose:

- `trace!`: very detailed, step-by-step output.
- `debug!`: information useful while debugging.
- `info!`: normal progress and status messages.
- `warn!`: something unexpected that the program can recover from.
- `error!`: an operation failed.

## Running it

```bash
cargo run
```

With the default filter of `info`, the `trace` and `debug` lines are hidden. The output looks like this (the timestamps will differ):

```text
[2023-06-02T13:00:00Z INFO  log_example] Logger initialized!
[2023-06-02T13:00:00Z INFO  log_example] This is an info log!
[2023-06-02T13:00:00Z WARN  log_example] This is a warning log!
[2023-06-02T13:00:00Z ERROR log_example] This is an error log!
```

Each line shows the time, the level, and the module the message came from.

## Changing the level with RUST_LOG

To show `debug` and above:

```bash
RUST_LOG=debug cargo run
```

In PowerShell, set the variable first:

```powershell
$env:RUST_LOG = "debug"; cargo run
```

`RUST_LOG` also accepts per-module filters, which is what makes it useful in bigger programs. Dependencies that use `log` are filtered the same way:

```bash
# trace for this crate, warnings and errors only for everything else
RUST_LOG=warn,log_example=trace cargo run
```

## Gotchas

- The macros skip formatting their arguments when the level is disabled, but code that runs *before* the macro (building a large debug string, say) still runs. Guard it with `if log::log_enabled!(log::Level::Debug) { ... }`.
- `env_logger`'s default output format isn't guaranteed to stay the same between versions. If something parses your logs, set a format with `Builder::format`.
- For async code or structured fields (request IDs, spans across `.await` points), look at [`tracing`](https://docs.rs/tracing) instead. It can also capture messages from crates that use `log`.

## Further reading

- [log crate docs](https://docs.rs/log)
- [env_logger docs](https://docs.rs/env_logger), including the full `RUST_LOG` syntax
