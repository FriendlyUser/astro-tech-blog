---
title: "WebAssembly for web developers: what it's good at and when to skip it"
pubDate: "2025-07-16T21:21:16.000Z"
lastUpdated: 2026-11-14
description: "What WebAssembly gives a web app (fast compute, reuse of C, C++ and Rust code, a sandbox) and what it costs, with a minimal module called from JavaScript."
tags: ["javascript"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1662522246.webp
---

WebAssembly (Wasm) is a compact binary instruction format that browsers compile to machine code and run next to JavaScript. You don't usually write it by hand. You compile C, C++, Rust, Go or another language to a `.wasm` module and call it from JavaScript. It makes sense when a page has CPU-heavy work (codecs, image processing, physics, parsers) or an existing native library you want to reuse.

## A minimal module

The smallest useful example is a function that adds two integers. Write it in the WebAssembly text format (`add.wat`):

```wasm
(module
  (func (export "add") (param i32 i32) (result i32)
    local.get 0
    local.get 1
    i32.add))
```

Compile it to binary with `wat2wasm` from the [WebAssembly Binary Toolkit (wabt)](https://github.com/WebAssembly/wabt):

```bash
wat2wasm add.wat -o add.wasm
```

Then load it from JavaScript:

```js
const { instance } = await WebAssembly.instantiateStreaming(fetch("add.wasm"));
console.log(instance.exports.add(2, 3)); // 5
```

`instantiateStreaming` compiles while the file downloads, but the server must send `add.wasm` with the `Content-Type: application/wasm` header. Opening the page from `file://` won't work. In practice a toolchain such as `wasm-bindgen` (Rust) or Emscripten (C/C++) generates the `.wasm` file and the JavaScript glue for you.

## What you get

### Predictable compute performance

Modern JavaScript engines are JIT compilers, so JavaScript is not simply "interpreted". But JIT performance depends on type feedback and can drop when the engine deoptimises. Wasm is statically typed and arrives already compiled from an optimising compiler, so the browser can produce fast machine code up front and performance is more consistent.

"Near-native" is a goal, not a guarantee. A 2019 USENIX ATC paper, [Not So Fast: Analyzing the Performance of WebAssembly vs. Native Code](https://www.usenix.org/conference/atc19/presentation/jangda), measured SPEC CPU benchmarks running 45% (Firefox) to 55% (Chrome) slower than native on average. Benchmark your own workload rather than assuming a speed-up over well-written JavaScript.

### Reuse of existing code

Wasm is a compilation target, so libraries written in C, C++ or Rust can run in the browser without a JavaScript rewrite. This is how tools like SQLite, FFmpeg and image codecs end up in web apps.

### A sandbox

Wasm runs inside the same browser sandbox as JavaScript and under the same origin rules. A module can only read and write its own linear memory and can only reach the outside world through functions the host explicitly imports into it. It has no direct access to the DOM or to Web APIs; every call goes through JavaScript. Memory-safety bugs in C or C++ code can still corrupt data *inside* the module's memory, so the sandbox protects the browser, not your program's logic.

### Threads and SIMD

Browsers support Wasm threads built on `SharedArrayBuffer` and Web Workers, plus 128-bit SIMD instructions. Threads only work on pages that are [cross-origin isolated](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated), which means serving `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. That can break third-party embeds, so plan for it.

### Portability beyond the browser

The same module format runs outside the browser in runtimes like [Wasmtime](https://wasmtime.dev/) and Node.js, with WASI providing system interfaces. The standard keeps growing: [Wasm 3.0](https://webassembly.org/news/2025-09-17-wasm-3.0/) (September 2025) added 64-bit memories, multiple memories, garbage collection, exception handling and tail calls. Garbage collection makes it more practical to compile languages like Java, Kotlin and Dart to Wasm.

## When not to use it

- **DOM-heavy UI work.** Every DOM call crosses the Wasm–JS boundary. A UI framework in JavaScript will usually be simpler and just as fast.
- **Chatty interfaces.** Passing strings, objects or arrays between JS and Wasm means copying or encoding them into linear memory. Lots of small calls can cost more than the work they do.
- **Small, simple logic.** The toolchain, larger downloads and harder debugging aren't worth it for code that already runs fast in JavaScript.

## Further reading

- [WebAssembly on MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [webassembly.org feature status](https://webassembly.org/features/)
- [wasm-bindgen guide](https://wasm-bindgen.github.io/wasm-bindgen/)
- [Emscripten documentation](https://emscripten.org/docs/)
