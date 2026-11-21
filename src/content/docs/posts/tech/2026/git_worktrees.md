---
title: "Working on Several Branches at Once with git worktree"
description: "Check out more than one branch of a repository at the same time with git worktree: add, list, move, remove and prune, and what the worktrees share."
tags: ["Git", "Git Worktree", "Version Control", "Developer Tools", "Command Line"]
pubDate: "2026-10-25T16:00:00.000Z"
imgSrc: "/imgs/2026/git_worktrees.webp"
imgAlt: "Three branch directories connected by lines to one shared .git object store"
---

`git worktree` lets one repository have several working directories, each with a different branch checked out. Instead of stashing your half-finished feature to look at a bug on `main`, you open the bug in a second directory and leave the feature exactly as it was.

It is also the cheapest way to run things in parallel on the same codebase: a long test suite on one branch while you keep editing another, or several coding agents that each need their own checkout. The commands below were run on Git 2.46; everything shown has been in Git for years.

## The model: one repository, many checkouts

A normal clone has one working tree, the directory you edit, plus the `.git` directory that holds the history. `git worktree add` creates another working tree attached to the same `.git`.

What the worktrees **share**:

- the object store, so no history is copied and adding a worktree is fast even for a large repository;
- branches, tags and remotes: a commit made in one worktree is visible from all of them straight away;
- repository config, hooks and the stash list.

What each worktree **has for itself**:

- its own files on disk;
- its own `HEAD` (which branch or commit is checked out);
- its own index (staging area).

The first directory, the one you cloned, is the **main worktree**. The others are **linked worktrees**. In a linked worktree, `.git` is a small file instead of a directory:

```text
gitdir: /home/me/src/app/.git/worktrees/app-login
```

Git keeps the bookkeeping for each linked worktree under `.git/worktrees/<name>/` in the main repository.

## Creating worktrees

Everything below runs from inside the main checkout, `~/src/app`. I keep linked worktrees next to it as siblings (`../app-<something>`), so they don't show up as untracked files inside the main one.

Check out an existing branch:

```bash
git worktree add ../app-login feature/login
```

Create a new branch and check it out in one step, like `git switch -c`:

```bash
git worktree add -b hotfix/crash ../app-hotfix main
```

Leave the branch name out and Git creates a branch named after the directory:

```bash
git worktree add ../review-42
# Preparing worktree (new branch 'review-42')
```

If the branch only exists on a remote, Git does the same thing `git switch` does and creates a local tracking branch:

```bash
git worktree add ../app-login feature/login
# Preparing worktree (new branch 'feature/login')
# branch 'feature/login' set up to track 'origin/feature/login'.
```

For a throwaway look at a commit or a tag, use a detached HEAD so you don't create a branch you'll have to delete later:

```bash
git worktree add --detach ../app-v2 v2.0.0
```

Then `cd ../app-login` and work as usual. `git status`, `git commit` and `git push` all behave normally.

## Listing them

```bash
git worktree list
```

```text
/home/me/src/app          eb3a155 [main]
/home/me/src/app-hotfix   eb3a155 [hotfix/crash]
/home/me/src/app-login    0f883e9 [feature/login]
```

For scripts, use `--porcelain`, which prints one attribute per line with a blank line between worktrees:

```text
worktree /home/me/src/app
HEAD eb3a15578b654adcdd330c770c7c7e421902ac66
branch refs/heads/main

worktree /home/me/src/app-login
HEAD 0f883e9...
branch refs/heads/feature/login
```

`list` also flags worktrees whose directory has gone missing as `prunable`, and ones you have locked as `locked`.

## A branch can only be checked out once

This is the rule that surprises people. Git refuses to check out a branch that is already checked out in another worktree:

```text
$ git worktree add ../app-login2 feature/login
fatal: 'feature/login' is already used by worktree at '/home/me/src/app-login'
```

The same applies inside a linked worktree: `git checkout main` fails there while `main` is checked out in the main worktree. And you can't delete the branch either:

```text
$ git branch -d feature/login
error: cannot delete branch 'feature/login' used by worktree at '/home/me/src/app-login'
```

The reason is that two checkouts moving the same branch ref would trample on each other: commit in one, and the other's files and index no longer match its `HEAD`. If you really need the same code twice, check out the commit detached (`--detach`) or create a second branch from it.

## A worked example: a hotfix in the middle of a feature

Say you are halfway through `feature/search`, with uncommitted changes and a dev server running, when a crash report comes in.

```bash
cd ~/src/app                      # on feature/search, files modified
git fetch origin
git worktree add -b hotfix/null-user ../app-hotfix origin/main

cd ../app-hotfix
npm ci                            # dependencies are per directory, see below
# fix the bug, run the tests
git commit -am "Handle missing user in session middleware"
git push -u origin hotfix/null-user

cd ../app                         # your feature is exactly as you left it
git worktree remove ../app-hotfix
```

