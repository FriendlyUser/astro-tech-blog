---
title: "Page transitions in Next.js: Motion in the Pages Router, ViewTransition in the App Router"
description: "Fade between routes in Next.js with Motion's AnimatePresence in the Pages Router, or React's ViewTransition component in the App Router."
pubDate: Saturday, 20 October 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["css", "chatgpt", "next", "react"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/dalle-2022-12-26-21-10-41-decentralized-network-diagram-simple-bobble-heads.webp'
---

:::caution
An earlier version of this post used the `next-page-transitions` package. Its last release was `1.0.0-beta.2` in March 2019 and it is unmaintained, and the code shown here before did not run. The post now uses Motion (the library formerly published as Framer Motion) for the Pages Router and React's `<ViewTransition>` for the App Router.
:::

A page transition is a short animation, usually a fade or slide, that plays when the user navigates from one route to another. Next.js doesn't animate route changes on its own, and how you add one depends on which router your app uses.

## Pages Router: Motion and AnimatePresence

In the Pages Router every page is rendered through `pages/_app.js`, so that is the one place to add the transition. Install Motion:

```bash
npm install motion
```

Then wrap the page component in `AnimatePresence` and a `motion.div` keyed by the current path:

```jsx
// pages/_app.js
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/router';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={router.asPath}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  );
}
```

How it works:

- When the route changes, `router.asPath` changes, so the `motion.div` gets a new `key`. React treats that as removing the old page and adding a new one.
- `AnimatePresence` keeps the old page mounted until its `exit` animation (fade to `opacity: 0`) finishes.
- `mode="wait"` makes the new page wait until the old one has gone, then it animates from `initial` to `animate`.
- `initial={false}` skips the fade on the very first page load.

Pages don't need any changes; they stay plain components.

### Scroll position

Next.js scrolls to the top when the route changes, which happens before the old page has finished fading out, so you see it jump. To scroll after the exit animation instead, turn off the automatic scroll on your links and scroll in `onExitComplete`:

```jsx
<AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
```

```jsx
import Link from 'next/link';

<Link href="/about" scroll={false}>About</Link>
```

## App Router: React's ViewTransition

The `AnimatePresence` approach doesn't carry over well to the App Router, because layouts stay mounted and pages are rendered by the router rather than through a single component you control.

The approach the Next.js docs describe for the App Router is React's `<ViewTransition>` component, built on the browser's View Transitions API. In Next.js, route navigations run as React transitions, so a `<ViewTransition>` boundary animates automatically when you navigate. With no props it uses the browser's default cross-fade:

```tsx
// app/about/page.tsx
import { ViewTransition } from 'react';

export default function AboutPage() {
  return (
    <ViewTransition>
      <main>
        <h1>About</h1>
      </main>
    </ViewTransition>
  );
}
```

You can customise the animation with the `::view-transition-old(...)` and `::view-transition-new(...)` CSS pseudo-elements and with the component's `enter`, `exit` and `default` props. Browsers without View Transitions support simply navigate without animating.

The current Next.js guide (16.4) says this works in the App Router with no configuration. Earlier releases put it behind the `experimental.viewTransition` flag in `next.config`, so check the docs for the Next.js version you are on.

## Gotchas

- **Keep it short.** 200–400 ms is plenty. Long exit animations make navigation feel slow, and with `mode="wait"` the user waits for the exit and the enter.
- **Reduced motion.** Respect `prefers-reduced-motion`. Motion's `MotionConfig` has a `reducedMotion="user"` setting, and for view transitions you can disable the animation in a `@media (prefers-reduced-motion: reduce)` block.
- **Don't key on anything that changes within a page.** Keying the `motion.div` on `router.asPath` means a query-string or hash change also triggers a full fade. Key on `router.pathname` if that's not what you want.

## Further reading

- [Motion: AnimatePresence](https://motion.dev/docs/react-animate-presence)
- [Next.js: Custom App (Pages Router)](https://nextjs.org/docs/pages/building-your-application/routing/custom-app)
- [Next.js: View Transitions guide](https://nextjs.org/docs/app/guides/view-transitions)
- [React: ViewTransition](https://react.dev/reference/react/ViewTransition)
