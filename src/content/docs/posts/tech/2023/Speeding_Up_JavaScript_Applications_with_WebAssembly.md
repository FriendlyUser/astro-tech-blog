---
title: "Calling WebAssembly from JavaScript: exports, imports and when it is faster"
pubDate: "2024-12-31T00:03:37.000Z"
lastUpdated: 2026-11-14
description: "How to load a .wasm module in the browser, call its exports, pass JavaScript functions in as imports, and decide whether moving code to WebAssembly will help."
tags: ["javascript", "rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2734189697_A_dream_of_a_distant_galaxy__concept_art__matte_painting__HQ__4k.png
---

WebAssembly (Wasm) is a binary instruction format that browsers (and runtimes like Node.js) can run alongside JavaScript. You compile C, C++, Rust or another language to a `.wasm` module and call its functions from JS. The usual reason to do this is CPU-heavy work, such as image or audio processing, compression, parsing or simulation, or reusing an existing native library on the web.

This post covers loading a module, calling its exports, passing JavaScript functions in as imports, and how to tell whether Wasm will actually make your code faster.

## A minimal module in C

The simplest way to see the JS/Wasm boundary is a C file compiled with plain Clang, without any generated glue code:

```c
// module.c
__attribute__((import_module("env"), import_name("jsLog")))
void jsLog(int value);

__attribute__((export_name("add")))
int add(int a, int b) {
  return a + b;
}

__attribute__((export_name("log_message")))
void log_message(void) {
  jsLog(42);
}
```

```bash
clang --target=wasm32 -O2 -nostdlib -Wl,--no-entry -Wl,--allow-undefined \
  -o module.wasm module.c
```

`export_name` makes a function callable from JavaScript. `import_module`/`import_name` declares a function the module expects the host to provide (`env.jsLog`). `-nostdlib` means there is no C standard library, so this only works for code that doesn't need `printf`, `malloc` and friends. For real C/C++ projects, use [Emscripten](https://emscripten.org/), which provides libc and generates a JS loader for you.

## Loading the module

`WebAssembly.instantiateStreaming` compiles the module while it downloads. It takes a `Response` (or a promise of one) and an import object:

```javascript
const importObject = {
  env: {
    jsLog: (value) => console.log(`WebAssembly says: ${value}`),
  },
};

const { instance } = await WebAssembly.instantiateStreaming(
  fetch('/module.wasm'),
  importObject,
);

console.log(instance.exports.add(2, 3)); // 5
instance.exports.log_message();          // "WebAssembly says: 42"
```

`instantiateStreaming` requires the server to send the file with `Content-Type: application/wasm`. If your server doesn't, it throws a `TypeError`. You can fall back to downloading the bytes first and using `WebAssembly.instantiate`:

```javascript
const response = await fetch('/module.wasm');
const bytes = await response.arrayBuffer();
const { instance } = await WebAssembly.instantiate(bytes, importObject);
```

Every import the module declares must be present in `importObject`, or instantiation fails with a `LinkError`.

## Passing data across the boundary

Exports and imports can only pass numbers directly (`i32`, `i64` as `BigInt`, `f32`, `f64`). Strings, arrays and objects have to be written into the module's linear memory, a single `ArrayBuffer`, and passed as a pointer and length. In practice, a toolchain generates that code for you:

- **Emscripten** (C/C++): mark functions with `EMSCRIPTEN_KEEPALIVE` or list them in `-sEXPORTED_FUNCTIONS`, then load the generated `.js` file. Helpers like `ccall` and `cwrap` convert strings and arrays.
- **wasm-bindgen** (Rust): annotate functions with `#[wasm_bindgen]` and it generates JS bindings that handle strings, `Vec`s and JS objects.

The Rust version of `add` looks like this:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

Set `crate-type = ["cdylib"]` in `Cargo.toml`, build for `wasm32-unknown-unknown`, and run the `wasm-bindgen` CLI to produce an ES module:

```bash
cargo build --release --target wasm32-unknown-unknown
wasm-bindgen target/wasm32-unknown-unknown/release/my_crate.wasm \
  --out-dir pkg --target web
```

```javascript
import init, { add } from './pkg/my_crate.js';

await init(); // fetches and instantiates my_crate_bg.wasm
console.log(add(2, 3));
```

`wasm-pack` wraps these steps into one command and is what most Rust tutorials use. It lived in the `rustwasm` GitHub organization, which the Rust project sunset in 2025, so check its current maintenance status before relying on it. `wasm-bindgen` itself moved to a new `wasm-bindgen` organization and is still maintained.

## Will it be faster?

Often not by as much as people expect. Modern JS engines JIT-compile hot code, so a simple numeric loop in JavaScript can run about as fast as the same loop in Wasm. Wasm tends to win when:

- The work is long-running and CPU-bound, so startup and copying costs are small in comparison.
- You need predictable performance without JIT warm-up or garbage collection pauses.
- The code uses 64-bit integer math, SIMD, or tight memory layouts that are awkward in JavaScript.
- You're porting an existing C/C++/Rust library (codecs, SQLite, physics engines) rather than rewriting it.

Some things to keep in mind:

- **The cost is in copying data, not in the calls.** Calling an exported function is cheap, but converting strings or copying large arrays into linear memory on every call adds up. Keep large data in Wasm memory and pass pointers, or batch work into fewer, larger calls.
- **Wasm can't touch the DOM.** Every DOM update goes through JavaScript, so UI-heavy code rarely benefits.
- **Threads need cross-origin isolation.** You can run Wasm in Web Workers for parallelism, but sharing memory between them requires `SharedArrayBuffer`, which browsers only enable on pages served with the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers.
- **Measure first.** Profile with the browser's performance tools, find the hot function, and benchmark a Wasm version of just that function before porting anything else.

## Further reading

- [MDN: WebAssembly concepts](https://developer.mozilla.org/en-US/docs/WebAssembly/Concepts)
- [MDN: `WebAssembly.instantiateStreaming()`](https://developer.mozilla.org/en-US/docs/WebAssembly/Reference/JavaScript_interface/instantiateStreaming_static)
- [Emscripten: Interacting with code](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html)
- [The wasm-bindgen guide](https://wasm-bindgen.github.io/wasm-bindgen/)
