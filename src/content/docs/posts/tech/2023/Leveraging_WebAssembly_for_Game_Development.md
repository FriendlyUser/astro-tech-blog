---
title: "WebAssembly for browser games: engines, toolchains and gotchas"
pubDate: "2025-02-20T06:30:47.000Z"
lastUpdated: 2026-11-14
description: Which engines and toolchains can ship a game to the browser as WebAssembly, a minimal Emscripten game loop, and the problems you hit when you deploy it.
tags: ["rust", "cpp"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3431403716.png
---

WebAssembly (Wasm) is a compact binary instruction format that browsers can compile to machine code. For games it means you can take code written in C, C++, C# or Rust (often an existing engine) and run it in a browser tab instead of rewriting it in JavaScript.

## What Wasm gives a game

- **Predictable CPU performance.** Wasm is statically typed and compiled ahead of execution, so hot loops (physics, pathfinding, animation) don't depend on a JIT warming up. It is usually slower than the same code compiled natively, but close enough for most games.
- **Reuse of existing code.** Engines and libraries written in C++ or Rust can be compiled for the web rather than ported.
- **A sandbox.** A Wasm module can only touch memory it owns and functions the host page passes in.

What it does *not* give you is direct access to the GPU or audio hardware. Wasm cannot call browser APIs itself. Rendering goes through WebGL or WebGPU and sound through the Web Audio API, via JavaScript glue code that your toolchain generates (Emscripten's runtime for C/C++, `wasm-bindgen` and `web-sys` for Rust).

## Engines that export to the web

- **Unity** builds for the browser through its Web platform (called WebGL before Unity 6). The output is a Wasm module plus a JavaScript loader.
- **Godot** has a web export template. In Godot 4, projects written in C# cannot be exported to the web; GDScript projects can. If you need C# on the web, the Godot docs point you to Godot 3.
- **Unreal Engine** no longer has an official web target. Epic moved HTML5 support out of the engine into a community-maintained plugin in 4.24, and UE5 ships with no web export. Treat Unreal as a poor fit for browser games.
- **Rust engines** such as Bevy and macroquad compile to the `wasm32-unknown-unknown` target.

## Toolchains if you write the code yourself

- **C and C++: Emscripten.** It compiles through LLVM to Wasm and provides browser-backed implementations of SDL2, OpenGL ES (mapped to WebGL) and a virtual file system.
- **Rust:** add the target with `rustup target add wasm32-unknown-unknown` and use `wasm-bindgen` to generate the JavaScript bindings.

## A minimal game loop with Emscripten

The first thing that breaks when you port a native game is the main loop. A `while (running)` loop blocks the browser's event loop, so the page freezes. Emscripten makes you hand it a per-frame callback instead:

```c
#include <emscripten.h>
#include <stdio.h>

static int frame = 0;

static void tick(void) {
    frame++;
    if (frame % 60 == 0) {
        printf("frame %d\n", frame);
    }
}

int main(void) {
    /* fps = 0 means "use requestAnimationFrame"; 1 = don't return from main */
    emscripten_set_main_loop(tick, 0, 1);
    return 0;
}
```

Build it and serve it over HTTP:

```bash
emcc main.c -o index.html
emrun index.html
```

`emcc` writes `index.html`, `index.js` and `index.wasm`. Opening the HTML file from disk with `file://` won't work, because browsers block fetching the `.wasm` file that way. Use `emrun` or any static file server.

## Problems you'll hit when shipping

- **Download size.** Engine exports often run to tens of megabytes. Serve the `.wasm` file with Brotli or gzip compression and the `application/wasm` MIME type, which lets the browser compile it while it downloads.
- **Threads need special headers.** Multithreaded Wasm uses `SharedArrayBuffer`, which browsers only enable on cross-origin isolated pages. Your server must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Some hosts, such as embedded game portals, don't let you set these, so check before you depend on threads.
- **No blocking file I/O.** Assets must be preloaded into the virtual file system at build time or fetched asynchronously.
- **Test on mobile.** Mobile browsers have tighter memory limits, and a build that runs on a desktop can crash on a phone.

## Further reading

- [WebAssembly on MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten documentation](https://emscripten.org/docs/)
- [Godot: Exporting for the Web](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)
- [Rust and WebAssembly (`wasm-bindgen` guide)](https://wasm-bindgen.github.io/wasm-bindgen/)
