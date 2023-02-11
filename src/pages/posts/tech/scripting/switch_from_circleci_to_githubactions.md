---
tags: ['latex', 'githubactions', 'circleci']
title: How I converted circleCi to github actions
description: For my latex diagrams project I converted the ci from circle to github actions.
pubDate: Sun, 19 Feb 2023
layout: "@/templates/BasePost.astro"
projects: ['LatexDiagrams']
imgSrc: "/imgs/2023/1924742632.png"
---
Continuous Integration (CI) is a software development practice that involves continuously integrating code changes into a single codebase repository, typically multiple times a day. The main goal of Continuous Integration is to catch and fix integration problems as early as possible in the development process, which helps to ensure that the code remains stable and that the software is always in a releasable state.

In practice, Continuous Integration is typically achieved through automated build and testing processes. Whenever code changes are committed to the repository, an automated build process is triggered which compiles the code, runs automated tests and checks the code for any syntax errors or other problems. If the build and tests are successful, the code changes are considered to be integrated and can be safely merged into the main branch of the codebase. If the build or tests fail, the development team is notified, and the code can be corrected before it's merged into the main branch.

Continuous Integration is an important aspect of Agile software development and is often used in combination with Continuous Deployment and Continuous Delivery to provide a fast, reliable, and efficient software delivery pipeline.


CircleCI is a cloud-based Continuous Integration and Continuous Deployment (CI/CD) platform that provides an automated process for building, testing, and deploying software applications. It helps teams to detect and fix integration problems as early as possible in the development process, allowing them to reduce the time-to-market and improve the overall quality of their applications.

CircleCI offers features such as parallel testing, custom environment variables, and a large library of pre-built integrations with popular tools and services like GitHub, AWS, and Google Cloud. CircleCI is also known for its easy-to-use interface and customizable workflows.

GitHub Actions is a similar service that is integrated with GitHub. It provides a platform for automating software workflows, including Continuous Integration, Continuous Deployment, and Continuous Delivery. GitHub Actions can be triggered by events like code commits or pull requests, and it provides a wide range of pre-built actions for tasks like building, testing, and deploying applications.

In comparison, both CircleCI and GitHub Actions offer similar functionality, but there are some differences. For example, CircleCI has a more robust and flexible environment, while GitHub Actions is tightly integrated with the GitHub ecosystem and provides native integration with other GitHub services like pull requests and issue tracking. Another difference is that CircleCI offers more resources for parallelism and concurrency, making it better suited for complex build and test processes.

Ultimately, the choice between CircleCI and GitHub Actions will depend on the specific needs of your team and the characteristics of your projects. Both are powerful tools for Continuous Integration and Continuous Deployment and can help teams to deliver high-quality software applications quickly and reliably.


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

This is a YAML configuration file for CircleCI, a Continuous Integration (CI) platform. The configuration file defines a workflow that consists of two jobs: "latex" and "trigger".

The "latex" job uses a Docker image "grandfleet/dolwarp:v0.70" as the environment for building, testing, and deploying code. The job performs several steps, including updating the system, installing necessary packages, checking out the code from the repository, and running the script "compile\_tex.sh". The script is used to compile TeX files into PDF documents. After the script execution, the artifacts (PDF documents) are persisted in the workspace and stored as artifacts.

The "trigger" job uses a Node.js environment and triggers another pipeline to run. It makes an HTTP POST request to CircleCI's API, passing an API token as an environment variable and several headers, to trigger the pipeline.

The workflow defined in this configuration file is called "build\_and\_test", which runs both "latex" and "trigger" jobs. The "trigger" job requires the successful completion of the "latex" job and is only triggered for the "master" branch.

In conclusion, this YAML configuration file defines a CircleCI workflow for building, testing, and deploying code changes, as well as triggering another pipeline for additional steps in the software development process.


Yes, triggering another workflow from a workflow in CircleCI is possible. To do this, you can make use of the CircleCI API and the "curl" command in your job steps to send an HTTP request to the API endpoint that triggers another workflow.

Here is an example of triggering another workflow from a workflow in CircleCI:


```yaml
yaml`version: 2
jobs:
 trigger\_workflow:
 docker:
 - image: node:latest
 working\_directory: ~/
 steps:
 - run:
 name: "Trigger another workflow"
 command: | 
 curl -X POST https://circleci.com/api/v2/project/gh/<OWNER>/<REPO>/pipeline \
 -H 'Circle-Token: ${CIRCLE\_API\_TOKEN}' \
 -H 'Content-Type: application/json' \
 -H 'Accept: application/json' \
 -d '{ "branch": "${CIRCLE\_BRANCH}" }'

workflows:
 version: 2
 build\_and\_test:
 jobs:
 - trigger\_workflow:
 filters:
 branches:
 only:
 - master
