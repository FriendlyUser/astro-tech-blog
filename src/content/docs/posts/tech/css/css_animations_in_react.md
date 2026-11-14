---
tags: ['css', 'intersectionobserver', 'react']
title: Fade elements in on scroll with CSS transitions and react-intersection-observer
description: "Use the useInView hook from react-intersection-observer to add a CSS class when an element scrolls into view, and animate it with a CSS transition."
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.webp
---
A common effect is to fade content in as the user scrolls down to it. The browser's Intersection Observer API tells you when an element enters the viewport, and a CSS transition does the animation. The `react-intersection-observer` package wraps the observer in a hook, so the React side is a few lines. The examples were checked against `react-intersection-observer` 11.

## Using useInView

Install the package:

```bash
npm install react-intersection-observer
```

`useInView` returns a `ref` to attach to the element you want to watch, an `inView` boolean, and the raw `IntersectionObserverEntry`. You can destructure it as an object or an array:

```jsx
import { useInView } from 'react-intersection-observer';

function Example() {
  const { ref, inView } = useInView();
  // or: const [ref, inView] = useInView();

  return <div ref={ref}>{inView ? 'Visible' : 'Not visible'}</div>;
}
```

The hook takes a single options object. The ones you'll use most:

- `threshold`: how much of the element (0 to 1) must be visible before `inView` becomes true. Defaults to `0`.
- `rootMargin`: grows or shrinks the area that counts as "in view", using CSS margin syntax such as `'0px 0px -100px 0px'`.
- `triggerOnce`: stop observing after the element has been seen once.

## A fade-in on scroll

The idea is to always render the element, start it transparent, and add an `is-visible` class once it's in view. The transition on `opacity` (and a small `transform`) does the rest.

```jsx
import { useInView } from 'react-intersection-observer';
import './styles.css';

export function FadeIn({ children }) {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <div ref={ref} className={`fade-in${inView ? ' is-visible' : ''}`}>
      {children}
    </div>
  );
}
```

```css
/* styles.css */
.fade-in {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.fade-in.is-visible {
  opacity: 1;
  transform: none;
}

/* Respect users who have asked the OS for less motion. */
@media (prefers-reduced-motion: reduce) {
  .fade-in {
    transform: none;
    transition: none;
  }
}
```

Use it by wrapping any content:

```jsx
<FadeIn>
  <h2>Hello world!</h2>
</FadeIn>
```

Two details matter here. First, the content is always rendered; only the class changes. If you conditionally render children based on `inView` (`{inView ? <p>…</p> : null}`), the wrapper has no height until the content appears, so the page jumps and nothing is there to fade. Second, `triggerOnce: true` keeps the element visible after the first reveal. Without it, the class is removed when the element scrolls out, so it fades out and back in every time.

## How the transition shorthand works

```css
transition: property duration timing-function delay;
```

- `property`: the CSS property to animate, such as `opacity`, `transform` or `background-color`. Separate several with commas, as in the example above.
- `duration`: how long the change takes, such as `1s` or `300ms`.
- `timing-function`: the easing curve, such as `ease`, `linear`, `ease-in-out` or `cubic-bezier(0.1, 0.7, 1.0, 0.1)`.
- `delay`: how long to wait before starting, such as `0s` or `500ms`.

A transition runs whenever the property's value changes, whether that is caused by a class being added from JavaScript or by a pseudo-class like `:hover`:

```css
.box {
  opacity: 1;
  transition: opacity 1s ease-in-out;
}

.box:hover {
  opacity: 0.5;
}
```

Animating `opacity` and `transform` is cheaper than animating properties like `height` or `top`, because browsers can usually run them without recalculating layout.

## Further reading

- [react-intersection-observer on GitHub](https://github.com/thebuilder/react-intersection-observer)
- [MDN: Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [MDN: Using CSS transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transitions/Using_CSS_transitions)
