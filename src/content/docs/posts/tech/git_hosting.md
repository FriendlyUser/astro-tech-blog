---
tags: ["git"]
title: "GitHub vs GitLab vs Bitbucket: choosing a Git host"
description: How GitHub, GitLab and Bitbucket differ on CI/CD, self-hosting, licensing and integrations, and which kind of project each one suits.
pubDate: Fri, 22 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2677360986.webp
---

GitHub, GitLab and Bitbucket all host Git repositories with pull/merge requests, code review, issues and built-in CI/CD, and all three offer free plans with private repositories. The basics are close enough that the choice usually comes down to three things: where the people you work with already are, whether you need to run it on your own servers, and which other tools it has to plug into.

## GitHub

GitHub is owned by Microsoft and is where most open-source projects live. Public and private repositories are free, and since 2020 the free plan has allowed unlimited collaborators on private repositories.

- CI/CD is [GitHub Actions](https://docs.github.com/en/actions), configured with YAML files in `.github/workflows`. The Marketplace has a large catalogue of reusable actions, which is its main advantage over the other two.
- Self-hosting is available as GitHub Enterprise Server, a paid product. You can also run Actions jobs on your own machines with self-hosted runners while keeping the code on github.com.
- The source code of GitHub itself is not open.

Pick it for open-source work, or when contributors and potential hires are most likely to already have an account.

## GitLab

GitLab is built as one application covering the whole delivery pipeline: repositories, CI/CD, a container registry, issue boards and more.

- [GitLab CI/CD](https://docs.gitlab.com/ci/) is configured in a `.gitlab-ci.yml` file and has been part of the product for longer than GitHub Actions has existed.
- GitLab is open core. The Community Edition is open source under the MIT licence and can be self-hosted for free; paid tiers add features on top.
- You can use the hosted service at gitlab.com or run your own instance.

Pick it when you want to self-host without paying, or want CI/CD and the rest of the pipeline in the same tool.

## Bitbucket

Bitbucket is Atlassian's Git host, and its main selling point is integration with Jira and Confluence: linking commits and pull requests to Jira issues works out of the box.

- CI/CD is [Bitbucket Pipelines](https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/), configured in `bitbucket-pipelines.yml`.
- Bitbucket no longer supports Mercurial. Atlassian removed Mercurial repositories from Bitbucket Cloud in 2020, so it's Git only.
- Bitbucket Server reached end of support in February 2024. Bitbucket Data Center is now Atlassian's only self-managed option.

Pick it when your team already runs on Jira and Confluence.

## Which one?

- Open source, or you want the biggest pool of contributors and third-party actions: GitHub.
- Self-hosted, or one tool for the whole pipeline: GitLab.
- Already on Jira: Bitbucket.

Switching later is not hard for the code itself. Git history moves with a `git clone --mirror` and `git push --mirror`, and each host has importers for repositories from the others. Issues, pull request history and CI configuration are what take real effort to move, so that is the part worth getting right up front.

Pricing and free-tier limits (CI minutes, storage, seats) change often, so check the current pricing pages before deciding.
