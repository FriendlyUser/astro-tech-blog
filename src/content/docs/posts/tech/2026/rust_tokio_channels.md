---
title: "Tokio channels in Rust: mpsc, oneshot, broadcast and watch"
description: "When to use each Tokio channel: bounded mpsc and backpressure, an actor with oneshot replies, broadcast lag, watch for config, and shutting tasks down cleanly."
tags: ["Rust", "Tokio", "Async", "Concurrency", "Channels"]
pubDate: "2026-02-20T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_tokio_channels.webp"
imgAlt: "Four small diagrams of message flow: many senders to one receiver, one to one, one to many, and a single latest value"
---

Tokio ships four channel types in `tokio::sync`, and each one fits a different communication shape between tasks. Picking the right one removes most of the need for `Arc<Mutex<_>>`: instead of sharing state, one task owns it and the others send it messages.

This post covers when to use each channel, shows the patterns I reach for most (bounded queues, an actor with request/reply, config reloads), and ends with how to shut it all down. Examples use Tokio 1.49 with the `full` feature:

```toml
[dependencies]
tokio = { version = "1.49", features = ["full"] }
```

## Which channel for which job

| Channel | Shape | Each message goes to | Typical use |
|---|---|---|---|
| `mpsc` | many senders, one receiver | the single receiver | work queues, actors, log or metrics pipelines |
| `oneshot` | one sender, one receiver, one value | the receiver | replying to a request, returning a result from a task |
| `broadcast` | many senders, many receivers | every receiver (cloned) | events every subscriber should see, like chat messages or cache invalidations |
| `watch` | many senders, many receivers, one value | receivers see the latest value only | config, status, a shutdown flag |

The main question is whether receivers need *every* message (`mpsc`, `broadcast`) or only the *current state* (`watch`). The second question is whether one consumer or all of them should see each message.

## mpsc: queues with backpressure

`mpsc::channel(n)` is bounded. Once `n` messages are buffered, `send().await` waits until the receiver makes room. That's backpressure: a fast producer slows down to the pace of the consumer instead of filling memory.

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    let (tx, mut rx) = mpsc::channel::<String>(8);

    for id in 0..3 {
        let tx = tx.clone();
        tokio::spawn(async move {
            for n in 0..5 {
                // Waits here while 8 messages are already queued.
                if tx.send(format!("producer {id}: item {n}")).await.is_err() {
                    return; // the receiver was dropped
                }
            }
        });
    }
    // Drop the original sender, or recv() below never returns None.
    drop(tx);

    while let Some(msg) = rx.recv().await {
        println!("{msg}");
    }
}
```

`recv()` returns `None` once every `Sender` is gone and the buffer is empty. Forgetting `drop(tx)` here is the most common reason a consumer loop hangs forever: the original sender is still alive in `main`, so the channel never closes.

When waiting is the wrong response to a full queue, for example when sampling telemetry you can afford to lose, use `try_send`:

```rust
use tokio::sync::mpsc::{self, error::TrySendError};

fn record(tx: &mpsc::Sender<u64>, value: u64, dropped: &mut u64) {
    match tx.try_send(value) {
        Ok(()) => {}
        Err(TrySendError::Full(_)) => *dropped += 1,
        Err(TrySendError::Closed(_)) => {} // consumer has shut down
    }
}
```

`mpsc::unbounded_channel()` has a synchronous `send` that never waits. It's handy when sending from code that can't `.await`, such as a `Drop` impl or a callback. But it has no backpressure, so a slow consumer means unbounded memory growth. I'd only use it when something else already limits the message rate.

For plain synchronous threads, the bounded channel also has `blocking_send` and `blocking_recv`. Don't call those from inside async code. They panic when called from within the runtime.

## oneshot: one reply

A `oneshot` carries exactly one value. `Sender::send` is not async (there's no buffer to wait on), and it returns `Err(value)` if the receiver has already been dropped. The `Receiver` is itself a future that resolves to `Result<T, RecvError>`, which is an error if the sender was dropped without sending.

On its own that's a way to get a result back from a spawned task. Combined with `mpsc`, it gives you request/response.

## The actor pattern: mpsc + oneshot

An actor is a task that owns some state and processes commands from an `mpsc` receiver, one at a time. Commands that need an answer carry a `oneshot::Sender`. Callers use a cheap, cloneable handle and never touch the state directly, so there are no locks.

```rust
use std::collections::HashMap;
use tokio::sync::{mpsc, oneshot};

enum Command {
    Set { key: String, value: String },
    Get { key: String, reply: oneshot::Sender<Option<String>> },
}

