---
title: "Building a small web server in Deno with Pogo: routes, static files and JSX"
pubDate: "2023-05-03T14:16:45.081Z"
lastUpdated: 2026-11-14
description: "Use Pogo, a hapi-style Deno web framework, to define routes, serve static files with h.directory() and render HTML from JSX."
tags: ["pogo", "deno", "typescript"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/covers/using-pogo-in-deno-for-web-development.webp"
---

:::caution
Pogo's latest release, v0.6.0, is several years old. It is built on `deno.land/std@0.154.0`'s HTTP server, which uses `Deno.serveHttp()`. Deno 2 soft-removed that API: its types are gone, but the runtime implementation remains. Expect type errors under `deno check` and possible breakage on future Deno releases. For new projects, use `Deno.serve` directly or a maintained framework such as Hono or Oak.
:::

[Pogo](https://github.com/sholladay/pogo) is a small Deno web framework modelled on [hapi](https://hapi.dev/). Route handlers return a value, such as a string, an object, a `Response` or a JSX element, and Pogo turns it into an HTTP response. It has a response toolkit (`h`) for files and redirects, and it renders React elements on the server without extra setup.

## Hello world

```typescript
// app.ts
import pogo from "https://deno.land/x/pogo@v0.6.0/main.ts";

const server = pogo.server({ port: 3000 });

server.router.get("/", () => {
  return "Hello, Pogo!";
});

await server.start();
```

```bash
deno run --allow-net app.ts
```

Open `http://localhost:3000`. Create servers with the default export's `pogo.server()` factory. The module has no `Pogo` export.

## Serving static files

Pogo has no `server.static()`. Static files go through a route with a wildcard path parameter and the `h.directory()` toolkit method:

```text
public/
  style.css
```

```typescript
server.router.get("/static/{file*}", (request, h) => {
  return h.directory("public");
});
```

Pogo joins the directory with the last path parameter, so `/static/style.css` serves `public/style.css`. Directory listings are off by default. For a single file, use `h.file("path/to/file")`, which by default refuses paths outside the current working directory. Both read from disk, so add `--allow-read`.

## Rendering HTML with JSX

Pogo doesn't ship a template engine such as EJS. Instead, it renders React elements to static markup, so a handler can return JSX. Save this as `app.tsx`; the extension tells Deno to compile JSX:

```tsx
// app.tsx
import React from "https://esm.sh/react@18.2.0";
import pogo from "https://deno.land/x/pogo@v0.6.0/main.ts";

const server = pogo.server({ port: 3000 });

server.router.get("/static/{file*}", (request, h) => {
  return h.directory("public");
});

server.router.get("/", () => {
  const message = "Hello, Pogo!";
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>Pogo Example</title>
        <link rel="stylesheet" href="/static/style.css" />
      </head>
      <body>
        <h1>{message}</h1>
      </body>
    </html>
  );
});

await server.start();
```

```bash
deno run --allow-net --allow-read app.tsx
```

Import React from the same version Pogo uses internally (`react@18.2.0` from esm.sh). Under Deno's default classic JSX transform, `<h1>` compiles to `React.createElement`, so `React` has to be in scope. With React 19 you'd get elements that Pogo's bundled React 18 renderer doesn't recognise.

## Further reading

- [Pogo README and API docs](https://github.com/sholladay/pogo)
- [Pogo on deno.land/x](https://deno.land/x/pogo)
- [`Deno.serve` docs](https://docs.deno.com/runtime/fundamentals/http_server/), the built-in alternative
