---
tags: ['next', 'latex', 'nextra']
title: Converting saber site to nextra
description: In this post I will show you how I ported saber site to nextra.
pubDate: Fri, 30 May 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1538101898.png
---
Next.js is a popular open-source framework for building modern web applications with React. It is a production-ready solution for building server-side rendered React applications that can be deployed to a wide variety of environments including the web, mobile devices, and even static hosting.

Next.js offers several features that make it a powerful and flexible tool for building web applications. Some of its key features include:

1. Server-side rendering: Next.js supports server-side rendering, which means that pages can be pre-rendered on the server and delivered to the client as fully formed HTML pages. This can lead to better performance and search engine optimization (SEO) for web applications.
2. Automatic code splitting: Next.js automatically splits code into smaller chunks, which are then loaded on demand when needed. This can help to improve the initial load time of the application and reduce the amount of code that needs to be loaded for each page.
3. Dynamic imports: Next.js supports dynamic imports, which allows code to be loaded on demand based on user actions. This can help to reduce the initial load time of the application and improve the user experience.
4. Hot module replacement: Next.js supports hot module replacement, which means that changes to code can be made in real-time without the need for a full page reload. This can help to improve developer productivity and reduce the time needed for testing and debugging.
5. Static site generation: Next.js supports static site generation, which means that pages can be pre-built as static HTML files that can be served directly to the client. This can help to improve performance and reduce the load on the server.

Overall, Next.js provides a powerful and flexible platform for building modern web applications with React. Its support for server-side rendering, automatic code splitting, dynamic imports, hot module replacement, and static site generation make it a popular choice for developers who want to build fast, scalable, and maintainable web applications.


Saber is a static site generator that uses Vue.js as its main framework. It allows developers to build fast, modern, and SEO-friendly websites with the power of Vue.js and the simplicity of static site generation.

With Saber, developers can create static websites with server-side rendering and support for dynamic data, routing, and caching. Saber is designed to be easy to use and flexible, allowing developers to customize the build process and add plugins and themes as needed.

Some of the key features of Saber include:

1. Vue.js-based: Saber is built on top of Vue.js, which is a popular and powerful framework for building web applications. This means that developers can leverage the power of Vue.js to build static websites with dynamic data and server-side rendering.
2. Server-side rendering: Saber supports server-side rendering, which means that pages can be pre-rendered on the server and delivered to the client as fully formed HTML pages. This can lead to better performance and search engine optimization (SEO) for web applications.
3. Easy theming: Saber makes it easy to create and use custom themes, which can be applied to any Saber site. Themes can include custom layouts, styles, and components.
4. Flexible plugin system: Saber has a flexible plugin system that allows developers to add new functionality to their Saber sites. There are many plugins available, including plugins for syntax highlighting, sitemaps, and RSS feeds.
5. Markdown-based: Saber uses Markdown as the primary way to create content, which makes it easy for developers and content creators to collaborate and create content for the website.

Overall, Saber is a powerful and flexible static site generator that makes it easy to build modern, SEO-friendly websites with the power of Vue.js. It's a great choice for developers who want to build fast and scalable websites without the complexity of traditional server-side applications.


Saber is a older framework and relies on hacks to implement search and/or analytics plus google adsense. By leveraging newer framework I was aiming to improve the user experience and improve the quality of my [latex diagrams site](grandfleet.eu.org).

Nextra is an open-source framework for building static websites with Next.js and MDX. It provides a set of pre-configured components and styles to make it easy to build modern, responsive websites that can be deployed anywhere.

Nextra is built on top of Next.js, which is a popular framework for building server-side rendered React applications. It leverages the power of Next.js to provide features like server-side rendering, automatic code splitting, and dynamic imports.

Nextra's primary focus is on making it easy to create documentation websites, blogs, and other content-driven sites with Next.js and MDX. MDX is a format that combines markdown and JSX, which allows developers to write components directly in their markdown content.

Some of the key features of Nextra include:

1. Easy setup: Nextra provides a simple setup process that includes a pre-configured Next.js project with all the necessary components and styles.
2. MDX-based: Nextra uses MDX as the primary way to create content, which makes it easy for developers and content creators to collaborate and create content for the website.
3. Customizable: Nextra is highly customizable and includes a wide variety of configuration options and components that can be modified to fit the needs of the website.
4. Dark mode support: Nextra includes built-in support for dark mode, which can be toggled with a single click.
5. Responsive design: Nextra provides a set of responsive styles that make it easy to build websites that look great on any device.

Overall, Nextra is a powerful and flexible framework for building static websites with Next.js and MDX. It's a great choice for developers who want to build fast, responsive, and content-driven websites with the power of Next.js and the simplicity of MDX.


```js 
 const withNextra = require('nextra')({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
  images: {
    unoptimized: true
  }
})

module.exports = withNextra()
 
 ```

This is a code snippet from a Next.js configuration file that uses the `withNextra` Higher Order Function (HOF) to apply the Nextra framework to the Next.js application.

Here's what each part of the code does:

1. `const withNextra = require('nextra')(...)` - This line imports the `withNextra` function from the Nextra package and calls it with an options object as an argument. This creates a new HOF that can be used to apply the Nextra framework to a Next.js application.
2. `theme: 'nextra-theme-docs'` - This option specifies the name of the Nextra theme to use. In this case, the theme is `nextra-theme-docs`, which is a pre-built theme that is optimized for documentation websites.
3. `themeConfig: './theme.config.tsx'` - This option specifies the location of the theme configuration file. The theme configuration file is a TypeScript module that can be used to customize the Nextra theme.
4. `images: { unoptimized: true }` - This option specifies that images should be served in an unoptimized format. This is useful for development purposes when you want to quickly iterate on image assets.
5. `module.exports = withNextra()` - This line exports the `withNextra` HOF with an empty options object as an argument. This applies the Nextra framework to the Next.js application and makes it available for use in the application.

