---
tags: ['vuepress', 'vuepress-theme-cool']
title: Introducing Vuepress Theme Cool - A Vuepress Theme for Blogs and documentation
description: Vuepress Theme Cool is a Vuepress theme for Blogs and documentation.
pubDate: Fri, 2 March 2023
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3997466131.png"
---
VuePress is a static site generator based on Vue.js that allows you to easily create documentation websites or any other kind of website that requires structured content. It features a built-in Markdown editor, support for custom themes, and plugins that extend its functionality.


To create a custom theme for VuePress, you can follow these steps:

1. Create a new folder in your VuePress project's `theme` directory. For example, you could name it `my-theme`.
2. Inside the `my-theme` folder, create an `enhanceApp.js` file. This file will be used to inject additional Vue components or plugins into the app.
3. Create a `Layout.vue` file in the `my-theme` folder. This file will define the basic layout structure of your custom theme.
4. Customize the CSS in the `Layout.vue` file and add any other Vue components you need to create your desired layout.
5. Create or modify any other necessary files, such as `index.js` or `config.js`, to define your custom theme's behavior.

Once you've created your custom theme, you can configure VuePress to use it by modifying the `theme` option in your `config.js` file to point to the folder containing your custom theme. For example:


```js
// .vuepress/config.js

module.exports = {
 theme: 'my-theme',
 // ... other options ...
}
```
After making these changes, your VuePress site should use your custom theme.


```js 
 module.exports = {
  extend: '@vuepress/theme-default'
} 
 ```

The code you provided is a configuration object in a VuePress project's `config.js` file.

It sets the default theme as the base theme for your VuePress site, and allows you to extend and customize it using additional configuration options.

By using `extend` property, you are inheriting and extending the functionality of the `@vuepress/theme-default` theme. This means that you can override or add to the default settings and components of the theme to create a custom look and feel for your site.

For example, you could add your own custom components or layouts, change the default color scheme, or modify the site's sidebar navigation.


```vue 
 // .vuepress/components/mermaid.vue

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

The code you provided is a Vue component that defines a `mermaid` custom element in your VuePress project.

This component is designed to render [Mermaid diagrams](https://mermaid-js.github.io/mermaid/#/) in your VuePress pages. It works by importing the `mermaid` library and initializing it when the component is mounted.

Here is a breakdown of what's happening in the code:

* The `<template>` section defines the HTML template for the `mermaid` component. It includes a `<slot>` element, which allows you to pass in content to be rendered inside the component.
* The `<script>` section defines the JavaScript logic for the `mermaid` component.
* `export default` defines the component as the default export for this module, which allows it to be imported and used in other parts of your VuePress project.
* `name: 'mermaid'` sets the name of the component to `mermaid`.
* `mounted()` is a lifecycle method that is called when the component is mounted to the DOM.
* `import("mermaid/dist/mermaid")` dynamically imports the `mermaid` library.
* `m.initialize({ startOnLoad: true })` initializes the `mermaid` library with a configuration option to automatically start rendering diagrams when the page is loaded.
* `m.init()` tells the `mermaid` library to initialize any `<div>` elements with a `class` of `mermaid` and render them as diagrams.

To use this component in your VuePress pages, you can include it like this:


```js
<mermaid>
 graph TD;
 A-->B;
 A-->C;
 B-->D;
 C-->D;
</mermaid>`
```
This will render the Mermaid diagram inside the `<mermaid>` element. Note that you can include any valid Mermaid diagram code inside the `<mermaid>` element.


```vue 
 <template>
  <div>
    <p class="intro">
      {{ intro }}
    </p>
    <div class="comparison">
      <div class="comparison__container">
        <div class="comparison__heading">
          <i class="material-icons blue-text">check</i>
          Pros
        </div>
        <ul>
          <li
            v-for="item in good"
            :key="item"
            :inner-html.prop="item"
          />
        </ul>
      </div>

      <div class="comparison__container comparison__container--donts">
        <div class="comparison__heading comparison__heading--donts">
          <i class="material-icons">close</i>
          Cons
        </div>
        <ul>
          <li
            v-for="item in bad"
            :key="item"
            :inner-html.prop="item"
          />
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'pros-cons',
  props: {
    intro: {
      type: String,
      required: true,
    },
    good: {
      type: Array,
      default: null,
    },
    bad: {
      type: Array,
      default: null,
    },
  },
}
</script>

<style scoped lang='stylus'>

.intro
  margin 0
  font-weight $fw-bold
.comparison
  display flex
  margin-top 1.5rem
  &__container
    width 50%
    padding-left 1.5rem
    margin-bottom 1.5em
    border-top 4px solid  blue(#000, 255)
    &--donts
      border-color red(#000, 255)
  &__heading
    margin-top 38px
    margin-bottom 28px
    font-size $fs-1
    font-weight $fw-bold
    color blue(#000, 255)
    display flex
    align-items center
    &--donts
      color red(#000, 255)
  &__icon
    margin-right 0.5rem
    height 24px
  li
    margin-bottom $base-sizing
    padding-left 0
    font-size $fs-2
    line-height 1.33rem
    list-style-type initial
    text-indent 0
</style> 
 ```

