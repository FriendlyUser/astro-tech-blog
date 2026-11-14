---
title: "A TLS server and client in Rust with rustls and tokio-rustls"
pubDate: "2023-04-20T14:45:32.808Z"
lastUpdated: 2026-11-14
description: "Build a small TLS echo server and client in Rust with rustls 0.23 and tokio-rustls, loading PEM certificates and trusting a local CA."
tags: ["tags", "rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/729981546.png
---

[rustls](https://github.com/rustls/rustls) is a TLS library written in Rust. It's the usual choice when you want TLS in a Rust program without linking OpenSSL: reqwest, hyper-rustls, axum-server and many others build on it. This post builds a small TLS echo server and a client that talks to it, using tokio-rustls for async I/O.

The code targets rustls 0.23.46 and tokio-rustls 0.26.6. The rustls API changed a lot between 0.19 (the version the original version of this post used) and 0.23: `ServerConfig::new`, `NoClientAuth`, `internal::pemfile` and `RootCertStore::add_pem_file` are all gone.

## What rustls is and isn't

- It supports TLS 1.2 and TLS 1.3 only. SSLv3, TLS 1.0 and TLS 1.1 aren't implemented.
- The protocol logic is Rust, but the cryptography comes from a pluggable *crypto provider*. The default provider is [aws-lc-rs](https://github.com/aws/aws-lc-rs); [ring](https://github.com/briansmith/ring) is available through the `ring` feature. Both contain C and assembly, so "pure Rust" only describes the TLS layer.
- Certificate verification is done by [rustls-webpki](https://github.com/rustls/webpki).

## Dependencies

```toml
[dependencies]
rustls = "0.23.46"
tokio-rustls = "0.26.6"
tokio = { version = "1", features = ["full"] }
```

`tokio-rustls` re-exports `rustls` as `tokio_rustls::rustls`, so you can also skip the direct `rustls` dependency. If you do keep both, make sure they resolve to the same rustls 0.23 release, otherwise the config types won't match.

PEM parsing is built in through `rustls::pki_types::pem::PemObject`. The separate `rustls-pemfile` crate that older examples use is no longer needed.

## Getting a certificate for local testing

webpki won't accept a self-signed leaf certificate as its own trust anchor, so you need a CA plus a certificate signed by it. [mkcert](https://github.com/FiloSottile/mkcert) does this in one step:

```sh
mkcert localhost
# writes localhost.pem and localhost-key.pem
cp "$(mkcert -CAROOT)/rootCA.pem" ca.pem
```

## The server

```rust
use std::sync::Arc;

use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio_rustls::TlsAcceptor;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let certs = CertificateDer::pem_file_iter("localhost.pem")?
        .collect::<Result<Vec<_>, _>>()?;
    let key = PrivateKeyDer::from_pem_file("localhost-key.pem")?;

    let config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_single_cert(certs, key)?;
    let acceptor = TlsAcceptor::from(Arc::new(config));

    let listener = TcpListener::bind("127.0.0.1:8443").await?;
    println!("Listening on 127.0.0.1:8443");

    loop {
        let (stream, peer) = listener.accept().await?;
        let acceptor = acceptor.clone();

        tokio::spawn(async move {
            let mut tls = match acceptor.accept(stream).await {
                Ok(tls) => tls,
                Err(err) => {
                    eprintln!("{peer}: handshake failed: {err}");
                    return;
                }
            };

            let mut buf = [0u8; 1024];
            match tls.read(&mut buf).await {
                Ok(n) if n > 0 => {
                    let _ = tls.write_all(&buf[..n]).await;
                    let _ = tls.shutdown().await; // sends TLS close_notify
                }
                Ok(_) => {}
                Err(err) => eprintln!("{peer}: read failed: {err}"),
            }
        });
    }
}
```

`ServerConfig::builder()` uses the default crypto provider and the default protocol versions (TLS 1.2 and 1.3). `with_single_cert` takes the certificate chain (leaf first) and the private key. `PrivateKeyDer::from_pem_file` accepts PKCS#8, PKCS#1 (RSA) and SEC1 (EC) keys.

A failed handshake is logged and only ends that connection's task. The original version of this post called `.unwrap()` there, which would panic the task on any bad client.

## The client

```rust
use std::sync::Arc;

use rustls::pki_types::pem::PemObject;
use rustls::pki_types::{CertificateDer, ServerName};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio_rustls::TlsConnector;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut roots = rustls::RootCertStore::empty();
    for cert in CertificateDer::pem_file_iter("ca.pem")? {
        roots.add(cert?)?;
    }

    let config = rustls::ClientConfig::builder()
        .with_root_certificates(roots)
        .with_no_client_auth();
    let connector = TlsConnector::from(Arc::new(config));

    let stream = TcpStream::connect("127.0.0.1:8443").await?;
    // The name is checked against the server certificate's subject alt names
    let domain = ServerName::try_from("localhost")?.to_owned();
    let mut tls = connector.connect(domain, stream).await?;

    tls.write_all(b"hello over TLS").await?;

    let mut buf = Vec::new();
    tls.read_to_end(&mut buf).await?;
    println!("Server replied: {}", String::from_utf8_lossy(&buf));
    Ok(())
}
```

The client trusts only `ca.pem`. To talk to public servers instead, fill the root store from the [webpki-roots](https://crates.io/crates/webpki-roots) crate (`roots.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned())`) or use the OS certificate store through [rustls-platform-verifier](https://crates.io/crates/rustls-platform-verifier).

Note that `ServerName` must match a name in the certificate. Connecting to `127.0.0.1` but passing `"localhost"` works here because mkcert put `localhost` in the certificate.

## Gotchas

- **Restricting protocol versions**: to allow TLS 1.3 only, use `ClientConfig::builder_with_protocol_versions(&[&rustls::version::TLS13])` (and the matching `ServerConfig` method) instead of `builder()`.
- **Crypto provider conflicts**: `builder()` picks the provider from the enabled crate features. If a dependency enables `ring` while rustls also has `aws-lc-rs` enabled, rustls can't choose one and panics. Fix it by calling `rustls::crypto::aws_lc_rs::default_provider().install_default()` (or the `ring` equivalent) at startup, or use `builder_with_provider`.
- **Closing connections**: call `shutdown()` on the TLS stream so the peer receives `close_notify`. Otherwise the peer sees an unexpected EOF, which rustls reports as an error.

## Further reading

- [rustls API docs](https://docs.rs/rustls/latest/rustls/)
- [tokio-rustls examples](https://github.com/rustls/tokio-rustls/tree/main/examples)
- [rustls-pki-types PEM support](https://docs.rs/rustls-pki-types/latest/rustls_pki_types/pem/trait.PemObject.html)
