---
title: How I built out my latex diagrams project
description: How I build out the latex diagrams project
tags: ["latex", "bash"]
pubDate: Saturday, 29 October 2022 13:00:00 GMT
layout: '@/templates/BasePost.astro'
imgSrc: '/assets/images/image-post7.jpeg'
---

The latex diagrams are composed of two projects, one that holds all the tex code and a workflow to build them all and another static site generation for client-side facing (and ad revenue generation). The following circleCi yaml file is used to build the diagrams and push them to the static site generation project.

```yaml
version: 2
jobs:
  latex:
    docker:
      - image: grandfleet/dolwarp:v0.70
    working_directory: ~/latex
    # Make pdf documents with tex
    steps:
      - run: apt-get update && apt-get install xpdf imagemagick -y
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
          root: .
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

From there I use my custom docker image hosted on github packages (see)[https://friendlyuser.github.io/posts/docker_hub_to_github_packages/] for more details on how to do this. The docker image is a custom image that has latex installed and a few other things.

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

So essentially the yaml file above, builds out latex diagrams, and in another job creates a static generated site with saber and then uploads them. A lot of code is there, but that is the gist.

My scripts automatically generate images in a readme.md file and repushes to the repo.

Although, this repo is my most popular and has 100+ stars, I have a few other repos that I use this same method to generate static sites.

Overall, if you want to make an open source project, do not expect it to get popular unless you are already a top-tier programmer or are publishing something people want or need.


To view the full latex diagrams projects, please view grandfleet.eu.org.

