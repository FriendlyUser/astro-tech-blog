---
title: Install Node.js and run your first Express server
description: Install Node.js on Windows, macOS or Linux, then build a minimal Express 5 server with a start script and static file hosting.
alt: my first blog post
tags: ["js","introToJs", "node", "express"]
layout: '@/templates/BasePost.astro'
pubDate: Monday, 13 Feb 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/3383398588_Ship_on_the_ocean.png'
---

> JavaScript's global scope is like a public toilet. You can't avoid going
> in there, but try to limit your contact with surfaces when you do.
> — Dmitry Baranovskiy

This post installs Node.js, then builds a small Express server: one route, an `npm start` script, and a folder of static files.

## Installing Node.js

Pick the LTS (long-term support) release unless you have a reason not to.

### Windows

- Download the LTS installer (`.msi`) from [nodejs.org](https://nodejs.org/) and run it, or
- use Chocolatey: `choco install nodejs-lts`.

You can also run Node inside the Windows Subsystem for Linux. On current Windows 10 and 11, `wsl --install` in an administrator terminal installs WSL with Ubuntu; then follow the Linux instructions below inside it.

### macOS

```bash
brew install node
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs npm
```

The Ubuntu repository version usually lags well behind the current LTS. If you need a newer release, use a version manager such as [nvm](https://github.com/nvm-sh/nvm) or the NodeSource packages linked from the Node.js download page.

### Check the install

```bash
node -v
npm -v
```

Express 5 needs Node.js 18 or newer, so check the version printed here.

## A minimal Express server

Express is a small web framework for Node.js. Its core is routing (map an HTTP method and path to a handler) and middleware (functions that run on each request before your handler). Things like sessions, authentication, and file uploads come from separate middleware packages.

Create a project and install Express:

```bash
mkdir my-node-app
cd my-node-app
npm init -y
npm install express
```

Save this as `app.js`:

```javascript
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

Run it with `node app.js` and open `http://localhost:3000`. A `GET /` request returns "Hello, world!"; any other path gets Express's default 404 response.

## Adding a start script

Add a `scripts` entry to `package.json` so you can start the app with `npm start`:

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    "express": "^5.3.0"
  }
}
```

`npm init` and `npm install` will already have written most of this file; you only need to add the `start` line. Then:

```bash
npm start
```

`start` is one of the few scripts npm runs without `run`; for any other script name use `npm run <name>`.

## Serving static files

`express.static` is built-in middleware that serves files from a directory:

```javascript
const path = require("path");
const express = require("express");

const app = express();

app.use(express.static(path.join(__dirname, "public")));

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

A file at `public/index.html` is then available at `http://localhost:3000/index.html` (and at `/`, because `express.static` serves `index.html` for a directory by default). The directory name is not part of the URL.

Use `path.join(__dirname, ...)` rather than a bare `'public'`. A relative path is resolved against the directory you launched `node` from, so `node src/app.js` run from the project root would look in the wrong place.

`express.static` only serves files. Anything dynamic, such as form submissions or API calls, needs its own route handlers registered with `app.get`, `app.post`, and so on.

## Further reading

- [Express "Hello world"](https://expressjs.com/en/starter/hello-world.html)
- [Serving static files in Express](https://expressjs.com/en/starter/static-files.html)
- [Migrating to Express 5](https://expressjs.com/en/guide/migrating-5.html)

## References

This content came from a book I generated using ChatGPT and a lot of editing.

View the source material on Amazon: https://www.amazon.com/dp/B0BSL14M71

For a free copy, please view https://friendlyuser.github.io/assets/pdfs/introToJs.pdf
