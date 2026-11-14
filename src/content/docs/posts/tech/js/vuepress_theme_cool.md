---
tags: ['vuepress', 'vuepress-theme-cool', 'vue']
title: vuepress-theme-cool, a VuePress 1 theme with Mermaid, charts and admonitions
description: How vuepress-theme-cool extends the VuePress 1 default theme with Mermaid diagrams, a pros/cons component, Chart.js charts, sortable tables and admonitions.
pubDate: Fri, 2 March 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3997466131.png"
---

:::caution[VuePress 1 is in maintenance mode]
This theme targets VuePress 1 (Vue 2, webpack). The VuePress project has put v1 in maintenance mode and points new sites to [VitePress](https://vitepress.dev/) (supported by the Vue team) or VuePress 2, which is still in release candidate on npm. The theme does not work with either of them.
:::

[vuepress-theme-cool](https://github.com/FriendlyUser/vuepress-theme-cool) is a VuePress theme for personal documentation. It inherits the default theme's layout, navbar and sidebar, and adds Mermaid and PlantUML diagrams, KaTeX math, Chart.js charts, sortable/filterable tables and styled admonitions. The [starter repo](https://github.com/FriendlyUser/vuepress-theme-cool-starter) is a working example.

## Installing

The README still says `yarn global add vuepress@next`, but on npm the `next` tag now points to a VuePress 2 release candidate, which this theme won't work with. Pin VuePress 1 instead:

```bash
npm install -D vuepress@1 vuepress-theme-cool
```

Then point `.vuepress/config.js` at the theme and register the markdown-it plugins it relies on. They're installed as dependencies of the theme:

```js
// .vuepress/config.js
module.exports = {
  theme: 'cool', // VuePress resolves this to vuepress-theme-cool
  markdown: {
    extendMarkdown: md => {
      md.set({ html: true })
      md.use(require('markdown-it-katex'))
      md.use(require('markdown-it-plantuml'))
      md.use(require('markdown-it-admonition'))
    }
  }
}
```

## Extending the default theme

The theme's whole `index.js` is one line of config:

```js
// vuepress-theme-cool/index.js
module.exports = {
  extend: '@vuepress/theme-default'
}
```

`extend` is VuePress 1's theme inheritance. Any file the child theme doesn't provide, such as `Layout.vue` and the navbar and sidebar components, falls back to `@vuepress/theme-default`. So the child theme only needs the extras: components in `global-components/`, styles in `styles/`, and an `enhanceApp.js`. `extend` belongs in the theme's `index.js`, not in the site's `.vuepress/config.js`.

If you want a local theme instead of a package, put it in `.vuepress/theme/` (with its own `index.js` and, if not extending another theme, a `Layout.vue`). VuePress 1 uses that directory automatically.

## Mermaid diagrams

VuePress 1 auto-registers every component in a theme's `global-components/` directory. The Mermaid component comes from [VuePress issue #111](https://github.com/vuejs/vuepress/issues/111):

```vue
<!-- global-components/mermaid.vue -->
<template>
  <div class="mermaid">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'mermaid',
  mounted() {
    import("mermaid/dist/mermaid").then(m => {
      m.initialize({
        startOnLoad: true
      });
      m.init();
    });
  }
};
</script>
```

Mermaid is imported lazily in `mounted()`, so it only runs in the browser and isn't part of the server-side render. `m.init()` renders every element with the `mermaid` class. That API is from Mermaid 8, which the theme depends on (`^8.2.6`). Mermaid 10 deprecated `init()` in favour of `mermaid.run()`.

In a Markdown page:

```md
<mermaid>
graph TD
  A-->B
  A-->C
  B-->D
  C-->D
</mermaid>
```

## Pros and cons lists

`pros-cons.vue` renders two lists side by side, with a blue "Pros" heading and a red "Cons" heading. It takes a required `intro` string plus `good` and `bad` arrays. Items are inserted with `:inner-html.prop`, so they can contain HTML, which means you shouldn't pass in untrusted strings.

```md
<pros-cons
  intro="Pros and cons of VuePress 1:"
  :good="[
    'Markdown pages with Vue components inline',
    'Extensible through themes and plugins',
  ]"
  :bad="[
    'In maintenance mode',
    'Requires some knowledge of Vue 2',
  ]"
/>
```

The styles are written in Stylus and use variables such as `$fw-bold`, `$fs-1` and `$base-sizing`. Neither VuePress nor the theme's `palette.styl` defines them, so add them to your own `.vuepress/styles/palette.styl`. Otherwise those font sizes and weights won't apply.

## Charts and tables

`enhanceApp.js` runs once when the Vue app is created. The theme uses it to install Vuex, vue-chartkick (backed by Chart.js 2) and vue-good-table globally. It also overrides `$title` so that page titles read `Page title | Site title`:

```js
// enhanceApp.js
import Vuex from 'vuex'
import VueChartkick from 'vue-chartkick'
import Chart from 'chart.js'
import VueGoodTable from 'vue-good-table'

export default ({ Vue, options, router, siteData }) => {
  Vue.use(Vuex)
  Vue.use(VueChartkick, { adapter: Chart })
  Vue.use(VueGoodTable)
  Vue.mixin({
    computed: {
      $title() {
        const page = this.$page
        const siteTitle = this.$siteTitle
        const selfTitle = page.frontmatter.home ? null : (
          page.frontmatter.title ||                              // explicit title
          (page.title ? page.title.replace(/[_`]/g, '') : '')    // inferred title
        )
        return siteTitle
          ? selfTitle
            ? (selfTitle + ' | ' + siteTitle)
            : siteTitle
          : selfTitle || 'VuePress'
      }
    }
  })
}
```

After that, chart tags work directly in Markdown:

```md
<pie-chart :data="[['Blueberry', 44], ['Strawberry', 23]]" />
```

vue-good-table's CSS is imported by a separate `Styles` global component, so add `<Styles />` to any page that uses a table.

## Admonitions

`markdown-it-admonition` turns blocks like this:

```md
!!! note This is the admonition title
This is the admonition body
!!!
```

into `<div class="admonition note">` with a `<p class="admonition-title">` inside. The plugin supports these types: `note`, `abstract`, `info`, `tip`, `success`, `question`, `warning`, `failure`, `danger`, `bug`, `example` and `quote`.

The theme's `styles/index.styl` styles each type in a Stylus loop. Each type gets its own border colour, a tinted title bar and a Material Icons glyph, with the icon font loaded from Google Fonts. To change a colour or icon, edit the `admonition_types` map in that file.

This syntax is different from the default theme's built-in `::: tip` / `::: warning` containers. Both work side by side.

## References

- https://github.com/FriendlyUser/vuepress-theme-cool-starter
- https://github.com/FriendlyUser/vuepress-theme-cool
- [VuePress 1 docs: theme inheritance](https://v1.vuepress.vuejs.org/theme/inheritance.html)
