---
title: Setting up a VuePress 1 site with vuepress-theme-cool
description: Install VuePress 1 and vuepress-theme-cool, configure KaTeX, PlantUML and admonition plugins, and run a local documentation site.
pubDate: Thursday, 16 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["vue", "vuepress"]
projects: ["vuepress-theme-cool"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3531615326.png'
---

:::caution
VuePress 1 is deprecated: its last release was 1.9.10 (August 2023), and the Vue team now recommends [VitePress](https://vitepress.dev/) as its static site generator. VuePress 2 is maintained by a community team. vuepress-theme-cool only targets VuePress 1 (its latest release is 1.3.1, from August 2020) and won't work with VuePress 2 or VitePress. Use this post for existing VuePress 1 sites; start new projects on VitePress.
:::

[VuePress](https://v1.vuepress.vuejs.org/) is a Vue-powered static site generator aimed at documentation: you write Markdown, and it builds a single-page app with a sidebar, search and pre-rendered HTML for each page. [vuepress-theme-cool](https://github.com/FriendlyUser/vuepress-theme-cool) extends the default VuePress 1 theme and adds Markdown-based diagrams (PlantUML, Mermaid), math via KaTeX, sortable/filterable tables (vue-good-table) and charts (Chart.js via vue-chartkick).

This post sets up a minimal site with the theme.

## Prerequisites

- Node.js and Yarn 1 (classic). npm works too; swap `yarn add -D` for `npm install -D`.

## Install

Create a project and install VuePress 1, the theme, and the markdown-it plugins the config below loads:

```bash
mkdir vuepress-cool-demo
cd vuepress-cool-demo
yarn init -y
yarn add -D vuepress@1 vuepress-theme-cool markdown-it-katex markdown-it-plantuml markdown-it-admonition
```

Pin `vuepress@1`. Older guides (including the theme's README) say `vuepress@next`, but that tag now points to VuePress 2, which this theme doesn't support.

Add scripts to `package.json`:

```json
{
  "scripts": {
    "docs:dev": "vuepress dev docs",
    "docs:build": "vuepress build docs"
  }
}
```

## Configure

VuePress looks for its config in `<source dir>/.vuepress/config.js`. Since the source directory is `docs`, create `docs/.vuepress/config.js`:

```js
// docs/.vuepress/config.js
module.exports = {
  // 'cool' resolves to the vuepress-theme-cool package
  theme: 'cool',
  markdown: {
    extendMarkdown: (md) => {
      // allow raw HTML in Markdown
      md.set({ html: true });
      // $...$ and $$...$$ math
      md.use(require('markdown-it-katex'));
      // @startuml ... @enduml blocks
      md.use(require('markdown-it-plantuml'));
      // !!! note ... !!! callouts
      md.use(require('markdown-it-admonition'));
    },
  },
};
```

The theme includes the KaTeX stylesheet in its layout, so math renders without extra CSS. Mermaid doesn't need a markdown-it plugin; the theme README shows how to add a small `<mermaid>` component instead.

## Add content

Create `docs/README.md`, which becomes the home page:

````md
# Welcome to my website

This is an example site using [VuePress](https://v1.vuepress.vuejs.org/) and
[vuepress-theme-cool](https://github.com/FriendlyUser/vuepress-theme-cool).

Raw HTML: <span style="color:red">This is red</span>

Math with KaTeX: $E=mc^2$

A PlantUML diagram:

@startuml
Alice -> Bob : hello
@enduml

An admonition from markdown-it-admonition:

!!! note A note
This is the body of the note.
!!!

VuePress's built-in custom container:

::: tip
This is a tip
:::
````

The `::: tip` / `::: warning` / `::: danger` containers are built into VuePress itself; `markdown-it-admonition` adds the `!!! type Title` syntax on top. markdown-it-plantuml turns each `@startuml` block into an image rendered by a PlantUML server (the public plantuml.com one by default), so diagrams need network access to display.

## Run it

```bash
yarn docs:dev
```

This starts a dev server at `http://localhost:8080/` with hot reload. `yarn docs:build` writes the static site to `docs/.vuepress/dist`.

VuePress 1 is built on webpack 4. If the dev server fails on a recent Node.js with `ERR_OSSL_EVP_UNSUPPORTED`, set `NODE_OPTIONS=--openssl-legacy-provider` before running it, or use an older Node.js LTS.

## Further reading

- [VuePress 1 guide](https://v1.vuepress.vuejs.org/guide/)
- [vuepress-theme-cool README](https://github.com/FriendlyUser/vuepress-theme-cool) (Mermaid, timeline and chart examples)
- [Vuepress Theme Cool Starter](https://friendlyuser.github.io/vuepress-theme-cool-starter) (demo site)