```js 
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

This is a code snippet that creates a configuration object for the Nextra `nextra-theme-docs` theme.

Here's what each part of the code does:

1. `import React from 'react'` - This line imports the `React` library, which is needed to create the logo element.
2. `import { DocsThemeConfig } from 'nextra-theme-docs'` - This line imports the `DocsThemeConfig` type from the `nextra-theme-docs` package. This type is used to define the structure of the theme configuration object.
3. `const config: DocsThemeConfig = {...}` - This line creates a `config` constant that is of type `DocsThemeConfig` and assigns it an object that contains various configuration options for the `nextra-theme-docs` theme.
4. `logo: <span>Latex Diagrams</span>` - This option specifies the logo for the website. In this case, the logo is a simple `span` element with the text "Latex Diagrams". This element will be rendered in the top left corner of the website.
5. `project: { link: 'https://github.com/FriendlyUser/LatexDiagrams' }` - This option specifies a link to the project repository. This link will be displayed in the top right corner of the website.
6. `chat: { link: 'https://discord.com' }` - This option specifies a link to a chat service. This link will be displayed in the top right corner of the website next to the project link.
7. `docsRepositoryBase: 'https://github.com/FriendlyUser/LatexDiagrams'` - This option specifies the base URL for the documentation repository. This is used to generate links to specific documentation pages.
8. `footer: { text: 'Nextra Docs Template' }` - This option specifies the text that should be displayed in the website footer. In this case, the text is "Nextra Docs Template".
9. `export default config` - This line exports the `config` constant so that it can be used by other parts of the application that require the `nextra-theme-docs` theme configuration.



In order to convert my site from saber to nextra I had to do the following:

1. Convert all the markdown files to mdx
2. Change the generation script to relative updating pathing for images
3. deploy to the nextra site to vercel

Nextra can use mdx in order to render html pages.

MDX (Markdown + JSX) is a syntax for combining Markdown and JSX into a single file format. It allows users to write rich content that is easily transformed into HTML or React components.

MDX extends the capabilities of traditional Markdown syntax by allowing users to embed JSX components within Markdown files. This allows for more dynamic and interactive content, such as live code examples, custom components, and interactive widgets.

MDX files are processed using a transpiler that converts the combined Markdown and JSX syntax into React components that can be rendered by a React application. This makes it easy to create rich, interactive content for the web that can be easily shared and reused.

MDX is commonly used for creating documentation, blog posts, and other types of content that require more advanced formatting and interactivity. It is supported by many popular static site generators, including Gatsby, Next.js, and Nuxt.js.

In addition to supporting MDX, Nextra can also be deployed to vercel and benefits from leverage next.js.

There are several advantages of using Next.js for building web applications:

1. Server-side rendering: Next.js provides server-side rendering (SSR) out of the box. This means that the initial HTML is generated on the server, which can improve performance and SEO. With SSR, the content is available to search engines and social media bots, which can improve the visibility of your website.
2. Automatic code splitting: Next.js automatically splits your code into small chunks, which can be loaded on demand. This can improve the initial load time of your website and provide a better user experience.
3. Static site generation: Next.js allows you to generate static sites, which can be hosted on a CDN and served to users with low latency. This is great for websites with mostly static content and can improve performance and reduce hosting costs.
4. TypeScript support: Next.js has excellent support for TypeScript, a statically typed superset of JavaScript. This can improve code quality and reduce bugs by catching errors at compile time.
5. Built-in API routes: Next.js provides built-in API routes that allow you to create API endpoints without the need for an external server. This can simplify your architecture and reduce complexity.
6. Automatic image optimization: Next.js can optimize images for the web, which can reduce the size of your images and improve performance.
7. Large and active community: Next.js has a large and active community, which means there are many resources, tutorials, and packages available to help you build your application.

There are several advantages to deploying your application to Vercel:

1. Easy deployment: Vercel makes it easy to deploy your application with just a few clicks. You can deploy your application from GitHub, GitLab, Bitbucket, or a zip file.
2. Automatic scaling: Vercel automatically scales your application based on the traffic it receives. This means your application will always be available, even if there is a sudden increase in traffic.
3. Global CDN: Vercel provides a global content delivery network (CDN) that can improve the performance of your application by serving content from the nearest edge server to the user.
4. Serverless architecture: Vercel uses a serverless architecture, which means you only pay for the resources you use. This can reduce hosting costs and improve scalability.
5. Built-in integrations: Vercel has built-in integrations with popular tools and services like GitHub, Slack, and Stripe. This makes it easy to set up continuous integration and deployment (CI/CD) pipelines, monitor your application, and handle payments.
6. Multiple environments: Vercel allows you to create multiple environments for your application, such as production, staging, and development. This can help you test your application in a safe and controlled environment.
7. Large and active community: Vercel has a large and active community, which means there are many resources, tutorials, and packages available to help you build and deploy your application.


## References
- https://github.com/FriendlyUser/dli-vue-docs
- https://github.com/FriendlyUser/latex-diagrams-docs
- https://latex-diagrams-docs.vercel.app/
