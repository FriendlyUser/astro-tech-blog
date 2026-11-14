---
title: 'WebAssembly with Emscripten: compile C to wasm and call it from JavaScript'
pubDate: "2024-12-16T13:33:03.000Z"
lastUpdated: 2026-11-14
description: "Install Emscripten, compile a small C program to WebAssembly, run it in the browser, and call an exported C function from JavaScript with cwrap."
tags:
  - javascript
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/945555918.webp
---

WebAssembly (wasm) is a compact binary instruction format that browsers (and runtimes such as Node.js and Wasmtime) can compile and run at close to native speed. You don't usually write it by hand: you compile C, C++, Rust or another language to it. It runs alongside JavaScript rather than replacing it. JavaScript still owns the DOM and loads the module, and wasm handles the CPU-heavy parts.

This post uses Emscripten to compile a C program to wasm, run it in the browser, and call a C function from JavaScript.

## A few concepts first

- **Module**: a `.wasm` file. The browser validates and compiles it before running it, and it runs inside the same sandbox as JavaScript.
- **Linear memory**: a single resizable `ArrayBuffer`, grown in 64 KiB pages. C pointers are just offsets into this buffer, and JavaScript can read and write it through typed arrays.
- **Imports and exports**: a module declares the functions, memories and globals it needs from the host (imports) and the ones it provides (exports). That is how JavaScript calls into wasm and vice versa.

Wasm functions only take and return numbers. Strings, arrays and structs have to be copied into linear memory and passed as pointers; Emscripten's helpers (`ccall`, `cwrap`) handle the simple cases for you.

## Install Emscripten

Emscripten is installed through `emsdk`. Follow the [official instructions](https://emscripten.org/docs/getting_started/downloads.html); on macOS or Linux it boils down to:

```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

On Windows, run `emsdk.bat install latest`, `emsdk.bat activate latest`, then `emsdk_env.bat`. The `emsdk_env` script only sets up `PATH` for the current terminal, so run it again in each new shell. Check the install with `emcc --version`.

## Hello, WebAssembly

Create `hello.c`:

```c
#include <stdio.h>

int main(void) {
  printf("Hello, WebAssembly!\n");
  return 0;
}
```

Compile it:

```bash
emcc hello.c -o hello.html
```

This produces three files: `hello.wasm` (the compiled code), `hello.js` (the glue that loads the module and provides things like `printf`), and `hello.html` (a test page). WebAssembly output is the default, so the old `-s WASM=1` flag is no longer needed.

Browsers won't load the `.wasm` file from a `file://` URL, so serve the directory over HTTP:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/hello.html`. The `printf` output appears in the page's text area and in the browser console. Emscripten also ships `emrun hello.html`, which starts a server and opens the browser for you.

## Calling C from JavaScript

Add a function to `hello.c`:

```c
#include <stdio.h>

int add(int a, int b) {
  return a + b;
}

int main(void) {
  printf("Hello, WebAssembly!\n");
  printf("2 + 3 = %d\n", add(2, 3));
  return 0;
}
```

JavaScript can only call functions the module exports, and Emscripten exports only what you list (unused code is removed, and `add` may be inlined into `main`). It also leaves out runtime helpers you don't ask for. Export `add` (C symbols get a leading underscore) and the `cwrap` helper:

```bash
emcc hello.c -o hello.js \
  -sEXPORTED_FUNCTIONS=_main,_add \
  -sEXPORTED_RUNTIME_METHODS=cwrap
```

This time the output is just `hello.js` and `hello.wasm`, so you write the page yourself. Create `index.html`:

```html
<!doctype html>
<html>
  <body>
    <script>
      var Module = {
        onRuntimeInitialized() {
          const add = Module.cwrap("add", "number", ["number", "number"]);
          console.log("5 + 7 =", add(5, 7));
        },
      };
    </script>
    <script src="hello.js"></script>
  </body>
</html>
```

The `Module` object has to exist before `hello.js` loads; the glue code reads it and calls `onRuntimeInitialized` once the wasm module has been fetched and compiled. Calling exported functions before that point fails. `cwrap` takes the C function name, its return type, and its argument types, and returns a normal JavaScript function.

Serve the folder again and open `http://localhost:8000/index.html`. The console shows:

```text
Hello, WebAssembly!
2 + 3 = 5
5 + 7 = 12
```

For a one-off call you can use `Module.ccall("add", "number", ["number", "number"], [5, 7])` instead, or call the raw export `Module._add(5, 7)`, since both arguments are plain numbers.

## Where to go next

- Passing strings: use `"string"` as a `ccall`/`cwrap` argument type for simple cases. For anything bigger, allocate in linear memory with `malloc` and copy the data in yourself.
- Bundlers: compile with `-sMODULARIZE -sEXPORT_ES6` to get a factory function you can `import` instead of relying on a global `Module`.
- Don't expect wasm to speed up DOM-heavy code. Every DOM call still goes through JavaScript. Wasm is a good fit for compute-heavy work such as codecs, image processing, physics and parsers, or for reusing an existing C/C++ library on the web.

## Further reading

- [Emscripten tutorial](https://emscripten.org/docs/getting_started/Tutorial.html)
- [Interacting with code (ccall, cwrap, exports)](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html)
- [WebAssembly on MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
