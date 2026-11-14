---
title: A simple collapsible component in React and TypeScript
description: A small React function component that shows or hides its content when you click the header, with a CSS-only caret and no icon library.
alt: Screenshot utilty for mobile apps
layout: '@/templates/BasePost.astro'
pubDate: Wed, 21 May 2023
lastUpdated: 2026-11-14
tags: ["bit", "javascript", "react", "typescript"]
imgSrc: '/imgs/2023/man-on-horse.webp'
imgAlt: 'Image post 6'
---

This is a collapsible section for React: a header that is always visible, and content underneath that toggles when you click the header. It's a function component with one piece of state and no dependencies beyond React; the caret is drawn with CSS borders instead of an icon library.

```tsx
import { useState, type ReactNode } from 'react';

export interface CollapsibleProps {
  header?: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
}

export function Collapsible({ header, children, defaultCollapsed = true }: CollapsibleProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div style={{ width: '100%' }}>
      <button
        type="button"
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={!collapsed}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: 0,
          border: 'none',
          background: 'none',
          font: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {header}
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 0,
            height: 0,
            marginLeft: '5px',
            borderTop: 'solid 5px currentColor',
            borderRight: 'solid 5px transparent',
            borderLeft: 'solid 5px transparent',
            transform: `rotate(${collapsed ? 0 : 180}deg)`,
            transition: 'transform 0.25s ease-in-out',
          }}
        />
      </button>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
```

Usage:

```tsx
<Collapsible header={<strong>Shipping details</strong>}>
  <p>Orders ship within two business days.</p>
</Collapsible>
```

## How it works

- **Props.** `header` is whatever you want in the clickable row and is optional. Because it sits inside a `<button>`, keep it to inline content (text, `<strong>`, an icon), not headings or block elements. `children` is the content that appears when expanded. Both are typed as `ReactNode`, so strings, elements and arrays all work. `defaultCollapsed` (default `true`) sets the initial state.
- **State.** `useState` holds `collapsed`. The click handler uses the functional updater (`prev => !prev`) so rapid clicks always toggle from the latest value.
- **Caret.** A zero-size element with a coloured top border and transparent left and right borders renders as a downward-pointing triangle. Rotating it 180° when expanded makes it point up, and the `transition` animates the turn. `currentColor` makes it follow the text colour.
- **Rendering.** When collapsed, the content isn't rendered at all (`{!collapsed && ...}`), so any state inside `children` resets each time it closes. If you need to keep that state, render it always and hide it with `hidden={collapsed}` instead.

## Changes from the original version

The first version of this component used a `<div onClick>` as the header, typed `children` as `any`, and set `display: "inlineBlock"`, which isn't a valid CSS value (it's `inline-block`), so the browser ignored it. A `<button>` with `aria-expanded` makes the header reachable with the keyboard and tells screen readers whether the section is open; the inline style resets keep it looking like plain text.

## When you don't need a component

If you don't need to control the open state from React, the native `<details>` and `<summary>` elements do the same thing with built-in keyboard and screen reader support:

```html
<details>
  <summary>Shipping details</summary>
  <p>Orders ship within two business days.</p>
</details>
```

## References

see https://github.com/FriendlyUser/dli_components/blob/main/web/collapse/collapsible.tsx
