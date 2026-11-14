---
title: Running an Express server in a Docker container
description: Write a Dockerfile for a small Express app, build the image, and run it with the port mapped to your machine.
alt: my first blog post
tags: ["js","introToJs", "node", "express"]
layout: '@/templates/BasePost.astro'
pubDate: Monday, 15 Feb 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/2269624161_forest.png'
---

See my previous post on [Getting started with nodejs and express](https://friendlyuser.github.io/posts/tech/js/getting_started_with_node_and_express/) for the Express app itself. This post packages that app into a Docker image.

A Docker container bundles an application with its runtime, libraries and dependencies, and runs it as an isolated process on the host. The practical benefit for a Node app is that the Node version and installed packages are fixed in the image, so the server behaves the same on your laptop, in CI and in production. Containers share the host's kernel instead of booting a full guest OS like a virtual machine, so they start quickly and use less memory.

## The Dockerfile

Put this `Dockerfile` in the project root, next to `package.json`:

```dockerfile
# Node.js 26 is an LTS release; the alpine variant keeps the image small
FROM node:26-alpine

# Set the working directory (created if it doesn't exist)
WORKDIR /usr/src/app

# Copy only the dependency manifests first so this layer is cached
COPY package*.json ./

# Install exactly what's in package-lock.json, without dev dependencies
RUN npm ci --omit=dev

# Copy the application source code
COPY . .

# Document the port the server listens on
EXPOSE 3000

# Start the Express server
CMD ["npm", "start"]
```

Copying `package*.json` and installing before copying the rest of the source means Docker can reuse the `npm ci` layer when you only change application code, which makes rebuilds much faster. `npm ci` requires a `package-lock.json`; if you don't have one, run `npm install` locally first to create it.

`EXPOSE` doesn't publish anything by itself. It documents the port; you still map it with `-p` when you run the container.

Add a `.dockerignore` so your local `node_modules` (which may contain binaries built for a different OS) isn't copied over the one installed in the image:

```text
node_modules
npm-debug.log
.git
```

The project should look like this:

```text
my-express-app/
├── .dockerignore
├── Dockerfile
├── app.js
├── package.json
└── package-lock.json
```

`package.json` needs a `start` script, for example `"start": "node app.js"`, and the app should listen on port 3000. Call `app.listen(3000)` without a host argument (or with `0.0.0.0`). If the server binds to `127.0.0.1`, it is only reachable from inside the container.

## Build and run

Build the image from the directory containing the `Dockerfile`:

```bash
docker build -t my-express-app .
```

Then run it, mapping port 3000 on your machine to port 3000 in the container:

```bash
docker run -p 3000:3000 my-express-app
```

The server is now at http://localhost:3000. Add `-d` to run it in the background, and stop it with `docker stop <container-id>` (`docker ps` lists running containers). `Ctrl+C` may not stop it: the process running as PID 1 in a container ignores `SIGINT` unless it installs a handler, so either handle the signal in your app or add `--init` to `docker run`.

## References

This content came from a book I generated using chatGPT and a lot of editing.

View on the source material see amazon https://www.amazon.com/dp/B0BSL14M71

For a free copy, please view https://friendlyuser.github.io/assets/pdfs/introToJs.pdf

- [Docker's Node.js language guide](https://docs.docker.com/guides/nodejs/)
- [Official Node.js image on Docker Hub](https://hub.docker.com/_/node)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
