---
title: "Node.js 18: built-in fetch and the node:test runner"
description: "Two Node.js 18 additions that replace npm packages: a global fetch() enabled by default, and the built-in node:test test runner."
alt: my first blog post
tags: ["react","js","node"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 April 2024 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/342028959_blank_card_on_brown_table.png'
---

:::caution
Node.js 18 reached end-of-life on 2025-04-30 and no longer receives security fixes. Use a supported LTS release such as Node.js 24 (see the [Node.js release schedule](https://github.com/nodejs/release)). Both features below are stable in current versions: `fetch` since Node.js 21 and `node:test` since Node.js 20.
:::

Node.js 18 added two features that remove the need for common npm packages: a global `fetch()` and a built-in test runner.

## Global `fetch`

`fetch` first appeared in Node.js 17.5 behind the `--experimental-fetch` flag. In Node.js 18 it is available globally without a flag (along with `Headers`, `Request`, `Response` and `FormData`, all implemented by the [undici](https://github.com/nodejs/undici) project), so you no longer need `node-fetch` for simple HTTP requests. In 18 it was still marked experimental and printed an `ExperimentalWarning` on first use; it became stable in Node.js 21.

```javascript
const getPokemon = async () => {
  const res = await fetch('https://pokeapi.co/api/v2/pokemon/');
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  const data = await res.json();
  console.log(data);
};

getPokemon().catch(console.error);
```

The API matches the browser `fetch`: it returns a `Response` with `ok`, `status`, `json()`, `text()` and so on. Note that `fetch` only rejects on network errors, not on HTTP error statuses like 404, so check `res.ok` yourself.

## The `node:test` runner

Node.js 18.0 also added the `node:test` module, so you can write tests without installing Jest or Mocha. It must be imported with the `node:` prefix.

```javascript
// math.test.mjs
import test from 'node:test';
import assert from 'node:assert';

test('synchronous passing test', () => {
  // Passes because it does not throw.
  assert.strictEqual(1, 1);
});
```

Run a single file with `node math.test.mjs`, or run every test file Node can find with `node --test` (the `--test` flag was added in Node.js 18.1). The `.mjs` extension is needed for the `import` syntax unless your `package.json` sets `"type": "module"`.

In Node.js 18 the runner was experimental. It became stable in Node.js 20, which also added more features, so check the [`node:test` docs](https://nodejs.org/api/test.html) for the version you run.

## Further reading

- [Node.js `fetch` docs](https://nodejs.org/api/globals.html#fetch)
- [Node.js test runner docs](https://nodejs.org/api/test.html)
- [Node.js 18 release announcement](https://nodejs.org/en/blog/announcements/v18-release-announce)
