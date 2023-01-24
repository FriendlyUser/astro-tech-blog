---
title: How I style svg in next.js
description: Using svg in next.js for custom styling
alt: my first blog post
tags: ["next","svg"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 2 September 2023 13:00:00 GMT
imgSrc: '/imgs/2023/DALL·E 2023-01-23 21.47.24 - abstract images.png'
---


SVGs (Scalable Vector Graphics) have several advantages over PNGs (Portable Network Graphics) and other raster image formats:

Scalability: SVGs are vector-based images, which means they can be scaled to any size without losing quality. This makes them perfect for responsive design and high-resolution displays.

Smaller file size: Since SVGs are code-based, they generally have a smaller file size than raster images like PNGs. This means they can be loaded faster and take up less space on a device.

Interactivity: SVGs can be animated and modified with CSS and JavaScript, which means they can be more interactive and dynamic.

Accessibility: SVGs can be easily indexed and searched by search engines and screen readers, making them more accessible to users with disabilities.

Better for logos and icons: SVGs are perfect for logos and icons because they can be infinitely scaled without losing quality, and they can be easily manipulated with CSS.

In summary, SVGs are a great choice for images that need to be scalable, lightweight and interactive, and logos or icons.

```js
// import react
import React, { useEffect, useState } from "react";

export interface SvgInlineProps {
  url: string;
  className?: string;
  style?: React.CSSProperties | undefined;
}
// for next.js if icon does not exist this will throw an error
export const SvgInline: React.FC<SvgInlineProps> = ({ url, className, style }) => {
  // set the state of the svg to be empty and set the default as false
  const [svg, setSvg] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isErrored, setIsErrored] = useState(false);

  useEffect(() => {
    // fetch the url
    fetch(url)
      .then((res) => {
        return res.text();
      })
      // set the svg to the text
      .then((text) => {
        if (text.includes("html")) {
          // use fallback svg
          console.log("file does not exist");
        } else {
          setSvg(text);
        }
      })
      // set the error state to true
      .catch(setIsErrored)
      .then(() => {
        return setIsLoaded(true);
      });
  }, [url]);
  return (
    // add class names for the states
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


1. The component accepts three props: url, className and style.
2. The component uses the useState hook to set the state of the SVG and the loading state.
3. The useEffect hook is used to fetch the SVG and set the state.
4. Then the SVG is set to the state.
5. If the SVG does not exist, the component will use a fallback SVG.
6. The component will add a class name for the states: loading, loaded, errored.
7. The SVG is then rendered using the dangerouslySetInnerHTML prop.

```js
"use client"; // this is a client component
import React from "react";
import classes from "./svgIcon.module.css";
import { SvgInline } from "./SvgInline";

export interface SearchIconProps {
  label?: string;
  iconUrl?: string;
  svgStyle?: React.CSSProperties;
}

export const SvgIcon: React.FC<SearchIconProps> = ({
  label,
  iconUrl,
}) => {
  const [testActive, setTestActive] = React.useState(false);

  const activeClasses = testActive ? classes.activeClass : classes.inActiveClass;
  return (
    <>
      <div tabIndex={-1} onClick={() => {
        setTestActive(!testActive);
      }} className={activeClasses} style={{
        width: '100px',
        maxWidth: "150px"
      }}>
        {iconUrl && <SvgInline url={iconUrl}  />}
        </div>
    </>
  );
};
```

This is a client-side React component called "SvgIcon" that renders an SVG image based on a provided URL. The component also has a state called "testActive" which is used to toggle a CSS class for the rendered SVG element. The component also receives a "label" prop and an "iconUrl" prop, and uses the "SvgInline" component to render the SVG image. The component also has a onClick event handler that toggles the state of the testActive variable.


```css
.activeClass path {
    fill: black;
    stroke: black;
    stroke-width: 0.25px;
}

.activeClass g {
    fill: black;
    stroke: black;
    stroke-width: 0.25px;
}

.inActiveClass path {
    fill: gray !important;
    stroke: gray !important;
    stroke-width: 0.25px;
}

.inActiveClass g {
    fill: gray !important;
    stroke: gray !important;
    stroke-width: 0.25px;
}

.activeClass svg {
    max-width: 100px;
    max-height: 100px;
}

.inActiveClass svg {
    max-width: 100px;
    max-height: 100px;
}
```
These are CSS styles for the "SvgIcon" component. The styles set the fill and stroke color of the "path" and "g" elements within the SVG, as well as the stroke width. When the "testActive" state is true, the class "activeClass" is applied to the SVG, which sets the fill and stroke color to black. When "testActive" is false, the class "inActiveClass" is applied, which sets the fill and stroke color to gray. The styles also set a maximum width and height for the SVG element when either class is applied. The "!important" keyword is used to ensure that these styles override any other styles that may be applied to the elements.

## References

* https://nextjs-blog-demo-navy.vercel.app/svg_icons
