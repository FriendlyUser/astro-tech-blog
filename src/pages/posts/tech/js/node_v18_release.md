---
title: Changes in Node.js 18
description: Describing the cool new functions in node 18
alt: my first blog post
tags: ["react","js"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 April 2024 13:00:00 GMT
imgSrc: '/imgs/2023/342028959_blank_card_on_brown_table.png'
---

Node.js 18 introduced some new cool features and one of the most useful ones is the built-in Fetch API. This means that we no longer need to use 3rd party npm packages like node-fetch because the functionality is now native and baked into Noded. Here's an example of how you can use it:

```javascript
const getAPI = async () => {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon/');
    if (res.ok) {
        const data = await res.json();
        console.log(data);
    }
};
getAPI();
```

Another new feature in Node.js 18 is the Test Runner module. Now, we can create tests in Node.js without needing an external package. Here's an example of how you can use it:

```javascript
import test from 'node:test';
import assert from 'node:assert';

test('synchronous passing test', (t) => {
    // This test passes because it does not throw an exception.
    assert.strictEqual(1, 1);
});
```
