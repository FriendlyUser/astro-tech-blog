---
title: "Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests"
description: "Capture a web app's API calls with Chrome DevTools, Puppeteer, Playwright and the DevTools MCP server, scrub secrets from HAR files, and replay them in tests."
tags: ["Chrome", "DevTools", "HAR", "Playwright", "Puppeteer", "API", "Testing"]
pubDate: "2026-11-08T16:00:00.000Z"
imgSrc: "/imgs/2026/recording_api_traffic_in_chrome.webp"
imgAlt: "A Chrome DevTools-style network waterfall of API requests with a red REC indicator"
---

A lot of my work starts with "what does this site actually call?":

- writing a scraper for a page with no public API;
- reproducing a bug that only happens with one customer's data;
- writing tests for a frontend whose backend I don't control.

In every case the answer is the same: record the browser's API traffic, keep the parts you need, and replay them.

This post covers five ways to do that in Chrome, from clicking around in DevTools to fully scripted capture, and how to replay the result in Playwright tests. Everything here was checked against Chrome 157/158 (158 reaches full stable on November 17, 2026), Puppeteer 25 and Playwright 1.65.

## 1. The Network panel, with nothing to install

For a one-off investigation, DevTools is enough:

1. Open DevTools (`F12`), go to the **Network** panel, and tick **Preserve log** so the list survives redirects and logins. Tick **Disable cache** if you want every call to hit the server.
2. Click the **Fetch/XHR** filter to hide scripts, images and fonts.
3. Use the page. Every API call appears with its method, status, timing and initiator.
4. Click a request to see its **Headers**, **Payload** and **Response**. Since Chrome 152 the Payload tab can decode binary payloads as Base64, hex or UTF-8.

The fastest way to turn a recorded call into code is the right-click **Copy** menu. It has **Copy as fetch**, **Copy as fetch (Node.js)**, **Copy as cURL** and **Copy as PowerShell**, and each comes in "Copy all" and "Copy all listed" versions. "Copy as fetch (Node.js)" gives you a working request with the same headers. That includes the session cookie, so treat the output as a secret.

Two newer features help when you are probing an API instead of just watching it:

- **Edit and Resend** works for `fetch()` requests as well as XHR since Chrome 152. Change a parameter and resend without leaving DevTools.
- **Request conditions** (Chrome 145) replaced the old "Network request blocking" drawer. Right-click a request to block or **throttle just that URL or domain**. That's the easiest way to see how your UI behaves when one slow API holds everything up.

### Exporting a HAR, and what it leaves out

To save the whole session, use **Export HAR** (the download arrow in the Network toolbar) or right-click > **Save all as HAR**. A HAR file is JSON: every request and response, with headers, timings and (usually) bodies.

Since Chrome 130, HAR exports are **sanitized by default**: `Cookie`, `Set-Cookie` and `Authorization` headers are removed. That's the right default, because HAR files get attached to bug reports and support tickets. If you need those headers, for example to replay an authenticated session locally, turn on **Settings > Preferences > Network > Allow to generate HAR with sensitive data**. The menu then offers both **Export HAR (sanitized)** and **Export HAR (with sensitive data)**.

Sanitizing only covers those three headers. Tokens in query strings, custom headers like `X-Api-Key`, and secrets inside response bodies (a login response that returns a JWT, for example) are still there. There is a scrubbing script at the end of this post.

### Faking an API response without a backend

**Local overrides** let you edit a response and have Chrome serve your version instead of the real one. Right-click a request > **Override content**, choose a folder, and edit the JSON. Overridden requests get a purple marker, and you can filter the list to show only them. Since Chrome 155/156, local response body overrides also persist across page navigations. This is the quickest way to answer "what does the UI do if this field is null?"

## 2. The Recorder panel: record the clicks, then the calls

The Network panel records what happened once. The **Recorder** panel (More tools > Recorder) records how to make it happen again: you click through a user flow and it saves the steps (navigate, click, type, wait) with stable selectors. You can add assertions while recording, replay at normal speed or slower, and set the timeout per step (the default is 5 seconds).

Recordings export as **JSON**, **@puppeteer/replay**, **Puppeteer**, **Puppeteer (for Firefox)** or **Puppeteer (including Lighthouse analysis)**. Extensions can add more formats. The JSON can be replayed headlessly with no code:

