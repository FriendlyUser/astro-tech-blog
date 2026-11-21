---
title: "A TypeScript monorepo with pnpm workspaces and project references"
description: "Set up a TypeScript monorepo with pnpm workspaces: workspace: and catalog: dependencies, --filter selectors, a shared tsconfig, and incremental builds with tsc -b."
tags: ["pnpm", "TypeScript", "Monorepo", "Node.js", "Workspaces"]
pubDate: "2026-12-27T16:00:00.000Z"
imgSrc: "/imgs/2026/pnpm_workspaces_monorepo.webp"
imgAlt: "A dependency graph of workspace packages, with a CLI package pointing at a core package and a shared catalog of versions underneath"
---

A monorepo keeps several packages in one repository: a library and the CLI that uses it, or a shared types package plus a few services. pnpm's workspace support links those packages to each other locally, installs everything with one command, and runs scripts across all or some of them. TypeScript's project references are the matching piece on the compiler side: each package compiles on its own, and `tsc -b` builds them in dependency order and skips the ones that haven't changed.

This post sets up a small two-package monorepo from scratch and covers the parts you use every day: `pnpm-workspace.yaml`, the `workspace:` and `catalog:` protocols, `--filter`, a shared tsconfig, and `tsc -b`. Everything here was run with pnpm 12.22, TypeScript 7.0 and Node 24.

## The layout

```text
acme/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  tsconfig.json
  packages/
    core/
      package.json
      tsconfig.json
      src/index.ts
      src/index.test.ts
    cli/
      package.json
      tsconfig.json
      src/main.ts
```

`@acme/core` is a library. `@acme/cli` is a command-line tool that depends on it and on one package from npm.

## pnpm-workspace.yaml

The workspace file at the root marks the directory as a workspace and lists where packages live:

```yaml
packages:
  - "packages/*"

catalog:
  typescript: ^7.0.2
  "@types/node": ^24.10.0
  picocolors: ^1.1.1
```

`packages` takes globs, so `"apps/*"` or `"tools/**"` work too. Every directory matched that has a `package.json` becomes a workspace project.

The `catalog` section is covered below. Since pnpm 11, this file is also where pnpm settings go (`nodeLinker`, `hoistPattern` and so on). `.npmrc` is now read only for registry and auth settings, so if you are following an older guide that puts settings in `.npmrc`, move them here.

The root `package.json` is private and holds the tools used across the repo:

```json
{
  "name": "acme-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -b",
    "clean": "tsc -b --clean"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:"
  }
}
```

## Linking packages with workspace:

The CLI depends on the core library through the `workspace:` protocol:

```json
{
  "name": "@acme/cli",
  "version": "0.3.0",
  "type": "module",
  "bin": { "acme": "./dist/main.js" },
  "files": ["dist"],
  "scripts": {
    "build": "tsc -b",
    "start": "node dist/main.js"
  },
  "dependencies": {
    "@acme/core": "workspace:^",
    "picocolors": "catalog:"
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:"
  }
}
```

`workspace:^` means "the `@acme/core` in this workspace, never one from the registry". After `pnpm install`, `packages/cli/node_modules/@acme/core` is a symlink to `packages/core`, so changes to core are visible to the CLI immediately, without publishing or `npm link`. If the workspace has no package with that name, the install fails instead of quietly downloading something from npm with the same name.

The part after `workspace:` decides what gets written when the package is published:

| In package.json | Published as (core at 1.2.0) |
|---|---|
| `workspace:*` | `1.2.0` |
| `workspace:^` | `^1.2.0` |
| `workspace:~` | `~1.2.0` |
| `workspace:^1.0.0` | `^1.0.0` |

I checked this with `pnpm pack` in `packages/cli`: the `package.json` inside the tarball has `"@acme/core": "^1.2.0"`. Use `^` for libraries that other people install, so their package manager can dedupe compatible versions.

To add a workspace dependency from the command line, use `--workspace`:

