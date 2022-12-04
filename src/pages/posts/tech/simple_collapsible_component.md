---
title: Adding collapsible component using react
description: Simple collapsible component
alt: my first blog post
tags: ["bit","react"]
layout: '@/templates/BasePost.astro'
pubDate: Saturday, 20 December 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-04 10.17.47 - collapse of a bridge.png'
---

## What is an collapsible
Collapsible components are often used in user interfaces to hide and show content on demand. This can be useful for reducing the amount of space that a page takes up and for hiding less important or less frequently used content. By allowing users to expand and collapse content as needed, collapsible components can help to improve the usability and navigability of a user interface.

```tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';

class Collapsible extends React.Component {
  state = {
    collapsed: true,
  };

  toggleCollapsed = () => {
    this.setState(prevState => ({
      collapsed: !prevState.collapsed,
    }));
  };

  render() {
    const { collapsed } = this.state;
    const { header, children } = this.props;

    return (
      <div>
        <div onClick={this.toggleCollapsed}>
          {header}
          <FontAwesomeIcon icon={collapsed ? faCaretDown : faCaretUp} />
        </div>
        {!collapsed && <div>{children}</div>}
      </div>
    );
  }
}

```

In this example, the Collapsible component is a class-based component that uses the React.Component base class. It maintains a state variable called collapsed that determines whether the collapsible content is currently visible or hidden. The component also has a toggleCollapsed method that updates the collapsed state variable when the header is clicked.

The component uses the FontAwesomeIcon component from the @fortawesome/react-fontawesome package to display the caret icon. The icon is determined by the value of the collapsed state variable, with a downward-facing caret icon being displayed when the content is collapsed and an upward-facing caret icon being displayed when the content is expanded.

When the component is rendered, the header and caret icon are always visible, but the content element is only visible if the collapsed state variable is false. This allows the user to click the header to toggle the visibility of the collapsible content.



Here is an example of how you could implement a simple collapsible component in React with a caret that flips based on the collapsed/expanded state:
```js
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';

class Collapsible extends React.Component {
  state = {
    collapsed: true,
  };

  toggleCollapsed = () => {
    this.setState(prevState => ({
      collapsed: !prevState.collapsed,
    }));
  };

  render() {
    const { collapsed } = this.state;
    const { header, children } = this.props;

    return (
      <div>
        <div onClick={this.toggleCollapsed}>
          {header}
          <FontAwesomeIcon
            icon={collapsed ? faCaretDown : faCaretUp}
            style={{
              transform: `rotate(${collapsed ? '0' : '180'}deg)`,
              transition: 'transform 0.25s ease-in-out',
            }}
          />
        </div>
        {!collapsed && <div>{children}</div>}
      </div>
    );
  }
}
```

Rewriting this code with hooks

```js
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCaretDown, faCaretUp } from '@fortawesome/free-solid-svg-icons';

// header children react prop types
export interface CollapsibleProps {
  header?: JSX.Element;
  children: React.ReactChildren
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
        <FontAwesomeIcon
          icon={collapsed ? faCaretDown : faCaretUp}
          style={{
            paddingLeft: "3px",
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


In this example, the Collapsible function is a stateful function component that uses the useState hook to manage the collapsed state variable. It also has a toggleCollapsed function that updates the collapsed state variable when the header is clicked.

The function uses the FontAwesomeIcon component from the @fortawesome/react-fontawesome package to display the caret icon. The icon is determined by the value of the collapsed state variable, with a downward-facing caret icon being displayed when the content is collapsed and an upward-facing caret icon being displayed when the content is expanded.

When the component is rendered, the header and caret icon are always visible, but the content element is conditionally rendered.


Alternatively we can build a caret using css

```css
.caret {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 5px;
  vertical-align: middle;
  border-top: solid 5px black;
  border-right: solid 5px transparent;
  border-left: solid 5px transparent;
}
```

This CSS code defines the styles for an element with the class caret. The caret is implemented using an inline-block element with some CSS styles that define the shape and orientation of the caret.

To use the caret, you would add the caret class to an element in your HTML code, like this:


```js
<div class="caret" />
```

The caret will be displayed as a downward-facing triangle next to the element to which the caret class is applied. You can change the color of the caret by modifying the border-top property in the CSS code.

This is used in my web components bit repository.

See https://bit.cloud/friendlyuser/web/collapse for more details.


If you want to create a collapsible component that is more visually appealing, you could use a library like styled-components to define the styles for your component. This would allow you to create a custom design for your collapsible component without having to write a lot of CSS code.
