---
title: "Running Checks Before Every Commit with the pre-commit Framework"
description: "Set up pre-commit: write .pre-commit-config.yaml, install the Git hook, add hooks from repos and local hooks, keep them updated, run them in CI and skip them."
tags: ["Git", "Git Hooks", "pre-commit", "CI", "Linting", "Developer Tools"]
pubDate: "2026-12-10T16:00:00.000Z"
imgSrc: "/imgs/2026/pre_commit_hooks.webp"
imgAlt: "A terminal showing a list of pre-commit hooks with Passed, Failed and Skipped results"
---

[pre-commit](https://pre-commit.com/) is a small tool that manages Git hooks for you. You list the checks you want in a `.pre-commit-config.yaml` file at the root of the repository, and before each commit it runs them against the files you staged: formatters, linters, secret scanners, or any script of your own.

The reason to use it instead of writing `.git/hooks/pre-commit` by hand is that the config is committed and versioned, every hook is pinned to a revision, and pre-commit installs each hook's tools in an isolated environment. A new contributor runs one command and gets the same checks as everyone else. Examples below were run with pre-commit 4.7.0.

## Installing pre-commit

pre-commit is a Python application, but the repository you use it in doesn't have to be Python. Install it once per machine as a standalone tool:

```bash
uv tool install pre-commit      # or: pipx install pre-commit
pre-commit --version
```

Installing it with `pip` into a project's virtual environment also works. Avoid running it only through a throwaway runner like `uvx`. The Git hook that `pre-commit install` writes points at the Python interpreter that ran it, and that interpreter should still exist next week.

## A first config

Create `.pre-commit-config.yaml` at the repository root:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
        args: ["--maxkb=500"]
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.17.6
    hooks:
      - id: ruff-check
        args: [--fix]
      - id: ruff-format
```

Each entry under `repos` is a Git repository that publishes hooks (it has a `.pre-commit-hooks.yaml` file), pinned with `rev` to a tag or commit. Under `hooks` you pick which of its hooks to run, by `id`, and can override things like `args`, `files` or `exclude` for each one.

`pre-commit sample-config` prints a starter file if you'd rather begin from that. The hooks above are a common baseline: whitespace and end-of-file fixes, YAML syntax, a guard against committing large binaries, and Ruff for Python linting and formatting.

## Installing the Git hook

The config does nothing until the hook is installed in your clone:

```bash
pre-commit install
# pre-commit installed at .git/hooks/pre-commit
```

Every contributor runs this once after cloning. It's per clone because `.git/hooks` is never committed.

The first commit afterwards is slow: pre-commit clones each hook repository and builds its environment, then caches it under `~/.cache/pre-commit`. Later runs reuse that cache.

## What a failing commit looks like

Here is a commit of a Python file with a trailing space, an unused import and an unformatted function, plus an `.env` file that should not be committed. The last two hooks are local hooks, covered in the next section:

```text
$ git commit -m "first"
trim trailing whitespace.................................................Failed
- hook id: trailing-whitespace
- exit code: 1
- files were modified by this hook

Fixing src/calc.py

fix end of files.........................................................Passed
check yaml...............................................................Passed
check for added large files..............................................Passed
ruff check...............................................................Failed
- hook id: ruff-check
- files were modified by this hook

Found 2 errors (2 fixed, 0 remaining).

ruff format..............................................................Failed
- hook id: ruff-format
- files were modified by this hook

1 file reformatted

no print() in app code...................................................Failed
- hook id: no-print
- exit code: 1

src/calc.py:2:    print(a)

do not commit .env files.................................................Failed
- hook id: no-env-files
- exit code: 1

.env files must not be committed

.env
```

The commit did not happen. Two kinds of failure show up here:

- **Fixers** (`trailing-whitespace`, `ruff-check --fix`, `ruff-format`) changed the files in your working tree. Look at the diff, `git add` the files again, and commit again.
- **Checkers** (`no-print`, `no-env-files`) only report. You fix those by hand.

pre-commit only checks **staged** content. If you have unstaged edits in the same files, it stashes them before the run and restores them afterwards, so a check never passes because of a change you haven't staged.

## Local hooks

Not every check needs a published hook repository. `repo: local` defines hooks right in the config. These are the two from the run above:

```yaml
  - repo: local
    hooks:
      - id: no-print
        name: no print() in app code
        language: pygrep
        entry: '^\s*print\('
        files: ^src/.*\.py$
      - id: no-env-files
        name: do not commit .env files
        language: fail
        entry: ".env files must not be committed"
        files: (^|/)\.env$
```

- `language: pygrep` fails if the regex in `entry` matches any line in the selected files. It's the quickest way to ban a pattern.
- `language: fail` fails whenever any file matches `files`, and prints `entry` as the message.
- `files` and `exclude` are Python regular expressions matched against paths relative to the repository root. `types: [python]` or `types: [yaml]` select by file type instead.

For a check that is a script in your repository, use `language: system` (runs with whatever is on `PATH`) or `language: python` with `additional_dependencies` (pre-commit builds a virtual environment and installs them):

```yaml
      - id: check-migrations
        name: migrations are up to date
        language: python
        entry: python scripts/check_migrations.py
        additional_dependencies: ["sqlalchemy>=2.0"]
        pass_filenames: false
        files: ^app/models/
```

`pass_filenames: false` runs the command once without the list of staged files, which suits project-wide checks. `files` still decides whether the hook runs at all: here, only when a model file is staged.

## Running hooks by hand

You don't need to commit to run the checks:

```bash
pre-commit run                       # all hooks, staged files only
pre-commit run --all-files           # all hooks, every tracked file
pre-commit run no-print --all-files  # one hook by id
pre-commit run --files src/calc.py   # specific files
```

Run `--all-files` once right after adding pre-commit to an existing project. The fixers will touch many files, and it's better to land that as a single "apply formatting" commit than to have it trickle into unrelated changes.

## Keeping hooks up to date

Pinned revisions don't update themselves. `pre-commit autoupdate` moves each repository to its newest tag:

```text
$ pre-commit autoupdate
[https://github.com/pre-commit/pre-commit-hooks] updating v5.0.0 -> v6.0.0
[https://github.com/astral-sh/ruff-pre-commit] updating v0.12.0 -> v0.17.6
```

It rewrites the `rev:` lines in place. Review the diff like any dependency bump, because a new linter version can bring new rules. `pre-commit autoupdate --freeze` pins commit hashes instead of tags, if you don't want a moved tag to change what runs.

## Skipping hooks

Sometimes you need to commit something that fails a check, such as a work-in-progress commit on a private branch. Skip individual hooks by id with the `SKIP` environment variable:

```text
$ SKIP=no-print git commit -m "debug"
...
ruff format..............................................................Passed
no print() in app code..................................................Skipped
do not commit .env files.............................(no files to check)Skipped
[main 3fda951] debug
```

`SKIP` takes a comma-separated list (`SKIP=no-print,ruff-check`). `git commit --no-verify` skips every hook. That's a Git feature, not a pre-commit one. Both are why CI has to run the checks as well: local hooks are a convenience, not an enforcement mechanism.

## Running pre-commit in CI

In CI, run all hooks on all files and fail the build if anything fails or changes a file. A GitHub Actions job:

```yaml
# .github/workflows/pre-commit.yml
name: pre-commit
on:
  pull_request:
  push:
    branches: [main]

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"
      - uses: actions/cache@v5
        with:
          path: ~/.cache/pre-commit
          key: pre-commit-${{ runner.os }}-${{ hashFiles('.pre-commit-config.yaml') }}
      - run: pip install pre-commit
      - run: pre-commit run --all-files --show-diff-on-failure
```

`--show-diff-on-failure` prints what the fixers would have changed, so the log tells the author exactly what to fix. The cache key includes the config hash, so environments are rebuilt only when hook revisions change.

[pre-commit.ci](https://pre-commit.ci/) is a hosted service from the same author that runs your config on pull requests, can push the fixes back as a commit, and opens weekly autoupdate pull requests. It is free for open source projects.

## Other settings worth knowing

- `default_install_hook_types: [pre-commit, pre-push]` at the top level makes `pre-commit install` install both hook types. Then `stages: [pre-push]` on a slow hook moves it from every commit to every push.
- `fail_fast: true` stops at the first failing hook.
- A top-level `exclude:` regex skips generated code or vendored files for every hook.
- `minimum_pre_commit_version: "4.0.0"` gives older installs a clear error instead of a confusing one.
- `pre-commit gc` removes cached environments that no config uses anymore. `pre-commit clean` removes the whole cache.

## Gotchas

- **Keep hooks fast.** Hooks run on every commit. A full test suite or a type check of the whole project belongs in a `pre-push` stage or in CI. If committing takes 30 seconds, people start using `--no-verify` by reflex.
- **Fixers plus partial staging.** If you stage part of a file with `git add -p`, a formatter only sees the staged version, and pre-commit has to merge its fixes with your unstaged changes. When they conflict, it rolls back the fixes and tells you. Stage the whole file or commit the rest first.
- **`language: system` hooks are not reproducible.** They use whatever version is installed on each machine. Prefer a published hook or `language: python`/`node` with `additional_dependencies` when the version matters.
- **Monorepos.** One config at the root applies to the whole repository. Use `files:` patterns per hook rather than trying to nest configs.

## Further reading

- [pre-commit documentation](https://pre-commit.com/)
- [Supported hooks list](https://pre-commit.com/hooks.html)
- [pre-commit-hooks repository](https://github.com/pre-commit/pre-commit-hooks)