```
In this example, the "trigger\_workflow" job uses a Node.js environment and sends an HTTP POST request to the CircleCI API endpoint that triggers another workflow. The request includes the CircleCI API token as a header, and the branch name is passed as a data payload in the request body.

The workflow defined in this configuration file is called "build\_and\_test", which runs the "trigger\_workflow" job. The "trigger\_workflow" job is only triggered for the "master" branch.

Note that you need to replace the placeholders `<OWNER>` and `<REPO>` with the GitHub repository owner name and repository name, respectively. Also, the `CIRCLE_API_TOKEN` environment variable needs to be set in the CircleCI project's environment variables to provide the API token.


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

This YAML file defines a CircleCI configuration that builds a LaTeX document and a Vue.js-based static site. The file has two jobs, "latex" and "saber".

The "latex" job runs inside a Docker container based on the "grandfleet/dolwarp:v0.70" image. The steps of the job are:

* Install xpdf, imagemagick, and git.
* Clone the repository at "<https://github.com/FriendlyUser/LatexDiagrams.git>".
* Compile the LaTeX document using the "compile\_tex.sh" and "CompileSaberMd.sh" scripts.
* Store the artifacts in the "saber" directory.
* Persist the "LatexDiagrams/saber", "saber", and "LatexDiagrams" directories to the workspace.

The "saber" job runs inside a Docker container based on the "circleci/node:14.17" image. The steps of the job are:

* Check out the code.
* Attach the workspace created in the "latex" job.
* Update and install the npm packages.
* Copy the files from the "LatexDiagrams/saber" directory to the root directory.
* Build the static site using the "npm run build" command.
* Deploy the static site to the "gh-pages" branch on GitHub.

Finally, the file defines a workflow named "build\_and\_test", which runs the "latex" job first, and then the "saber" job, which requires the "latex" job to complete successfully. The "latex" job is ignored for branches named "gh-pages".


You can use GitHub Actions to trigger a deployment to GitHub Pages by setting up a workflow in your repository. The workflow will run whenever you push changes to the repository or when a specific event occurs.

Here's an example of a workflow that deploys a static website to GitHub Pages using the `actions/github-pages` action:


```yaml
yaml`name: Deploy to GitHub Pages

on:
 push:
 branches:
 - main

env:
 ACCESS\_TOKEN: ${{ secrets.ACCESS\_TOKEN }}

jobs:
 deploy:
 runs-on: ubuntu-latest

 steps:
 - name: Checkout code
 uses: actions/checkout@v2

 - name: Deploy to GitHub Pages
 uses: actions/github-pages@v3
 with:
 token: ${{ env.ACCESS\_TOKEN }}
 target-branch: gh-pages
```
In this example, the workflow will run whenever you push changes to the `main` branch of your repository. The workflow will check out your code and then use the `actions/github-pages` action to deploy the static website to the `gh-pages` branch of your repository.

You can store the GitHub access token in the repository secrets to prevent it from being leaked.

Note that this is just one way to set up a deployment to GitHub Pages using GitHub Actions. You can also use other actions or write your own custom deployment scripts if needed.


```yaml 
 ---
name: Full Build
on:
  push:
    branches:
      - master
jobs:
  buildtex:
    runs-on: ubuntu-latest
    container:
      image: docker://grandfleet/dolwarp:v0.70
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Install dependencies
        run: |
          apt-get update && apt-get install xpdf imagemagick git -y
      - name: Compile TeX
        run: |
          chmod +x ./compile_tex.sh && ./compile_tex.sh
          ./compile_tex.sh -p 2 -l 1 -r 1 -o ReadMe.md
      - name: Persist Tex Artifacts
        uses: actions/upload-artifact@v1
        with:
          id: latex
          path: .
          name: latex
  buildfiles:
    needs: buildtex
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Download Latex Artifacts
        uses: actions/download-artifact@v1
        with:
          name: latex
          path: .
      - name: Commit files
        run: >
          mkdir ~/.git

          git config --local user.email "41898282+github-actions[bot]@users.noreply.github.com"

          git config --local user.name "github-actions[bot]"

          git add ReadMe.md *.png || true

          git commit -m "Update images and readme" || true
      - name: Push changes
        uses: ad-m/github-push-action@master
      - name: Compile Saber docs
        run: chmod +x ./CompileSaberMd.sh && ./CompileSaberMd.sh
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 14.x
      - name: Checkout dli-vue-docs
        uses: actions/checkout@v2
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
        uses: actions/upload-artifact@v1
        with:
          path: dli-vue-docs
          name: saber
      - name: setup node
        run: |
          cd dli-vue-docs
          ls
          npm install
      - name: build app
        run: |
          rm -rf .git
          cd dli-vue-docs
          npm run build
          cp assets/ads.txt public || true
          rm -rf .git
          ls
          mv public ../
          cd ../
          ls 
      - uses: crazy-max/ghaction-github-pages@v3
        with:
          target_branch: gh-pages
          build_dir: public
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Persist artifacts
        uses: actions/upload-artifact@v1
        with:
          path: public
          name: output
 
 ```

The above Github Actions workflow does the following:

1. Triggers on a push event to the "master" branch.
2. In the "buildtex" job, the code is checked out and dependencies are installed.
3. Then, the TeX code is compiled using the "compile\_tex.sh" script.
4. The TeX artifacts are persisted using the "actions/upload-artifact@v1" action.
5. In the "buildfiles" job, the code is checked out again and the TeX artifacts are downloaded.
6. The files (ReadMe.md, \*.png) are committed and pushed using the "ad-m/github-push-action@master" action.
7. The "CompileSaberMd.sh" script is used to compile Saber documentation.
8. The "dli-vue-docs" repository is checked out, and the "saber" folder is moved to it.
9. The "dli-vue-docs" artifacts are persisted using the "actions/upload-artifact@v1" action.
10. The Node environment is set up and the "dli-vue-docs" app is built using the "npm run build" command.
11. The "crazy-max/ghaction-github-pages@v3" action is used to deploy the "public" directory to the "gh-pages" branch.
12. The "public" artifacts are persisted using the "actions/upload-artifact@v1" action.

Note: You may need to adjust this workflow according to your specific requirements and setup.



## References
- https://github.com/FriendlyUser/dli-vue-docs/blob/master/.circleci/config.yml
- https://github.com/FriendlyUser/dolwarp
- https://github.com/FriendlyUser/LatexDiagrams