#[derive(Clone)]
struct KvHandle {
    tx: mpsc::Sender<Command>,
}

impl KvHandle {
    fn spawn() -> Self {
        let (tx, rx) = mpsc::channel(32);
        tokio::spawn(run_kv(rx));
        KvHandle { tx }
    }

    async fn set(&self, key: &str, value: &str) {
        let cmd = Command::Set { key: key.to_string(), value: value.to_string() };
        // An error means the actor has stopped. This example ignores it.
        let _ = self.tx.send(cmd).await;
    }

    async fn get(&self, key: &str) -> Option<String> {
        let (reply, rx) = oneshot::channel();
        self.tx
            .send(Command::Get { key: key.to_string(), reply })
            .await
            .ok()?;
        rx.await.ok().flatten()
    }
}

async fn run_kv(mut rx: mpsc::Receiver<Command>) {
    let mut store = HashMap::new();
    while let Some(cmd) = rx.recv().await {
        match cmd {
            Command::Set { key, value } => {
                store.insert(key, value);
            }
            Command::Get { key, reply } => {
                // The caller may have stopped waiting. That's fine.
                let _ = reply.send(store.get(&key).cloned());
            }
        }
    }
    // Every KvHandle has been dropped, so the loop ends and the task exits.
}

#[tokio::main]
async fn main() {
    let kv = KvHandle::spawn();

    let writer = kv.clone();
    tokio::spawn(async move { writer.set("lang", "rust").await })
        .await
        .unwrap();

    assert_eq!(kv.get("lang").await, Some("rust".to_string()));
    assert_eq!(kv.get("missing").await, None);
    println!("actor answered both requests");
}
```

Some things this structure gets you for free:

- **Shutdown follows ownership.** When the last `KvHandle` is dropped, the channel closes, `recv()` returns `None`, and the actor task ends. You don't need a separate stop message.
- **Ordering.** Commands from one handle are processed in the order they were sent.
- **Backpressure.** The bounded channel limits how many requests can queue up.

The cost is that the actor is a single task, so it processes one command at a time. If a command needs slow I/O, don't `.await` it inside the loop. Spawn the work and let that task reply on the oneshot, or every other caller waits behind it.

## broadcast: everyone sees every message, unless they fall behind

`broadcast::channel(capacity)` gives you a `Sender` and a first `Receiver`. Call `tx.subscribe()` for more receivers. Each receiver gets a clone of every message sent after it subscribed, so `T` must be `Clone`. For large payloads, send an `Arc<T>`.

The buffer is shared and has a fixed capacity. When it's full, sending doesn't wait. It overwrites the oldest message. A receiver that hadn't read that message yet gets `RecvError::Lagged(n)` on its next `recv()`, where `n` is how many messages it missed, and then continues from the oldest message still in the buffer:

```rust
use tokio::sync::broadcast::{self, error::RecvError};

#[tokio::main]
async fn main() {
    let (tx, mut rx) = broadcast::channel::<u32>(2);

    for n in 1..=5 {
        tx.send(n).unwrap();
    }

    // Only the last two values fit in the buffer; 1, 2 and 3 were overwritten.
    assert_eq!(rx.recv().await, Err(RecvError::Lagged(3)));
    assert_eq!(rx.recv().await, Ok(4));
    assert_eq!(rx.recv().await, Ok(5));
    println!("lagged receiver caught up");
}
```

That means a broadcast receiver loop has to handle three cases, not two:

```rust
use tokio::sync::broadcast::{self, error::RecvError};

async fn listen(mut rx: broadcast::Receiver<String>) {
    loop {
        match rx.recv().await {
            Ok(event) => println!("got {event}"),
            Err(RecvError::Lagged(missed)) => eprintln!("missed {missed} events"),
            Err(RecvError::Closed) => break,
        }
    }
}
```

Treating `Lagged` as fatal (`while let Ok(event) = rx.recv().await`) is a common bug. A slow subscriber then silently stops listening the first time it falls behind. Whether skipping messages is acceptable depends on your data. If a subscriber must never miss anything, give it its own `mpsc` channel instead.

Also note that `tx.send` returns an error when there are no receivers at all, and `Ok(n)` with the number of receivers otherwise. Code that broadcasts events nobody may be listening to yet should not `unwrap()` that result.

## watch: the latest value

A `watch` channel stores one value. Receivers can read it at any time with `borrow()`, and wait for it to change with `changed()`. Intermediate values can be skipped: if the sender updates three times before a receiver looks, the receiver only sees the last one. For configuration, that's exactly what you want.

```rust
use std::time::Duration;
use tokio::sync::watch;