The code you provided is a Vue component that creates a `pros-cons` custom element. This component allows you to display a list of pros and cons side by side, with an optional introduction text.

Here is a breakdown of what's happening in the code:

* The `<template>` section defines the HTML template for the `pros-cons` component. It includes a `<p>` element for the introduction text, and two `<ul>` elements for the pros and cons lists.
* The `v-for` directive is used to iterate over the `good` and `bad` arrays, and render a `<li>` element for each item. The `:inner-html.prop` binding is used to insert the item text as raw HTML.
* The `<script>` section defines the JavaScript logic for the `pros-cons` component.
* `export default` defines the component as the default export for this module, which allows it to be imported and used in other parts of your VuePress project.
* `name: 'pros-cons'` sets the name of the component to `pros-cons`.
* `props` is an object that defines the component's props. In this case, the component expects three props: `intro`, `good`, and `bad`.
* The `intro` prop is a required string that is used as the introduction text for the component.
* The `good` and `bad` props are arrays that contain the list of pros and cons, respectively.
* The `<style>` section defines the component's styles using Stylus, with the `scoped` attribute to limit the styles to this component only.

To use this component in your VuePress pages, you can include it like this:


```js
<pros-cons
 intro="Here are the pros and cons of using VuePress:"
 :good="[
 'Easy to set up and use',
 'Built-in support for Markdown and Vue components',
 'Extensible through plugins',
 ]"
 :bad="[
 'Limited customizability',
 'Requires some knowledge of Vue.js and JavaScript',
 'May not be suitable for large or complex sites',
 ]"
/>`
```
This will render the `pros-cons` component with the provided introduction text and lists of pros and cons. Note that you can customize the component's styles by modifying the `<style>` section in this file.


```js 
 import Vuex from 'vuex'
//import './timetableStyles.css'
//import timetable from 'vue-timetable'
//Vue.use(timetable)
import VueChartkick from 'vue-chartkick'
import Chart from 'chart.js'

