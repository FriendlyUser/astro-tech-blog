---
description: How to build HTTP servers in Deno with Deno.serve, make requests with fetch, stream files, and serve static directories with @std/http.
imgSrc: /imgs/2023/3054188082.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-09-08T03:12:13.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript", "http"]
title: 'HTTP in Deno: servers with Deno.serve, requests with fetch, and @std/http'
---

Deno ships an HTTP server and client in the runtime itself. `Deno.serve` takes a function from a web-standard `Request` to a `Response`, and `fetch` is the same API you use in the browser. The standard library package `@std/http` adds helpers on top, such as static file serving, cookies, and status code constants.

:::note[Updated in November 2026]
The first version of this post used `serve` from `https://deno.land/std/http/server.ts`. That function was deprecated once `Deno.serve` became stable in Deno 1.35 (July 2023), and it is not part of `@std/http` 1.x on JSR. It also showed an `HttpClient` class and a `readFile` import from `std/fs` that never existed. The examples below use `Deno.serve` and `fetch`, and were run with Deno 2.9.
:::

## A minimal server

```typescript
// server.ts
Deno.serve((_req) => new Response("Hello, Deno HTTP!"));
```

```sh
deno run --allow-net server.ts
```

With no options, `Deno.serve` listens on port 8000 and prints `Listening on http://localhost:8000/`. Pass an options object as the first argument to change the port or hostname: `Deno.serve({ port: 3000, hostname: "127.0.0.1" }, handler)`.

The handler can return a `Response` or a `Promise<Response>`, so `async` handlers work without extra setup.

## Routing on the URL

There's no router built in. For a handful of routes, a `switch` on the pathname is enough:

```typescript
Deno.serve({ port: 8001 }, (req) => {
  const url = new URL(req.url);

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  switch (url.pathname) {
    case "/":
      return new Response("Welcome to the Deno HTTP server!");
    case "/about":
      return Response.json({ name: "example", runtime: "deno" });
    default:
      return new Response("Page not found", { status: 404 });
  }
});
```

`Response.json()` sets `content-type: application/json` for you. For path parameters such as `/todos/:id`, the built-in `URLPattern` class can match and extract them, or you can use a framework (see below).

## Making requests with fetch

Deno has no separate HTTP client module. Use the global `fetch`:

```typescript
const res = await fetch("https://jsonplaceholder.typicode.com/todos/1");

console.log("Status:", res.status);
console.log("Content-Type:", res.headers.get("content-type"));

if (!res.ok) {
  throw new Error(`Request failed: ${res.status}`);
}
const todo = await res.json();
console.log(todo);
```

```sh
deno run --allow-net client.ts
```

`fetch` only rejects on network errors. A 404 or 500 still resolves, so check `res.ok` or `res.status` yourself.

## Streaming a file

To send a file without reading it all into memory, open it and pass its `readable` stream as the response body. Deno closes the file when the stream finishes.

```typescript
Deno.serve({ port: 8002 }, async (req) => {
  const url = new URL(req.url);

  if (url.pathname !== "/static") {
    return new Response("Page not found", { status: 404 });
  }

  try {
    const file = await Deno.open("static/sample.txt", { read: true });
    return new Response(file.readable, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return new Response("File not found", { status: 404 });
    }
    throw err;
  }
});
```

```sh
deno run --allow-net --allow-read file.ts
```

For small files, `await Deno.readFile(path)` returns a `Uint8Array` you can pass straight to `new Response()`.

## Serving a static directory with @std/http

For a whole directory, `serveDir` from `@std/http` handles content types, `ETag`/`If-None-Match`, range requests, and 404s:

```typescript
import { serveDir } from "jsr:@std/http@^1.1.4/file-server";

Deno.serve({ port: 8003 }, (req) => {
  return serveDir(req, { fsRoot: "public" });
});
```

It logs each request to the console by default; pass `quiet: true` to turn that off. In a project with a `deno.json`, run `deno add jsr:@std/http` and import from `@std/http/file-server` instead of using the inline `jsr:` specifier.

## HTTPS

`Deno.serve` handles TLS itself. Pass the PEM-encoded certificate and key as strings:

```typescript
Deno.serve(
  {
    port: 8443,
    cert: Deno.readTextFileSync("./cert.pem"),
    key: Deno.readTextFileSync("./key.pem"),
  },
  (_req) => new Response("Hello over HTTPS"),
);
```

This needs `--allow-read` for the certificate files as well as `--allow-net`.

## Frameworks

Because `Deno.serve` takes any `(Request) => Response` function, frameworks built on web-standard types plug straight in. [Hono](https://hono.dev/) is a common choice:

```typescript
import { Hono } from "jsr:@hono/hono@^4";

const app = new Hono();

app.get("/", (c) => c.text("Hello from Hono on Deno"));
app.get("/todos/:id", (c) => c.json({ id: c.req.param("id") }));

Deno.serve({ port: 8004 }, app.fetch);
```

This post originally recommended [Oak](https://github.com/oakserver/oak), a Koa-style framework. Oak's README now marks it as unmaintained and says not to use it in new projects, and the repository was archived in November 2026. Existing Oak apps still run, but use Hono or [Fresh](https://fresh.deno.dev/) for new work.

## Gotchas

- Permissions are opt-in. A server needs `--allow-net`, and anything that touches files needs `--allow-read`. Deno stops with a permission error, or prompts in an interactive terminal, if a flag is missing.
- The default hostname is `0.0.0.0`, which listens on all interfaces. Set `hostname: "127.0.0.1"` if the server should only be reachable from your machine.
- `Deno.serve` returns an `HttpServer`. Call `await server.shutdown()` to stop accepting connections and let in-flight requests finish, or pass an `AbortSignal` in the options.

## Further reading

- [`Deno.serve` API reference](https://docs.deno.com/api/deno/~/Deno.serve)
- [HTTP server guide in the Deno docs](https://docs.deno.com/runtime/fundamentals/http_server/)
- [`@std/http` on JSR](https://jsr.io/@std/http)
