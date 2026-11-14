---
tags: ['react', 'nextjs', 'typescript']
title: "Next.js basics: rendering modes, a TypeScript starter app and deploying to Vercel"
description: What Next.js adds on top of React, how to create a TypeScript app with the App Router, the built-in components worth using, and how to deploy it to Vercel.
pubDate: Fri, 29 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2432208319.png
---

Next.js is a React framework from Vercel. On top of React it gives you file-based routing, server rendering and static generation, API endpoints, and a build pipeline, so you don't have to wire those together yourself. This post was revised against Next.js 16.4 and React 19.

:::note
The original version of this post used the **Pages Router** (`pages/_app.tsx`, `getStaticProps`, `next/head`). That router is still supported, but new projects created with `create-next-app` use the **App Router** (`app/` directory) by default, so the examples below use it.
:::

## What Next.js gives you

- **Server rendering and static generation.** Pages can be rendered to HTML at build time or on each request instead of only in the browser.
- **File-based routing.** `app/about/page.tsx` becomes `/about`. Navigation with `next/link` happens on the client without a full page reload.
- **Automatic code splitting.** Each route only loads the JavaScript it needs.
- **Route Handlers** (the App Router's version of API routes) for backend endpoints in the same project.
- **Styling.** CSS Modules, global CSS, Sass and Tailwind CSS work out of the box. CSS-in-JS libraries such as styled-components need extra setup, and only work in Client Components.

## Why server rendering helps

With plain client-side React, the browser downloads an almost empty HTML file, then fetches and runs JavaScript before anything appears. With server-side rendering (SSR) or static generation, the HTML already contains the page content, so:

- The first paint doesn't wait for your JavaScript bundle to download and run.
- Crawlers and link previews see real content without executing JavaScript.
- Content is readable even if JavaScript fails to load. Interactive parts (buttons, forms that use client state) still need JavaScript once the page *hydrates*.

In the App Router, components are **Server Components** by default and run only on the server. Add `'use client'` at the top of a file when a component needs state, effects or browser APIs.

## Create a TypeScript app

```bash
npx create-next-app@latest my-app
cd my-app
npm run dev
```

The recommended defaults include TypeScript, ESLint, Tailwind CSS and the App Router. To be explicit, pass `--ts --app`. The generated `tsconfig.json` is already set up for Next.js, so you don't need to edit it. The dev server runs at `http://localhost:3000`.

The home page lives in `app/page.tsx`. Replace it with:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'My Next.js App',
  description: 'A small Next.js app',
};

export default function Home() {
  return (
    <main>
      <h1>Welcome to my Next.js app!</h1>
      <Link href="/about">About</Link>
    </main>
  );
}
```

`app/layout.tsx`, which `create-next-app` generates, wraps every page. Shared UI and global CSS imports go there.

A Route Handler is a `route.ts` file that exports functions named after HTTP methods:

```ts
// app/api/hello/route.ts  ->  GET /api/hello
export async function GET() {
  return Response.json({ message: 'Hello from Next.js' });
}
```

## Built-ins worth using

- **Data fetching.** In the App Router, fetch data directly in an `async` Server Component instead of using `getStaticProps` or `getServerSideProps`, which are Pages Router APIs. See the [data fetching guide](https://nextjs.org/docs/app/getting-started/fetching-data) for caching options.
- **Metadata.** Export a `metadata` object or a `generateMetadata` function from `page.tsx` or `layout.tsx` for titles and descriptions. `next/head` is Pages Router only.
- **`next/link`** for client-side navigation between routes.
- **`next/image`** for automatic resizing, modern formats and lazy loading of images.
- **`next/dynamic`** to lazy-load heavy client components that aren't needed on first render.
- **`public/`** for static files served as-is from the site root. `public/logo.png` is available at `/logo.png`.
- **CSS Modules** (`*.module.css`) for component-scoped class names.

## Deploy to Vercel

Vercel detects Next.js projects and builds them with no extra configuration.

1. Push the project to GitHub, GitLab or Bitbucket.
2. In the Vercel dashboard, go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Check the detected settings (framework preset, build command, environment variables) and click **Deploy**.

Each push to the production branch then triggers a new deployment, and pull requests get preview URLs. You can add a custom domain in the project settings, and Vercel provisions the HTTPS certificate automatically.

To deploy from your machine without a Git repository, use the CLI:

```bash
npm i -g vercel
vercel
```

Vercel isn't required. `next build && next start` runs the app on any Node.js server, and Next.js can also produce a standalone build for Docker or a static export.

## Further reading

- [Next.js docs](https://nextjs.org/docs)
- [`create-next-app` options](https://nextjs.org/docs/app/api-reference/cli/create-next-app)
- [Deploying Next.js](https://nextjs.org/docs/app/getting-started/deploying)