import VueGoodTable from 'vue-good-table';
// import the styles 
//import 'vue-good-table/dist/vue-good-table.css'
export default ({ Vue, options, router, siteData }) => {
    Vue.use(Vuex)
    Vue.use(VueChartkick, {adapter: Chart})
    Vue.use(VueGoodTable)
    Vue.mixin({
        computed: {
            $title() {
                const page = this.$page
                const siteTitle = this.$siteTitle
                const selfTitle = page.frontmatter.home ? null : (
                    page.frontmatter.title || // explicit title
                    (page.title ? page.title.replace(/[_`]/g, '') : '') // inferred title
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

This is an example of a VuePress plugin, which can be used to add functionality to a VuePress site. This particular plugin imports and installs several third-party libraries: Vuex for state management, VueChartkick and Chart.js for charting, and VueGoodTable for creating tables. Additionally, it defines a computed property `$title` on the Vue instance, which is used to generate the title for each page based on the page's metadata and the site's title. This plugin is included in a VuePress project's `.vuepress/enhanceApp.js` file, which is responsible for importing and applying plugins to the site.


Admonitions are a feature in the VuePress documentation system that allows authors to call out specific pieces of text with a visually distinct block that draws attention to them. They are commonly used for notes, warnings, tips, and other similar types of information. Admonitions are typically displayed as a colored block with an icon and a title that describes the type of information being presented, followed by the text of the admonition itself. In VuePress, admonitions can be created using a special syntax in Markdown that is transformed into HTML and styled using CSS.


```scss 
     @import url(https://fonts.googleapis.com/icon?family=Material+Icons)
    .admonition.note,
    .admonition.hint,
    .admonition.danger,
    .admonition.caution,
    .admonition.error,
    .admonition.attention {
        box-shadow: 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12), 0 3px 1px -2px rgba(0,0,0,0.2);
        position: relative;
        margin: 1.5625em 0;
        padding: 0 1.2rem;
        border-left: 0.4rem solid #448aff;
        border-radius: 0.2rem;
        overflow: auto;
    }

    html .admonition>:last-child {
        margin-bottom: 1.2rem;
    }

    .admonition .admonition {
        margin: 1em 0;
    }

    .admonition p {
        margin-top: 0.5em;
    }

    .admonition.note>.admonition-title:before,
    .admonition.hint>.admonition-title:before,
    .admonition.danger>.admonition-title:before,
    .admonition.caution>.admonition-title:before,
    .admonition.error>.admonition-title:before,
    .admonition.attention>.admonition-title:before {
        position: absolute;
        left: 1.2rem;
        font-family: "Material Icons";
        font-size: 24px;
        display: inline-block;
        line-height: 1;
        text-transform: none;
        letter-spacing: normal;
        word-wrap: normal;
        white-space: nowrap;
        direction: ltr;
    /* Support for all WebKit browsers. */
        -webkit-font-smoothing: antialiased;
    /* Support for Safari and Chrome. */
        text-rendering: optimizeLegibility;
    /* Support for Firefox. */
        -moz-osx-font-smoothing: grayscale;
    /* Support for IE. */
        font-feature-settings: 'liga';
    }

    .admonition.note>.admonition-title,
    .admonition.hint>.admonition-title,
    .admonition.danger>.admonition-title,
    .admonition.caution>.admonition-title,
    .admonition.error>.admonition-title,
    .admonition.attention>.admonition-title {
        margin: 0 -1.2rem;
        padding: 0.8rem 1.2rem 0.8rem 4rem;
        border-bottom: 0.1rem solid rgba(68,138,255,0.1);
        background-color: rgba(68,138,255,0.1);
        font-weight: 700;
    }

    .admonition>.admonition-title:last-child {
        margin-bottom: 0;
    }

    .admonition.note {
        border-left-color: #448aff;
    }

    .admonition.note>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(68,138,255,0.1);
        background-color: rgba(68,138,255,0.1);
    }

    .admonition.note>.admonition-title:before {
        color: #448aff;
        content: "note";
    }

    .admonition.hint {
        border-left-color: #00bfa5;
    }

    .admonition.hint>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(0,191,165,0.1);
        background-color: rgba(0,191,165,0.1);
    }

    .admonition.hint>.admonition-title:before {
        color: #00bfa5;
        content: "info";
    }

    .admonition.danger {
        border-left-color: #ff1744;
    }

    .admonition.danger>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(255,23,68,0.1);
        background-color: rgba(255,23,68,0.1);
    }

    .admonition.danger>.admonition-title:before {
        color: #ff1744;
        content: "block";
    }

    .admonition.caution {
        border-left-color: #ff9100;
    }

    .admonition.caution>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(255,145,0,0.1);
        background-color: rgba(255,145,0,0.1);
    }

    .admonition.caution>.admonition-title:before {
        color: #ff9100;
        content: "warning";
    }

    .admonition.error {
        border-left-color: #ff1744;
    }

    .admonition.error>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(255,23,68,0.1);
        background-color: rgba(255,23,68,0.1);
    }

    .admonition.error>.admonition-title:before {
        color: #ff1744;
        content: "error";
    }

    .admonition.attention {
        border-left-color: #64dd17;
    }

    .admonition.attention>.admonition-title {
        border-bottom-color: 0.1rem solid rgba(100,221,23,0.1);
        background-color: rgba(100,221,23,0.1);
    }

    .admonition.attention>.admonition-title:before {
        color: #64dd17;
        content: "priority_high";
    } 
 ```

This is a block of CSS code that defines styles for different types of admonitions, which are visual cues that can be added to a text to indicate important or noteworthy information. The CSS code defines various style properties, such as the color, border, and background color of the admonitions, as well as the size and position of the icons used to denote the type of admonition (e.g. "note", "hint", "danger", etc.).



## References
- https://github.com/FriendlyUser/vuepress-theme-cool-starter
- https://github.com/FriendlyUser/vuepress-theme-cool
