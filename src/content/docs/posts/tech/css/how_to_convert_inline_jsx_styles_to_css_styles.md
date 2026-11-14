---
title: Converting React inline style objects to CSS classes with ChatGPT
description: "Why moving React inline style objects into CSS classes helps, and how I used ChatGPT to turn a camelCase style object into a CSS rule."
pubDate: Saturday, 20 October 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["css", "chatgpt"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-26-21-10-41-decentralized-network-diagram-simple-bobble-heads.webp'
---

React's `style` prop is handy for a quick tweak, but style objects tend to pile up. Moving them into CSS classes is usually worth it:

- **Separation of concerns.** The component file holds behaviour and markup; the stylesheet holds how it looks.
- **Reuse.** One class can be shared across components instead of copying the same object around.
- **Things inline styles can't do.** The `style` prop can't express `:hover`, `:focus`, media queries, or `::before`/`::after`. A class can.
- **Less per-render work.** An inline style object literal is recreated on every render, and React compares it and updates the element's `style` attribute when it changes. A class name is a single string, and the rules live in a stylesheet the browser parses once and caches.
- **Tooling.** Stylesheets go through the usual CSS pipeline (PostCSS, autoprefixing, minification).

## Converting with ChatGPT

The conversion is mechanical: camelCase keys become kebab-case properties, quotes and commas go away, and unitless numbers need units. Take this style object:

```js
const tagStyle = {
  border: "1px solid #fff",
  paddingRight: "4px",
  paddingLeft: "4px",
  paddingTop: "5px",
  paddingBottom: "5px",
  minWidth: "75px",
  backgroundColor: "white",
  boxShadow: "0 0 2px 0 rgba(0, 0, 0, 0.5)",
  fontSize: "14px",
  textAlign: "center",
};
```

Pasting that into ChatGPT, it gave me this:

```css
.some-class {
  border: 1px solid #fff;
  padding-right: 4px;
  padding-left: 4px;
  padding-top: 5px;
  padding-bottom: 5px;
  min-width: 75px;
  background-color: white;
  box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.5);
  font-size: 14px;
  text-align: center;
}
```

That is a correct one-to-one translation. Two things to do by hand afterwards:

- **Give the class a real name** and tidy it. The four padding lines collapse to `padding: 5px 4px;` (vertical, then horizontal).
- **Watch for numbers.** If the object had used numbers, such as `fontSize: 14`, React adds `px` automatically for most properties, so the CSS needs `font-size: 14px`. Unitless properties like `lineHeight: 1.5` or `zIndex: 2` stay unitless.

Then swap the prop on the component:

```jsx
import './Tag.css';

// before: <span style={tagStyle}>{label}</span>
<span className="tag">{label}</span>
```

This is a small example of how a chat assistant can take the tedious part out of a refactor and boost day-to-day productivity.

## When inline styles are still fine

Keep the `style` prop for values that are truly dynamic and computed at runtime, such as a width from a drag handle or a colour picked by the user. A middle ground is to keep the rules in CSS and pass only the variable part as a custom property: `style={{ '--accent': color }}` with `color: var(--accent)` in the stylesheet.
