---
title: Implementing caching in github actions
description: Leveraging free apis to detect ip addresses
alt: github action to detect ip addresses
tags: ["typescript", "github actions", "astro"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 28 July 2023 13:00:00 GMT
imgSrc: '/imgs/2023/DALL·E 2023-01-07 13.47.20 - spaceship paper.png'
---

To use caching in a GitHub Actions workflow, you can use the cache action. Here is an example of a workflow that caches the node_modules directory between builds:


```yml
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/cache@v2
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-
      - run: npm install
      - run: npm test
```


This workflow is triggered by a push event and runs on the ubuntu-latest runner. It consists of four steps:

1. The actions/checkout@v2 action checks out the code from the repository.
2. The actions/cache@v2 action restores the node_modules directory from the cache, if it exists, or creates a new cache if it doesn't. The cache key is based on the operating system and the package-lock.json file.
3. The npm install command installs the dependencies for the project.
4. The npm test command runs the tests for the project.
If the node_modules directory is not in the cache, it will be installed during the npm install step and added to the cache. On subsequent builds, the node_modules directory will be restored from the cache, saving time on the npm install step.


I added this logic to my personal blog's github action to cache the node_modules directory between builds. This will save time on the npm install step and reduce the number of requests to the npm registry.

The full workflow is

```yml
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
      - uses: actions/checkout@v2
      - uses: actions/cache@v2
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-

      - uses: actions/setup-node@v2
        name: Update node
        with:
          node-version: '16'

      - name: install astro
        run: npm install --force

      - name: update config
        run: |
          npm run build
          echo > dist/.nojekyll 
      
      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@releases/v3
        with:
          GITHUB_TOKEN: ${{ secrets.MAIN_REPO_TOKEN }}
          BRANCH: gh-pages
          FOLDER: dist
```

This .github/workflows/build.yml file defines a workflow that is triggered by either a push event to the master, main, or feature/* branches, or by a schedule that runs every three weeks on weekdays at 21:30.

The workflow consists of a single job named make_website, which has several steps:

1. The actions/checkout@v2 action checks out the code from the repository.
2. The actions/cache@v2 action restores the node_modules directory from the cache, if it exists, or creates a new cache if it doesn't. The cache key is based on the operating system and the package-lock.json file.
3. The actions/setup-node@v2 action sets up Node.js on the runner.
4. The npm install --force command installs the dependencies for the project, even if the dependencies have not changed since the last build.
5. The npm run build command builds the project, and the echo > dist/.nojekyll command creates an empty .nojekyll file in the dist directory.
6. The JamesIves/github-pages-deploy-action@releases/v3 action deploys the built project to GitHub Pages, using the gh-pages branch as the target. The GITHUB_TOKEN secret is used to authenticate the action.
