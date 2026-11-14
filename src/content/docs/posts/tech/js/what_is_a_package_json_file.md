---
title: What package.json does in a Node.js project, with an Express example
description: The main package.json fields (name, version, scripts, dependencies, devDependencies) and how to add a start script for a small Express server.
alt: my first blog post
tags: ["javascript","introtojs", "node", "express"]
layout: '@/templates/BasePost.astro'
pubDate: Monday, 6 August 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/DALL·E 2023-01-07 17.07.12 - introductory book.png'
---

`package.json` sits in the root of a Node.js project and describes it: its name and version, the commands you run during development, and the packages it depends on. npm, Yarn and pnpm all read it. When you run `npm install`, npm installs what it lists and records the exact resolved versions in `package-lock.json`.

## The fields you'll use most

- `name`: the package name. It must be lowercase and URL-safe if you ever publish to npm.
- `version`: the project's version, in semver form (`1.0.0`).
- `scripts`: named commands you run with `npm run <name>`. `start` and `test` also have shortcuts: `npm start` and `npm test`.
- `dependencies`: packages the code needs at runtime. `npm install <pkg>` adds an entry here.
- `devDependencies`: packages only needed during development, such as test runners, linters and bundlers. `npm install -D <pkg>` adds an entry here.

A plain `npm install` installs both `dependencies` and `devDependencies`. To skip the dev ones, for example in a production image, use `npm install --omit=dev`. Yarn Classic's `yarn install --production` does the same.

## Example: an Express server

[Express](https://expressjs.com/) is a minimal web framework for Node.js. It handles routing (mapping an HTTP method and path to a handler) and middleware (functions that run on each request before or after your handlers). Template engines such as Pug or EJS are installed separately and then enabled with `app.set('view engine', ...)`.

Create a project and install Express:

```bash
mkdir my-node-app && cd my-node-app
npm init -y
npm install express
```

`npm init -y` writes a default `package.json`, and `npm install express` adds Express to its `dependencies`.

Save this as `app.js`:

```js
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

`app.get("/")` registers a handler for `GET /` that responds with "Hello, world!", and `app.listen(3000)` starts the server on port 3000.

## Adding a start script

Add a `start` entry under `scripts` so nobody has to remember the file name:

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

`^5.3.0` means any 5.x release from 5.3.0 up. That was the current Express release when this post was revised, and `npm install` writes whatever is current for you. JSON doesn't allow comments, so don't add any to `package.json`.

Run it with:

```bash
npm start
```

`npm start` is short for `npm run start`. Open http://localhost:3000 to see the response.

## Introduction to JS

This is a snippet from a book I am writing on JS with the assistance of chatgpt.
