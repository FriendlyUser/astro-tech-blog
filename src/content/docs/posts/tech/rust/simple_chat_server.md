---
title: "How to create a simple chat server and client using Rust's networking capabilities"
description: In this article, we will explore how to create a simple chat server and client using Rust's networking capabilities. We will use Rust's standard library to implement basic networking functionality and create a text-based interface for sending and receiving messages between clients.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/176625275.png'
---


Introduction

In this article, we will explore how to create a simple chat server and client using Rust's networking capabilities. We will use Rust's standard library to implement basic networking functionality and create a text-based interface for sending and receiving messages between clients.

Setting up the Project

To get started, we need to set up a new Rust project. To create a new Rust project, open a terminal window and run the following command:

```
$ cargo new chat_server
```

This command will create a new Rust project named `chat_server`. The project will contain a `Cargo.toml` file that describes the project's dependencies and a `src` directory that contains the project's source code.

The `Cargo.toml` file will look like this:

```toml
[package]
name = "chat_server"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2018"

[dependencies]
```

We will add dependencies to the `Cargo.toml` file as we need them.

Creating the Server

To create the chat server, we will use Rust's standard library to implement basic networking functionality.

We will create a function named `start_server` that will create a TCP listener on a specified port and accept incoming connections.

```rust
use std::io::{BufRead, BufReader};
use std::net::{TcpListener, TcpStream};

fn start_server(port: u32) {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();
    println!("Server listening on port {}", port);

    for stream in listener.incoming() {
        let stream = stream.unwrap();
        println!("New client connected: {:?}", stream.peer_addr().unwrap());
    }
}
```

In this function, we use the `TcpListener` struct to create a TCP listener on the specified port. We then use a `for` loop to accept incoming connections and print a message for each new connection.

We will also create a function named `handle_client` that will handle communication with a single client. This function will take a `TcpStream` object as a parameter and read messages from the client.

```rust
fn handle_client(stream: TcpStream) {
    let mut reader = BufReader::new(&stream);

    loop {
        let mut buffer = String::new();
        let bytes_read = reader.read_line(&mut buffer).unwrap();

        if bytes_read == 0 {
            break;
        }

        println!("Received message: {:?}", buffer.trim());

        // TODO: Broadcast message to all clients
    }

    println!("Client disconnected: {:?}", stream.peer_addr().unwrap());
}
```

In this function, we use a `BufReader` to read messages from the client. We use a `loop` to read messages continuously until the client disconnects. We print each message to the console and broadcast it to all connected clients (which we will implement later).

Creating the Client

To create the chat client, we will also use Rust's standard library to implement basic networking functionality and create a text-based interface for sending and receiving messages.

We will create a function named `start_client` that will connect to a specified server and port and create a text-based interface for sending and receiving messages.

```rust
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::thread;

fn start_client(server: &str, port: u32) {
    let mut stream = TcpStream::connect(format!("{}:{}", server, port)).unwrap();
    println!("Connected to server {}:{}", server, port);

    let stream_clone = stream.try_clone().unwrap();
    thread::spawn(move || {
        handle_server_messages(stream_clone);
    });

    let mut reader = BufReader::new(std::io::stdin());

    loop {
        let mut buffer = String::new();
        reader.read_line(&mut buffer).unwrap();

        if buffer.trim() == "/quit" {
            break;
        }

        stream.write_all(buffer.as_bytes()).unwrap();
    }

    println!("Disconnected from server");
}
```

In this function, we use the `TcpStream` struct to connect to the specified server and port. We then create a separate thread to handle incoming messages from the server using the `handle_server_messages` function (which we will implement later).

We use a `BufReader` to read input from the user and send each message to the server using the `write_all` method of the `TcpStream` object. We use a `loop` to read input continuously until the user types `/quit` to disconnect from the server.

Handling Communication

To handle communication between clients, we will use a simple broadcast mechanism. Whenever a client sends a message, the server will broadcast the message to all connected clients.

We will modify the `handle_client` function to take a reference to a vector of `TcpStream` objects as a parameter. This vector will contain all connected clients.

```rust
fn handle_client(stream: TcpStream, clients: &mut Vec<TcpStream>) {
let mut reader = BufReader::new(&stream);

  loop {
      let mut buffer = String::new();
      let bytes_read = reader.read_line(&mut buffer).unwrap();

      if bytes_read == 0 {
          break;
      }

      println!("Received message: {:?}", buffer.trim());

      for client in clients.iter_mut() {
          if *client != stream {
              client.write_all(buffer.as_bytes()).unwrap();
          }
      }
  }

  println!("Client disconnected: {:?}", stream.peer_addr().unwrap());
  clients.retain(|client| *client != stream);
}
```

In this modified function, we use a `for` loop to broadcast the message to all connected clients except for the client that sent the message. We use the `write_all` method of the `TcpStream` object to send the message to each client.

We also add the connected client's `TcpStream` object to the vector of connected clients when a new client connects and remove it from the vector when the client disconnects.

We will modify the `start_server` function to keep track of all connected clients using a vector of `TcpStream` objects.

```rust
fn start_server(port: u32) {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).unwrap();
    println!("Server listening on port {}", port);

    let mut clients = Vec::new();

    for stream in listener.incoming() {
        let stream = stream.unwrap();
        println!("New client connected: {:?}", stream.peer_addr().unwrap());

        clients.push(stream.try_clone().unwrap());

        let clients_clone = clients.clone();
        thread::spawn(move || {
            handle_client(stream, &mut clients_clone);
        });
    }
}
```

In this modified function, we create a vector of TcpStream objects named clients to keep track of all connected clients. When a new client connects, we push its TcpStream object to the clients vector and create a new thread to handle communication with the client using the handle_client function.

We use the try_clone method of the TcpStream object to create a new TcpStream object for the new thread that represents the same connection. This allows multiple threads to communicate with the same client simultaneously.

Handling Server Messages

To handle incoming messages from the server, we will modify the start_client function to read messages from the server and print them to the console.

```rust
fn handle_server_messages(mut stream: TcpStream) {
    let mut reader = BufReader::new(&stream);

    loop {
        let mut buffer = String::new();
        let bytes_read = reader.read_line(&mut buffer).unwrap();

        if bytes_read == 0 {
            break;
        }

        println!("{}", buffer.trim());
    }

    println!("Disconnected from server");
}
```

In this function, we use a BufReader to read incoming messages from the server and print them to the console using the println macro.

We modify the start_client function to create a separate thread to handle incoming messages from the server using the handle_server_messages function.

Putting it All Together

To run the chat server and client, we can add the following code to the main function in the src/main.rs file of the chat_server project:

```rust
use std::thread;

fn main() {
    let server_port = 8080;
    let client_port = 8081;

    thread::spawn(move || {
        start_server(server_port);
    });

    start_client("127.0.0.1", client_port);
}
```
In this code, we create a new thread to start the chat server on port 8080 using the start_server function. We then start the chat client on port 8081 using the start_client function.

Conclusion

In this article, we have explored how to create a simple chat server and client using Rust's networking capabilities. We have used Rust's standard library to implement basic networking functionality and create a text-based interface for sending and receiving messages between clients. We have also used Rust's thread support to handle multiple clients simultaneously. With this knowledge, you can now create your own Rust networking applications and explore the full potential of this powerful programming language.