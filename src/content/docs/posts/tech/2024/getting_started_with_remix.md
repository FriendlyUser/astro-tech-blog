---
title: "Getting started with Remix: loaders, actions, and the move to React Router"
pubDate: "2024-02-16T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "How Remix's loaders, actions, and nested routes work, how it compares to Next.js, and how to start the same app today with React Router framework mode."
tags: ["Remix", "React", "Web Development", "JavaScript", "Frontend Development", "Performance Optimization", "SEO", "Authentication", "State Management", "Styling", "React Router"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2024/2443221186.webp"
---

:::caution[Remix v2 is end of life]
Remix v2 was merged into React Router v7. What would have been Remix v3 shipped as React Router v7's "framework mode" in November 2024. When React Router v8 came out on 17 June 2026, the team marked Remix v2 (and React Router v6) as end of life, so they no longer receive security updates. React Router v7 still gets security fixes.

For a new project, use React Router (`npx create-react-router@latest`). For an existing Remix v2 app, follow the [upgrade guide](https://reactrouter.com/upgrading/remix). The name "Remix 3" now refers to a separate, new framework that is currently in beta. It is not an upgrade path for Remix v2 apps.
:::

Remix is a full-stack React framework built around web standards. Each route can export a `loader` that runs on the server and returns data for that route, an `action` that handles form submissions, and a component that renders the result. Server code uses the Fetch API's `Request` and `Response` objects, and forms work as plain HTML `<form>` posts before any JavaScript loads.

The ideas below apply to both Remix v2 and React Router framework mode, because the APIs are nearly identical. The examples were checked against `@remix-run/react` 2.17.5 and `react-router` 8.5.1.

## The core model: nested routes, loaders, and actions

Routes nest. A URL like `/projects/42/settings` can match a layout route for `/projects`, a child route for `/projects/:id`, and a grandchild for `settings`. Each level renders inside its parent's `<Outlet />` and can have its own loader. Remix calls the loaders for all matched routes in parallel, so a page doesn't wait on a chain of sequential fetches.

After an action runs, Remix revalidates the page by calling the loaders again. The UI then shows the updated data without you writing any client-side cache invalidation. Before JavaScript loads, the form does a normal POST and full page reload. After hydration, the same form submits with `fetch`.

### A route in Remix v2

In Remix v2, a file in `app/routes/` becomes a route (`app/routes/todos.tsx` serves `/todos`):

```tsx
// app/routes/todos.tsx
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import { addTodo, getTodos } from "~/todos.server";

export async function loader() {
  return { todos: await getTodos() };
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  await addTodo(String(formData.get("title") ?? ""));
  return { ok: true };
}

export default function Todos() {
  const { todos } = useLoaderData<typeof loader>();
  return (
    <main>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <Form method="post">
        <input type="text" name="title" required />
        <button type="submit">Add</button>
      </Form>
    </main>
  );
}
```

```ts
// app/todos.server.ts (in-memory stand-in for a database)
type Todo = { id: number; title: string };
const todos: Todo[] = [];

export async function getTodos() {
  return todos;
}

export async function addTodo(title: string) {
  todos.push({ id: todos.length + 1, title });
}
```

The `.server.ts` suffix marks the module as server-only. Imports used only by `loader` and `action` are stripped from the browser bundle. If client code still references it, the Vite build fails instead of leaking server code.

### The same route in React Router framework mode

The route module has the same shape, but imports come from `react-router` and the generated `Route` types give you typed `loaderData` as a prop:

```tsx
// app/routes/todos.tsx
import { Form } from "react-router";
import type { Route } from "./+types/todos";
import { addTodo, getTodos } from "~/todos.server";

export async function loader() {
  return { todos: await getTodos() };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  await addTodo(String(formData.get("title") ?? ""));
  return { ok: true };
}

export default function Todos({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <ul>
        {loaderData.todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <Form method="post">
        <input type="text" name="title" required />
        <button type="submit">Add</button>
      </Form>
    </main>
  );
}
```

Routes are declared in `app/routes.ts` by default:

```ts
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("todos", "routes/todos.tsx"),
] satisfies RouteConfig;
```

If you prefer Remix-style file-based routing, `flatRoutes()` from `@react-router/fs-routes` keeps it.

## Creating a project

New project (React Router framework mode):

```bash
npx create-react-router@latest my-app
cd my-app
npm run dev
```

The dev server runs on `http://localhost:5173`. React Router v8 requires Node 22.22+, React 19.2.7+, and Vite 7+. If you're stuck on older versions, v7 needs Node 20 and React 18.

`npx create-remix@latest` still scaffolds a Remix v2 app, but don't start anything new on an end-of-life release.

To migrate an existing Remix v2 app, first enable all the v2 future flags. Then run the codemod, which renames the `@remix-run/*` packages to their `react-router` / `@react-router/*` equivalents and updates imports:

```bash
npx codemod remix/2/react-router/upgrade
```

## Remix and Next.js

Both are full-stack React frameworks with server rendering, nested layouts, and file- or config-based routing. The real differences:

| | Remix v2 / React Router framework mode | Next.js (App Router) |
|---|---|---|
| Data loading | Per-route `loader` functions run on the server. Optional `clientLoader` runs in the browser. | React Server Components fetch data directly in components. |
| Mutations | Route `action` + `<Form>`, with automatic revalidation of loaders | Server Actions (stable since Next.js 14) called from `<form action={...}>`. No third-party library needed. |
| Routing | Nested routes with `<Outlet />`. React Router configures routes in `app/routes.ts` or the file system. | File-system routes with nested `layout.tsx` files |
| Static output | Remix v2 had SPA mode but no built-in pre-rendering. React Router adds `prerender` and `ssr: false` config. | Static generation and incremental static regeneration are built in. |
| Images | No built-in image optimization | `next/image` |
| Hosting | Adapters for Node/Express, Cloudflare, Netlify, Vercel, and others | `next start` or standalone output on any Node host. Vercel (which maintains Next.js) has the deepest integration. |

Neither framework makes an app fast "by default." Remix's advantages are structural: parallel loaders, `<Link prefetch="intent">` to fetch a route's code and data on hover, and forms that work without JavaScript. Next.js's advantages are React Server Components, which keep server-only component code out of the client bundle, and mature static generation.

## Libraries that work well with it

These are general React or Node libraries, not Remix-specific packages, except where noted.

- **Styling:** Tailwind CSS is set up in the default React Router template. Runtime CSS-in-JS libraries (Emotion, and component kits built on it such as Chakra UI) work but need extra server-rendering setup to extract styles. Plain CSS files and CSS Modules work without extra setup through Vite.
- **Server and client state:** Loaders plus revalidation cover most server data, so you often don't need TanStack Query (formerly React Query). It's still useful for polling, infinite scroll, or data that isn't tied to a route. For purely client-side UI state, a small store like Zustand works fine.
- **Authentication:** [Remix Auth](https://github.com/sergiodxa/remix-auth) (v4.2) is a server-side library, not a set of hooks. You create an `Authenticator` and register strategies (form login, OAuth2, and others as separate packages), then call `authenticate()` inside an action or loader. Its design is borrowed from Passport.js, but it's written for the Fetch API. It doesn't manage sessions itself: you store the user with React Router's session helpers or your own cookie. Passport itself is Express middleware built around Node's `req`/`res`. It only fits if you run Remix behind an Express server and handle auth there, outside your route modules.
- **Database:** Prisma or Drizzle, called from loaders and actions. Keep the client in a `.server.ts` module. Supabase works through its `@supabase/ssr` package, which handles cookie-based sessions in server-rendered apps.
- **Testing:** Vitest for unit tests, since the project already uses Vite. `createRoutesStub` from `react-router` renders route components with stubbed loaders and actions (`createRemixStub` from `@remix-run/testing` in Remix v2). Playwright is a good choice for end-to-end tests.

## Gotchas

- **Loaders run on every navigation to that route,** and after every action on the page. Keep them fast, or return cache headers from the route's `headers` export.
- **Everything a loader returns is sent to the browser.** Don't return whole database rows that contain fields the user shouldn't see.
- **Validate in the action, not just in the browser.** The `required` attribute is a convenience, while the action is the actual boundary. Return validation errors from the action and read them with `useActionData` (or the `actionData` prop).

## Further reading

- [React Router framework mode docs](https://reactrouter.com/start/framework/installation)
- [Upgrading from Remix v2](https://reactrouter.com/upgrading/remix)
- [Remix v2 docs (archived)](https://v2.remix.run/docs)
- [React Router v8 release post](https://remix.run/blog/react-router-v8)
