---
tags: ['next', 'latex', 'nextra']
title: Porting my LaTeX diagrams site from Saber to Nextra
description: How I moved my LaTeX diagrams site from the Vue-based Saber generator to Nextra on Next.js, with the config files I used and the migration steps.
pubDate: Fri, 30 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1538101898.png
---
:::caution
The config below was written for **Nextra 2** (Pages Router). Nextra 4 (current release 4.6.1) removed the `theme`/`themeConfig` options and the `theme.config.tsx` file, and dropped Pages Router support: theme settings are now props on `<Layout>`, `<Navbar>` and `<Footer>` in `app/layout.jsx`. See the [Nextra docs](https://nextra.site/docs) before copying this setup. Saber has had no stable release since 0.11.7 in May 2020.
:::

My [LaTeX diagrams site](https://grandfleet.eu.org) was built with [Saber](https://saber.egoist.dev/), a static site generator that renders Markdown pages with Vue. Saber is an older framework, and I had to rely on hacks to get search, analytics and Google AdSense working. I moved the site to [Nextra](https://nextra.site/), a Next.js-based framework for documentation sites written in MDX, to get those features with less glue code and improve the site overall.

## Next.js config

Nextra plugs into Next.js as a config wrapper. This is my `next.config.js`:

```js
const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
})

module.exports = withNextra({
  images: {
    unoptimized: true,
  },
})
```

- `require('nextra')(...)` takes Nextra's own options and returns a function that wraps your Next.js config.
- `theme: 'nextra-theme-docs'` selects the docs theme (sidebar, search, dark mode toggle).
- `themeConfig` points at the file that customises that theme.
- `images.unoptimized` is a Next.js option, so it goes in the object passed to `withNextra()`, not in the Nextra options. It turns off Next.js image optimization and serves images as-is. It's also required if you later switch to a fully static `output: 'export'` build.

## Theme config

`theme.config.tsx` sets the logo, repository links and footer:

```tsx
import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>Latex Diagrams</span>,
  project: {
    link: 'https://github.com/FriendlyUser/LatexDiagrams',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/FriendlyUser/LatexDiagrams',
  footer: {
    text: 'Nextra Docs Template',
  },
}

export default config
```

- `logo` is any React element and shows in the top-left of the navbar.
- `project.link` and `chat.link` add GitHub and chat icons to the navbar. The chat link here is still the template's placeholder.
- `docsRepositoryBase` is used to build the "Edit this page" links.
- `footer.text` is the footer content. In Nextra 3 this became `footer.content`, and in Nextra 4 the footer is a `<Footer>` component.

## Migration steps

To move the site from Saber to Nextra I had to:

1. Convert all the Markdown files to MDX. Nextra renders pages from `.mdx` (and `.md`) files, and MDX lets you drop React components into the content.
2. Change the generation script to use relative paths for images.
3. Deploy the Nextra site to Vercel.

Vercel builds Next.js projects without extra configuration, so deployment was mostly connecting the GitHub repository.

## References

- https://github.com/FriendlyUser/dli-vue-docs
- https://github.com/FriendlyUser/latex-diagrams-docs
- https://latex-diagrams-docs.vercel.app/
- [Nextra documentation](https://nextra.site/docs)
