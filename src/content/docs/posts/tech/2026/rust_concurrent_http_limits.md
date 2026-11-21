---
title: "Concurrent HTTP requests in Rust with reqwest and a concurrency limit"
description: "Fetch many URLs at once in Rust without overloading anyone: one shared reqwest Client, buffer_unordered, a Semaphore with JoinSet, timeouts, and collecting errors."
tags: ["Rust", "reqwest", "Tokio", "HTTP", "Concurrency", "futures"]
pubDate: "2026-12-13T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_concurrent_http_limits.webp"
imgAlt: "A timeline of four request slots, each running HTTP requests back to back, with one failed and one timed-out request marked"
---

Sending HTTP requests one after another wastes most of the time waiting on the network. Sending all of them at once can exhaust file descriptors, trip the server's rate limiter, or get your IP blocked. The useful middle ground is *bounded* concurrency: at most N requests in flight, with a new one starting as soon as one finishes.

This post shows two ways to do that with reqwest and Tokio: a `futures` stream with `buffer_unordered`, and spawned tasks gated by a `Semaphore` in a `JoinSet`. It also covers client reuse, timeouts at three levels, and keeping per-URL errors instead of failing the whole batch. The examples use reqwest 0.13.5, Tokio 1.54 and futures 0.3.34.

## Setup

```toml
[dependencies]
futures = "0.3"
reqwest = "0.13"
tokio = { version = "1", features = ["full"] }
```

reqwest's default features include TLS (rustls, since 0.13) and HTTP/2. The examples only read raw bytes, so they don't need the `json` feature.

## One client, reused

```rust
use std::time::Duration;

use reqwest::Client;

fn build_client() -> reqwest::Result<Client> {
    Client::builder()
        .user_agent("concurrent-fetch-example/0.1")
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(15))
        .build()
}

async fn fetch_len(client: &Client, url: &str) -> Result<usize, reqwest::Error> {
    let response = client.get(url).send().await?.error_for_status()?;
    let body = response.bytes().await?;
    Ok(body.len())
}
```

Create the `Client` once and share it. It holds a connection pool, so requests to the same host reuse open TCP and TLS connections instead of doing a new handshake each time. `Client` is a handle around an `Arc`, so cloning it is cheap, and every clone shares the same pool. Building a new client per request is the most common performance mistake with reqwest.

Two details in `fetch_len`:

- `error_for_status()` turns 4xx and 5xx responses into errors. Without it, a 404 is a successful `Response`, and you'd count the error page's length as a result.
- Set a `user_agent`. Some servers reject requests that don't send one, and it tells server operators who to contact.

## Option 1: `buffer_unordered`

`futures::stream::iter` turns the URL list into a stream. `map` turns each URL into a future (not yet started), and `buffer_unordered(n)` polls up to `n` of those futures at a time, yielding results in completion order:

```rust
use futures::stream::{self, StreamExt};

type FetchResult = (String, Result<usize, reqwest::Error>);

async fn fetch_all(client: &Client, urls: Vec<String>, limit: usize) -> Vec<FetchResult> {
    stream::iter(urls)
        .map(|url| async move {
            let result = fetch_len(client, &url).await;
            (url, result)
        })
        .buffer_unordered(limit)
        .collect()
        .await
}
```

Each future returns its URL alongside the result. Results arrive out of order, so without the URL you couldn't tell which error belongs to which request. If you need the output in input order, use `buffered(limit)` instead. It has the same concurrency limit, but holds back finished results until the earlier ones are done.

This approach runs everything inside the *current* task. All the request futures are polled by the one task that awaits the stream, so they never run in parallel with each other. There's no parallel CPU work, but for network I/O that doesn't matter: the futures spend nearly all their time waiting. It also means nothing needs to be `'static`. Borrowing `client` works fine, as above.

## Option 2: a `Semaphore` and a `JoinSet`

When each request is followed by real CPU work (parsing a large HTML page, decompressing, hashing), you want that work spread across threads. That means spawning tasks. A `tokio::sync::Semaphore` with `limit` permits caps how many run at once, and a `JoinSet` collects their results:

```rust
use std::sync::Arc;

use tokio::sync::Semaphore;
use tokio::task::JoinSet;

async fn fetch_all_spawned(client: Client, urls: Vec<String>, limit: usize) -> Vec<FetchResult> {
    let semaphore = Arc::new(Semaphore::new(limit));
    let mut set = JoinSet::new();

    for url in urls {
        // Wait for a free slot *before* spawning, so at most `limit` tasks exist.
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .expect("semaphore is never closed");
        let client = client.clone();
        set.spawn(async move {
            let result = fetch_len(&client, &url).await;
            drop(permit); // free the slot for the next URL
            (url, result)
        });
    }

    let mut results = Vec::new();
    while let Some(joined) = set.join_next().await {
        match joined {
            Ok(pair) => results.push(pair),
            Err(err) => eprintln!("task panicked or was cancelled: {err}"),
        }
    }
    results
}
```

Notes:

