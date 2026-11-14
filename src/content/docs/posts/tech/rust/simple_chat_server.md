---
title: "Building a TCP chat server and client in Rust with std::net"
description: "A small multi-client chat program using only Rust's standard library: TcpListener, one thread per client, and a shared map of connections for broadcasting."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/176625275.png'
---

This post builds a line-based chat program with nothing but the Rust standard library. One binary runs either as a server, which accepts connections and rebroadcasts every line it receives, or as a client, which sends what you type and prints what others send.

The design is deliberately simple: one OS thread per connected client, and a `Mutex`-protected `HashMap` of client sockets that every thread can write to.

## Project setup

```sh
cargo new chat_server
cd chat_server
```

No dependencies are needed.

## The shared client list

Each client thread needs to write to every *other* client, so the sockets live in a map shared between threads:

```rust
use std::collections::HashMap;
use std::net::{SocketAddr, TcpStream};
use std::sync::{Arc, Mutex};

type Clients = Arc<Mutex<HashMap<SocketAddr, TcpStream>>>;
```

The key is the client's address, which gives us an easy way to skip the sender and to remove a client when it disconnects. (`TcpStream` doesn't implement `PartialEq`, so you can't compare streams directly.)

## The server

`start_server` binds a listener, accepts connections in a loop, stores a clone of each socket in the map, and hands the original to a new thread:

```rust
use std::io::{self, BufRead, BufReader, Write};
use std::net::TcpListener;
use std::thread;

fn start_server(addr: &str) -> io::Result<()> {
    let listener = TcpListener::bind(addr)?;
    println!("Server listening on {addr}");

    let clients: Clients = Arc::new(Mutex::new(HashMap::new()));

    for stream in listener.incoming() {
        let stream = match stream {
            Ok(stream) => stream,
            Err(e) => {
                eprintln!("Failed to accept connection: {e}");
                continue;
            }
        };
        let peer = stream.peer_addr()?;
        println!("New client connected: {peer}");

        // One handle goes in the shared map for broadcasting,
        // the other is read by this client's thread.
        clients.lock().unwrap().insert(peer, stream.try_clone()?);

        let clients = Arc::clone(&clients);
        thread::spawn(move || handle_client(stream, peer, clients));
    }

    Ok(())
}
```

`try_clone` returns a second handle to the same socket. Reading from one handle while other threads write to the other is fine.

`handle_client` reads lines until the client disconnects, broadcasts each line to everyone else, and removes the client from the map at the end:

```rust
fn handle_client(stream: TcpStream, peer: SocketAddr, clients: Clients) {
    let reader = BufReader::new(stream);

    for line in reader.lines() {
        let Ok(line) = line else { break };
        println!("{peer}: {line}");

        let message = format!("{peer}: {line}\n");
        let mut guard = clients.lock().unwrap();
        for (addr, client) in guard.iter_mut() {
            if *addr != peer {
                // A failed write means that client is gone; its own
                // thread will notice and remove it.
                let _ = client.write_all(message.as_bytes());
            }
        }
    }

    clients.lock().unwrap().remove(&peer);
    println!("Client disconnected: {peer}");
}
```

`lines()` yields `None` when the client closes the connection and an `Err` on a socket error or invalid UTF-8; both end the loop.

## The client

The client needs to do two things at once: read your keyboard input and print incoming messages. A second thread handles the incoming side:

```rust
fn start_client(addr: &str) -> io::Result<()> {
    let mut stream = TcpStream::connect(addr)?;
    println!("Connected to {addr}. Type /quit to exit.");

    let incoming = stream.try_clone()?;
    thread::spawn(move || handle_server_messages(incoming));

    for line in io::stdin().lines() {
        let line = line?;
        if line.trim() == "/quit" {
            break;
        }
        writeln!(stream, "{line}")?;
    }

    Ok(())
}

fn handle_server_messages(stream: TcpStream) {
    for line in BufReader::new(stream).lines() {
        match line {
            Ok(line) => println!("{line}"),
            Err(_) => break,
        }
    }
    println!("Disconnected from server");
}
```

Messages are newline-terminated, which is what lets the server use `lines()` to split the byte stream into messages. TCP has no message boundaries of its own.

## `main`

The first argument picks the mode; the optional second argument is the address:

```rust
use std::env;

fn main() -> io::Result<()> {
    let args: Vec<String> = env::args().collect();
    let addr = args.get(2).map(String::as_str).unwrap_or("127.0.0.1:8080");

    match args.get(1).map(String::as_str) {
        Some("server") => start_server(addr),
        Some("client") => start_client(addr),
        _ => {
            eprintln!("usage: chat_server <server|client> [address]");
            Ok(())
        }
    }
}
```

Put all the snippets in `src/main.rs` (the `use` lines can be merged at the top).

## Running it

Open three terminals:

```sh
# terminal 1
cargo run -- server

# terminals 2 and 3
cargo run -- client
```

Lines typed in one client appear in the other, prefixed with the sender's address.

## Limitations

- **One thread per client.** Fine for a handful of users; for many connections, use an async runtime such as Tokio, where each client is a cheap task.
- **Writes happen under the lock.** A client that stops reading can make `write_all` block once its socket buffer fills, which stalls every broadcast. A real server would give each client its own outgoing queue (for example an `mpsc` channel drained by a writer thread).
- **No framing or authentication.** Anyone who can reach the port can connect, and a line without a trailing newline isn't delivered until one arrives.
- **Binding.** `127.0.0.1` only accepts local connections. Bind to `0.0.0.0:8080` to accept connections from other machines.

## Further reading

- [`std::net::TcpListener`](https://doc.rust-lang.org/std/net/struct.TcpListener.html)
- [The Rust Book: Building a Multithreaded Web Server](https://doc.rust-lang.org/book/ch21-00-final-project-a-web-server.html)
