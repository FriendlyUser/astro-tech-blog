---
title: "Vue 3 Frameworks in 2026, and What Changed in Astro"
description: "Where Nuxt, Quasar, VitePress, Pinia and Vue Router stand in late 2026, what Vite 8 changed under them, and the Astro 6 and 7 features this blog runs on."
tags: ["Vue", "Nuxt", "Astro", "Vite", "Quasar", "Pinia", "Web Development"]
pubDate: "2026-11-10T16:00:00.000Z"
imgSrc: "/imgs/2026/vue_frameworks_and_astro_in_2026.webp"
imgAlt: "Nuxt, Astro, Quasar, VitePress and Pinia drawn as connected islands"
---

The [previous post](/posts/tech/2026/vue_3_since_launch/) covered Vue itself. This one covers what you build Vue apps with in November 2026, and it ends with Astro, which runs this blog.

The short version: 2026 was the year the whole stack moved to Vite 8 and Rolldown. Two of the companies behind it (VoidZero, which makes Vite, and the Astro team) joined Cloudflare. Most frameworks had a major or near-major release to absorb all of that.

## The layer underneath: Vite 8 and Rolldown

[Vite 8](https://vite.dev/blog/announcing-vite8) shipped on March 12, 2026. It replaced esbuild and Rollup with [Rolldown](https://rolldown.rs/), a single Rust bundler used for both dev and build, with the Oxc toolchain throughout. The announcement says Rolldown is 10–30x faster than Rollup, and gives Linear's production build dropping from 46 seconds to 6 as an example. A compatibility layer translates existing `esbuild` and `rollupOptions` config, so most projects upgraded without changes. Vite 8 needs Node 20.19+ or 22.12+.

Two business changes followed. VoidZero [joined Cloudflare](https://blog.cloudflare.com/voidzero-joins-cloudflare/) on June 4, 2026. Vite, Rolldown and Oxc stay open source and vendor-neutral, and Cloudflare put $1M into a Vite ecosystem fund. [Vite+](https://voidzero.dev/posts/announcing-vite-plus-1-0), VoidZero's unified toolchain (dev server, build, test, lint and format behind one CLI), was open-sourced under MIT in March and reached 1.0 on September 28.

Everything below is downstream of this. If a framework release in 2026 says "faster builds", it is usually Rolldown.

## Nuxt 4, and Nuxt 5 on the way

Nuxt 4.0 shipped in July 2025, with the `app/` directory, reworked data fetching and per-context TypeScript projects. The 2026 releases built on it:

- **4.4 (March 12):**
  - factory functions `createUseFetch` and `createUseAsyncData`;
  - Vue Router 5;
  - typed layout props;
  - `useAnnouncer` for accessible route announcements;
  - build profiling.
- **4.5 (July 18):**
  - Vite 8;
  - Rspack 2 / Rsbuild builder support;
  - experimental SSR streaming;
  - `useLayout` and named views;
  - an `enabled` option for `useFetch`;
  - an opt-in `future.compatibilityVersion: 5` for trying Nuxt 5's breaking changes early.
- **4.6 (October 5):**
  - Nuxt CLI v4 with an interactive terminal UI;
  - a server-agnostic `nuxt/server` API, so server code written today also runs on Nuxt 5's Nitro v3;
  - built-in `appSecret` and sessions;
  - a rebuilt typed `$fetch`;
  - **Vue Vapor support in interop mode.**

The Vapor support means you can turn it on in config and opt single pages or components in:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { vapor: true },
});
```

```vue
<!-- app/pages/dashboard.vue -->
<script setup vapor lang="ts">
const { data } = await useFetch('/api/stats');
</script>
```

The app root stays on the virtual DOM. According to the release notes, routing, `useAsyncData`, layouts and most built-in components work unchanged.

Support dates matter if you run Nuxt in production. Per the [Nuxt roadmap](https://nuxt.com/docs/4.x/community/roadmap), **Nuxt 3 reached end of life on July 31, 2026** and no longer gets security patches. Nuxt 5, which moves to Nitro v3 and h3 v2, is listed as "Q4 2026 (estimated)". Nitro v3 was at release-candidate stage in early November. Nuxt 4 is supported for six months after 5.x ships.

If you still have a Nuxt 3 app, move it to 4.6 now, and write new server code against `nuxt/server` so the 5.0 upgrade is mostly a version bump.

## Quasar

Quasar is still the most complete "batteries included" Vue UI framework: components, plus build targets for SPA, SSR, PWA, Electron and Capacitor. Its 2026 work was mostly about the build tool:

- **`@quasar/app-vite` 3.0** (July 6, 2026):
  - uses Rolldown in place of esbuild for the `src-*` folders;
  - moved to `import.meta.env`;
  - redesigned the SSR setup so you can pick Hono, Fastify, Express or Koa as the server;
  - added file-based routing.
- **`@quasar/vite-plugin` 2.0** (August) requires Vite 8.
- **The core package** is on 2.35.x (2.35.4 on November 12).
- **`@quasar/mcp`** (September) is a new package: an MCP server that gives coding agents Quasar's component docs.

I haven't seen anything official about Quasar components running in Vapor Mode yet. For a Quasar app, the realistic 2026 upgrade is app-vite 3 and Vite 8, not Vapor.

## VitePress, Pinia, Vue Router and the tooling

- **VitePress 2 is still in alpha.** 2.0.0-alpha.21 came out on October 25, 2026, and alpha.18 moved it to Vite 8. Plenty of docs sites run the alphas, but there is no stable release date.
- **Pinia 4.0** (July 14, 2026) is a small major. The release notes call its breaking changes "only technically breaking": it is ESM-only, and you now install `@vue/devtools-api` v8 next to it. 4.1 (October 14) added `getStores()`.
- **Vue Router 5.0** (January 29, 2026) merged unplugin-vue-router into core, so file-based routing with typed routes is built in. It has no real breaking changes, and it adds experimental data loaders. It is on 5.5.x now, and the 4.x line still gets patches.
- **Vue DevTools 9** is in release candidates (rc.3 on November 6), rebuilt on Vite DevTools. It needs Vite 8.3+, so plan the DevTools upgrade together with the Vite one. The stable release is 8.2.x.
- **Vue Language Tools** (Volar) is on 3.3.x and is what the official VS Code extension uses.

A Vue 3 stack started in late 2026 therefore looks like this: Vite 8, Vue 3.5 (3.6 when it is stable), Vue Router 5 with file-based routes, Pinia 4, and Nuxt 4 if you need SSR. Vuex and Vue CLI are only for maintaining old apps.

## What changed in Astro

Astro is not a Vue framework, but it is one of the best ways to ship Vue components. With `@astrojs/vue` you can render Vue components to static HTML, and hydrate only the interactive ones with `client:visible` or `client:idle`. This blog runs on Astro 7.4 with Starlight, so these changes are the ones I deal with directly.

### The company

The Astro team [joined Cloudflare](https://astro.build/blog/joining-cloudflare/) on January 16, 2026. Astro stays MIT-licensed and works on any host. It's the same arrangement Vite got five months later.

### Astro 6 (March 10, 2026)

- **A rewritten `astro dev`** built on Vite's Environment API. With the Cloudflare adapter, dev, prerendering and production all run in `workerd`, the actual Workers runtime.
- **Built-in Fonts API** (the top-level `fonts` option) for self-hosting and preloading web fonts.
- **Live content collections** became stable. They fetch at request time instead of build time.
- **Content Security Policy** support became stable (`security.csp`).
- **Upgrades and removals:**
  - moved to Vite 7, Shiki 4 and Zod 4;
  - the minimum Node version became 22.12;
  - removed legacy content collections, `Astro.glob()`, `<ViewTransitions />` and CommonJS config files.

### Astro 7 (June 22, 2026)

Astro 7 is the release where the toolchain changed:

- **Vite 8 and Rolldown.** The Astro team cites builds 15–61% faster.
- **The Rust compiler is the default.** `@astrojs/compiler-rs` replaced the Go-based compiler, and the Go compiler was removed. It is stricter: unclosed tags that the old compiler forgave now throw.
- **Sätteri is the default Markdown processor.** This native pipeline renders `.md` files instead of remark/rehype.
- **Queued rendering is stable.** The Astro team measured about 2.4x faster rendering on expression-heavy pages.
- **Route caching is stable.** It uses a top-level `cache` option, `routeRules`, and `Astro.cache` in pages.
- **Agent-friendly dev tooling.** `astro dev --background`, plus `stop`, `status` and `logs` subcommands and JSON logging, so a coding agent can run a dev server without holding a terminal.
- **`@astrojs/db` was removed** after being deprecated in 6.x.

The Markdown change is the one that affects a blog with years of posts. Remark plugins still work, but you have to opt back into the remark pipeline. This blog does exactly that, because it relies on a remark plugin that drops a duplicate leading heading:

```js
// astro.config.mjs (this blog)
import { defineConfig, memoryCache } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkDropLeadingH1 from './src/utils/remarkDropLeadingH1.mjs';

