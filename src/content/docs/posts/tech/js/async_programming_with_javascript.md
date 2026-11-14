---
title: "Async JavaScript: promises, async/await and fetch"
description: How promises and async/await work in JavaScript, plus making HTTP requests with fetch, handling errors, cancelling with AbortController and caching responses.
alt: my first blog post
tags: ["js","introToJs","express","javascript"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 Feb 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/2126341537-forest.webp'
---

> The only way to learn a new programming language is by writing programs in it.
> — Brian Kernighan and Dennis Ritchie, *The C Programming Language*

JavaScript runs your code on a single thread, so slow work like network requests, timers and
file I/O is done asynchronously: you start the operation, the rest of your code keeps running,
and you handle the result when it arrives. JavaScript gives you three ways to handle that result:
callbacks, promises, and `async`/`await` (which is built on promises).

## Promises

A promise is an object representing the eventual result of an asynchronous operation. It is
always in one of three states:

- **pending**: the operation hasn't finished yet
- **fulfilled**: it finished and a value is available
- **rejected**: it failed and an error (the rejection reason) is available

### Why use promises

With plain callbacks, every step that depends on the previous one gets nested inside it, and
error handling has to be repeated at each level ("callback hell"). Promises let you chain steps
with `.then()` and handle errors once with `.catch()`.

Here is a promise that wraps `setTimeout` and fails half the time:

```javascript
const flipCoin = new Promise((resolve, reject) => {
  setTimeout(() => {
    if (Math.random() < 0.5) {
      resolve('heads');
    } else {
      reject(new Error('tails'));
    }
  }, 500);
});

flipCoin
  .then((result) => {
    console.log('Won with', result);
  })
  .catch((error) => {
    console.error('Lost:', error.message);
  });
```

The function passed to `new Promise` receives `resolve` and `reject`. Calling `resolve(value)`
fulfils the promise and runs the `.then()` callback; calling `reject(error)` rejects it and runs
the `.catch()` callback. Reject with an `Error` object rather than a string so you keep a stack trace.

### async/await

`async`/`await` (ES2017) is syntax over promises that lets you write the same logic top to
bottom. An `async` function always returns a promise, and `await` pauses that function until the
promise settles. Rejections become exceptions you handle with `try`/`catch`:

```javascript
async function play() {
  try {
    const result = await flipCoin;
    console.log('Won with', result);
  } catch (error) {
    console.error('Lost:', error.message);
  }
}

play();
```

To run independent operations at the same time instead of one after another, start them all and
await `Promise.all([...])` (fails as soon as one rejects) or `Promise.allSettled([...])` (waits for
all and reports each outcome).

## HTTP requests

The most common use of async code in the browser is talking to a server over HTTP. The request
methods you'll use most:

- `GET`: read a resource
- `POST`: send data to be processed, often to create a resource
- `PUT`: replace a resource
- `PATCH`: partially update a resource
- `DELETE`: delete a resource

An endpoint is the URL you send a request to, such as `https://example.com/books?title=harry+potter`,
where `https://example.com/books` is the path and `title=harry+potter` is a query string parameter.

### XMLHttpRequest vs fetch

Browsers have two built-in APIs for making requests. The older one is `XMLHttpRequest` (XHR),
which is event/callback based:

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://pokeapi.co/api/v2/pokemon/1');

xhr.onload = function () {
  if (xhr.status === 200) {
    const data = JSON.parse(xhr.responseText);
    console.log(data.name);
  }
};
xhr.onerror = function () {
  console.error('Network error');
};

xhr.send();
```

The newer `fetch()` API returns a promise and is what you should reach for today. It is also
available in Node.js 18 and later without any imports.

```javascript
fetch('https://pokeapi.co/api/v2/pokemon/1')
  .then((response) => response.json())
  .then((data) => console.log(data.name));
```

"AJAX" isn't a separate API; it's the general technique of requesting data from the page without
a full reload, and both XHR and fetch can do it. Practical differences between the two:

- `fetch` returns promises, so it works with `async`/`await`; XHR uses event handlers.
- `fetch` exposes the response body as a stream (`response.body`), so you can process large
  responses as they arrive.
- XHR has `upload.onprogress` for upload progress events; `fetch` has no equivalent.

### Using fetch

The examples below use [PokéAPI](https://pokeapi.co/), a free REST API with data about Pokémon
games that needs no API key. Pokémon #1 is Bulbasaur.

One thing that catches people out: **`fetch` only rejects on network failures**. A 404 or 500
response still fulfils the promise, so check `response.ok` yourself:

```javascript
async function getPokemon(id) {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

getPokemon(1)
  .then((pokemon) => console.log(pokemon.name)) // "bulbasaur"
  .catch((error) => console.error(error));
```

To send headers, such as a bearer token for an authenticated API, pass an options object as the
second argument. The same object sets the method and body for `POST`, `PUT` and so on
(this and later snippets use top-level `await`, which works in ES modules and the browser console;
elsewhere, put them inside an `async` function):

```javascript
const response = await fetch('https://example.com/api/v1/data', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer <your-token>',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'bulbasaur' }),
});
```

### Cancelling a request with AbortController

`AbortController` lets you cancel a request in flight, for example when the user starts a new
search that replaces the old one. Pass its `signal` to `fetch`; calling `abort()` rejects the
promise with an `AbortError`:

```javascript
const controller = new AbortController();

fetch('https://pokeapi.co/api/v2/pokemon/1', { signal: controller.signal })
  .then((response) => response.json())
  .then((data) => console.log(data.name))
  .catch((error) => {
    if (error.name === 'AbortError') {
      console.log('Request cancelled');
    } else {
      throw error;
    }
  });

// later, to cancel:
controller.abort();
```

For a timeout, you don't need your own controller: `fetch(url, { signal: AbortSignal.timeout(5000) })`
aborts after five seconds (the rejection is then a `TimeoutError`).

## Scraping HTML with fetch and Cheerio

`fetch` gets you the raw HTML of a page but doesn't parse it. For server-side scraping in Node.js,
[Cheerio](https://cheerio.js.org/) parses HTML and gives you a jQuery-like API for selecting
elements (`npm install cheerio`). Save this as `scrape.mjs` so Node treats it as an ES module,
which allows `import` and top-level `await`:

```javascript
import * as cheerio from 'cheerio';

const response = await fetch('https://example.com');
const html = await response.text();

const $ = cheerio.load(html);
console.log($('title').text()); // "Example Domain"
```

Cheerio doesn't run JavaScript, so it only sees what's in the HTML the server sends. For pages that
build their content client-side, use a headless browser such as Puppeteer or Playwright instead.

## Caching responses

If your app requests the same data repeatedly, you can keep responses in memory and skip the
network on repeat requests. Cache the *promise* rather than the resolved data: then two calls
made at the same time share one request, and the function always returns a promise.

```javascript
const cache = new Map();

function getData(url) {
  if (!cache.has(url)) {
    const request = fetch(url).then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    });
    // Don't keep failed requests in the cache
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return cache.get(url);
}

const first = await getData('https://pokeapi.co/api/v2/pokemon/1');
const second = await getData('https://pokeapi.co/api/v2/pokemon/1'); // no second request
```

This cache never expires and grows without limit, which is fine for a small, fixed set of URLs.
For anything bigger, reach for a library:

- [`quick-lru`](https://www.npmjs.com/package/quick-lru) and
  [`tiny-lru`](https://www.npmjs.com/package/tiny-lru): in-memory LRU caches that evict the least
  recently used entries once a maximum size is reached.
- [`memoizee`](https://www.npmjs.com/package/memoizee): memoizes function results, including
  promise-returning functions, with optional expiry.
- [`lscache`](https://www.npmjs.com/package/lscache): stores values in `localStorage` with an
  expiry time, so they survive page reloads.

Also remember that the browser already has an HTTP cache. If the server sends sensible
`Cache-Control` headers, repeat `fetch` calls may be served without a network round trip at all.

## Further reading

- [Using promises (MDN)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [Using the Fetch API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [AbortController (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

## References

This content came from a book I generated using ChatGPT and a lot of editing.

View the source material on Amazon: https://www.amazon.com/dp/B0BSL14M71

For a free copy, see https://friendlyuser.github.io/assets/pdfs/introToJs.pdf
