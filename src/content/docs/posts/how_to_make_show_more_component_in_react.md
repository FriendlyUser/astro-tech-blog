---
title: How to make a show more component in react
description: How I implemented tags for my blog
alt: Tagging in Astro
pubDate: Sunday, 8 April 2020 13:00:00 GMT
tags: ["react", "bit"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-08-11 19.14.04 - A handpalm with a tree growing out of it, digital art.png.jpeg'
imgAlt: 'Image post 6'
---


### Introduction

Recently I had to make a Show More Component for a body of text. Here I will outline the basic steps to make this component.

1. Have a truncate text function
```
function truncateString(str, num) {
  // If the length of str is less than or equal to num
  // just return str--don't truncate it.
  if (str.length <= num) {
    return str
  }
  // Return str truncated with '...' concatenated to the end of str.
  return str.slice(0, num) + '...'
}
```
2. Have an internal state variable that tracks if the text should  be truncated and likewise use the show more text or the show less text.

```js
import React from 'react';

export type ShowmoreProps = {
  /**
   * Props to be passed to the Showmore component.
   * @params text: string - a node to be rendered in the special component.
   * @params truncateLength: number - the number of characters to show before truncating.
   */
  text: string;
  truncateLength?: number
};

function truncateString(str, num) {
  // If the length of str is less than or equal to num
  // just return str--don't truncate it.
  if (str.length <= num) {
    return str
  }
  // Return str truncated with '...' concatenated to the end of str.
  return str.slice(0, num) + '...'
}

export function Showmore({text, truncateLength = 50}: ShowmoreProps) {

    const [showMore, setShowMore] = React.useState(false);

    if (showMore) {
        return(<div>
          <p>{text}</p>
          <button onClick={() => setShowMore(false)}>Show less</button> 
          </div>
          );
    }
    return (
        <div>
            <p>{truncateString(text, truncateLength)}</p>
            <button onClick={() => setShowMore(true)}>Show more</button>  
        </div>
    );
};
```

View the full components at https://bit.cloud/friendlyuser/web/showmore.