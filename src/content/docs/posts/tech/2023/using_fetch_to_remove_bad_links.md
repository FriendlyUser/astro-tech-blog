---
title: Finding and removing broken links with the Fetch API
pubDate: "2024-08-29T09:57:22.000Z"
lastUpdated: 2026-11-14
description: "Use fetch() HEAD requests to find links that return 4xx or 5xx errors, remove them from a page in the browser, or check them from Node.js."
tags: ['javascript', 'web']
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3541980154.webp
---

Broken links are a bad experience for readers and a signal search engines notice. The Fetch API makes it easy to check them: send a `HEAD` request, which returns only the status line and headers, and look at the status code. A 4xx or 5xx means the link is broken; anything else means it works.

This post shows the idea in the browser, the limits of doing it there, and a Node.js version that can check any URL.

## The basic idea

```js
const res = await fetch(url, { method: 'HEAD' });
if (res.status >= 400) {
  // broken
}
```

A few details matter in practice:

- **Redirects are already handled.** `fetch` follows 3xx redirects by default, and `res.status` is the status of the final response. (`res.redirected` tells you a redirect happened.) So a link that redirects to a working page reports 200.
- **Some servers don't support `HEAD`** and answer 405 or 501. Retry those with `GET`.
- **`fetch` rejects on network errors**, such as DNS failures or refused connections, rather than returning a status. Catch those, or one bad link rejects the whole `Promise.all`.
- **Requests can hang.** `AbortSignal.timeout(ms)` gives each request a deadline.

## Removing broken links in the browser

This checks every link on the page, logs the broken ones, and removes them. If a link sits in a table row, the whole row goes:

```js
async function linkStatus(url) {
  try {
    let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10_000) });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      await res.body?.cancel();
    }
    return res.status;
  } catch {
    return null; // network error, timeout, or blocked by CORS
  }
}

async function removeBrokenLinks(selector = 'a[href]:not([data-ignore])') {
  const links = [...document.querySelectorAll(selector)]
    .filter(a => a.origin === location.origin);

  const results = await Promise.all(
    links.map(async a => [a, await linkStatus(a.href)])
  );

  for (const [a, status] of results) {
    if (status !== null && status >= 400) {
      console.warn(`${a.href} returned ${status}`);
      (a.closest('tr') ?? a).remove();
    }
  }
}

removeBrokenLinks();
```

`querySelectorAll` takes any CSS selector, so you can narrow the check to one table or class, and a `data-ignore` attribute lets you skip links you never want removed. `Promise.all` sends the requests concurrently; `linkStatus` never throws, so one failure can't sink the rest.

### Why it only checks same-origin links

The `filter` on `a.origin` is there because of CORS. A browser `fetch` to another origin only succeeds if that server sends `Access-Control-Allow-Origin`, and most sites don't. Without it the request rejects with a `TypeError`, exactly like a dead server would, so you can't tell "broken" from "not allowed to look". `mode: 'no-cors'` doesn't help either: it returns an opaque response whose status is always 0.

So in the browser this approach is reliable for links within your own site. For external links, check from a server or a script instead.

## Checking any link from Node.js

Node.js 18 and later ship a global `fetch`, and there's no CORS outside the browser. This script takes URLs on the command line, retries transient 5xx errors and network failures a couple of times with a growing delay, and prints the ones that are still broken:

```js
// check-links.mjs
const TIMEOUT_MS = 10_000;

async function linkStatus(url, retries = 2) {
  let status = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 405 || res.status === 501) {
        // Some servers don't support HEAD; fall back to GET and drop the body.
        res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
        await res.body?.cancel();
      }
      status = res.status;
      if (status < 500) return status;
    } catch {
      status = null; // DNS failure, refused connection or timeout
    }
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return status;
}

const urls = process.argv.slice(2);
const results = await Promise.all(urls.map(async url => [url, await linkStatus(url)]));
const broken = results.filter(([, status]) => status === null || status >= 400);

for (const [url, status] of broken) {
  console.log(`${status ?? 'ERR'} ${url}`);
}
process.exitCode = broken.length > 0 ? 1 : 0;
```

```bash
node check-links.mjs https://example.com/ https://example.com/old-page
```

It exits with code 1 when anything is broken, so you can run it in CI on a schedule and fix the links in the source, instead of making every visitor's browser re-check them on every page load.

## Gotchas

- **Not every 4xx means dead.** Some sites answer automated requests with 403 or 429 (rate limited) even though the page works in a browser. Log those for a human to look at rather than deleting them automatically.
- **Limit concurrency on big pages.** Hundreds of simultaneous requests to one host can get you rate limited. Check in batches if you have a lot of links.
- **Removing a link hides the problem.** Removing broken links client-side is a stopgap; the durable fix is updating or deleting them in the source.

## Further reading

- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
- [MDN: `AbortSignal.timeout()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
