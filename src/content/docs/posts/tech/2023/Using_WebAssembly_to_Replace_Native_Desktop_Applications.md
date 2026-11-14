---
title: "Can WebAssembly replace native desktop apps? Benefits and limits"
pubDate: "2024-05-16T14:59:44.000Z"
lastUpdated: 2026-11-14
description: "How WebAssembly lets native C++, Rust and .NET code run as web apps, what it does well, and where native desktop apps still have the edge."
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/using-webassembly-to-replace-native-desktop-applications.webp"
---

WebAssembly (Wasm) is a portable binary format that C, C++, Rust, C# and other languages compile to. Its main role in "desktop replacement" is not to replace the app shell, but to let an existing native codebase run inside a browser tab, so a product that used to need an installer can ship as a web app instead.

Figma's editor (a C++ renderer compiled to Wasm) and Adobe's web version of Photoshop (ported with Emscripten) are the usual examples. This post looks at what makes that possible and what still pushes teams towards native.

## Why it can work

Native desktop apps are traditionally built per platform: Win32 or WinUI on Windows, AppKit on macOS, GTK or Qt on Linux. Each target adds build, test and release work.

Wasm changes the economics in a few ways:

- **One binary, every browser.** The same `.wasm` file runs in Chrome, Firefox and Safari on any OS. You still test across browsers, but you don't maintain per-OS builds.
- **Reuse of existing code.** Emscripten compiles C and C++ (including codebases using SDL or OpenGL ES, mapped to WebGL), Rust targets `wasm32-unknown-unknown`, and frameworks like Qt for WebAssembly, Blazor WebAssembly (.NET) and Flutter web can target the browser. Porting is work, but much less than a rewrite.
- **Performance close to native for compute.** Wasm code is statically typed and compiled to machine code by the browser, which makes it well suited to the hot paths: rendering, image processing, geometry, codecs.
- **Sandboxing.** A Wasm module can only reach its own memory and the functions the host gives it. Users can open the app without trusting an installer.
- **No install or update step.** Deploying a new version means updating files on a server.

The UI usually stays in HTML, CSS and JavaScript (or a canvas the Wasm code draws into), with Wasm handling the heavy lifting.

## Where native still wins

- **Platform APIs.** Wasm has no direct access to the OS. In the browser, everything goes through web APIs called from JavaScript. Some desktop features are missing or Chromium-only (for example, broad file system access via the File System Access API), and things like system tray icons, global shortcuts, or talking to arbitrary hardware aren't available at all.
- **Threads and memory.** Wasm threads need `SharedArrayBuffer`, which browsers only enable on cross-origin-isolated pages. Standard 32-bit Wasm is limited to 4 GiB of linear memory, which matters for large documents or datasets.
- **Startup size.** A large C++ app can compile to a module tens of megabytes in size, which must be downloaded and compiled before the app starts. Caching helps on repeat visits, not the first one.
- **Tooling.** Debugging Wasm in browser DevTools works (Chrome can show C/C++ source via its DWARF debugging extension), but it's less polished than a native debugger, and profiling across the JS/Wasm boundary takes effort.
- **Offline and OS integration.** Progressive Web Apps can be installed and work offline, but file associations, background work and OS integration vary by browser and platform.

## Outside the browser

Wasm also runs outside browsers. Runtimes such as [Wasmtime](https://wasmtime.dev/) and [Wasmer](https://wasmer.io/) execute Wasm modules on the command line or embedded in other programs, using WASI for file and network access. WASI does not include a GUI API, though, so for a desktop app with a window you would still pair Wasm with a native or webview shell (Electron or Tauri, for example) rather than run it standalone.

## When to consider it

Wasm is a good fit when you have a compute-heavy native core you want to put on the web, and the app's UI can live in a browser. It is a poor fit when the app depends on deep OS integration, very large memory, or specific hardware. In those cases, a cross-platform native toolkit (Qt, Flutter desktop, .NET MAUI) or a webview shell is the more realistic way to cut per-platform work.

## Further reading

- [MDN: WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [Emscripten documentation](https://emscripten.org/docs/)
- [web.dev: Photoshop's journey to the web](https://web.dev/articles/ps-on-the-web)
- [WASI](https://wasi.dev/)
