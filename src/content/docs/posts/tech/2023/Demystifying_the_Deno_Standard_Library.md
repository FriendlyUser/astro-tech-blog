---
description: What the Deno standard library is, how to install its @std packages from JSR, and examples from @std/fs, @std/http, @std/datetime and @std/uuid.
imgSrc: /imgs/2023/2785394646.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-18T14:25:14.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: "The Deno standard library: using @std packages from JSR"
---

:::caution[The standard library moved to JSR]
The original version of this post imported from `https://deno.land/std/...`. After version 0.224.0, new standard library releases are published to [JSR](https://jsr.io/@std) as separate `@std/*` packages, and deno.land/std no longer gets regular updates. Several APIs shown in older tutorials, including the old version of this post, no longer exist: `readFileStr` (use `Deno.readTextFile`), the `serve` async iterator from `std/http/server.ts` (use `Deno.serve`), and `v4.generate()` from the uuid module (use `crypto.randomUUID()`). The examples below use the current packages.
:::

The Deno standard library is a set of TypeScript packages maintained by the Deno team. It isn't built into the runtime: you install the packages you need like any other dependency. It covers things the runtime APIs leave out, such as recursive directory walking, file serving, date formatting, CSV and YAML parsing, and test assertions.

## How it's organised

Each module is its own package under the `@std` scope on JSR, for example `@std/fs`, `@std/path` or `@std/assert`, and each is versioned independently. Most packages are stable (1.x) and follow semantic versioning. Some, such as `@std/datetime`, are still marked unstable, which means their API can change in a minor release. The packages have no third-party dependencies; they only depend on each other.

Add packages to a project with `deno add`, which records them in `deno.json` so you can import them by bare name:

```sh
deno add jsr:@std/fs jsr:@std/http
```

```typescript
import { walk } from "@std/fs";
```

For a single script you can skip `deno.json` and import with a `jsr:` specifier, as the examples below do.

## `@std/fs`: file system helpers

Reading and writing files is a runtime API (`Deno.readTextFile`, `Deno.writeTextFile`), not part of the standard library. `@std/fs` adds the higher-level operations: `walk`, `expandGlob`, `ensureDir`, `copy`, `move`, `emptyDir` and `exists`.

This lists every TypeScript file under the current directory:

```typescript
import { walk } from "jsr:@std/fs@^1/walk";

for await (const entry of walk(".", { exts: [".ts"], includeDirs: false })) {
  console.log(entry.path);
}
```

Run it with `deno run --allow-read list.ts`.

## `@std/http`: utilities around `Deno.serve`

The HTTP server itself is built into the runtime as `Deno.serve`. `@std/http` provides helpers on top of it: static file serving, cookies, status code constants, content negotiation and user-agent parsing.

This server answers `/static/...` from the `public` directory and everything else with a plain response:

```typescript
import { serveDir } from "jsr:@std/http@^1/file-server";

Deno.serve({ port: 8000 }, (req) => {
  const { pathname } = new URL(req.url);
  if (pathname.startsWith("/static")) {
    return serveDir(req, { fsRoot: "public", urlRoot: "static" });
  }
  return new Response("Hello, world!\n");
});
```

Run it with `deno run --allow-net --allow-read server.ts`. A request to `/static/logo.png` is served from `./public/logo.png`.

## `@std/datetime`: parsing and formatting dates

`parse` and `format` take format strings built from tokens like `yyyy`, `MM`, `dd`, `HH` and `mm`. This package is still unstable (0.x), so pin the version you tested with:

```typescript
import { format, parse } from "jsr:@std/datetime@^0.225";

const date = parse("2023-05-07", "yyyy-MM-dd");
console.log(format(date, "dd/MM/yyyy")); // 07/05/2023
```

`parse` interprets the string in the local time zone. `format` accepts `{ timeZone: "UTC" }` as a third argument if you want UTC output.

## `@std/uuid`: generating and validating UUIDs

For random (v4) UUIDs you don't need the standard library at all: `crypto.randomUUID()` is built in. `@std/uuid` adds validation and the other versions, such as name-based v5 UUIDs, which always produce the same ID for the same namespace and name:

```typescript
import { NAMESPACE_URL, v4, v5 } from "jsr:@std/uuid@^1";

const random = crypto.randomUUID();
console.log(v4.validate(random)); // true

const data = new TextEncoder().encode("https://example.com/users/42");
const stable = await v5.generate(NAMESPACE_URL, data);
console.log(stable); // same value every run
```

## Gotchas

- Old code with unversioned `https://deno.land/std/...` imports is fragile. If you can't migrate yet, pin a version (`https://deno.land/std@0.224.0/...`), then move to the matching `jsr:@std/*` packages.
- Check the package page for a stability label before depending on a 0.x package such as `@std/datetime` in production code.
- Some packages also run outside Deno. JSR shows runtime compatibility on each package page: `@std/uuid`, for example, is listed for Node.js, Bun and browsers, while `@std/fs` is Deno-only.

## Further reading

- [Deno docs: Standard library](https://docs.deno.com/runtime/fundamentals/standard_library/)
- [`@std` packages on JSR](https://jsr.io/@std)
- [Deno docs: Writing an HTTP server](https://docs.deno.com/runtime/fundamentals/http_server/)
