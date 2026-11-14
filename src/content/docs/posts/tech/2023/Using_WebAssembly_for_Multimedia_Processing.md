---
title: "Image processing in the browser with WebAssembly: a Gaussian blur with OpenCV.js"
pubDate: "2023-09-23T11:33:12.000Z"
lastUpdated: 2026-11-14
description: "Use OpenCV.js, OpenCV compiled to WebAssembly, to blur an image in the browser, plus where Wasm helps for audio and video and what it costs."
tags: ['opencv', 'javascript', 'cpp']
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2465919888.png
---

WebAssembly (Wasm) lets you compile C, C++ or Rust to a bytecode that browsers run at close to native speed. For multimedia that's useful in two ways: heavy per-pixel or per-sample loops run much faster than equivalent JavaScript, and you can reuse existing native libraries (OpenCV, FFmpeg, audio codecs) instead of rewriting them.

This post blurs an image with OpenCV.js, which is OpenCV compiled to Wasm with the Emscripten toolchain, then covers when to build your own module and where Wasm fits for audio and video.

## Example: Gaussian blur with OpenCV.js

The OpenCV project publishes a prebuilt `opencv.js` (the Wasm binary is embedded in the file), so there's nothing to compile. Save this as `index.html` and open it in a browser:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Gaussian blur with OpenCV.js</title>
</head>
<body>
  <input type="file" id="fileInput" accept="image/*" disabled>
  <img id="source" alt="Selected image" style="max-width: 45%">
  <canvas id="output"></canvas>

  <script>
    const fileInput = document.getElementById('fileInput');
    const img = document.getElementById('source');

    // opencv.js finishes loading before its Wasm runtime is ready,
    // so wait for onRuntimeInitialized unless it has already run.
    function onOpenCvReady() {
      if (cv.Mat) {
        fileInput.disabled = false;
      } else {
        cv.onRuntimeInitialized = () => { fileInput.disabled = false; };
      }
    }

    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) img.src = URL.createObjectURL(file);
    });

    img.addEventListener('load', () => {
      // cv.imread(img) would use the <img>'s displayed size, so copy
      // the image to a canvas at full resolution and read that instead.
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);

      const src = cv.imread(canvas); // RGBA cv.Mat
      const dst = new cv.Mat();
      cv.GaussianBlur(src, dst, new cv.Size(15, 15), 0, 0, cv.BORDER_DEFAULT);
      cv.imshow('output', dst);     // draws the Mat on the canvas

      // Mats live in Wasm memory, which the JS garbage collector
      // doesn't manage. Free them explicitly.
      src.delete();
      dst.delete();
      URL.revokeObjectURL(img.src);
    });
  </script>
  <script async src="https://docs.opencv.org/4.x/opencv.js" onload="onOpenCvReady()"></script>
</body>
</html>
```

How it works:

- `cv.imread()` reads the pixels from an `<img>` or `<canvas>` into a `cv.Mat`. For an `<img>` it uses the element's displayed width and height, which is why the example draws to a full-size canvas first. `cv.imshow()` writes a `Mat` back to a canvas. Both are JavaScript helpers that ship with OpenCV.js.
- `cv.GaussianBlur(src, dst, ksize, sigmaX, sigmaY, borderType)` has the same signature as the C++ function. The kernel size must be odd; passing `0` for sigma lets OpenCV derive it from the kernel size.
- Every `cv.Mat` must be freed with `.delete()`. Forgetting this is the most common OpenCV.js bug: memory grows with each image until the page slows down or crashes.

The `4.x` URL always serves the latest 4.x release, so for production, pin a specific version (for example `https://docs.opencv.org/4.13.0/opencv.js`) or host the file yourself. It's around 10 MB, so load it only on pages that need it.

## Building your own Wasm module

Prebuilt OpenCV.js covers most of OpenCV's image-processing API. You'd build your own module when you want a smaller download or your own C++ code:

- **A slimmer OpenCV.js.** OpenCV's `platforms/js/build_js.py` script builds OpenCV.js with Emscripten. Its `--config` option takes your own copy of `opencv_js.config.py`, the whitelist of functions exported to JavaScript, so you can include only what you call. See [Build OpenCV.js](https://docs.opencv.org/4.x/d4/da1/tutorial_js_setup.html).
- **Your own C++ that uses OpenCV.** Your code and OpenCV must be compiled into the *same* Wasm module, using OpenCV static libraries that were themselves built with Emscripten. Linking against a desktop OpenCV install (`-L/usr/lib -lopencv_core`) won't work, because those are native x86 or ARM libraries. You also can't pass a `cv.Mat` from the prebuilt OpenCV.js into a separately compiled module: each module has its own linear memory.
- **Plain pixel loops.** For a simple filter you may not need OpenCV at all. Write a C or Rust function that takes a pointer to an RGBA buffer, compile it with Emscripten or `wasm-pack`, and copy `ImageData.data` into the module's memory before calling it.

## Audio and video

- **Video**: [ffmpeg.wasm](https://ffmpegwasm.netlify.app/docs/overview/) is FFmpeg compiled to Wasm and can transcode, trim or extract frames in the browser. It's noticeably slower than native FFmpeg, so it suits short clips and keeping files on the user's device, not bulk transcoding. Where the browser supports it, the WebCodecs API gives you hardware-accelerated encoding and decoding without shipping a codec at all.
- **Audio**: Wasm DSP code is usually run inside an `AudioWorkletProcessor`, which processes audio on a dedicated real-time thread in 128-sample blocks. Keep allocations out of the processing loop so the garbage collector doesn't cause dropouts.

## Gotchas

- Copying pixels between JavaScript and Wasm memory costs time. For small images, or a single cheap operation, a canvas filter or plain JavaScript may be just as fast.
- Wasm runs on the CPU. For filters that run every frame on video, a WebGL or WebGPU shader is often faster still.
- Multithreaded Wasm builds need `SharedArrayBuffer`, which only works on cross-origin isolated pages (served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`).

## Further reading

- [OpenCV.js tutorials](https://docs.opencv.org/4.x/d5/d10/tutorial_js_root.html)
- [Emscripten documentation](https://emscripten.org/docs/introducing_emscripten/index.html)
- [WebAssembly official website](https://webassembly.org/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API)
