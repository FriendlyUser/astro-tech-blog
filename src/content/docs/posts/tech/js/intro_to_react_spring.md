---
title: "Getting started with react-spring: useSpring and useTrail examples"
description: "Three small react-spring examples (a fade-in, a slide and a staggered trail) using the current @react-spring/web package and the .to() API."
pubDate: Saturday, 7 November 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["react", "reactspring", "js"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/powell_ANGRY.png'
---
react-spring animates React components with spring physics instead of fixed durations and easing curves. You describe the values you want (`opacity: 1`, `x: 100`) and the library moves towards them using a spring defined by mass, tension and friction. Values are updated on animated components directly, outside React's render cycle, so a running animation doesn't re-render your component every frame.

The examples below use `@react-spring/web` 10.1.2, which supports React 16.8 through 19:

```bash
npm install @react-spring/web
```

Older tutorials (including the first version of this post) import from `react-spring` and call `.interpolate()`. That method was removed in v9; use `.to()` instead.

## Fade in with useSpring

```jsx
import { useSpring, animated } from '@react-spring/web'

export function FadeIn() {
  const styles = useSpring({ from: { opacity: 0 }, to: { opacity: 1 } })
  return <animated.div style={styles}>I will fade in</animated.div>
}
```

`useSpring` returns animated values, and `animated.div` is a `div` that knows how to apply them. Any HTML or SVG element is available as `animated.<tag>`.

## Slide to the right

```jsx
import { useSpring, animated } from '@react-spring/web'

export function SlideRight() {
  const { x } = useSpring({ from: { x: 0 }, to: { x: 100 } })

  return (
    <animated.div style={{ transform: x.to((v) => `translate3d(${v}px, 0, 0)`) }}>
      I will move to the right
    </animated.div>
  )
}
```

`x.to()` maps the spring value to whatever string the style needs. For plain translations `@react-spring/web` also accepts the `x`, `y` and `z` shorthands directly, so `style={{ x }}` does the same thing as the `transform` above.

## Staggered list with useTrail

`useTrail` creates one spring per item, and each spring follows the one before it, which gives a staggered effect.

```jsx
import { useState } from 'react'
import { useTrail, animated } from '@react-spring/web'

const items = ['Item 1', 'Item 2', 'Item 3', 'Item 4']

export function TrailAnimation() {
  const [open, setOpen] = useState(true)
  const trail = useTrail(items.length, {
    config: { mass: 5, tension: 2000, friction: 200 },
    opacity: open ? 1 : 0,
    y: open ? 0 : 20,
    height: open ? 80 : 0,
    from: { opacity: 0, y: 20, height: 0 },
  })

  return (
    <div>
      <button onClick={() => setOpen((value) => !value)}>Toggle</button>
      {trail.map(({ height, ...style }, index) => (
        <animated.div key={items[index]} className="trails-text" style={style}>
          <animated.div style={{ height }}>{items[index]}</animated.div>
        </animated.div>
      ))}
    </div>
  )
}
```

The `config` object sets the spring physics: higher `tension` makes it faster, higher `friction` damps the bounce, and `mass` adds inertia. The outer `div` gets the opacity and vertical offset, and the inner one animates its height so the items collapse when toggled.

<iframe src="https://codesandbox.io/embed/youthful-chatelet-9tyow5?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="youthful-chatelet-9tyow5"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>

## Further reading

- [react-spring getting started](https://react-spring.dev/docs/getting-started)
- [useTrail reference](https://react-spring.dev/hooks/use-trail)
- [CodeSandbox for this post](https://codesandbox.io/s/youthful-chatelet-9tyow5?file=/src/App.js)
