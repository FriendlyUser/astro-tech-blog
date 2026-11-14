---
title: Keeping an element above the fold in React with refs and getBoundingClientRect
description: Measure where an element ends up on the page with a React ref and getBoundingClientRect, then shift it up with a negative top offset so it stays above the fold.
alt: my first blog post
tags: ["js", "react"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 7 December 2024
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/148139817.webp'
---

"Above the fold" means visible in the first screenful, before the user scrolls. The fold sits at `window.innerHeight` pixels from the top of the document, so its position depends on the device.

The simplest way to keep something above the fold is layout: put it near the top of the page, keep what's above it short, and test on small screens. If it has to stay visible while the user scrolls, `position: sticky` or `position: fixed` does that without JavaScript. This post covers the remaining case: an element whose position you don't fully control (for example, it sits below content of varying height) and that you want to nudge up when it would land below the fold.

## Measuring the element

A React ref gives you the DOM node, and `getBoundingClientRect()` returns its size and position relative to the viewport:

```js
const rect = ref.current?.getBoundingClientRect();
if (rect) {
  const bottomInDocument = rect.bottom + window.scrollY;
}
```

- `rect.bottom` is the distance from the top of the viewport to the element's bottom edge. It changes as the user scrolls.
- Adding `window.scrollY` (the same value as `document.documentElement.scrollTop` in standards mode) converts it to the distance from the top of the document, which doesn't depend on scroll position.
- `ref.current` is `null` until React attaches the node, so the optional chaining goes on `current`: `ref.current?.getBoundingClientRect()`. Writing `ref?.current.getBoundingClientRect()` guards the wrong thing, because the ref object returned by `useRef` is never null.

If `bottomInDocument` is greater than `window.innerHeight`, the element ends below the fold, and the difference is how far it needs to move up.

## Shifting it up

A relatively positioned element can be moved with `top` without affecting the layout around it. A negative value moves it up:

```jsx
import { useLayoutEffect, useRef, useState } from 'react';

export function AboveTheFold({ children }) {
  const ref = useRef(null);
  const offsetRef = useRef(0);
  const [offset, setOffset] = useState(0);

  useLayoutEffect(() => {
    const update = () => {
      const el = ref.current;
      if (!el) return;

      // The measured rect already includes the shift we applied last time,
      // so add it back to get the element's natural position.
      const naturalBottom =
        el.getBoundingClientRect().bottom + window.scrollY + offsetRef.current;
      const overflow = Math.max(0, naturalBottom - window.innerHeight);

      offsetRef.current = overflow;
      setOffset(overflow);
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', top: `-${offset}px` }}>
      {children}
    </div>
  );
}
```

`useLayoutEffect` runs after React updates the DOM but before the browser paints, so the element doesn't visibly jump from its original position. The resize listener recalculates when the viewport height changes, for example when a phone rotates.

## Gotchas

- Relative positioning leaves the element's original space in the flow, so shifting it up leaves a gap below it and makes it overlap whatever is above it. That's fine for a call-to-action over a hero image, less so in a text column.
- If the content above changes height after the first render (images or web fonts loading, data arriving), the measurement goes stale. Watch the container with a `ResizeObserver` and call `update` from it.
- If the element is taller than the viewport, it can't fit above the fold, and the shift will push its top edge off the page. Clamp `overflow` to the element's natural top if that can happen.
- To find out whether an element is currently visible rather than force it into view, use an `IntersectionObserver`. To bring it into view on demand, `el.scrollIntoView({ block: 'nearest' })` scrolls the page instead of moving the element.

## Further reading

- [`Element.getBoundingClientRect()` on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)
- [`useRef`](https://react.dev/reference/react/useRef) and [`useLayoutEffect`](https://react.dev/reference/react/useLayoutEffect) in the React docs
- [Intersection Observer API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
