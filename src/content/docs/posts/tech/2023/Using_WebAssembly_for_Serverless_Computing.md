---
title: "WebAssembly for serverless functions: why it fits and a first Spin app"
pubDate: "2025-03-08T04:07:08.000Z"
lastUpdated: 2026-11-14
description: "Why WebAssembly suits serverless functions, which platforms run it (Fastly Compute, Cloudflare Workers, Spin), and how to build a Rust HTTP function with Spin."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2515566937.png
---

Serverless platforms run your code per request and scale it for you. Most of them do that with containers or microVMs, which means a cold start has to boot an environment before your handler runs. WebAssembly (Wasm) offers a lighter unit: a sandboxed module that a runtime can instantiate inside an existing process, with no OS to boot.

This post covers why that matters, which platforms use it, and how to build and run a small HTTP function with Spin.

## Why Wasm suits serverless

- **Fast instantiation.** A precompiled Wasm module is instantiated inside the host process, so creating a fresh instance per request is practical. Spin, for example, does exactly that.
- **Isolation by default.** A module can only access its own linear memory and the host functions it is given. File system, network and environment access are explicit capabilities (WASI), so many tenants can share one host process.
- **Small artifacts.** You deploy a `.wasm` file, not a container image with an OS layer.
- **Several source languages.** Rust, C/C++, Go (via TinyGo or the standard toolchain's WASI target) and others compile to Wasm. Language support varies by platform, so check before committing.

The trade-offs: no arbitrary native libraries, threads are limited, and each platform exposes its own host APIs, so "portable" mostly means portable across runtimes that implement the same WASI and component-model interfaces (WASI 0.2 and later).

## Where you can run it

- **[Fastly Compute](https://www.fastly.com/documentation/guides/compute/)** (formerly Compute@Edge) compiles your code to Wasm and runs it on Fastly's edge network.
- **[Cloudflare Workers](https://developers.cloudflare.com/workers/)** run JavaScript in V8 isolates and can also load Wasm modules; Rust Workers use the `workers-rs` crate, which compiles to Wasm.
- **[Spin](https://spinframework.dev/)** is an open-source framework for Wasm HTTP apps, built on Wasmtime and now a CNCF project. You can run it locally, on Kubernetes via SpinKube, or on Fermyon's hosted service (Fermyon is now part of Akamai).
- **Standalone runtimes** like [Wasmtime](https://wasmtime.dev/) and [Wasmer](https://wasmer.io/) let you embed Wasm in your own host service.

## A first Spin function in Rust

[Install Spin](https://spinframework.dev/v3/install) and Rust, then add the WASI target Spin builds for:

```bash
rustup target add wasm32-wasip1
```

Create an app from the Rust HTTP template. `spin new` prompts for a template; pick `http-rust`, name it `hello_rust`, and accept the default route `/...`:

```bash
spin new
cd hello_rust
```

The template generates this handler in `src/lib.rs`:

```rust
use spin_sdk::http::{IntoResponse, Request, Response};
use spin_sdk::http_component;

/// A simple Spin HTTP component.
#[http_component]
fn handle_hello_rust(req: Request) -> anyhow::Result<impl IntoResponse> {
    println!("Handling request to {:?}", req.header("spin-full-url"));
    Ok(Response::builder()
        .status(200)
        .header("content-type", "text/plain")
        .body("Hello, Fermyon")
        .build())
}
```

Build and run it locally:

```bash
spin build
spin up
```

`spin up` serves on `http://127.0.0.1:3000` by default (use `--listen` to pick another address). Each request gets a fresh instance of the component, so there is no shared in-memory state between requests; use Spin's key-value store or an external database for that.

## When not to use it

- Your function depends on native libraries or language runtimes that don't compile to Wasm (many Python C extensions, for example).
- You need long-running work, background threads, or raw sockets. Container-based serverless (AWS Lambda, Cloud Run) is less restrictive.
- You want to move between providers freely. Fastly, Cloudflare and Spin each have their own SDKs and host APIs, so handler code is not drop-in portable.

## Further reading

- [Spin documentation](https://spinframework.dev/)
- [Fastly Compute guides](https://www.fastly.com/documentation/guides/compute/)
- [Cloudflare Workers: WebAssembly](https://developers.cloudflare.com/workers/runtime-apis/webassembly/)
- [WASI](https://wasi.dev/)
