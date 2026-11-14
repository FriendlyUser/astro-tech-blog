---
description: 'Make HTTP requests in Deno with the built-in fetch: GET and POST, error handling, timeouts, streaming a download to disk, and Deno-specific options.'
imgSrc: /imgs/2023/2581699444.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-24T14:08:45.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: 'HTTP requests in Deno with fetch'
---

:::caution[Updated in November 2026]
The first version of this post imported `fetch` from `https://deno.land/x/std/fetch/mod.ts`. That module never existed. `fetch` is a global in Deno, exactly as in browsers, and needs no import. The examples below were run with Deno 2.9.
:::

Deno implements the web-standard [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) as globals: `fetch()`, `Request`, `Response` and `Headers`. Code you write against it also runs in browsers, Node.js 18+ and Bun, and you don't need a library like Axios for ordinary HTTP calls. The one Deno-specific part is permissions: a script can only reach hosts you allow with `--allow-net`.

## The pieces

- `fetch(input, init?)` takes a URL string, `URL` or `Request`, plus optional settings (`method`, `headers`, `body`, `signal`, …), and returns a `Promise<Response>`.
- `Request` describes a request. Build one when you want to reuse or pass around a request object; otherwise pass the URL and options straight to `fetch`.
- `Response` holds the status, headers and body. The body can be read once, as `.json()`, `.text()`, `.bytes()`, `.arrayBuffer()` or `.blob()`, or consumed as a stream through `.body`.
- `Headers` is a case-insensitive map with `get`, `set`, `append`, `has` and `delete`.

## A GET request

```typescript
const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
if (!response.ok) {
  throw new Error(`Request failed: ${response.status} ${response.statusText}`);
}
const post = await response.json();
console.log(post.title);
```

```bash
deno run --allow-net=jsonplaceholder.typicode.com get.ts
```

`fetch` only rejects on network failures (DNS errors, refused connections, aborts). A 404 or 500 still resolves to a `Response`, so check `response.ok` or `response.status` yourself.

## A POST request with a JSON body

```typescript
const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "New post", body: "Sent from Deno", userId: 1 }),
});

console.log(response.status); // 201
console.log(await response.json());
// { title: "New post", body: "Sent from Deno", userId: 1, id: 101 }
```

`body` also accepts a string, `Uint8Array`, `Blob`, `FormData`, `URLSearchParams` or a `ReadableStream`. For `FormData` and `URLSearchParams`, `fetch` sets the `Content-Type` header for you.

## Timeouts and cancellation

`fetch` has no timeout of its own. Pass an `AbortSignal`; `AbortSignal.timeout(ms)` creates one that fires after a delay:

```typescript
try {
  const response = await fetch("https://httpbin.org/delay/5", {
    signal: AbortSignal.timeout(2000),
  });
  console.log(response.status);
} catch (err) {
  if (err instanceof DOMException && err.name === "TimeoutError") {
    console.log("Request timed out");
  } else {
    throw err;
  }
}
```

Use an `AbortController` instead if you want to cancel from your own code (for example, when the user navigates away or another request wins a race).

## Streaming a large download to disk

`response.body` is a `ReadableStream<Uint8Array>`, and a Deno file has a `writable` stream, so you can pipe one into the other without holding the whole response in memory:

```typescript
const response = await fetch("https://jsonplaceholder.typicode.com/photos");
const file = await Deno.create("photos.json");
await response.body!.pipeTo(file.writable);
```

`pipeTo` closes the file when the stream ends. This one needs `--allow-net` and `--allow-write=photos.json`.

## Deno-specific behaviour

- **Local files.** Deno's `fetch` accepts `file:` URLs, so `await fetch(new URL("./data.json", import.meta.url))` reads a file next to your module. It needs `--allow-read`.
- **Proxies and certificates.** `Deno.createHttpClient()` creates a client with options such as a proxy, extra CA certificates or HTTP/2 settings. Pass it as `fetch(url, { client })` and call `client.close()` when you're done. Deno also respects the `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY` environment variables.
- **No CORS.** CORS is a browser rule. Deno doesn't apply it to outgoing requests, so a request that fails in the browser may work from Deno.

## Further reading

- [Fetch API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [`fetch` in the Deno API reference](https://docs.deno.com/api/web/fetch)
- [`Deno.createHttpClient`](https://docs.deno.com/api/deno/~/Deno.createHttpClient)