```bash
npx @puppeteer/replay checkout-flow.json
```

Combine the two and you have a repeatable recording. Export the flow as a Puppeteer script, then add network capture (next section) to the top of it. Every run walks the same path and records the same API calls, which makes it easy to diff the traffic before and after a backend change.

## 3. Puppeteer: capture API calls from a script

Puppeteer 25 (the current major; 25.17 was released on November 10) exposes every request and response as events. This script visits a page and saves every fetch/XHR call with its request and response bodies:

```js
// capture-api.mjs: node capture-api.mjs https://example.com
import puppeteer from 'puppeteer';
import { writeFile } from 'node:fs/promises';

const url = process.argv[2];
const browser = await puppeteer.launch();
const page = await browser.newPage();
const calls = [];

page.on('response', async (response) => {
  const request = response.request();
  if (!['fetch', 'xhr'].includes(request.resourceType())) return;

  let body = null;
  try {
    body = await response.text(); // throws for redirects and some cached responses
  } catch {}

  calls.push({
    method: request.method(),
    url: response.url(),
    status: response.status(),
    requestBody: request.postData() ?? null,
    contentType: response.headers()['content-type'] ?? '',
    body,
  });
});

await page.goto(url, { waitUntil: 'networkidle0' });
await writeFile('api-calls.json', JSON.stringify(calls, null, 2));
console.log(`Saved ${calls.length} API calls`);
await browser.close();
```

For edge cases the high-level events don't cover, such as WebSocket frames or bodies of requests that were already evicted, open a raw DevTools Protocol session with `page.createCDPSession()`. Then use the `Network` domain directly (`Network.enable`, `Network.responseReceived`, `Network.getResponseBody`).

To change traffic instead of just watching it, use `page.setRequestInterception(true)`. In the `request` handler, check `request.isInterceptResolutionHandled()` before calling `abort()`, `continue()` or `respond()`, so you don't clash with other handlers.

## 4. Playwright: record a HAR, then replay it in tests

Playwright has HAR recording and replay built in, and it is the cleanest way to turn real traffic into test fixtures.

**Recording from the command line**, with no code:

```bash
npx playwright open --save-har=orders.har --save-har-glob="**/api/**" https://shop.example.com
```

Use the site in the browser that opens, close it, and `orders.har` holds every request matching the glob. Use a `.zip` filename to store response bodies as separate files instead of inline.

**Recording from code** uses the `recordHar` context option. The HAR is written when the context closes:

```ts
const context = await browser.newContext({
  recordHar: {
    path: 'hars/orders.har',
    urlFilter: '**/api/**',
    content: 'embed', // 'omit' | 'embed' | 'attach'
    mode: 'minimal',  // 'full' | 'minimal'
  },
});
const page = await context.newPage();
await page.goto('https://shop.example.com/orders');
await context.close(); // flushes the HAR to disk
```

**Replaying** is where it pays off. `routeFromHAR` serves matching requests from the file, so the test runs without the real backend:

```ts
import { test, expect } from '@playwright/test';

test('orders page renders the recorded orders', async ({ page }) => {
  await page.routeFromHAR('hars/orders.har', {
    url: '**/api/**',
    // Set UPDATE_HAR=1 to re-record against the real API instead of replaying.
    update: !!process.env.UPDATE_HAR,
    updateContent: 'embed',
    notFound: 'abort', // fail loudly on calls that weren't recorded
  });

  await page.goto('https://shop.example.com/orders');
  await expect(page.getByRole('row')).toHaveCount(11);
});
```

The `update` flag turns fixture maintenance into a single command. When the API changes, run the suite once with `UPDATE_HAR=1` against a real environment, review the HAR diff in the pull request, and commit it. `notFound: 'abort'` makes unexpected calls fail the test. If you prefer them to reach the network, use `'fallback'`.

## 5. Let an agent do it: Chrome DevTools MCP

