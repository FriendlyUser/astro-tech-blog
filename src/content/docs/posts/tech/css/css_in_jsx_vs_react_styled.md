---
tags: ['css', 'jsx', 'react', 'styled']
title: CSS-in-JS vs plain CSS in React, with styled-components examples
description: "The trade-offs between runtime CSS-in-JS and plain CSS or CSS Modules in React, with working styled-components examples and its 2025 maintenance-mode status."
pubDate: Fri, 28 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1098832555.webp
---
:::caution
In March 2025 the styled-components maintainer announced the project is in maintenance mode: fixes and small improvements continue, but he no longer recommends adopting it, or most other CSS-in-JS libraries, for new projects. See the [announcement on Open Collective](https://opencollective.com/styled-components/updates/thank-you). Existing apps keep working; for new React projects, CSS Modules, Tailwind CSS or a zero-runtime library are the more common choices now.
:::

"CSS-in-JS" means writing styles inside your JavaScript, next to the component that uses them. Runtime libraries such as styled-components and Emotion generate class names and inject a `<style>` tag in the browser as components render. Plain CSS, or CSS Modules, keeps styles in `.css` files that the bundler turns into static stylesheets.

## The same button, both ways

With styled-components, styles live in a tagged template literal (note the backticks), and props can drive them:

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background-color: ${(props) => (props.$primary ? '#0077cc' : '#fff')};
  color: ${(props) => (props.$primary ? '#fff' : '#0077cc')};
  border: 1px solid #0077cc;
  font-size: 16px;
  padding: 10px 20px;
  border-radius: 4px;

  &:hover {
    opacity: 0.9;
  }
`;

export function App() {
  return (
    <>
      <Button $primary>Save</Button>
      <Button>Cancel</Button>
    </>
  );
}
```

The `$` prefix makes `$primary` a "transient" prop: styled-components uses it for styling but doesn't pass it through to the DOM, so React doesn't warn about an unknown attribute.

With a CSS Module, the stylesheet is plain CSS and the component picks classes:

```css
/* Button.module.css */
.button {
  background-color: #fff;
  color: #0077cc;
  border: 1px solid #0077cc;
  font-size: 16px;
  padding: 10px 20px;
  border-radius: 4px;
}

.button:hover {
  opacity: 0.9;
}

.primary {
  background-color: #0077cc;
  color: #fff;
}
```

```jsx
import styles from './Button.module.css';

export function Button({ primary, children }) {
  const className = primary ? `${styles.button} ${styles.primary}` : styles.button;
  return <button className={className}>{children}</button>;
}
```

The bundler (Vite, Next.js, webpack with css-loader) rewrites `.button` to a unique class name, so you get the same scoping as CSS-in-JS without any runtime.

## What CSS-in-JS gives you

- **Scoped class names.** Generated names mean one component's styles can't leak into another's. CSS Modules give you this too.
- **Styles driven by props.** Interpolating props or a theme object into styles is natural. With plain CSS you toggle classes or set CSS custom properties (`style={{ '--accent': color }}`) instead.
- **Co-location.** Styles sit in the same file as the component, and deleting the component deletes its styles.
- **Typed props.** In TypeScript you can type the props a styled component accepts. The CSS inside the template string is not type-checked, though; editor plugins only add highlighting and some linting.

## What it costs

- **Runtime work.** Styles are generated and injected in the browser while components render, and props-dependent styles are recomputed when props change. Static CSS files have no such cost and are cached separately from your JavaScript.
- **Bundle size.** The library itself ships to the client.
- **Server rendering setup.** styled-components supports SSR, but you have to collect the generated styles on the server (in the Next.js App Router, through a style registry in a client component). Static CSS needs none of this.
- **Server Components.** Runtime CSS-in-JS depends on client-side React features, which was one of the reasons the styled-components maintainer gave for stepping back. Check the current docs of whichever library you use before mixing it with React Server Components.

## How styled-components compares to other CSS-in-JS options

styled-components is one CSS-in-JS library, not an alternative to the category. Within the category the main split is:

- **Runtime libraries** (styled-components, Emotion): styles are generated in the browser. Most flexible, with the costs above.
- **Zero-runtime libraries** (vanilla-extract, Linaria, Panda CSS): you write styles in JS or TS, but they are extracted to static CSS at build time. You keep co-location and typed APIs while losing some dynamic-styling convenience.

## Should you still use styled-components?

If an existing codebase already uses it heavily, it still works and still gets fixes, so a rewrite purely to remove it is rarely worth it on its own. For a new project, start with CSS Modules or a utility framework, and reach for a zero-runtime library if you want styles written in TypeScript.

## Further reading

- [styled-components documentation](https://styled-components.com/docs)
- [Next.js: CSS-in-JS in the App Router](https://nextjs.org/docs/app/guides/css-in-js)
- [Next.js: CSS Modules](https://nextjs.org/docs/app/getting-started/css)
