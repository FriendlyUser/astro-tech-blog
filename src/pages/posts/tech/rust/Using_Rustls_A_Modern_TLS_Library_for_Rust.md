---
title: Using Rustls A Modern TLS Library for Rust
pubDate: "2023-04-20T14:45:32.808Z"
description: "In this article, we will discuss how to use Rustls in Rust projects."
tags: ["tags"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/729981546.png
---
# Using Rustls: A Modern TLS Library for Rust

Rust is a systems programming language with a focus on safety, concurrency, and performance. One critical component in ensuring safety and privacy in network communication is the use of TLS (Transport Layer Security). Rustls is a modern, efficient, and safe TLS library implemented in Rust. In this article, we will discuss how to use Rustls in Rust projects.

## Overview of Rustls

Rustls is a pure-Rust implementation of TLS that provides a safe, efficient, and easy-to-use API. It is built on top of *ring* for cryptographic operations and *webpki* for certificate handling. Rustls supports TLS 1.2 and 1.3, and it aims to provide a safer and more efficient alternative to OpenSSL.

Some key features of Rustls include:

- Pure Rust implementation, avoiding common pitfalls of C-based libraries
- Modern, safe, and efficient cryptographic primitives provided by *ring*
- Support for TLS 1.2 and 1.3
- No support for old, insecure protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1)
- Clear and concise API

## Getting Started with Rustls

To get started, add Rustls as a dependency in your `Cargo.toml`:

```toml
[dependencies]
rustls = "0.19"
tokio-rustls = "0.23"
```

The `tokio-rustls` crate provides async support for Rustls when using the Tokio runtime, which is commonly used in Rust-based network applications.

## Creating a Rustls Server

Let's create a simple TLS server using Rustls and Tokio. First, we need to import the necessary crates:

```rust
use rustls::{ServerConfig, NoClientAuth, AllowAnyAuthenticatedClient, internal::pemfile};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;
use std::sync::Arc;
use std::fs::File;
use std::io::BufReader;
```

Next, we'll create a function to configure the server's TLS settings:

```rust
fn configure_tls() -> Result<ServerConfig, Box<dyn std::error::Error>> {
    let mut config = ServerConfig::new(NoClientAuth::new());

    let cert_file = File::open("cert.pem")?;
    let key_file = File::open("key.pem")?;
    let mut cert_reader = BufReader::new(cert_file);
    let mut key_reader = BufReader::new(key_file);

    let cert_chain = pemfile::certs(&mut cert_reader).unwrap();
    let mut keys = pemfile::pkcs8_private_keys(&mut key_reader).unwrap();

    config.set_single_cert(cert_chain, keys.remove(0))?;

    Ok(config)
}
```

In this function, we create a `ServerConfig` with no client authentication. We then read the server's certificate and private key from PEM files and configure the server to use them.

Now, let's create an async function to start the server:

```rust
async fn start_server() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "127.0.0.1:8080";
    let tcp_listener = TcpListener::bind(addr).await?;
    let tls_config = configure_tls()?;
    let tls_acceptor = TlsAcceptor::from(Arc::new(tls_config));

    println!("Server is listening on {}", addr);

    loop {
        let (stream, _) = tcp_listener.accept().await?;
        let tls_acceptor = tls_acceptor.clone();

        tokio::spawn(async move {
            let tls_stream = tls_acceptor.accept(stream).await.unwrap();
            println!("Client connected");
        });
    }
}
```

This function creates a TCP listener on a specified address, configures the TLS settings using the previously defined function, and creates a `TlsAcceptor`. We then accept incoming connections in a loop, spawning a new task to handle each connection.

To run the server, simply call `start_server().await` in your `main` function.

## Creating a Rustls Client

Now that we have a server, let's create a client that connects to it. Import the necessary crates:

```rust
use rustls::{ClientConfig, ProtocolVersion, RootCertStore};
use tokio::net::TcpStream;
use tokio_rustls::TlsConnector;
use std::sync::Arc;
use std::fs::File;
use std::io::BufReader;
```

Next, create a function to configure the client's TLS settings:

```rust
fn configure_tls() -> Result<ClientConfig, Box<dyn std::error::Error>> {
    let mut config = ClientConfig::new();
    config.versions = vec![ProtocolVersion::TLSv1_2, ProtocolVersion::TLSv1_3];

   let root_cert_file = File::open("ca.pem")?;
    let mut root_cert_reader = BufReader::new(root_cert_file);
    let mut root_store = RootCertStore::empty();
    root_store.add_pem_file(&mut root_cert_reader).unwrap();

    config.root_store = root_store;

    Ok(config)
}
```

In this function, we create a `ClientConfig` and set the supported TLS protocol versions. Then, we read the CA certificate used to sign the server's certificate from the PEM file and add it to the client's root certificate store.

Now, let's create an async function to connect to the server:

```rust
async fn connect_to_server() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "127.0.0.1:8080";
    let tcp_stream = TcpStream::connect(addr).await?;
    let tls_config = configure_tls()?;
    let tls_connector = TlsConnector::from(Arc::new(tls_config));

    println!("Connecting to {}", addr);

    let tls_stream = tls_connector.connect("localhost", tcp_stream).await?;
    println!("Connected to server");

    // Use `tls_stream` to communicate with the server
}
```

This function connects to the server using a TCP stream, configures the TLS settings using the previously defined function, and creates a `TlsConnector`. We then use the `TlsConnector` to establish a TLS session with the server.

To connect to the server, simply call `connect_to_server().await` in your `main` function.

## Conclusion

In this article, we have demonstrated how to use Rustls to create a simple TLS server and client in Rust. Rustls provides a modern, safe, and efficient alternative to OpenSSL, making it an excellent choice for Rust-based network applications. By leveraging the power of Rust and its ecosystem, you can build secure and efficient network applications with ease.