Nothing was stashed, the dev server in `~/src/app` kept running, and the hotfix branch still exists after the worktree is removed. Removing a worktree never deletes its branch.

## Cleaning up

`git worktree remove` deletes the directory and Git's bookkeeping for it. It refuses if the worktree has modified or untracked files:

```text
$ git worktree remove ../app-login
fatal: '../app-login' contains modified or untracked files, use --force to delete it
```

Read that message as "you are about to lose work", not as something to automatically override with `--force`.

If you delete a worktree directory by hand (`rm -rf`, or your file manager), Git still has its entry and still considers the branch checked out. `git worktree list` shows it as `prunable`, and `prune` clears it:

```text
$ git worktree prune -v
Removing worktrees/app-hotfix: gitdir file points to non-existent location
```

Git also prunes stale entries on its own during `git gc`, after `gc.worktreePruneExpire` (three months by default), but running `prune` yourself frees the branch immediately.

Two more maintenance commands:

- `git worktree move ../app-login ../login` moves a linked worktree and updates the bookkeeping. If you moved it without Git, run `git worktree repair <new-path>` from the main worktree to reconnect them.
- `git worktree lock --reason "on external drive" ../app-review` stops `prune` from removing a worktree that lives on a drive that is sometimes unmounted. `unlock` undoes it.

## What is not shared, and why it matters

Each worktree is a separate directory, so anything ignored by Git is per worktree too:

- `node_modules`, `.venv`, `target/` and other build output have to be created again in each one. For a big JavaScript project that's the slowest part of `worktree add`. A package manager with a global content-addressed store (pnpm, uv) makes it cheap.
- `.env` files and other local, untracked config don't follow you. Copy them, or have a setup script that creates them.
- IDE state (`.idea/`, `.vscode/` if it is ignored) is per directory.

The flip side is that hooks and repository config *are* shared. A `pre-commit` hook installed in the main worktree runs in all of them. If you want a setting in just one worktree, enable `extensions.worktreeConfig` and use `git config --worktree`.

The stash is shared as well. A stash made in one worktree shows up in `git stash list` everywhere, so name your stashes (`git stash push -m "search: wip"`) if you use them across worktrees.

## Long builds and coding agents

Worktrees are a good fit for anything that occupies a checkout for a long time:

- **Slow test suites or release builds.** Add a detached worktree at the commit you want to test, start the build there, and keep working in your main directory. Your edits can't change the files mid-build.
- **Comparing behaviour.** Run the old and new version side by side, in two worktrees, on two ports.
- **Coding agents.** If you run more than one agent on the same repository, give each its own worktree and branch. Two agents editing the same directory will overwrite each other's files and step on each other's `git add`. In separate worktrees they can't, and you review each branch as a normal pull request. Several agent tools create worktrees for you for this reason; the cleanup advice below applies to those too.

A small script makes the per-task setup repeatable:

```bash
#!/usr/bin/env bash
# new-task.sh <branch>: create a sibling worktree on a new branch and set it up
set -euo pipefail
branch="$1"
dir="../$(basename "$PWD")-${branch//\//-}"

git fetch origin
git worktree add -b "$branch" "$dir" origin/main
cp .env "$dir/.env" 2>/dev/null || true
(cd "$dir" && npm ci)
echo "Ready: $dir"
```

## Gotchas

- **Paths are absolute by default.** The `.git` file in a linked worktree and the bookkeeping in the main repository store absolute paths. Moving the whole parent directory, or opening it from a container with a different mount point, breaks the link until you run `git worktree repair`. Git 2.48 added `--relative-paths` (and the `worktree.useRelativePaths` setting) for this case.
- **Some tools assume `.git` is a directory.** Most modern tools handle the `gitdir:` file, but older scripts that read `.git/HEAD` directly break inside a linked worktree. `git rev-parse --git-dir` and `git rev-parse --git-common-dir` give the right paths.
- **Submodules** work in worktrees, but each worktree needs its own `git submodule update --init`. The Git documentation still describes multiple checkouts of a superproject as incomplete.
- **Don't nest worktrees inside the main one** unless you add the directory to `.gitignore`. Otherwise `git status` in the main worktree lists the whole linked worktree as untracked.
- **Clean up regularly.** `git worktree list` after a week of agent runs can be long, and every entry holds a branch hostage. Remove what you've merged, then run `git worktree prune`.

## Further reading

- [git-worktree documentation](https://git-scm.com/docs/git-worktree)
- [git-config: `worktree.*` and `extensions.worktreeConfig`](https://git-scm.com/docs/git-config)
