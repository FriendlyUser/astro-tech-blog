---
title: "Astrodon: a Tauri-based desktop app framework for Deno (unmaintained)"
pubDate: "2023-05-03T14:16:45.104Z"
lastUpdated: 2026-11-14
description: "What Astrodon was, how its webview windows and Deno messaging worked, why it no longer runs, and what to use for Deno desktop apps instead."
tags: ["deno", "typescript"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2892583015.webp
---

:::caution
Astrodon is unmaintained. Its README says so, and it warns that even the official demo fails. The last public release was `0.1.0-alpha.2`, and it targeted Deno 1.x. For new desktop apps, use [Tauri](https://tauri.app/) or the [webview_deno](https://github.com/webview/webview_deno) bindings.
:::

[Astrodon](https://github.com/astrodon/astrodon) was a **desktop app framework** for Deno built on [Tauri](https://tauri.app/)'s webview stack. You wrote your backend in Deno, rendered your UI as HTML in a native webview window, and passed messages between the two. Its README describes it as "not there yet", and it never left alpha.

An earlier version of this post presented Astrodon as an Express-style web server with `app.get()`, `res.json()` and `app.listen()`. Astrodon never had that API, so that REST example has been removed. To build an HTTP API in Deno, use `Deno.serve` or a framework such as Hono or Oak.

## What it offered

The README lists these features:

- Webview windows with your own title and URL or inline HTML
- Two-way messaging between the frontend page and the Deno backend
- Compiling an app into an executable, and building installers

## How the API looked

In the `hello_world` demo on the main branch, you created an `AppWindow`, gave it HTML with `setHtml()` (or a URL with `setUrl()`), and started it with `run()`. The page called `window.sendToDeno(event, data)`. Deno read those messages with `for await (const msg of await win.listen(event))` and replied with `win.send(event, data)`, which the page received as a DOM event. See [the demo source](https://github.com/astrodon/astrodon/blob/main/examples/hello_world/demo.ts).

I haven't reproduced the code here because it no longer runs on current Deno.

## Alternatives

- **[Tauri](https://tauri.app/)**: the project Astrodon was built on. It's actively maintained, but the backend is Rust rather than Deno.
- **[webview_deno](https://github.com/webview/webview_deno)** (`jsr:@webview/webview`): Deno FFI bindings to the small `webview` C library. It's closer to what Astrodon did, but its README still says to expect breaking changes.
- **A local web server plus the user's browser**: for internal tools, `Deno.serve` with `deno compile` is often enough, and it avoids native webview dependencies entirely.
