---
title: Simple collapsible component
description: Describes a simple collapsible component for react
alt: Screenshot utilty for mobile apps
layout: '@/templates/BasePost.astro'
pubDate: Wed, 21 May 2023
tags: ["bit", "javascript"]
imgSrc: '/imgs/2023/man_on_horse.png'
imgAlt: 'Image post 6'
---

In this example, the Collapsible component is a class-based component that uses the React.Component base class. It maintains a state variable called collapsed that determines whether the collapsible content is currently visible or hidden. The component also has a toggleCollapsed method that updates the collapsed state variable when the header is clicked.

The component uses the FontAwesomeIcon component from the @fortawesome/react-fontawesome package to display the caret icon. The icon is determined by the value of the collapsed state variable, with a downward-facing caret icon being displayed when the content is collapsed and an upward-facing caret icon being displayed when the content is expanded.

When the component is rendered, the header and caret icon are always visible, but the content element is only visible if the collapsed state variable is false. This allows the user to click the header to toggle the visibility of the collapsible content.

```js
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';

// header children react prop types
export interface CollapsibleProps {
  header?: JSX.Element;
  children: any;
}

export function Collapsible(props: CollapsibleProps) {
  const [collapsed, setCollapsed] = useState<boolean>(true);

  function toggleCollapsed() {
    setCollapsed(prevState => !prevState);
  }

  const { header, children } = props;

  return (
    <div style={{
      width: "100%",
    }}>
      <div onClick={toggleCollapsed} style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: "row",
      }}>
        {header}
        <div style={{
            display: "inlineBlock",
            width: "0",
            height: "0",
            marginLeft: "5px",
            verticalAlign: "middle",
            borderTop: "solid 5px black",
            borderRight: "solid 5px transparent",
            borderLeft: "solid 5px transparent",
            transform: `rotate(${collapsed ? '0' : '180'}deg)`,
            transition: 'transform 0.25s ease-in-out',
        }}
        />
      </div>
      {!collapsed && <div>{children}</div>}
    </div>
  );
}
```

This is a functional component in React that allows you to render some content in a collapsible manner. The component takes two props:

header: This is a JSX element that will be displayed as the header of the collapsible component. It is optional, so you don't have to provide it if you don't want to.

children: This prop represents the content that will be displayed when the collapsible component is expanded. It can be any valid React element, such as a string, a JSX element, or an array of elements.

The component uses the useState hook to manage its state. The collapsed state variable is initialized to true, which means the component will be collapsed by default. The toggleCollapsed function is used to toggle the value of collapsed between true and false when the header is clicked.

The component renders the header and an SVG arrow that points down when the component is collapsed, and points up when it is expanded. When the component is expanded, it also renders the children prop.

## References

see https://github.com/FriendlyUser/dli_components/blob/main/web/collapse/collapsible.tsx