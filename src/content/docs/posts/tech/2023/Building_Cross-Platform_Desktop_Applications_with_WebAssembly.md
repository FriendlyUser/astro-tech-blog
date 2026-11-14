---
title: "WebAssembly in desktop apps: a Rust module in a Tauri window"
pubDate: "2023-10-22T16:26:42.000Z"
lastUpdated: 2026-11-14
description: "Where WebAssembly fits in a cross-platform desktop app, and how to compile a Rust function to Wasm with wasm-bindgen and call it from a Tauri 2 frontend."
tags:
  - rust
  - javascript
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3708253319.png
---

WebAssembly (Wasm) is a portable binary instruction format. Rust, C, C++ and other languages compile to it, and it runs in every major browser engine and in standalone runtimes. Wasm doesn't draw windows by itself, so in a desktop app it plays one of two roles: compiled code running inside a webview-based shell such as Tauri or Electron, or a sandboxed plugin format loaded by a native app through a runtime like Wasmtime.

This post covers the first case: compiling a small Rust library to Wasm and calling it from a Tauri 2 window. An earlier version of this post used Tauri APIs that don't exist (`tauri::AppBuilder`, `app.load_web_assembly`); the code below replaces them.

## What Wasm gives you

- **Compiled code in the frontend.** CPU-heavy work such as parsing, image processing or compression can be written in Rust or C++ and called from JavaScript.
- **One module for desktop and web.** The same `.wasm` file runs in the desktop webview and in a browser, which is the main reason to use it inside Tauri or Electron.
- **A sandbox.** A Wasm module can only call the functions its host passes in as imports. It has no file system or network access unless the host grants it, which is why it suits third-party plugins.

What it doesn't give you: the desktop shell still has to be built separately for Windows, macOS and Linux. Calls between JavaScript and Wasm also cost something, so pass work in large chunks rather than one number at a time.

## The toolchain

- **Compiler target.** For Rust, `wasm32-unknown-unknown` for browser and webview use, or `wasm32-wasip1`/`wasm32-wasip2` for WASI runtimes. For C and C++, Emscripten.
- **Bindings.** `wasm-bindgen` generates the JavaScript glue for Rust: type conversion, strings, and the loader.
- **Shell.** Tauri (Rust backend, system webview) or Electron (bundled Chromium and Node.js). Both can load the same generated module.
- **Standalone runtimes**, if you want Wasm plugins in a native app: Wasmtime, Wasmer, or WAMR (WebAssembly Micro Runtime).

## Example: a Rust calculator in a Tauri window

You need Rust, Node.js, and the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

### Step 1: write the Rust library

```sh
cargo new --lib wasm_calculator
cd wasm_calculator
rustup target add wasm32-unknown-unknown
```

In `Cargo.toml`, set the crate type to `cdylib` (that is what produces a standalone `.wasm` file) and add `wasm-bindgen`:

```toml
[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
```

`src/lib.rs`:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn subtract(a: i32, b: i32) -> i32 {
    a - b
}
```

### Step 2: compile and generate bindings

```sh
cargo build --target wasm32-unknown-unknown --release
```

The raw `.wasm` file isn't enough: `#[wasm_bindgen]` functions need the generated JavaScript glue. Install the `wasm-bindgen` CLI at exactly the same version as the `wasm-bindgen` crate in your `Cargo.lock` (0.2.130 at the time of writing), then run it:

```sh
cargo install wasm-bindgen-cli --version 0.2.130
wasm-bindgen --target web --out-dir pkg target/wasm32-unknown-unknown/release/wasm_calculator.wasm
```

This writes `pkg/wasm_calculator.js` (an ES module with an `init` default export) and `pkg/wasm_calculator_bg.wasm`. If the CLI and crate versions differ, `wasm-bindgen` refuses to run and tells you which version to install.

### Step 3: create the Tauri app

From the parent directory:

```sh
npm create tauri-app@latest
```

Name the app `wasm_calculator_app`, choose the **Vanilla** template with **JavaScript**, then copy the bindings into the frontend folder:

```sh
cd wasm_calculator_app
npm install
cp -r ../wasm_calculator/pkg src/pkg
```

### Step 4: the user interface

Replace `src/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Wasm Calculator</title>
    <script type="module" src="/main.js"></script>
</head>
<body>
    <h1>Wasm Calculator</h1>
    <input type="number" id="number1" />
    <input type="number" id="number2" />
    <button id="add">Add</button>
    <button id="subtract">Subtract</button>
    <p>Result: <span id="result"></span></p>
</body>
</html>
```

And `src/main.js`:

```js
import init, { add, subtract } from "./pkg/wasm_calculator.js";

await init(); // fetches and instantiates wasm_calculator_bg.wasm

const value = (id) => parseInt(document.getElementById(id).value, 10) || 0;
const show = (n) => (document.getElementById("result").textContent = n);

document.getElementById("add").addEventListener("click", () => {
    show(add(value("number1"), value("number2")));
});

document.getElementById("subtract").addEventListener("click", () => {
    show(subtract(value("number1"), value("number2")));
});
```

The template's `tauri.conf.json` sets no Content Security Policy. If you add one, include `'wasm-unsafe-eval'` in `script-src`, or the webview will refuse to compile the module.

### Step 5: run and build

```sh
npm run tauri dev     # development window with reload
npm run tauri build   # release build and installers for the current OS
```

The same `src/` folder, `pkg` included, also works as a static website, which is the point of putting the logic in Wasm.

## When you don't need Wasm

In Tauri, the backend is already native Rust. If the code only has to run on the desktop, a Tauri command is simpler than a Wasm module:

```rust
#[tauri::command]
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// in the builder: .invoke_handler(tauri::generate_handler![add])
```

The frontend calls it with `invoke("add", { a: 1, b: 2 })` from `@tauri-apps/api/core`. That code runs natively and can use the file system and threads. Choose Wasm when the same logic has to run in a browser, or when you need to load untrusted plugins in a sandbox.

## Further reading

- [WebAssembly on MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [The wasm-bindgen guide](https://wasm-bindgen.github.io/wasm-bindgen/)
- [Tauri 2: create a project](https://v2.tauri.app/start/create-project/)
- [Wasmtime](https://wasmtime.dev/)
