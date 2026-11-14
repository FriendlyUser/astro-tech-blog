---
tags: ['github', 'ci']
title: "GitHub Actions basics: YAML, cron schedules, push triggers and keeping scheduled workflows alive"
description: The YAML and cron syntax you need for GitHub Actions workflows, with a scheduled scraper, push triggers, and a workaround for the 60-day schedule shutoff.
pubDate: Mon, 13 November 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/2543580613.webp"
---

GitHub Actions workflows are YAML files in `.github/workflows/` that run jobs when something happens in a repository: a push, a pull request, or a schedule. This post covers the YAML and cron syntax you need to read them, then walks through two workflows I use in [news-alert](https://github.com/FriendlyUser/news-alert).

## YAML in two minutes

YAML is a data format built from key-value pairs separated by colons. Indentation (spaces, not tabs) defines nesting, and lines starting with `-` are list items.

```yaml
name: John Doe
age: 35
email: john.doe@example.com

interests:
  - programming
  - photography
  - hiking
```

`name` and `email` are strings, `age` is a number, and `interests` is a list. Nesting another level looks like this:

```yaml
person:
  name: John Doe
  age: 35
  email: john.doe@example.com
  interests:
    - programming
    - photography
    - hiking
```

Here `person` maps to a dictionary with four keys. If the indentation is off, the structure changes or the file fails to parse, which is the most common cause of broken workflow files.

## Cron syntax

A cron expression has five fields:

```text
┌───────────── minute (0-59)
│ ┌─────────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌─────── month (1-12)
│ │ │ │ ┌───── day of week (0-6, Sunday = 0)
│ │ │ │ │
* * * * *
```

`*` matches any value, `,` separates a list, `-` is a range, and `/` is a step. In a Unix crontab the five fields are followed by the command to run, so this runs a script every day at 4 PM:

```text
0 16 * * * /path/to/script.sh
```

Edit your crontab with `crontab -e`, list it with `crontab -l`, or load one from a file with `crontab /path/to/crontab.file`.

In GitHub Actions you write only the five schedule fields. Two differences from a server crontab:

- Schedules run in UTC by default.
- The shortest interval is every 5 minutes, and runs can start late when GitHub is busy, especially at the top of the hour.

## A scheduled workflow

This workflow runs a .NET scraper that posts news to Discord:

```yaml
name: Scrap News

on:
  schedule:
    # * is a special character in YAML, so quote the string
    - cron: '10-59/20 13-19 * * 1-5'

jobs:
  scrap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-dotnet@v6
        with:
          dotnet-version: '10.0.x'
      - run: dotnet restore
      - run: dotnet build -o out
      - run: dotnet out/news-alert.dll
        env:
          DISCORD_WEBHOOK: ${{ secrets.DISCORD_WEBHOOK }}
          ES_INSTANCE: ${{ secrets.ES_INSTANCE }}
```

The cron expression runs at minutes 10, 30, and 50 of every hour from 13:00 to 19:59 UTC, Monday to Friday. The steps check out the repository, install the .NET SDK, build the project into `out/`, and run it. `DISCORD_WEBHOOK` and `ES_INSTANCE` are [repository secrets](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions) passed to the app as environment variables, so the webhook URL and Elasticsearch address never appear in the repository.

The original 2023 version of this workflow used `actions/checkout@master`, `actions/setup-dotnet@v1` and .NET Core 3.1, which went out of support in December 2022. Pin actions to a release tag rather than a branch, and make sure the project's target framework matches the SDK you install.

## Triggering on push

To run a workflow on every push to `main`:

```yaml
on:
  push:
    branches:
      - main
```

`branches` is a list, so add more entries (for example `- dev`) to watch several branches. To run on pushes to any branch, leave the filter out:

```yaml
on: push
```

You can combine triggers. This runs on pushes to `main` and every day at midnight UTC:

```yaml
on:
  push:
    branches:
      - main
  schedule:
    - cron: '0 0 * * *'
```

## Keeping scheduled workflows alive

In public repositories, GitHub disables scheduled workflows after 60 days with no repository activity. You can re-enable them from the Actions tab, but if a repository exists only to run a scheduled job, it's easier to have a workflow commit something once a month:

```yaml
name: Update CRON
# Commit to a file once a month so scheduled workflows stay enabled
on:
  schedule:
    - cron: '1 1 1 * *'

permissions:
  contents: write

jobs:
  update_cron:
    name: Update CRON.md
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - name: Update Cron
        run: echo "c" >> CRON.md
      - name: Commit file
        uses: test-room-7/action-update-file@v1
        with:
          file-path: CRON.md
          commit-msg: Update CRON.md
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

This runs at 01:01 UTC on the first of each month. The built-in `GITHUB_TOKEN` is enough to push the commit, but repositories created since 2023 default it to read-only, so the `permissions: contents: write` block is needed.

You only need a personal access token if the commit must trigger *other* workflows: events created with `GITHUB_TOKEN` don't start new workflow runs. If you do create one, prefer a [fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) limited to the one repository with Contents read/write, store it as a repository secret, and use it in place of `secrets.GITHUB_TOKEN`.

## References

- https://github.com/FriendlyUser/news-alert/blob/master/.github/workflows/CRON.yml
- https://github.com/FriendlyUser/news-alert/blob/master/.github/workflows/scrapNews.yml
- [Events that trigger workflows: schedule](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#schedule)
