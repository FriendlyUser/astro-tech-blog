---
title: Ensure Elements are always visible on screen
description: Understanding React Refs A Guide for Beginners
alt: my first blog post
tags: ["js"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 7 December 2024
imgSrc: '/imgs/2023/148139817.png'
---

To ensure that an HTML element is in the fold, you can follow these steps:

Identify the viewport height: The viewport height is the visible portion of the web page that a user can see on their screen without scrolling. You can find the viewport height using JavaScript or by using the CSS "vh" unit.

Place the element in the top portion of the page: To ensure that the element is in the fold, place it in the top portion of the page, preferably in the first screenful of content. This will make sure that the element is visible to the user without them having to scroll down.

Optimize the content above the element: Ensure that the content above the element is optimized to keep the user engaged and interested. This will encourage them to scroll down and view more content.

Test the layout on different devices: Test the layout on different devices with different screen sizes to ensure that the element is visible in the fold on all devices.

Consider using a sticky navigation: If the element is important, consider using a sticky navigation that follows the user as they scroll down the page. This will ensure that the element is always visible to the user.

By following these steps, you can ensure that the HTML element is in the fold and visible to the user without them having to scroll down.

In React, a ref is a way to reference a DOM element or a React component instance created by a component.

Here's an example of a React ref being used to reference a DOM element:

```jsx
import React, { useRef } from 'react';

function ExampleComponent() {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current.focus();
  };

  return (
    <div>
      <input type="text" ref={inputRef} />
      <button onClick={handleClick}>Focus</button>
    </div>
  );
}
```

In React, a ref is a way to reference a DOM element or a React component instance created by a component.

Here's an example of a React ref being used to reference a DOM element:

javascript
Copy code
import React, { useRef } from 'react';

function ExampleComponent() {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current.focus();
  };

  return (
    <div>
      <input type="text" ref={inputRef} />
      <button onClick={handleClick}>Focus</button>
    </div>
  );
}
In this example, we are creating a functional component called "ExampleComponent". We're using the "useRef" hook to create a ref called "inputRef" and assigning it to the input element using the "ref" attribute.

We're also defining a function called "handleClick" that is called when the button is clicked. This function is using the "current" property of the ref to call the "focus" method on the input element, which will give it focus.

This is just one example of how refs can be used in React. Refs can also be used to reference a React component instance, which can be useful for accessing component methods or properties.


```jsx
inputRef?.current.getBoundingClientRect().bottom + document.documentElement.scrollTop
```

inputRef is the ref object that is referencing the element.
current is a property of the ref object that holds the current DOM node.
getBoundingClientRect() is a method that returns the size of an element and its position relative to the viewport.
bottom is a property of the returned object that represents the distance from the bottom edge of the element to the top edge of the viewport.
document.documentElement.scrollTop is the distance between the top of the viewport and the top of the document.
So, the above code is calculating the distance between the bottom edge of the element referenced by the inputRef and the top of the document, taking into account any scrolling that has occurred on the page.

Note that the ? operator is used to ensure that the current property is not accessed if the inputRef is null or undefined. This is important because the getBoundingClientRect() method can only be called on a valid DOM node.

Using that value and an adjustment property for a relatively positioned element, you can calculate the distance between the bottom edge of the element and the top of the viewport. This can be used to ensure the component is always above the fold.

```jsx
top: `-${top}px`,
```

top is a CSS property that controls the positioning of an element along the vertical axis relative to its parent container.
-${top}px is a template literal that evaluates to a string value that represents a negative pixel value for the top property.
top is a variable that holds the pixel value to be used in the negative value.
By setting the top property to a negative value, the element is positioned above the top edge of its parent container. The amount of pixels the element is positioned above the top edge is determined by the value of the top variable. The variable is passed in as an argument to the template literal in the form of ${top}, and is interpolated into the resulting string.

Overall, this code is useful for positioning an element above its parent container, for example to create an overlay effect or to position a tooltip.