---
title: "Caching npm dependencies in GitHub Actions with actions/cache"
description: "How actions/cache restores and saves node_modules between GitHub Actions runs, the cache-key pitfalls, and how I used it in this Astro blog's build workflow."
alt: github action to detect ip addresses
tags: ["typescript", "github actions", "astro"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 28 July 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/dalle-2023-01-07-13-47-20-spaceship-paper.webp'
---

:::caution
This post originally used `actions/checkout@v2`, `actions/cache@v2`, `actions/setup-node@v2` and `JamesIves/github-pages-deploy-action@releases/v3`. `actions/cache@v2` stopped working when GitHub retired its legacy cache service in 2025, and the other versions target Node.js runtimes GitHub has deprecated for actions. The workflows below use the current major versions: `checkout@v7`, `cache@v6`, `setup-node@v7` and `github-pages-deploy-action@v4`.
:::

[`actions/cache`](https://github.com/actions/cache) saves a directory at the end of a job and restores it at the start of later runs, keyed on a string you choose. For a Node project, that means you don't download every package from the npm registry on every build.

## A minimal example

This workflow caches `node_modules` between builds:

```yaml
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
      - uses: actions/cache@v6
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      - run: npm install
      - run: npm test
```

How the cache step behaves:

1. **Restore.** It looks for a cache whose key exactly matches `Linux-node-<hash of package-lock.json>`. If there's none, it falls back to the most recent cache whose key starts with a `restore-keys` prefix (`Linux-node-`), so you still get a mostly up-to-date `node_modules` after the lockfile changes.
2. **Your steps run.** `npm install` only fetches what's missing or changed.
3. **Save.** In a post-job step, if there was no exact key match and the job succeeded, the action saves the directory under the new key. Caches are immutable: an existing key is never overwritten, which is why the lockfile hash belongs in the key.

## Caching `node_modules` vs. the npm cache

The `actions/cache` docs recommend **not** caching `node_modules`: it can break across Node versions (native modules are compiled for a specific one), and it doesn't work with `npm ci`, which deletes `node_modules` before installing. If you do cache it, at least put the Node version in the key.

The simpler option is to let `setup-node` cache npm's download cache (`~/.npm`) for you, keyed on the lockfile:

```yaml
      - uses: actions/setup-node@v7
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
```

`npm ci` still has to unpack every package into `node_modules`, but the downloads come from the cache rather than the registry, and you get a clean, lockfile-exact install every time.

## The workflow for this blog

I added this logic to my personal blog's GitHub Action to cache `node_modules` between builds, to save time on the `npm install` step and reduce the number of requests to the npm registry. Updated to current action versions, plus one line that clears Astro's content cache (explained under Gotchas), the workflow looks like this:

```yaml
name: Build For Github
# Don't want to burn my private minutes at this point
on:
  push:
    branches:
      - master
      - main
      - feature/*
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '30 21 * * 1-6/3'

jobs:
  make_website:
    name: Generate Website
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/cache@v6
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - uses: actions/setup-node@v7
        name: Update node
        with:
          node-version: lts/*

      - name: install astro
        run: npm install --force

      - name: build
        run: |
          # The cached node_modules also holds Astro's content cache (node_modules/.astro).
          # Remove it so every build renders posts from scratch.
          rm -rf node_modules/.astro
          npm run build
          echo > dist/.nojekyll

      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          token: ${{ secrets.MAIN_REPO_TOKEN }}
          branch: gh-pages
          folder: dist
```

What each part does:

- **Triggers.** Pushes to `master`, `main` or any `feature/*` branch, plus a schedule. The cron expression `30 21 * * 1-6/3` means 21:30 UTC on days of the week 1 through 6 in steps of 3, which is **Monday and Thursday**. Scheduled workflows only run on the repository's default branch.
- **Cache.** Restores and saves `node_modules` as described above.
- **`setup-node`.** Installs the current Node.js LTS release.
- **`npm install --force`.** `--force` makes npm fetch packages from the registry even when a local copy exists, and with npm 7+ also lets the install proceed despite peer-dependency conflicts. The first effect partly defeats the cache, so drop `--force` if your dependencies resolve cleanly without it.
- **Build.** `npm run build` writes the static site to `dist`, and the empty `.nojekyll` file stops GitHub Pages from running the output through Jekyll, which would drop files and folders starting with `_` (such as Astro's `_astro` asset folder).
- **Deploy.** `JamesIves/github-pages-deploy-action` commits the contents of `dist` to the `gh-pages` branch. In v4 the inputs are lowercase (`token`, `branch`, `folder`); v3 used `GITHUB_TOKEN`, `BRANCH` and `FOLDER`. The `token` input is optional when deploying to the same repository, because the action falls back to the built-in `GITHUB_TOKEN`; you need a personal access token like `MAIN_REPO_TOKEN` only to push to a different repository.

## Gotchas

- **Stale build caches ride along.** Anything tools write inside `node_modules` (Astro's `.astro` content cache, Babel or webpack caches under `node_modules/.cache`) is restored with it. If a change to your build config doesn't seem to take effect in CI, that's the first place to look; that's what the `rm -rf node_modules/.astro` line above is for.
- **Caches are scoped by branch.** A run can restore caches created on its own branch or on the default branch, but not from sibling feature branches.
- **Unused caches are evicted.** GitHub removes caches that haven't been accessed in 7 days, and evicts the oldest ones when a repository exceeds its cache storage limit.

## Further reading

- [actions/cache](https://github.com/actions/cache) and its [examples for other languages](https://github.com/actions/cache/blob/main/examples.md)
- [actions/setup-node caching](https://github.com/actions/setup-node#caching-global-packages-data)
- [Caching dependencies to speed up workflows](https://docs.github.com/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
