---
title: "Getting started with Fresh 2 in Deno: routes, handlers and islands"
pubDate: "2023-05-03T14:16:45.051Z"
lastUpdated: 2026-11-14
description: "Create a Fresh 2 app in Deno and add a file-based route with a data handler, a JSON API route and an interactive Preact island."
tags: ["deno", "typescript"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3053072516.webp
---

[Fresh](https://usefresh.dev/) is Deno's web framework. It renders pages on the server with Preact, routes requests based on the files in `routes/`, and ships JavaScript to the browser only for the components you mark as "islands". By default a page is plain HTML with no client-side JS.

An earlier version of this post showed an Oak-style `Application`/`Router` API imported from `deno.land/x/fresh`. Fresh has never had that API, so the examples below have been rewritten for Fresh 2, which is published on JSR as `@fresh/core`. Fresh 2.0 went stable in 2025.

## Create a project

You only need [Deno](https://docs.deno.com/runtime/getting_started/installation/) installed.

```bash
deno run -Ar jsr:@fresh/init
cd fresh-project   # or whatever directory name you chose
deno task dev
```

Open the URL the dev server prints. The generated project looks roughly like this:

```text
components/   shared Preact components (server-rendered only)
islands/      components that also run in the browser
routes/       file-based routes; routes/index.tsx renders /
static/       CSS, images and other static assets
main.ts       server entry point
utils.ts      exports the typed `define` helper used by routes
deno.json     dependencies, tasks and import map (`@/` maps to the project root)
```

## A page with a data handler

A route file can export a `handler`, which runs on the server for each request, and a default page component. The handler passes data to the page with `page()`:

```tsx
// routes/index.tsx
import { page } from "fresh";
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET() {
    return page({ message: "This is a dynamic message" });
  },
});

export default define.page<typeof handler>(({ data }) => {
  return (
    <main>
      <h1>Welcome to the Fresh application!</h1>
      <p>{data.message}</p>
    </main>
  );
});
```

`define.page<typeof handler>` ties the page's `data` prop to the handler's return type, so `data.message` is type-checked. A page without data can skip the handler and export only `define.page(...)`. For example, `routes/about.tsx` serves `/about`.

Dynamic segments come from the filename: `routes/posts/[slug].tsx` matches `/posts/anything`, and the handler reads the value from `ctx.params.slug`.

## A JSON API route

A route that exports only a handler can return any `Response`:

```ts
// routes/api/time.ts
import { define } from "@/utils.ts";

export const handler = define.handlers({
  GET() {
    return Response.json({ now: new Date().toISOString() });
  },
});
```

## An interactive island

Everything in `routes/` and `components/` renders to static HTML. To add client-side behaviour, put the component in `islands/`:

```tsx
// islands/LikeButton.tsx
import { useSignal } from "@preact/signals";

export default function LikeButton() {
  const likes = useSignal(0);
  return (
    <button type="button" onClick={() => likes.value++}>
      Likes: {likes}
    </button>
  );
}
```

Use it from a page like any other component:

```tsx
// routes/about.tsx
import { define } from "@/utils.ts";
import LikeButton from "@/islands/LikeButton.tsx";

export default define.page(() => {
  return (
    <main>
      <h1>About</h1>
      <LikeButton />
    </main>
  );
});
```

Fresh hydrates only that button. The rest of the page stays plain HTML. Props passed to an island must be serializable, because Fresh sends them to the browser.

## Things to know

- Fresh 1.x projects (`fresh.gen.ts`, imports from `$fresh/`) need migrating to 2.x. See the official docs for the migration guide.
- Islands are the only components that run in the browser. Event handlers on non-island components do nothing.
- Fresh is tied to Preact. If you need React-only libraries, check for `preact/compat` support first.

## Further reading

- [Fresh documentation](https://usefresh.dev/docs/introduction)
- [Getting started](https://usefresh.dev/docs/getting-started)
- [@fresh/core on JSR](https://jsr.io/@fresh/core)
