---
title: Getting Started with Vuepress Theme Cool and Vuepress
description: Vuepress is a static site generator based on Vue.js that allows you to easily create documentation websites or any other kind of website that requires structured content. It features a built-in Markdown editor, support for custom themes, and plugins that extend its functionality.
pubDate: Thursday, 16 March 2023 13:00:00 GMT
tags: ["vue", "vuepress"]
projects: ["vuepress-theme-cool"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3531615326.png'
---

## Getting Started with Vuepress Theme Cool and Vuepress

Vuepress is a static site generator based on Vue.js that allows you to easily create documentation websites or any other kind of website that requires structured content. It features a built-in Markdown editor, support for custom themes, and plugins that extend its functionality.

Vuepress Theme Cool is a custom theme for Vuepress that provides libraries for markdown-based diagramming tools, sortable/filterable table components and chartjs. It also inherits from the base Vuepress theme and supports all its features.

In this article, we will show you how to set up a simple website using Vuepress Theme Cool and Vuepress.

### Prerequisites

To follow this tutorial, you will need:

- Node.js version 10 or higher installed on your machine
- Yarn package manager installed on your machine
- A code editor of your choice (we recommend Visual Studio Code)

### Installing Vuepress and Vuepress Theme Cool

First, we need to install Vuepress globally using Yarn:

```bash
yarn global add vuepress@next
```

We use the `@next` tag to install the latest version of Vuepress (v1.x), which is compatible with Vuepress Theme Cool.

Next, we need to create a new folder for our project and initialize it as a Node.js project:

```bash
mkdir vuepress-cool-demo
cd vuepress-cool-demo
yarn init -y
```

This will create a `package.json` file with some default values.

Then, we need to install Vuepress Theme Cool as a development dependency:

```bash
yarn add -D vuepress-theme-cool
```

This will download the theme package and add it to our `package.json` file.

### Configuring Vuepress

Now that we have installed the necessary packages, we need to configure Vuepress to use our theme and enable some features.

To do that, we need to create a `.vuepress` folder inside our project folder and add a `config.js` file inside it. This file will contain our main configuration options for Vuepress.

A minimal setup for our config file is:

```js
// .vuepress/config.js

// this represents the minimal configuration
module.exports = {
  // specify the theme name
  theme: 'cool',
  // enable some markdown extensions
  markdown: {
    extendMarkdown: (md) => {
      // enable HTML tags in markdown source
      md.set({ html: true });
      // enable KaTeX for math expressions
      md.use(require('markdown-it-katex'));
      // enable PlantUML for diagrams
      md.use(require('markdown-it-plantuml'));
      // enable Admonition for callouts
      md.use(require('markdown-it-admonition'));
    },
  },
};
```

As you can see, we specify the theme name as `'cool'`, which tells Vuepress to use our custom theme. We also enable some markdown extensions that allow us to use HTML tags, KaTeX math expressions, PlantUML diagrams and Admonition callouts in our markdown files.

### Creating Content

Now that we have configured Vuepress, we can start creating some content for our website.

To do that, we need to create a `docs` folder inside our project folder and add some markdown files inside it. These files will represent our pages on the website.

For example, let's create an `index.md` file inside the `docs` folder with this content:

```md
# Welcome to my website!

This is an example website using [VuePress](https://vuepres.vuejs.org) and [VuePress Theme Cool](https://github.com/FriendlyUser/vuepress-theme-cool).

You can write any content here using **Markdown** syntax.

You can also use some **extensions** like:

- HTML tags: <span style="color:red">This is red</span>
- KaTeX math expressions: $E=mc^2$
- PlantUML diagrams:
@startuml 
Alice -> Bob : hello 
@enduml 
- Admonition callouts:
::: tip Tip 
This is a tip 
:::
```

This file will be rendered as the homepage of our website. You can see how it looks like by running this command in your terminal:

```bash
vuepress dev docs/
```

This will start a local development server at http://localhost:8080/ where you can preview your website live.