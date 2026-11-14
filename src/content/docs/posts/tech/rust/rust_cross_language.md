---
title: "Rust and other languages: FFI, WebAssembly, and gRPC compared"
description: "Three ways to make Rust work with other languages: in-process calls over the C ABI, compiling to WebAssembly, and gRPC services over the network."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---

When Rust has to work with code in another language, there are three common options, and they sit at very different distances from each other:

- **FFI**: both languages run in the same process and call each other's functions directly through the C ABI.
- **WebAssembly**: Rust compiles to a sandboxed module that a host (a browser, Node.js, or a runtime like Wasmtime) loads and calls.
- **gRPC**: each side is a separate service, and they talk over the network using a shared Protocol Buffers schema.

The examples below use Rust edition 2024 (the default for `cargo new` since Rust 1.85), which requires `unsafe extern` blocks and `#[unsafe(no_mangle)]`. Older editions accept the same code without the extra `unsafe`.

## FFI

Rust's foreign function interface lets Rust call any function that follows the C calling convention, and lets other languages call Rust functions exported with it. You declare the foreign function in an `extern "C"` block:

```rust
unsafe extern "C" {
    fn my_c_function(arg1: i32, arg2: f64) -> f64;
}

fn main() {
    let result = unsafe { my_c_function(42, 3.14) };
    println!("Result: {result}");
}
```

This compiles, but it only links if `my_c_function` is actually provided, either by a static or shared library named with `#[link(name = "...")]` or by C code compiled in a build script (the [`cc`](https://crates.io/crates/cc) crate is the usual way). Calls are `unsafe` because the compiler can't check that the declaration matches the real function or that the C code upholds Rust's rules.

The C ABI is the common denominator. C++ code needs `extern "C"` wrapper functions (or the [`cxx`](https://cxx.rs/) crate), and most "Rust from language X" tools are built on it, such as [PyO3](https://pyo3.rs/) for Python and [napi-rs](https://napi.rs/) for Node.js.

Trade-offs: calls are as cheap as a normal function call, but you handle memory ownership, string encoding, and error codes by hand at the boundary, and a bug on the C side can crash the whole process.

## WebAssembly

WebAssembly (Wasm) is a portable bytecode format. Browsers run it, and so do standalone runtimes such as Wasmtime and Wasmer. Rust can compile to it directly.

A minimal exported function:

```rust
// src/lib.rs
#[unsafe(no_mangle)]
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

The crate must be built as a `cdylib`:

```toml
# Cargo.toml
[lib]
crate-type = ["cdylib"]
```

```sh
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
# output: target/wasm32-unknown-unknown/release/<crate_name>.wasm
```

Load it from JavaScript (after renaming or serving the output as `add.wasm`):

```javascript
fetch('add.wasm')
  .then(response => response.arrayBuffer())
  .then(bytes => WebAssembly.instantiate(bytes))
  .then(({ instance }) => {
    console.log(instance.exports.add(2, 3)); // 5
  });
```

Raw Wasm exports only pass numbers. To pass strings, structs, or JavaScript objects, use [`wasm-bindgen`](https://wasm-bindgen.github.io/wasm-bindgen/), which generates the JavaScript glue code. `wasm-pack` is a build tool that runs `cargo` and `wasm-bindgen` together and packages the result for npm.

Trade-offs: Wasm runs in a sandbox. In the browser it can't touch the DOM or network directly and has to call imported JavaScript functions for that. Outside the browser, WASI runtimes only grant file system or network access you explicitly allow. That isolation is the point, but crossing the boundary with anything other than numbers costs copying and glue code.

## gRPC

gRPC is an RPC framework where services are defined in a Protocol Buffers (`.proto`) file. Code generators turn that file into client and server code for each language, and messages travel over HTTP/2 in protobuf's binary encoding.

The schema is language-neutral. This one defines a `Greeter` service any language can implement or call:

```protobuf
syntax = "proto3";

package hello;

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

In Rust, the usual implementation is [`tonic`](https://github.com/hyperium/tonic), which uses `prost` for the protobuf types. A build script generates a `Greeter` trait for the server and a `GreeterClient` for callers from the `.proto` file; you implement the trait and run it on a Tokio runtime. A Python or Go client generated from the same file can then call your Rust server.

Trade-offs: each call is a network round trip with serialization, so it's far slower than an in-process call. In return, the services are fully isolated, can be deployed and scaled separately, and the schema gives you typed contracts with rules for evolving them. Browsers can't speak gRPC directly; they need gRPC-Web and a proxy.

## Which to pick

- Calling an existing C or C++ library, or speeding up a hot path in Python or Node: **FFI**.
- Running Rust in the browser, or running untrusted plugins in a sandbox: **WebAssembly**.
- Separate services owned by different teams or deployed independently: **gRPC**.

## Further reading

- [The Rustonomicon: FFI](https://doc.rust-lang.org/nomicon/ffi.html)
- [wasm-bindgen guide](https://wasm-bindgen.github.io/wasm-bindgen/)
- [gRPC documentation](https://grpc.io/docs/)
- [tonic](https://docs.rs/tonic)
