---
title: "Running C numerical code in the browser with WebAssembly and Emscripten"
pubDate: "2023-12-10T03:33:03.000Z"
lastUpdated: 2026-11-14
description: "Compile a C dot-product function to WebAssembly with Emscripten, pass Float64Array data through Wasm memory, and see where Wasm fits for scientific code."
tags: ["javascript"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/424066448.png
---

WebAssembly (Wasm) is a compact binary instruction format that C, C++, Rust and other languages can compile to. For scientific code, the appeal is that an existing numerical routine written in C can run in a browser, close to native speed, without being rewritten in JavaScript. Pyodide is a well-known example: it is CPython compiled with Emscripten, and it runs NumPy and SciPy in the browser.

This post compiles a small C function to Wasm with Emscripten and calls it from JavaScript, including the part most tutorials get wrong: passing arrays of `double`s.

## Why Wasm for numerical code

- **Reuse existing code.** Numerical libraries are mostly C, C++ and Fortran. Emscripten compiles C and C++ directly, so you can ship an existing routine to the web instead of porting it.
- **Predictable performance.** Wasm instructions are statically typed (`i32`, `f64` and so on), so tight loops avoid the type checks and deoptimisation that JavaScript JITs can hit.
- **Sandboxing.** A Wasm module can only touch its own linear memory and the functions you import into it, which makes it reasonable to run untrusted or third-party compute code.
- **Distribution.** A web page is easier to hand to a colleague than a build environment.

## The example: a dot product

### Install Emscripten

Follow the [Emscripten install guide](https://emscripten.org/docs/getting_started/downloads.html) (it uses the `emsdk` tool). After activating the SDK, `emcc --version` should work in your shell.

### Write the C code

```c
// dot_product.c
#include <stddef.h>

double dot_product(const double *a, const double *b, size_t length) {
    double result = 0.0;
    for (size_t i = 0; i < length; ++i) {
        result += a[i] * b[i];
    }
    return result;
}
```

### Compile to WebAssembly

```bash
emcc dot_product.c -O3 \
  -sEXPORTED_FUNCTIONS=_dot_product,_malloc,_free \
  -sEXPORTED_RUNTIME_METHODS=cwrap,HEAPF64 \
  -o dot_product.js
```

This produces `dot_product.wasm` (the compiled module) and `dot_product.js` (glue code that loads it). The flags matter:

- `EXPORTED_FUNCTIONS` lists the C functions JavaScript can call, with a leading underscore. We need `malloc` and `free` too, to allocate the input arrays inside Wasm memory.
- `EXPORTED_RUNTIME_METHODS` exposes `cwrap` and the `HEAPF64` view of Wasm memory. Recent Emscripten releases no longer export the `HEAP*` views by default, so code that used `Module.HEAPF64` without this flag breaks.

Wasm output is the default, so the old `-s WASM=1` flag is not needed.

### Call it from JavaScript

C pointers in Wasm are offsets into the module's linear memory. To pass two arrays of `double`s, allocate space with `malloc`, copy the values into the `HEAPF64` view, and pass the pointers.

```html
<!DOCTYPE html>
<html>
<body>
  <script>
    var Module = {
      onRuntimeInitialized() {
        const dotProduct = Module.cwrap('dot_product', 'number', ['number', 'number', 'number']);

        const a = new Float64Array([1, 2, 3]);
        const b = new Float64Array([4, 5, 6]);
        const bytes = a.length * Float64Array.BYTES_PER_ELEMENT;

        const ptrA = Module._malloc(bytes);
        const ptrB = Module._malloc(bytes);
        try {
          // HEAPF64 is indexed in 8-byte elements, so divide the byte offset by 8.
          Module.HEAPF64.set(a, ptrA / 8);
          Module.HEAPF64.set(b, ptrB / 8);
          console.log('Dot product:', dotProduct(ptrA, ptrB, a.length));
        } finally {
          Module._free(ptrA);
          Module._free(ptrB);
        }
      },
    };
  </script>
  <script src="dot_product.js"></script>
</body>
</html>
```

Defining `Module` before loading `dot_product.js` lets the glue code pick up the `onRuntimeInitialized` callback, which runs once the Wasm module has been fetched and compiled.

Don't be tempted by `cwrap`'s `'array'` argument type here. It copies a JavaScript array into memory as 8-bit values (for typed arrays it only accepts `Int8Array` or `Uint8Array`), so `[1, 2, 3]` would arrive in C as bytes, not `double`s, and the result would be garbage.

Browsers won't load `.wasm` files from `file://` URLs, so serve the directory over HTTP:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` (or whatever you named the HTML file) and the console shows:

```text
Dot product: 32
```

## Limits to know about

- **Copying costs.** Data must live in Wasm linear memory. For large arrays, allocate once and write directly into `HEAPF64` rather than copying back and forth on every call. Also re-read `Module.HEAPF64` after anything that might grow memory, because growth replaces the underlying buffer.
- **Memory size.** Standard 32-bit Wasm addresses at most 4 GiB of linear memory, and browsers may allow less.
- **SIMD and threads.** Wasm SIMD is fixed at 128 bits, so you won't get AVX-width vectors. Threads need `SharedArrayBuffer`, which browsers only enable on cross-origin-isolated pages (COOP/COEP headers).
- **No direct GPU access.** GPU compute in the browser goes through WebGPU from JavaScript, not from Wasm itself.

For heavy batch jobs on a workstation or cluster, native builds are still the better choice. Wasm earns its place when you want to put an existing numerical routine in front of users with nothing to install.

## Further reading

- [Emscripten: Interacting with code](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html)
- [Pyodide](https://pyodide.org/)
- [MDN: WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
