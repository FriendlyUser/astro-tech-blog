---
description: How Deno's permission flags work and how to check, request, and revoke
  permissions at runtime with the built-in Deno.permissions API.
imgSrc: /imgs/2023/1047200128.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-05T01:45:04.000Z'
lastUpdated: 2026-11-14
tags: ['deno', 'typescript']
title: Checking, requesting, and revoking permissions in Deno
---

:::caution
An earlier version of this post imported a `Permissions` object from `https://deno.land/std/permissions/mod.ts`. That module never exported such an object: it exported `grant()` and `grantOrThrow()` helpers, and it has since been deprecated in favour of the built-in `Deno.permissions` API. The examples below use `Deno.permissions`, which needs no import.
:::

Deno runs code in a sandbox. By default a script can't read or write files, open network connections, read environment variables, or spawn subprocesses. You grant access with command-line flags, and you can inspect or change permissions from inside the program with `Deno.permissions`.

## Granting permissions with flags

Each permission has an `--allow-*` flag, and most can be scoped to specific resources:

```bash
deno run --allow-net=api.github.com --allow-read=./data --allow-env=API_KEY main.ts
```

A bare flag such as `--allow-read` grants the whole category. `--deny-*` flags override allows, so `--allow-read --deny-read=/etc` permits reading everything except `/etc`. `-A` / `--allow-all` disables the sandbox entirely. Treat `--allow-run` and `--allow-ffi` as nearly equivalent to `-A`, because a subprocess or native library isn't bound by Deno's checks.

If a permission is missing and Deno is running in an interactive terminal, it pauses and prompts you to allow it. Without a terminal, or with `--no-prompt`, the operation throws `Deno.errors.NotCapable`.

Modules in your static import graph (local files, `npm:`, `jsr:`, and remote URLs) load without any permission flag. Only dynamic `import()` calls with non-literal specifiers are checked at runtime.

## Querying permissions

`Deno.permissions.query()` reports the current state of a permission without prompting. Pass a descriptor with the permission `name` and, optionally, the specific resource:

```typescript
const status = await Deno.permissions.query({ name: "net", host: "api.github.com" });
console.log(status.state); // "granted", "denied", or "prompt"
```

The permission names are `read`, `write`, `net`, `env`, `sys`, `run`, and `ffi`. The resource field depends on the name: `path` for `read`, `write`, and `ffi`; `host` for `net`; `variable` for `env`; `command` for `run`; and `kind` for `sys`.

## Requesting permissions

`Deno.permissions.request()` prompts the user if the state is `"prompt"`, and returns the existing state otherwise. A common pattern is to ask once up front and exit with a clear message if access is refused, rather than failing halfway through:

```typescript
// main.ts
const desc: Deno.PermissionDescriptor = { name: "net", host: "api.github.com" };

let status = await Deno.permissions.query(desc);
if (status.state === "prompt") {
  status = await Deno.permissions.request(desc);
}

if (status.state !== "granted") {
  console.error("Network access to api.github.com is required.");
  Deno.exit(1);
}

const res = await fetch("https://api.github.com/repos/denoland/deno");
const repo = await res.json();
console.log(`${repo.full_name}: ${repo.stargazers_count} stars`);
```

Run it with `deno run main.ts` to see the prompt, or `deno run --allow-net=api.github.com main.ts` to skip it.

## Revoking permissions

`Deno.permissions.revoke()` drops a permission for the rest of the process. Use it to give up access you only needed during startup, such as reading a config file:

```typescript
const config = JSON.parse(await Deno.readTextFile("./config.json"));

const status = await Deno.permissions.revoke({ name: "read" });
console.log(status.state); // "prompt"

// From here on, reads are no longer pre-approved.
```

Revoking downgrades the permission to `"prompt"`, not `"denied"`. In an interactive terminal, a later read will prompt again. Run with `--no-prompt` if you want it to fail outright instead.

Each method also has a synchronous variant: `querySync()`, `requestSync()`, and `revokeSync()`.

## Gotchas

- `--allow-net` without a host list allows every host. Scope it in anything you run regularly.
- Permission prompts block on stdin, so a script that works when you run it by hand can hang or fail in CI. Pass explicit flags there.
- In Deno 2, permission failures throw `Deno.errors.NotCapable`. Code written for Deno 1 that catches `Deno.errors.PermissionDenied` won't catch them.

## Further reading

- [Security and permissions](https://docs.deno.com/runtime/fundamentals/security/)
- [`Deno.permissions` API reference](https://docs.deno.com/api/deno/~/Deno.Permissions)
