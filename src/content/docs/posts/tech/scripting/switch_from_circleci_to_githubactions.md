---
tags: ['latex', 'github actions', 'circleci', "ci"]
title: Moving my LaTeX diagrams build from CircleCI to GitHub Actions
description: "How I replaced two chained CircleCI pipelines that compiled LaTeX diagrams and deployed a Saber docs site with a single GitHub Actions workflow."
pubDate: Sun, 19 Feb 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
projects: ['LatexDiagrams']
imgSrc: "/imgs/2023/1924742632.webp"
---

:::caution
Some tools in this post are no longer maintained. [Saber](https://github.com/saberland/saber), the static site generator the docs site used, has been archived, and CircleCI's legacy `circleci/node` images were replaced by `cimg/node`. The GitHub Actions workflow below has been updated to current action versions: GitHub retired v1–v3 of `actions/upload-artifact` and `actions/download-artifact`, so the original `@v1` steps no longer run.
:::

For my [LatexDiagrams](https://github.com/FriendlyUser/LatexDiagrams) project I moved continuous integration from CircleCI to GitHub Actions. The build compiles a set of TeX diagrams to PDF and PNG, regenerates the README, and publishes the results to a docs site built with Saber in a second repository, [dli-vue-docs](https://github.com/FriendlyUser/dli-vue-docs).

On CircleCI this took two pipelines in two repositories, with one triggering the other. GitHub Actions let me do it in a single workflow in the LatexDiagrams repository.

## The CircleCI setup

### LatexDiagrams: compile the TeX and trigger the docs build

```yaml
version: 2
jobs:
  latex:
    docker:
      - image: grandfleet/dolwarp:v0.70
    working_directory: ~/latex
    # Make pdf documents with tex
    steps:
      - run: apt-get update && apt-get install xpdf imagemagick git -y
      - checkout
      - run: chmod +x ./compile_tex.sh && ./compile_tex.sh -p 2 -l 1 -r 1 -o ReadMe.md
      - persist_to_workspace:
          root: .
          paths:
            - BlogDiagrams/*.pdf
            - ControlSystems/*.pdf
            - DSP/*.pdf
            - DVP/*.pdf
            - ElectroMag/*.pdf
            - EngineeringSoftwareDesign/*.pdf
            - PCC/*.pdf
            - ReportDiagrams/*.pdf
      - store_artifacts:
          path: .

  # think about restricting to master, but whatever, I don't update that much
  trigger:
    docker:
      - image: node:latest
    working_directory: ~/docs
    steps:
      - run:
          name: "Trigger saber npx build"
          command: |
            curl -X POST https://circleci.com/api/v2/project/gh/FriendlyUser/dli-vue-docs/pipeline?circle_token=${CIRCLE_API_TOKEN} \
            -H 'Circle-Token: ${CIRCLE_API_TOKEN}' \
            -H 'Content-Type: application/json' \
            -H 'Accept: application/json' \
            -H 'x-attribution-login: Circle CI' \
            -H 'x-attribution-actor-id: TFT'

workflows:
  version: 2
  build_and_test:
    jobs:
      - latex
      - trigger:
          requires:
            - latex
          filters:
            branches:
              only:
                - master
```

The `latex` job runs in the `grandfleet/dolwarp` Docker image, which has a TeX distribution installed, and runs `compile_tex.sh` to build the PDFs and regenerate `ReadMe.md`. On `master`, the `trigger` job then calls the CircleCI API to start a pipeline in `dli-vue-docs`.

If you copy the `curl` call, note that the `Circle-Token` header is in single quotes, so the shell sends the literal text `${CIRCLE_API_TOKEN}` rather than the token. Use double quotes so the variable expands.

### dli-vue-docs: rebuild the diagrams and deploy the site

```yaml
version: 2
jobs:
  latex:
    docker:
      - image: grandfleet/dolwarp:v0.70
    working_directory: ~/latex
    # Make pdf documents with tex
    steps:
      - run: apt-get update && apt-get install xpdf imagemagick git -y
      - run: yes YES | git clone https://github.com/FriendlyUser/LatexDiagrams.git || true
      - run:
          name: Build Tex
          command: |
            cd LatexDiagrams
            chmod +x ./compile_tex.sh && ./compile_tex.sh -p 2 -l 1 -r 1 -o ReadMe.md || true
            chmod +x ./CompileSaberMd.sh && ./CompileSaberMd.sh
            pwd
      - store_artifacts:
          path: /data/latex/LatexDiagrams/saber
      - persist_to_workspace:
          root: .
          paths:
          - LatexDiagrams/saber
          - saber
          - LatexDiagrams

  saber:
    docker:
      - image: circleci/node:14.17 # ...with this image as the primary container; this is where all `steps` will run
    environment:
      - TARGET_BRANCH: gh-pages
      - USERNAME: FriendlyUser
      - REPO: dli-vue-docs
    steps:
      - checkout
      - attach_workspace:
          at: .
      - run: ls && npm update && npm install && npm update || true
      # move build files in saber pages and go back to the root folder
      - run: cd LatexDiagrams/saber && ls && mv static ../../ && cp -r pages ../../ && cd ../../
      - run: ls
      - run:
          name: saber build
          command: |
            ls
            npm run update || true && npm run build
            # sed -i '36i script: [{src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js", "data-ad-client": "ca-pub-2479144310234386", async: true }]' saber-browser.js
            # npx saber build
            cp assets/ads.txt public || true
      - run:
          name: deployment
          command: |
            git config --global user.email "lidavid@uvic.ca"
            git config --global user.name "$USERNAME"
            git clone $CIRCLE_REPOSITORY_URL out
            cd out
            git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
            git rm -rf .
            echo "" > .nojekyl
            cd ../
            ls
            cp -a public/ out/
            mkdir -p out/.circleci && cp -a .circleci/. out/.circleci/.
            cd out
            cp -r public/ . || true
            git remote rm origin
            git remote add origin https://$USERNAME:$GITHUB_TOKEN@github.com/$USERNAME/$REPO.git
            echo "" > .nojekyll || true
            git add -A
            git commit -m "Automated deployment: ${CIRCLE_SHA1} [ci skip]" --allow-empty
            git push origin $TARGET_BRANCH
            # sudo npm install -g surge
            # rm -rf .git
            # echo  dli-vue-docs.surge.sh > CNAME
            # echo | surge . dli-vue-docs.surge.sh

workflows:
  version: 2
  build_and_test:
    jobs:
      - latex:
          filters:
            branches:
              ignore:
                - gh-pages
      - saber:
          requires:
            - latex
```

The triggered pipeline clones LatexDiagrams and compiles the diagrams again, runs `CompileSaberMd.sh` to turn them into Saber pages, passes everything to the `saber` job through the workspace, builds the site and pushes the output to the `gh-pages` branch by hand with a personal access token.

So every change compiled the TeX twice, the deployment was a page of hand-written Git commands, and the build was split across two repositories and two config files.

## The GitHub Actions workflow

The replacement lives in LatexDiagrams and does everything in two jobs: `buildtex` compiles the TeX in the same Docker image, and `buildfiles` commits the regenerated README and images, builds the Saber site from a checkout of `dli-vue-docs`, and deploys it to GitHub Pages.

```yaml
name: Full Build
on:
  push:
    branches:
      - master

permissions:
  contents: write

jobs:
  buildtex:
    runs-on: ubuntu-latest
    container:
      image: grandfleet/dolwarp:v0.70
    steps:
      - name: Checkout code
        uses: actions/checkout@v7
      - name: Install dependencies
        run: |
          apt-get update && apt-get install xpdf imagemagick git -y
      - name: Compile TeX
        run: |
          chmod +x ./compile_tex.sh && ./compile_tex.sh
          ./compile_tex.sh -p 2 -l 1 -r 1 -o ReadMe.md
      - name: Persist Tex Artifacts
        uses: actions/upload-artifact@v7
        with:
          name: latex
          path: .

  buildfiles:
    needs: buildtex
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v7
      - name: Download Latex Artifacts
        uses: actions/download-artifact@v8
        with:
          name: latex
          path: .
      - name: Commit files
        run: |
          git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git add ReadMe.md *.png || true
          git commit -m "Update images and readme" || true
      - name: Push changes
        uses: ad-m/github-push-action@v1.3.0
      - name: Compile Saber docs
        run: chmod +x ./CompileSaberMd.sh && ./CompileSaberMd.sh
      - name: Setup Node
        uses: actions/setup-node@v7
        with:
          node-version: 14.x
      - name: Checkout dli-vue-docs
        uses: actions/checkout@v7
        with:
          repository: FriendlyUser/dli-vue-docs
          path: dli-vue-docs
      - name: Move saber folder
        run: |
          mv saber/pages/* dli-vue-docs/pages/
          ls saber/static/software || true
          mv saber/static dli-vue-docs || true
          mv saber dli-vue-docs || true
      - name: Persist artifacts
        uses: actions/upload-artifact@v7
        with:
          name: saber
          path: dli-vue-docs
      - name: Install docs dependencies
        run: |
          cd dli-vue-docs
          npm install
      - name: Build app
        run: |
          cd dli-vue-docs
          npm run build
          cp assets/ads.txt public || true
          mv public ../
      - name: Deploy to GitHub Pages
        uses: crazy-max/ghaction-github-pages@v5
        with:
          target_branch: gh-pages
          build_dir: public
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Persist artifacts
        uses: actions/upload-artifact@v7
        with:
          name: output
          path: public
```

Compared with the CircleCI version:

- The TeX is compiled once. The `buildtex` output reaches the second job as an artifact (`upload-artifact` / `download-artifact`) instead of a CircleCI workspace.
- No cross-repository trigger: the workflow checks out `dli-vue-docs` with `actions/checkout` and builds the site in the same run.
- No personal access token. The generated README and images are pushed with [`ad-m/github-push-action`](https://github.com/ad-m/github-push-action) and the site is deployed with [`crazy-max/ghaction-github-pages`](https://github.com/crazy-max/ghaction-github-pages), both using the built-in `GITHUB_TOKEN`. That token needs `contents: write`, which the `permissions` block grants if the repository's default token permissions are read-only. Pushes made with `GITHUB_TOKEN` don't start new workflow runs, so committing the README doesn't loop.
- Saber needs an old Node.js, so the workflow pins `node-version: 14.x`. Node 14 is end-of-life; moving the docs to a maintained generator would remove that pin.

If the repository is new, a simpler way to publish is GitHub's own Pages deployment ([`actions/upload-pages-artifact`](https://github.com/actions/upload-pages-artifact) and [`actions/deploy-pages`](https://github.com/actions/deploy-pages)), which deploys without a `gh-pages` branch.

## References

- https://github.com/FriendlyUser/dli-vue-docs/blob/master/.circleci/config.yml
- https://github.com/FriendlyUser/dolwarp
- https://github.com/FriendlyUser/LatexDiagrams