export default defineConfig({
  markdown: {
    processor: unified(), // keep remark/rehype instead of Sätteri
    remarkPlugins: [remarkDropLeadingH1],
  },
  cache: { provider: memoryCache() }, // Astro 7 route caching
});
```

### Astro 7.1 to 7.4

The 7.x minors were smaller but useful:

- **7.1 (July 16):**
  - `deferRender` for `glob()` collections;
  - finer-grained CSP directives;
  - a `format()` option for `paginate()`.
- **7.2 (August 6):**
  - experimental incremental builds;
  - `session: false`;
  - `astro preview --background`.
- **7.3 (September 3):** loggers passed to image services and cache providers.
- **7.4 (October 15):**
  - `astro build --timings`;
  - separate build-time and runtime image services;
  - experimental parallel prerendering.
  - It also **raised the minimum Node version to 22.22.0 in a minor release.** If your CI pins an older Node 22, a routine `npm update` can break the build.

Starlight followed the same path:

- **0.38 and 0.41** added support for Astro 6 and Astro 7.
- **0.40** added Sätteri support.
- **0.42** ships compiled JavaScript instead of TypeScript source, and the mobile menu now works without JavaScript.
- **0.43** (November 13) adds Pagefind `excludeSelectors`.

On the Vue side, `@astrojs/vue` 7 moved to Vite 8. The container renderer, used for rendering Vue components in tests and outside pages, is now imported from `@astrojs/vue/container-renderer`. I haven't seen any Vapor-specific support in the integration yet. Because Astro only hydrates the components you mark, the bundle-size win from Vapor matters less there than in a full Vue SPA.

## Which one to pick in 2026

- **Content sites, docs and blogs with a few interactive widgets:** Astro, with Vue islands for the widgets. Starlight if it is documentation.
- **Docs that are Vue-heavy, or for a Vue library:** VitePress. It is alpha, but stable in practice.
- **Full-stack apps with SSR, auth and server routes:** Nuxt 4.6, written so it is ready for Nuxt 5.
- **Admin panels, internal tools, and apps that also ship as desktop or mobile builds:** Quasar.
- **A plain SPA:** Vite 8 + Vue 3.5 + Vue Router 5 + Pinia 4.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests](/posts/tech/2026/recording_api_traffic_in_chrome/)
- [Vue 3 Six Years On: What Changed from 3.0 to 3.6](/posts/tech/2026/vue_3_since_launch/)
- [Static Recompilation: How Old Games (and Old Software) Become Native Apps](/posts/tech/2026/static_recompilation_games_and_software/)
- [AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett](/posts/tech/2026/ai_investing_research_systems/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
- [What Changed in Claude Code in 2026](/posts/tech/2026/claude_code_changes_2026/)
