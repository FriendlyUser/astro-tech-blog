---
title: "Desktop automation in Deno with autopilot: mouse, keyboard and screenshots"
pubDate: "2023-05-03T14:16:45.005Z"
lastUpdated: 2026-11-14
description: "How the autopilot module drives the mouse, keyboard and screen from Deno through Rust FFI, with a working example and its permission flags."
tags: ["deno", "typescript", "automation"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2896017845.png
---

:::caution
autopilot has not had a release in years. The latest version on deno.land/x is 0.4.0, written for Deno 1.x and its `--unstable` flag, and deno.land/x no longer accepts new publishes. Test it on your Deno version before you depend on it.
:::

[autopilot](https://deno.land/x/autopilot) is a Deno module for **desktop** automation. It wraps the Rust [autopilot-rs](https://github.com/autopilot-rs/autopilot-rs) crate through Deno's FFI, so a script can move the mouse, type keystrokes, read pixel colours, take screenshots of the screen, and show alerts or notifications.

An earlier version of this post called autopilot a browser automation tool, with `goto()` and an in-memory `screenshot()`. Those methods don't exist. It controls the operating system's input devices, not a browser page. For browser automation in Deno, use [Astral](https://jsr.io/@astral/astral) or Puppeteer instead.

## Prerequisites

- [Deno](https://docs.deno.com/runtime/getting_started/installation/)
- On Linux, the X11 and build packages listed in the [README](https://github.com/littledivy/autopilot-deno): `libdbus-1-dev x11-xserver-utils wmctrl libxtst-dev cmake libc-dev libx11-dev libxcb1-dev`

On first run, the module downloads a prebuilt native library from the project's GitHub releases and caches it locally.

## Example

```typescript
// autopilot_example.ts
import AutoPilot from "https://deno.land/x/autopilot@0.4.0/mod.ts";

const pilot = new AutoPilot();

// Screen dimensions in pixels
const { width, height } = pilot.screenSize();
console.log(`Screen is ${width}x${height}`);

// Move the mouse to the centre of the screen, then type into whatever has focus.
// type() only accepts ASCII and throws a TypeError otherwise.
pilot
  .moveMouse(width / 2, height / 2)
  .type("Hello from Deno");

// Save a screenshot of the whole screen to a PNG file
pilot.screenshot("screenshot.png");
```

The methods run synchronously and return the `AutoPilot` instance, so you can chain them. Other methods include `click()`, `tap()` for a single key, `mousePosition()`, `pixelColor()`, `alert()` and `notify()`.

## Running it

```bash
deno run -A --unstable autopilot_example.ts
```

The README runs it with `--unstable --allow-ffi`. FFI needs `--allow-ffi` because native code runs outside Deno's sandbox. The library loader (`plug`) also needs network, read, write and env access to download and cache the native binary, which is why `-A` is the simplest choice here. Run it in a throwaway terminal: the script really will move your mouse and type into the focused window.

## Gotchas

- `screenshot()` takes a file name and writes the file itself; it does not return image bytes.
- Coordinates are screen pixels. On HiDPI displays, check the scale factor before you compute positions.
- Because it drives real input devices, it won't work on a headless server or CI runner without a display.

## Further reading

- [autopilot on deno.land/x](https://deno.land/x/autopilot)
- [autopilot-deno on GitHub](https://github.com/littledivy/autopilot-deno)
- [Deno FFI docs](https://docs.deno.com/runtime/fundamentals/ffi/)