- `acquire_owned` needs an `Arc<Semaphore>` and returns an `OwnedSemaphorePermit` that can move into the task. Dropping the permit returns it to the semaphore. Dropping it explicitly, as here, frees the slot as soon as the request is done. If the task then does CPU work, the next request starts in the meantime.
- Acquiring the permit in the loop, before `spawn`, limits how many tasks exist. Acquiring inside the task also limits concurrent requests, but spawns every task immediately. For 100,000 URLs that's 100,000 tasks waiting on the semaphore. It works, but it uses memory for no benefit.
- Spawned tasks must be `'static`, so each one gets its own `Client` clone and owns its `url`.
- `join_next` returns `Err(JoinError)` if a task panicked. One bad response that triggers a panic in your parsing code doesn't take down the batch.
- Dropping a `JoinSet` aborts every task still in it. That's what you want when the caller gives up, and it leads to the next section.

## Timeouts at three levels

1. **Per connection:** `connect_timeout` on the builder bounds TCP and TLS setup. An unreachable host fails fast instead of waiting for the OS's own timeout.
2. **Per request:** `timeout` on the builder bounds the whole request, from connecting to reading the end of the body. Override it for one request with `client.get(url).timeout(Duration::from_secs(60))` when you know a download is large.
3. **Per batch:** wrap the whole operation in `tokio::time::timeout` to put a ceiling on the total time:

```rust
match tokio::time::timeout(Duration::from_secs(30), fetch_all(&client, urls, 8)).await {
    Ok(results) => println!("finished {} requests", results.len()),
    Err(_) => eprintln!("batch did not finish within 30 seconds"),
}
```

When the batch timeout fires, the inner future is dropped. That cancels every request still in flight: the futures in `buffer_unordered` are dropped, and with the `JoinSet` version, dropping the set aborts its tasks. You lose the results that had already completed, though. If you need partial results, push each one into a `Vec` as it arrives (with `while let Some(item) = stream.next().await`) and use `tokio::time::timeout_at` or `select!` around that loop instead.

## Collecting and classifying errors

A batch of requests should almost never fail as a whole because one URL failed. Keep each result next to its URL, then decide what to report:

```rust
fn describe(err: &reqwest::Error) -> String {
    if let Some(status) = err.status() {
        format!("HTTP {status}")
    } else if err.is_timeout() {
        "timed out".to_string()
    } else if err.is_connect() {
        "could not connect".to_string()
    } else {
        err.to_string()
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = build_client()?;
    let urls: Vec<String> = [
        "https://www.rust-lang.org/",
        "https://doc.rust-lang.org/std/",
        "https://blog.rust-lang.org/",
        "https://www.rust-lang.org/this-page-does-not-exist",
        "https://unreachable.invalid/",
    ]
    .into_iter()
    .map(String::from)
    .collect();

    let results = fetch_all(&client, urls, 4).await;

    for (url, result) in &results {
        match result {
            Ok(len) => println!("ok    {url} ({len} bytes)"),
            Err(err) => println!("error {url}: {}", describe(err)),
        }
    }
    let failures = results.iter().filter(|(_, r)| r.is_err()).count();
    println!("{} succeeded, {failures} failed", results.len() - failures);
    Ok(())
}
```

`err.status()` is set for errors created by `error_for_status`. `is_timeout()` covers both the connect and request timeouts. `is_connect()` covers anything that went wrong while opening the connection: refused or unreachable hosts, and DNS lookups, which run as part of connecting (`is_dns()` singles those out). (The `.invalid` top-level domain is reserved and never resolves, which makes it handy for testing the error path.) Swap `fetch_all` for `fetch_all_spawned(client.clone(), urls, 4)` and the output is the same, apart from the order of the lines.

From here, retrying is a policy decision. Timeouts, connection errors, 429 and 5xx responses are usually worth a retry with backoff. Other 4xx responses are not. Keep the retry loop inside the per-URL future, so a retried request keeps its slot instead of queueing again behind everything else.

## Gotchas

- **Concurrency is not a rate limit.** Four requests in flight against a fast server can still be dozens of requests per second. If an API documents a requests-per-second limit, add a `tokio::time::interval` tick before each request, or use a rate-limiting crate.
- **Limit per host, not just globally.** When fetching from many hosts, a single global limit of 50 could put all 50 requests on one host. Keep a `HashMap<String, Arc<Semaphore>>` keyed by host and acquire both the global and the per-host permit.
- **Keep polling the stream.** `buffer_unordered` only makes progress while something polls it. If you pull results with `stream.next().await` and then do slow work before the next pull, the in-flight requests sit idle, and their timeouts keep running. Do slow work in spawned tasks (option 2), or collect first and process afterwards.
- **Read or drop the body.** A response whose body is never read holds its connection until it's dropped. In a loop, make sure every `Response` is consumed or dropped promptly, or the pool runs out of connections.
- **Mind file descriptor limits.** Every open connection is a socket. A concurrency limit in the hundreds can run into the default `ulimit -n` on Linux and macOS.

## Further reading

- [reqwest documentation](https://docs.rs/reqwest/0.13.5/reqwest/), especially `ClientBuilder`
- [`StreamExt::buffer_unordered`](https://docs.rs/futures/0.3.34/futures/stream/trait.StreamExt.html#method.buffer_unordered)
- [`tokio::sync::Semaphore`](https://docs.rs/tokio/latest/tokio/sync/struct.Semaphore.html) and [`tokio::task::JoinSet`](https://docs.rs/tokio/latest/tokio/task/struct.JoinSet.html)