```bash
pnpm --filter @acme/cli add @acme/core --workspace
```

## The core package

```json
{
  "name": "@acme/core",
  "version": "1.2.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "files": ["dist", "!dist/**/*.test.*"],
  "scripts": {
    "build": "tsc -b",
    "test": "node --test \"dist/**/*.test.js\""
  },
  "devDependencies": {
    "typescript": "catalog:",
    "@types/node": "catalog:"
  }
}
```

```ts
// packages/core/src/index.ts
export interface Task {
  id: number;
  title: string;
  done: boolean;
}

export function summarize(tasks: Task[]): string {
  const done = tasks.filter((t) => t.done).length;
  return `${done}/${tasks.length} done`;
}
```

```ts
// packages/core/src/index.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "./index.js";

test("summarize counts finished tasks", () => {
  assert.equal(summarize([{ id: 1, title: "a", done: true }, { id: 2, title: "b", done: false }]), "1/2 done");
});
```

The CLI (`packages/cli/src/main.ts`) imports it by package name, exactly as an outside user would:

```ts
#!/usr/bin/env node
import pc from "picocolors";
import { summarize, type Task } from "@acme/core";

const tasks: Task[] = [
  { id: 1, title: "Write the release notes", done: true },
  { id: 2, title: "Tag the release", done: false },
];

console.log(pc.bold("acme"), summarize(tasks));
```

Importing by name rather than by relative path (`../../core/src`) matters. It goes through core's `exports` map, so the monorepo tests the same entry points your users get.

## Shared versions with catalogs

Without catalogs, every package repeats `"typescript": "^7.0.2"`, and sooner or later one of them says `^6.0.0`. A catalog defines each version once in `pnpm-workspace.yaml`, and packages refer to it with `catalog:`:

```json
"devDependencies": {
  "typescript": "catalog:",
  "@types/node": "catalog:"
}
```

Upgrading TypeScript across the repo is now a one-line change in the workspace file followed by `pnpm install`. The lockfile records both the catalog specifier and the resolved version:

```yaml
catalogs:
  default:
    typescript:
      specifier: ^7.0.2
      version: 7.0.2
```

When you publish, `catalog:` is replaced with the real range, the same as `workspace:` (the packed CLI has `"picocolors": "^1.1.1"`).

For the odd package that has to stay on an older major, define a named catalog and reference it by name:

```yaml
catalogs:
  legacy:
    typescript: ^6.0.3
```

```json
"devDependencies": { "typescript": "catalog:legacy" }
```

`pnpm add --save-catalog <pkg>` adds a dependency and writes `catalog:` for it.

## Running scripts across packages

`-r` (recursive) runs a command in every workspace project that has the script, in dependency order: a package's workspace dependencies run first.

```bash
pnpm -r run build      # every package with a build script
pnpm -r test           # every package with a test script
```

`--filter` (short form `-F`) narrows the set. The selectors are worth learning, because they are what makes a big monorepo usable:

| Command | Runs in |
|---|---|
| `pnpm --filter @acme/cli build` | just the CLI |
| `pnpm --filter "@acme/cli..." build` | the CLI and everything it depends on |
| `pnpm --filter "...@acme/core" build` | core and everything that depends on it |
| `pnpm --filter "./packages/core" test` | the package in that directory |
| `pnpm --filter "@acme/*" build` | every package matching the name pattern |
| `pnpm --filter "...[origin/main]" test` | packages changed since `origin/main`, plus their dependents |

The trailing `...` means "and its dependencies", a leading `...` means "and its dependents". The last form is the one for CI: on a pull request, test only what the change could have broken.

`pnpm --filter <pkg> exec <cmd>` runs an arbitrary command in each selected package's directory, and `pnpm --filter <pkg> add <dep>` installs a dependency into one package without changing directory.

## A shared tsconfig

