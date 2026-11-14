---
title: Running machine learning models in the browser with WebAssembly
pubDate: "2023-12-03T05:18:43.000Z"
lastUpdated: 2026-11-14
description: "How WebAssembly is used to run ML inference in the browser, with an ONNX Runtime Web example, the TensorFlow.js Wasm backend, and when WebGPU is the better fit."
tags: ['javascript']
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1834084038-a-dream-of-a-distant-galaxy-concept-art-matte-painting-hq-4k.webp
---

Running a model in the browser means no server round trip, no inference bill, and user data that never leaves the device. The hard part is speed: the numeric kernels behind ML inference (matrix multiplies, convolutions) are slow in plain JavaScript. WebAssembly (Wasm) lets libraries compile those kernels from C++ or Rust and run them in the browser with SIMD instructions and, optionally, multiple threads.

In practice you rarely write Wasm yourself for this. You use an inference library that ships a Wasm build of its runtime, and you load a model trained elsewhere (usually in Python).

## What Wasm does and doesn't give you

- **Faster CPU inference than plain JavaScript.** Wasm runs compiled, typed code, and the 128-bit SIMD extension lets kernels process several values per instruction.
- **Threads, with a condition.** Multithreaded Wasm needs `SharedArrayBuffer`, which browsers only enable on cross-origin isolated pages. Your server must send `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. Without those headers, libraries fall back to a single thread.
- **Still the CPU.** For large models (vision transformers, LLMs), the GPU is much faster. In browsers that support it, WebGPU is the better backend; Wasm is the fallback that works everywhere and is often faster for small models, where GPU setup overhead dominates.
- **Downloads.** The Wasm runtime is several megabytes and the model can be tens or hundreds more. Cache both and load them lazily.

## Example: ONNX Runtime Web

[ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/) runs models in the ONNX format. PyTorch, TensorFlow/Keras and scikit-learn models can all be exported to ONNX, so it's the most general option. Its Wasm backend supports every ONNX operator; the GPU backends (WebGPU, WebGL, WebNN) support a subset.

Install it:

```bash
npm install onnxruntime-web
```

Then load a model and run it. This assumes an MNIST-style classifier exported to `model.onnx` that takes a `[1, 784]` float32 input:

```js
import * as ort from 'onnxruntime-web';

// Create the session once and reuse it.
const session = await ort.InferenceSession.create('./model.onnx', {
  executionProviders: ['wasm'],
});

// 28x28 grayscale pixels, scaled to 0..1.
const pixels = new Float32Array(784);
const input = new ort.Tensor('float32', pixels, [1, 784]);

// Feed inputs by name; the names come from the exported model.
const results = await session.run({ [session.inputNames[0]]: input });
const scores = results[session.outputNames[0]].data;

const predicted = scores.indexOf(Math.max(...scores));
console.log('Predicted digit:', predicted);
```

Using `session.inputNames` and `session.outputNames` saves you from hard-coding whatever names the exporter chose. Swap `'wasm'` for `'webgpu'` in `executionProviders` to try the GPU path; check the [execution provider docs](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html) for the import path that build needs.

## Other options

- **TensorFlow.js** runs TensorFlow and Keras models in JavaScript. It has several backends: WebGL, WebGPU, plain CPU, and a Wasm backend in the `@tensorflow/tfjs-backend-wasm` package. Select it with `await tf.setBackend('wasm')` after importing the package. Models trained in Python are converted with the `tensorflowjs` converter.
- **Transformers.js** from Hugging Face runs many Hugging Face Hub models (text classification, embeddings, speech recognition, small LLMs) in the browser. It uses ONNX Runtime Web underneath, so the same Wasm and WebGPU backends apply.
- **ML.NET in Blazor WebAssembly**: Blazor runs .NET in the browser on Wasm, and ML.NET has had partial support there since .NET 6. Some trainers that rely on native libraries aren't supported, so check your algorithm before committing to it.
- **WebDNN** was an early research framework for in-browser inference. Its npm package hasn't been updated since 2022; prefer one of the options above for new work.

## When not to do this

- The model is too big to download to every visitor, or must stay private. Serve it from a backend instead.
- You need consistent latency across devices. In-browser speed depends entirely on the user's hardware, and a low-end phone may be many times slower than your laptop.
- You'd be training rather than running inference. Browser runtimes are built for inference; train in Python and export.

## Further reading

- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [TensorFlow.js platform and environment (backends)](https://www.tensorflow.org/js/guide/platform_environment)
- [Transformers.js](https://huggingface.co/docs/transformers.js)
- [WebAssembly features and browser support](https://webassembly.org/features/)