If you use a coding agent, the [Chrome DevTools MCP server](https://github.com/ChromeDevTools/chrome-devtools-mcp) gives it the same Network panel access you have. Add it to your MCP config:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

The agent can then navigate and click. For API traffic it uses two tools:

- **`list_network_requests`** lists what the page loaded. It can filter by resource type and include requests from the last few navigations.
- **`get_network_request`** fetches one request's details, and can save the request and response bodies to files. If no request ID is given, it uses whichever request is selected in your own DevTools Network panel. That makes "look at this failing call" work.

Version 1.13.0 (November 11, 2026) added page-scoped **network mocks** (`mock_network`, `remove_network_mock`). The agent can serve a local file or another upstream URL for a matching request. They are off by default; enable them with `--categoryNetworkMocks`. There is no HAR export tool yet, so for fixtures, have the agent write a Playwright `recordHar` script instead.

This turns "open the orders page, find the call that loads the table, and write a typed client for it" into one request to the agent, instead of twenty minutes of copying headers.

## 6. A browser extension, for capturing in your everyday profile

All of the above uses a fresh browser profile. To record traffic in the browser you actually use, with your real logins, write a small extension with the `debugger` permission. `chrome.debugger` attaches the DevTools Protocol to a tab:

```js
// background.js: manifest.json needs "permissions": ["debugger"]
chrome.action.onClicked.addListener(async (tab) => {
  const target = { tabId: tab.id };
  await chrome.debugger.attach(target, '1.3');
  await chrome.debugger.sendCommand(target, 'Network.enable');
});

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method !== 'Network.loadingFinished') return;
  try {
    const { body, base64Encoded } = await chrome.debugger.sendCommand(
      source, 'Network.getResponseBody', { requestId: params.requestId });
    console.log(params.requestId, base64Encoded ? '[binary]' : body.slice(0, 200));
  } catch {} // some requests have no retrievable body
});
```

Chrome shows a "started debugging this browser" banner while it is attached, as it should. Don't install third-party "HAR recorder" extensions in a profile with real accounts unless you have read their code. They get the same access.

## Scrubbing secrets before you commit a HAR

Even a sanitized export can hold tokens. Run recorded files through a script like this before they go into a repository:

```js
// scrub-har.mjs: node scrub-har.mjs in.har out.har
import { readFile, writeFile } from 'node:fs/promises';

const SECRET_HEADERS = /^(authorization|cookie|set-cookie|x-api-key|x-csrf-token|x-auth-token)$/i;
const SECRET_PARAMS = /^(token|access_token|refresh_token|api_key|apikey|key|signature|code|session)$/i;

const [input, output] = process.argv.slice(2);
const har = JSON.parse(await readFile(input, 'utf8'));

for (const { request, response } of har.log.entries) {
  for (const h of [...request.headers, ...response.headers]) {
    if (SECRET_HEADERS.test(h.name)) h.value = '[redacted]';
  }
  request.cookies = [];
  response.cookies = [];

  for (const q of request.queryString) {
    if (SECRET_PARAMS.test(q.name)) q.value = '[redacted]';
  }
  const url = new URL(request.url);
  for (const key of [...url.searchParams.keys()]) {
    if (SECRET_PARAMS.test(key)) url.searchParams.set(key, 'redacted');
  }
  request.url = url.toString();
}

await writeFile(output, JSON.stringify(har, null, 2));
```

Response bodies are the part no script can safely clean: login responses, user profiles and anything with personal data. Record fixtures with a test account, and search the file for your real email and name before committing.

## Which one to use

- **"What does this page call?"** Network panel, Fetch/XHR filter, Copy as fetch.
- **"Make this bug reproducible for someone else"** Recorder flow plus a sanitized HAR.
- **"Scrape or monitor an API without docs"** Puppeteer with `page.on('response')`.
- **"Frontend tests that don't need the backend"** Playwright `recordHar` plus `routeFromHAR` with `update`.
- **"Have my coding agent figure it out"** Chrome DevTools MCP.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Vue 3 Six Years On: What Changed from 3.0 to 3.6](/posts/tech/2026/vue_3_since_launch/)
- [Vue 3 Frameworks in 2026, and What Changed in Astro](/posts/tech/2026/vue_frameworks_and_astro_in_2026/)
- [Static Recompilation: How Old Games (and Old Software) Become Native Apps](/posts/tech/2026/static_recompilation_games_and_software/)
- [AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett](/posts/tech/2026/ai_investing_research_systems/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
- [What Changed in Claude Code in 2026](/posts/tech/2026/claude_code_changes_2026/)