Put the common compiler options in one file at the root:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022"],
    "module": "nodenext",
    "strict": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node"]
  }
}
```

Each package's `tsconfig.json` extends it and sets only what is specific to the package:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Paths such as `rootDir`, `outDir` and `include` are resolved relative to the config file that contains them, which is why they belong in the package's own config and not in the base.

If several repositories should share the same base, publish it as a package (say `@acme/tsconfig` with a `base.json`) and use `"extends": "@acme/tsconfig/base.json"`. Inside one repo, a root file is simpler.

## Project references and tsc -b

`composite: true` in the base config turns each package into a TypeScript project that can be referenced. The CLI's config declares that it needs core:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src"],
  "references": [{ "path": "../core" }]
}
```

And a root `tsconfig.json` lists every project and compiles nothing itself:

```json
{
  "files": [],
  "references": [
    { "path": "packages/core" },
    { "path": "packages/cli" }
  ]
}
```

Now `pnpm build` (which runs `tsc -b` at the root) builds core first, then the CLI, and writes a `tsconfig.tsbuildinfo` per package recording what it compiled. Run it again and nothing happens. Change a file in core and run `tsc -b --verbose` to see the decisions:

```text
Project 'packages/core/tsconfig.json' is out of date because output 'packages/core/tsconfig.tsbuildinfo' is older than input 'packages/core/src/index.ts'
Building project 'packages/core/tsconfig.json'...
Project 'packages/cli/tsconfig.json' is up to date with .d.ts files from its dependencies
```

The change was inside a function body, so core's declaration files didn't change, and TypeScript skipped type-checking the CLI again. In a repo with dozens of packages, that is the difference between a one-second and a one-minute rebuild.

Then run the CLI and the tests:

```bash
pnpm build
pnpm --filter @acme/cli start
pnpm -r test
```

```text
acme 1/2 done
✔ summarize counts finished tasks (0.5881ms)
```

### Why the reference is needed

The CLI resolves `@acme/core` through the symlink to `packages/core`, then through its `exports` map to `dist/index.d.ts`. That file only exists after core is built. Running plain `tsc -p packages/cli` on a clean checkout fails with `Cannot find module '@acme/core' or its corresponding type declarations`. With the reference, `tsc -b` knows to build core first.

pnpm and TypeScript each have a dependency graph here: pnpm's comes from `package.json`, TypeScript's from `references`. They should match. If the CLI imports a package that isn't in its `references`, the build only works when that package happens to be built already.

## Gotchas

- **`tsc -b --noEmit` doesn't work with composite projects.** TypeScript stops with error TS6310 ("Referenced project ... may not disable emit"). Use `tsc -b` as your type-check step; the incremental build makes it cheap.
- **Ignore build info.** Add `*.tsbuildinfo` and `dist/` to `.gitignore`. A stale `.tsbuildinfo` without its `dist` makes `tsc -b` think a project is up to date; `pnpm clean` (`tsc -b --clean`) fixes that.
- **Keep tests out of the tarball.** The core package compiles its test file into `dist`, so its `files` list excludes `dist/**/*.test.*`. Run `pnpm pack` and read the file list before the first publish.
- **New pnpm defaults.** pnpm 11 and later require Node 22 or newer, don't run dependency build scripts unless they are allowed in `allowBuilds`, and by default won't install a version published less than a day ago (`minimumReleaseAge`). If an install refuses a package you just released, that's why.
- **Pin the package manager.** Add `"packageManager": "pnpm@12.22.0"` (or your version) to the root `package.json`, so everyone and every CI job resolves the lockfile with the same pnpm.

## Further reading

- [pnpm: Workspaces](https://pnpm.io/workspaces)
- [pnpm: Catalogs](https://pnpm.io/catalogs)
- [pnpm: Filtering](https://pnpm.io/filtering)
- [pnpm: Settings in pnpm-workspace.yaml](https://pnpm.io/settings)
- [TypeScript: Project references](https://www.typescriptlang.org/docs/handbook/project-references.html)
