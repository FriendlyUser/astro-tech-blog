---
description: 'A tour of the deno CLI: running TypeScript with permission flags, then formatting, linting, type-checking, bundling and compiling a small script.'
imgSrc: /imgs/2023/1096284488.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-02-08T15:32:23.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript"]
title: 'The deno CLI: run, fmt, lint, check, bundle and compile'
---

:::note[Updated in November 2026]
This post was revised for Deno 2. The commands below were run with Deno 2.9. The main changes since the first version: `deno install` now installs project dependencies (use `deno install -g` for a global script), and `deno bundle` was removed in Deno 2.0 and came back, rebuilt on esbuild, in Deno 2.4. It still prints an "experimental" warning.
:::

Deno is a JavaScript and TypeScript runtime built on V8 and written in Rust, started by Ryan Dahl, who also created Node.js. Almost everything you do with it goes through one binary, `deno`: it runs code, but it also formats, lints, type-checks, tests, bundles and compiles it, so a small project needs no extra tooling.

## Install and check the version

Follow the [installation guide](https://docs.deno.com/runtime/getting_started/installation/) for your platform, then:

```bash
deno --version
```

## The commands you'll use most

| Command | What it does |
| --- | --- |
| `deno run` | Run a JS or TS file (or a URL, `jsr:` or `npm:` specifier) with the permissions you grant |
| `deno task` | Run a task defined in `deno.json` or a script in `package.json` |
| `deno add` / `deno install` | Add dependencies from JSR or npm; `deno install` with no arguments installs everything in the config |
| `deno fmt` | Format JS and TS, plus Markdown, JSON and Jupyter notebooks |
| `deno lint` | Lint for likely bugs and style problems |
| `deno check` | Type-check without running |
| `deno test` | Run tests |
| `deno bundle` | Bundle a program and its dependencies into one JS file (experimental) |
| `deno compile` | Build a self-contained executable that includes the runtime |
| `deno install -g` | Install a script as a command on your `PATH` |

`deno --help` lists the rest, and `deno <command> --help` shows each command's flags. The [CLI reference](https://docs.deno.com/runtime/reference/cli/) has the same information online.

## A small worked example

Create `hello.ts`. It fetches a repository from the GitHub API and prints its star count:

```typescript
interface Repo {
  full_name: string;
  stargazers_count: number;
}

async function fetchRepo(name: string): Promise<Repo> {
  const response = await fetch(`https://api.github.com/repos/${name}`);
  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status}`);
  }
  return await response.json();
}

const repo = await fetchRepo("denoland/deno");
console.log(`${repo.full_name} has ${repo.stargazers_count} stars`);
```

### Run it with permissions

```bash
deno run hello.ts
```

Deno doesn't give scripts network, file or environment access unless you allow it. In an interactive terminal it prompts you to allow `api.github.com`; in CI or any non-interactive shell the script fails with a `NotCapable` error saying it requires net access. Grant exactly the host it needs:

```bash
deno run --allow-net=api.github.com hello.ts
```

Scoping the flag to a host (or a path, for `--allow-read`) is the point: a dependency that tries to reach somewhere else gets denied. See [Security and permissions](https://docs.deno.com/runtime/fundamentals/security/) for the full list of flags.

### Format, lint and type-check

```bash
deno fmt hello.ts      # rewrite the file in Deno's style
deno fmt --check       # fail instead of rewriting; useful in CI
deno lint hello.ts
deno check hello.ts
```

`deno run` doesn't type-check by default, so add `deno check` (or `deno test`, which does check) to CI. These commands read their settings from the `fmt`, `lint` and `compilerOptions` sections of `deno.json` if you have one.

### Bundle or compile

To produce a single JavaScript file:

```bash
deno bundle hello.ts -o hello.bundle.js
```

The output is plain JavaScript with the types stripped and dependencies inlined, so it runs with `deno run --allow-net=api.github.com hello.bundle.js` or in another runtime that supports top-level `await`.

If you want to ship a program to machines that don't have Deno installed, `deno compile` is usually the better fit. Permission flags are baked in at compile time:

```bash
deno compile --allow-net=api.github.com -o hello hello.ts
./hello
```

The executable includes the Deno runtime, so it's large even for a script this small: about 80 MB on Windows with Deno 2.9. Use `--target` to build for another OS from the same machine.

## Further reading

- [Deno CLI reference](https://docs.deno.com/runtime/reference/cli/)
- [`deno bundle`](https://docs.deno.com/runtime/reference/cli/bundle/) and [`deno compile`](https://docs.deno.com/runtime/reference/cli/compile/)
- [Deno 2.4 release notes](https://deno.com/blog/v2.4), which cover the return of `deno bundle`
