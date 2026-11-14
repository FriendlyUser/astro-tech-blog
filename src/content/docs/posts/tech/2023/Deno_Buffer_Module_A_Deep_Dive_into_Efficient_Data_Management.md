---
description: 'How the Buffer class from @std/io works in Deno: writing and reading bytes, filling it from a file, and when to use web streams instead.'
imgSrc: /imgs/2023/4225416985.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-24T08:06:49.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: 'Byte buffers in Deno with @std/io Buffer'
---

:::caution[Updated in November 2026]
The first version of this post imported `Buffer` from `https://deno.land/std@0.114.0/io/buffer.ts`. The standard library is no longer published to `deno.land/std`; `Buffer` now lives in the [`@std/io`](https://jsr.io/@std/io) package on JSR. That package is still marked unstable (0.x), and its own docs say the `Reader`/`Writer` interfaces it is built around are deprecated in Deno in favour of web streams. The old global `Deno.Buffer` was removed in Deno 2. The examples below were run with Deno 2.9 and `@std/io` 0.225.
:::

`Buffer` from `@std/io` is a growable byte queue modelled on Go's `bytes.Buffer`. You write `Uint8Array` chunks onto the end and read them off the front; it grows its underlying `ArrayBuffer` as needed. It is not Node's `Buffer`, and it isn't a general-purpose binary data type: it's for collecting bytes from a `Reader` (a file or socket) and handing them out again.

## Creating a buffer

```typescript
import { Buffer } from "jsr:@std/io@0.225/buffer";

const empty = new Buffer();
const buf = new Buffer(new Uint8Array([65, 66, 67])); // "ABC"
console.log(buf.length); // 3
```

The constructor takes an optional `ArrayBuffer` or array-like of numbers as the initial unread contents.

## Reading consumes bytes

`read(p)` copies up to `p.length` unread bytes into `p` and returns how many it copied. Those bytes are then gone from the buffer: it's a queue, not a random-access array. When the buffer is empty, `read` returns `null` (end of input), not `0`.

```typescript
const readData = new Uint8Array(2);
const n = await buf.read(readData);
console.log(n, readData); // 2 Uint8Array(2) [ 65, 66 ]
console.log(buf.length);  // 1 ("C" is still unread)
```

`readSync` does the same thing synchronously. The async version exists so `Buffer` satisfies the `Reader` interface; there's no actual I/O.

## Writing appends bytes

```typescript
const written = await buf.write(new TextEncoder().encode("DEF"));
console.log(written); // 3

console.log(new TextDecoder().decode(buf.bytes({ copy: false }))); // "CDEF"

const rest = new Uint8Array(10);
console.log(await buf.read(rest)); // 4
console.log(await buf.read(rest)); // null
console.log(buf.empty());          // true
```

`bytes()` returns the unread portion without consuming it. With `{ copy: false }` it returns a view into the buffer's memory, which is only valid until the next `read`, `write`, `reset` or `truncate`; pass `{ copy: true }` if you need to keep it.

There is no `seek` or `slice` method. To drop data, use `truncate(n)` (keep only the first `n` unread bytes) or `reset()` (empty the buffer but keep the allocation). `grow(n)` pre-allocates room for `n` more bytes if you know roughly how much is coming.

## Filling a buffer from a file

`readFrom` reads from any `Reader` until end of input. A `Deno.FsFile` still has a `read` method, so it works directly:

```typescript
import { Buffer } from "jsr:@std/io@0.225/buffer";

using file = await Deno.open("data.bin");
const buf = new Buffer();
const n = await buf.readFrom(file);
console.log(`read ${n} bytes, ${buf.length} unread`);
```

Run it with `deno run --allow-read`. The `using` declaration closes the file when it goes out of scope.

## When not to use it

For most new code you don't need `Buffer` at all:

- To read a whole file, `await Deno.readFile(path)` returns a `Uint8Array`.
- To collect a `ReadableStream` (a file's `.readable`, a `fetch` body), `await new Response(stream).bytes()` does it in one line.
- To join chunks you already have, `concat` from [`@std/bytes`](https://jsr.io/@std/bytes) is simpler.

`Buffer` is also an ordinary single-threaded object with no locking. Code within one isolate can't race on it, but it can't be shared with a `Worker` either: `postMessage` copies what you send, so send the bytes (`buf.bytes({ copy: true })`) rather than the `Buffer`. If you really need memory shared between workers, use a `SharedArrayBuffer` with `Atomics`.

## Further reading

- [`@std/io` Buffer API docs](https://jsr.io/@std/io/doc/buffer)
- [Go `bytes.Buffer`](https://pkg.go.dev/bytes#Buffer), the design it copies
- [Streams in Deno](https://docs.deno.com/api/web/streams)
