---
title: A React image component with a loading skeleton and fallback image
description: Build a React image component that shows a shimmer skeleton while the image loads and swaps to a fallback image if it fails, without error loops.
alt: my first blog post
tags: ["react","js", "css"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 April 2024 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/342028959-blank-card-on-brown-table.webp'
---

A plain `<img>` shows nothing while it loads and a broken-image icon if the URL fails. This post builds a small React component that shows a placeholder skeleton while loading and swaps to a fallback image on error.

## The `<img>` basics

`src` is the only attribute the browser needs to load an image. `alt` should always be present too: screen readers read it, and browsers show it when the image can't be displayed. Use `alt=""` for purely decorative images.

```html
<img src="image.jpg" alt="A sunset over the ocean">
```

Other useful attributes are `width` and `height` (which let the browser reserve space before the image loads, avoiding layout shift) and `loading="lazy"` (which defers off-screen images until the user scrolls near them).

## A fallback in plain HTML

The `error` event fires when an image fails to load, so you can swap the source:

```html
<img src="primary-image.jpg" alt="Product photo"
     onerror="this.onerror = null; this.src = 'fallback-image.jpg';">
```

Clearing `onerror` first matters. Without it, a missing fallback image fires `error` again and the handler keeps resetting `src` in a loop.

## The same thing in React

React exposes the event as `onError`:

```jsx
function MyImage() {
  return (
    <img
      src="primary-image.jpg"
      alt="A landscape"
      width={400}
      height={300}
      loading="lazy"
      style={{ borderRadius: '10px' }}
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith('fallback-image.jpg')) {
          img.src = 'fallback-image.jpg';
        }
      }}
    />
  );
}
```

The check on the current `src` plays the same role as clearing `onerror` above: if the fallback also fails, the handler does nothing instead of looping. Changing `src` directly on the DOM node works, but React doesn't know about it. If you want React to own the state (and add a loading placeholder), keep it in state instead.

## Component with a skeleton and fallback

```jsx
import { useState } from 'react';

export default function ImageWithFallback({ src, fallbackSrc, alt, ...rest }) {
  // 'loading' | 'loaded' | 'error'
  const [status, setStatus] = useState('loading');

  if (status === 'error') {
    return <img src={fallbackSrc} alt={alt} {...rest} />;
  }

  return (
    <span className="image-wrapper">
      {status === 'loading' && <span className="skeleton-loader" aria-hidden="true" />}
      <img
        {...rest}
        src={src}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={{ ...rest.style, opacity: status === 'loaded' ? 1 : 0 }}
      />
    </span>
  );
}
```

Usage:

```jsx
<ImageWithFallback
  key={photoUrl}
  src={photoUrl}
  fallbackSrc="/images/placeholder.png"
  alt="Product photo"
  width={400}
  height={300}
/>
```

How it works:

- A single `status` value replaces separate `isLoading` and `hasError` flags, so the component can't end up in an impossible combination.
- While loading, the real `<img>` is rendered (so the browser actually fetches it) but kept invisible with `opacity: 0`, and the skeleton is positioned on top of it. Hiding the image with `display: none` instead can stop `loading="lazy"` images from ever loading.
- On `error`, the component renders the fallback image. The fallback has no `onError` handler, so a broken fallback can't cause a loop.
- `key={photoUrl}` resets the state when the URL changes. Without it, a component that already reached `loaded` or `error` would keep that status for the new image.
- Pass `width` and `height`. The wrapper takes its size from the image, and an image that hasn't loaded has no intrinsic size, so without them the skeleton collapses to nothing.

## The skeleton CSS

```css
.image-wrapper {
  position: relative;
  display: inline-block;
}

.skeleton-loader {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #e3e3e3 25%, #f2f2f2 50%, #e3e3e3 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.2s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
```

The wrapper is `position: relative` so the skeleton can cover the image exactly with `position: absolute; inset: 0`. The skeleton's background is a grey gradient twice as wide as the box, and the animation slides it across to produce a shimmer. Animating `background-position` keeps the skeleton itself in place; animating `transform` on the skeleton would move the whole grey box instead.

## Gotchas

- With server-side rendering (Next.js, Remix and similar), the image can finish loading before React hydrates and attaches `onLoad`, leaving the skeleton up forever. Fix it by putting a ref on the `<img>` and, in a `useEffect`, setting the status to `loaded` if `img.complete && img.naturalWidth > 0`.
- If you use Next.js, its `next/image` component already has a `placeholder` prop for blur placeholders; you may only need the `onError` part.

## Further reading

- [`<img>` on MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
- [Common components (including `<img>` events) in the React docs](https://react.dev/reference/react-dom/components/common)
