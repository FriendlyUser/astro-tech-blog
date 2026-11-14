---
tags: ['vuepress', 'gridsome', 'astro']
title: "Static site generators compared: Jekyll, Hugo, Gatsby, Next.js, Eleventy, VuePress, Astro and Gridsome"
description: What a static site generator does, and the trade-offs between Jekyll, Hugo, Gatsby, Next.js, Eleventy, VuePress/VitePress, Astro and Gridsome.
pubDate: Fri, 14 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2022/dall-e/CorgiUpInATree.jpeg"
---

:::caution
Two of the tools covered here are no longer a good choice for new sites. Gridsome's last release was 0.7.23 in November 2020. VuePress 1 is deprecated, and the Vue team now recommends [VitePress](https://vitepress.dev/) instead.
:::

A static site generator (SSG) turns content (usually Markdown) and templates into plain HTML, CSS and JavaScript files at build time. Because every page already exists before anyone requests it, you can host the output on any static file host or CDN (GitHub Pages, Netlify, Cloudflare Pages, S3) with no server-side code to run or patch. That suits blogs, portfolios and documentation. The trade-off is that changing content means rebuilding, and anything per-user (logins, search over private data, comments) needs client-side JavaScript or an external service.

## The tools

| Tool | Language / templates | Good fit |
| --- | --- | --- |
| Jekyll | Ruby, Liquid | Simple blogs, especially on GitHub Pages |
| Hugo | Go binary, Go templates | Large content sites where build speed matters |
| Eleventy | Node.js, many template languages | Content sites that want little or no client-side JS |
| Gatsby | React, GraphQL data layer | React sites pulling content from several sources |
| Next.js | React | Apps that mix static pages with server rendering |
| VuePress / VitePress | Vue | Documentation sites |
| Astro | Node.js, `.astro` components plus React/Vue/Svelte etc. | Content sites with a few interactive parts |
| Gridsome | Vue 2, GraphQL data layer | Unmaintained; avoid for new projects |

### Jekyll

Written in Ruby and uses the Liquid template language. GitHub Pages can build Jekyll sites for you, which makes it the lowest-effort way to get a blog online from a repository. It has built-in blog conventions (posts with dates, categories, tags) and a long-established ecosystem of themes and plugins.

Downsides: you need a Ruby toolchain locally, builds slow down noticeably on large sites, and GitHub Pages' built-in build only allows a fixed list of plugins (you can work around this by building in GitHub Actions).

### Hugo

A single Go binary with no runtime dependencies to install. It's known for build speed: sites with thousands of pages typically build in seconds. Templates use Go's `html/template`/`text/template` syntax, so you don't need to write Go, but the template syntax and Hugo's lookup rules for which template renders which page take some learning. Hugo has no plugin system; you extend it with themes, shortcodes and Hugo Modules.

### Eleventy (11ty)

A Node.js generator that ships no client-side JavaScript unless you add it. It supports several template languages (Markdown, Liquid, Nunjucks, plain JavaScript and others) and can mix them in one project. It's deliberately unopinionated: there's no default theme or required project layout, which is flexible but means more decisions up front.

### Gatsby

A React framework with a GraphQL data layer: source plugins pull content from Markdown, CMSs or APIs into one GraphQL schema that your pages query. Besides static generation it also supports deferred static generation and server-side rendering. The cost is complexity: you need to be comfortable with React and GraphQL, and builds and dependency trees are heavy for a small blog.

### Next.js

A React framework rather than an SSG first. Pages can be statically generated, server-rendered or rendered on the client, and it has API routes for backend code. For a fully static site, set `output: 'export'` in `next.config.js` and deploy the generated `out` folder, but server-only features such as API routes and default image optimisation aren't available in that mode. It's a good choice when a mostly static site will grow app-like features; it's more machinery than a plain blog needs.

### VuePress and VitePress

VuePress uses Vue components inside Markdown and was built for documentation: the default theme gives you a sidebar, navbar, search and per-page table of contents out of the box. VuePress 1 (Vue 2, webpack) is deprecated; VuePress 2 is maintained by a community team. The Vue team's recommended replacement is VitePress, which is built on Vite and Vue 3 and covers the same documentation use case.

### Astro

Astro renders pages to static HTML and ships no JavaScript by default. Interactive parts are "islands": you write them in React, Vue, Svelte, Solid or other supported frameworks and opt in to hydrating them with directives like `client:load` or `client:visible`. Content collections give you type-checked frontmatter for Markdown/MDX. With an adapter (Node, Netlify, Vercel, Cloudflare and others) individual routes can be server-rendered on demand, so a site isn't locked into being fully static. [Starlight](https://starlight.astro.build/) is Astro's official documentation theme.

### Gridsome

A Vue 2 framework inspired by Gatsby: a GraphQL data layer fed by source plugins, with Vue components for pages. Development has stopped (last release November 2020) and Vue 2 itself reached end of life at the end of 2023, so existing Gridsome sites are best migrated, for example to Astro, Nuxt or VitePress.

## Choosing

- Want the least setup for a blog in a GitHub repo: Jekyll on GitHub Pages.
- Thousands of pages, or no wish to manage a Node.js toolchain: Hugo.
- Documentation for a Vue or JavaScript project: VitePress, or Astro with Starlight.
- Mostly content with a few interactive widgets, using components you already have: Astro.
- A site that will become an app with auth and APIs: Next.js.

Whatever you pick, try building a few real pages with it first. Templating syntax and how content is organised affect day-to-day work more than benchmark numbers.
