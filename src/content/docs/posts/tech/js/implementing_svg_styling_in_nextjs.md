---
title: "How I style SVG icons in Next.js: inline fetch plus CSS modules"
description: A small React component that fetches an SVG file and inlines it, so a CSS module can recolour the icon's paths when it is toggled.
alt: my first blog post
tags: ["next","svg"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 2 September 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/DALL·E 2023-01-23 21.47.24 - abstract images.png'
---

I wanted icons in a Next.js app that change colour when clicked. SVG suits this: icons are vector shapes, so they stay sharp at any size, and simple icons are usually smaller than the equivalent PNG. Inline SVG elements can also be styled with CSS like any other DOM node.

The catch is that an SVG loaded through `<img src="icon.svg">` is a separate document, and your page's CSS can't reach inside it. To recolour the paths, the SVG markup has to be inlined into the page. My approach is a small component that fetches the file and injects it, plus a CSS module that targets the `path` and `g` elements.

## Fetching and inlining the SVG

```tsx
"use client";
import React, { useEffect, useState } from "react";

export interface SvgInlineProps {
  url: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SvgInline: React.FC<SvgInlineProps> = ({ url, className, style }) => {
  const [svg, setSvg] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isErrored, setIsErrored] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setIsErrored(false);

    fetch(url)
      .then((res) => {
        // A missing file in /public returns Next.js's HTML 404 page,
        // so check the status rather than injecting whatever came back.
        if (!res.ok) {
          throw new Error(`Failed to load ${url}: ${res.status}`);
        }
        return res.text();
      })
      .then(setSvg)
      .catch((err) => {
        console.error(err);
        setIsErrored(true);
      })
      .finally(() => setIsLoaded(true));
  }, [url]);

  return (
    <div
      className={`svgInline svgInline--${isLoaded ? "loaded" : "loading"} ${
        isErrored ? "svgInline--errored" : ""
      } ${className || ""}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
```

How it works:

1. It takes a `url` plus optional `className` and `style`.
2. `useEffect` fetches the file whenever `url` changes.
3. A non-2xx response (such as a missing icon) is treated as an error. The component renders an empty `div` with a `svgInline--errored` class instead of inlining an HTML error page.
4. The wrapper gets `loading`, `loaded` and `errored` class names, so you can style each state, for example with a placeholder size while loading.
5. The SVG markup is injected with `dangerouslySetInnerHTML`.

Only use this with SVG files you control, such as files in `/public`. SVG can carry scripts and event-handler attributes, so injecting markup from an untrusted URL is an XSS risk. Sanitise it first, for example with DOMPurify, if the source isn't yours.

The component uses hooks, so in the App Router it must be a client component. The `"use client"` directive at the top handles that.

## A clickable icon that toggles colour

```tsx
"use client";
import React from "react";
import classes from "./svgIcon.module.css";
import { SvgInline } from "./SvgInline";

export interface SvgIconProps {
  label?: string;
  iconUrl?: string;
}

export const SvgIcon: React.FC<SvgIconProps> = ({ label, iconUrl }) => {
  const [active, setActive] = React.useState(false);

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={() => setActive(!active)}
      className={active ? classes.activeClass : classes.inActiveClass}
      style={{ width: "100px", maxWidth: "150px" }}
    >
      {iconUrl && <SvgInline url={iconUrl} />}
    </button>
  );
};
```

Clicking toggles `active`, which switches the wrapper between the two CSS module classes. I originally used a `div` with an `onClick`, but a `button` can be focused and activated from the keyboard for free. `aria-pressed` tells screen readers it is a toggle. `label` becomes the accessible name, since the icon itself has no text.

## The CSS module

```css
/* svgIcon.module.css */
.activeClass,
.inActiveClass {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.activeClass path,
.activeClass g {
  fill: black;
  stroke: black;
  stroke-width: 0.25px;
}

.inActiveClass path,
.inActiveClass g {
  fill: gray !important;
  stroke: gray !important;
  stroke-width: 0.25px;
}

.activeClass svg,
.inActiveClass svg {
  max-width: 100px;
  max-height: 100px;
}
```

The first rule strips the default button styling. The `path` and `g` rules set the fill and stroke colour for each state, and the last rule caps the icon's size.

A note on `!important`: a normal CSS rule already overrides SVG presentation attributes such as `fill="red"`, so plain rules (like the active ones) work for most icons. `!important` is only needed when the SVG has inline `style="fill: ..."` attributes, which some export tools add. If your icons have those, use `!important` in both classes, not just one, or strip the inline styles from the files.

## When not to do this

Fetching at runtime adds a network request per icon and a flash of empty space while it loads. For icons that are known at build time, importing them as React components with [SVGR](https://react-svgr.com/) avoids both, and lets you write `fill="currentColor"` in the SVG so the icon follows the CSS `color` of its parent. The fetch approach is useful when the icon URL is only known at runtime, for example when it comes from a CMS or a database.

## References

* https://nextjs-blog-demo-navy.vercel.app/svg_icons
