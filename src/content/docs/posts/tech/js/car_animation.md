---
tags: ['javascript', 'css', 'react']
title: An endless road animation for a car in React and CSS
description: Make a car look like it is driving forever by scrolling dashed road markings with a CSS keyframe animation inside a small React component.
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3054188082.webp
---

This is a small trick for a "your ride is on its way" style status screen: the car image stays still and the dashed line on the road scrolls past it, so the car looks like it is driving forever. The animation is pure CSS; React only renders the markup.

## The component

```jsx
import "./styles.css";

export default function App() {
  return (
    <div className="scene" data-testid="carOnRoad">
      <div className="carWrapper">
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/3/38/Red_Car_Closed_Window_Cartoon_Vector.svg"
          alt="Red cartoon car"
          className="car"
        />
      </div>
      <div className="bookingCar">
        <div className="infinite" style={{ width: "500px" }} />
      </div>
    </div>
  );
}
```

There are two layers:

- `.carWrapper` holds the car image and is absolutely positioned on top of the road.
- `.bookingCar` is the road container, and `.infinite` is the grey road surface. Its `::before` pseudo-element draws the dashed centre line, which is the only thing that moves.

The car image is from Wikimedia Commons and is licensed CC BY-SA 4.0, so credit it if you use it in a real product.

## The CSS

```css
.scene {
  position: relative; /* anchor for the absolutely positioned car */
  display: inline-block;
}

.bookingCar {
  display: flex;
  align-items: center;
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.infinite {
  position: relative;
  min-width: 200px;
  height: 64px;
  background: gray;
}

/* Dashed centre line: 30px white, 30px grey, repeating */
.infinite::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 10px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, #fff 0%, #fff 50%, gray 50%, gray 100%);
  background-size: 60px 100%;
  animation: animate 2s linear infinite;
}

@keyframes animate {
  from {
    background-position: 0 0;
  }
  to {
    background-position: -60px 0;
  }
}

.carWrapper {
  position: absolute;
  top: 4px;
  left: 40px;
  z-index: 1;
}

.car {
  display: block;
  height: 30px;
}

/* Respect users who have asked the OS to reduce motion */
@media (prefers-reduced-motion: reduce) {
  .infinite::before {
    animation: none;
  }
}
```

How the loop works:

- The gradient is a hard stop at 50%, so each 60px tile is half white and half grey. `background-size: 60px 100%` repeats that tile along the line.
- The keyframes slide the background left by exactly one tile (60px). Because the last frame looks identical to the first, the jump back to the start is invisible and the loop is seamless.
- The markings move left, so the car appears to drive right. Change the `2s` duration to change the apparent speed, and keep the `-60px` equal to the tile width or the loop will visibly jump.

The `.scene` wrapper needs `position: relative`; without it the absolutely positioned car is placed relative to whatever positioned ancestor happens to exist on the page, which is often the page itself.

## Live demo

<iframe src="https://codesandbox.io/embed/elated-haibt-3e8pph?fontsize=14&hidenavigation=1&theme=dark" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" title="elated-haibt-3e8pph" allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking" sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts" ></iframe>

The sandbox is the original version of this example, so its CSS differs slightly from the cleaned-up code above.

## Further reading

- [MDN: Using CSS animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_animations/Using_CSS_animations)
- [MDN: `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