#[derive(Clone, Debug)]
struct Config {
    log_level: String,
    max_connections: usize,
}

#[tokio::main]
async fn main() {
    let initial = Config { log_level: "info".into(), max_connections: 10 };
    let (tx, mut rx) = watch::channel(initial);

    let worker = tokio::spawn(async move {
        // The initial value counts as seen, so this waits for the first update.
        while rx.changed().await.is_ok() {
            let config = rx.borrow_and_update().clone();
            println!("worker now using {config:?}");
        }
        println!("config sender dropped, worker exiting");
    });

    tx.send_modify(|c| c.log_level = "debug".into());
    tokio::time::sleep(Duration::from_millis(10)).await;
    tx.send_modify(|c| c.max_connections = 50);

    drop(tx);
    worker.await.unwrap();
}
```

Details worth knowing:

- `borrow()` and `borrow_and_update()` return a guard that holds a read lock. Clone what you need and drop the guard quickly. Don't hold it across an `.await`. The guard isn't `Send`, so in a spawned task the compiler stops you anyway.
- `borrow_and_update()` marks the value as seen, `borrow()` doesn't. `changed()` also marks the value it woke for, but if another update lands before you read, `borrow()` hands you the newer value without marking it, and the next `changed()` fires for a value you've already handled. Inside a `changed()` loop, use `borrow_and_update()`.
- `send()` fails if there are no receivers, and then the value is *not* stored. `send_modify` and `send_replace` always update the value, so receivers that subscribe later still see it. For config, I use those.
- `changed()` returns an error only when the sender is gone *and* the current value has already been seen. A final update sent just before the sender is dropped is still delivered.

## Shutting down

There are two ways tasks end in channel-based code.

**Close the channel.** Drop every sender and the receiver loops end on their own, as in the actor above. This is the cleanest option when the producers are finished.

**Signal a stop.** Long-running workers whose senders live forever need an explicit signal. A `watch::channel(false)` works well, because every worker can hold a receiver and the "stopped" state stays visible to tasks that check it later:

```rust
use std::time::Duration;
use tokio::sync::{mpsc, watch};

async fn worker(mut jobs: mpsc::Receiver<u64>, mut shutdown: watch::Receiver<bool>) {
    loop {
        tokio::select! {
            job = jobs.recv() => match job {
                Some(n) => println!("processing job {n}"),
                None => break, // every job sender is gone
            },
            _ = shutdown.changed() => {
                println!("shutdown requested");
                break;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let (job_tx, job_rx) = mpsc::channel(16);
    let (shutdown_tx, shutdown_rx) = watch::channel(false);

    let handle = tokio::spawn(worker(job_rx, shutdown_rx));

    for n in 0..3 {
        job_tx.send(n).await.unwrap();
    }
    tokio::time::sleep(Duration::from_millis(50)).await;

    shutdown_tx.send(true).unwrap();
    handle.await.unwrap();
}
```

Two caveats. First, `select!` picks randomly among branches that are ready, so a worker told to stop may leave jobs in the queue. If those jobs must finish, call `jobs.close()` when shutdown is requested. That stops new sends but lets you keep calling `recv()` until it returns `None`. Second, `changed()` also returns (with an error) if the shutdown sender is dropped, so this worker stops in that case too. That's usually what you want.

If you already depend on `tokio-util`, its `CancellationToken` does the same job with a nicer API (`token.cancelled().await`, plus child tokens for cancelling groups of tasks).

## Gotchas

- **A clone of the sender kept by accident** keeps an `mpsc` channel open forever. Look for one held in a struct, or captured by a closure that never finishes.
- **Channel capacity is not a performance knob to max out.** A huge bound hides a slow consumer until memory runs out. Size it for the bursts you expect, and measure.
- **Don't block inside a consumer loop.** A synchronous `std::fs` call or a CPU-heavy loop stalls the runtime thread. Use `spawn_blocking` for that work.
- **`std::sync::mpsc` is not interchangeable.** Its `recv()` blocks the thread, which stalls a Tokio worker. Use the Tokio channels in async code.

## Further reading

- [`tokio::sync` module docs](https://docs.rs/tokio/latest/tokio/sync/index.html), whose "Message passing" section describes each channel type
- [Tokio tutorial: Channels](https://tokio.rs/tokio/tutorial/channels)
- [Actors with Tokio](https://ryhl.io/blog/actors-with-tokio/) by Alice Ryhl, a Tokio maintainer
