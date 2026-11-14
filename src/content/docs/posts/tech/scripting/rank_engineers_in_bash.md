---
tags: ['bash', 'git']
title: Ranking engineers by commits and lines of code with Git and Bash
description: "Four Bash scripts that use git log, git shortlog and git blame to count each author's commits, touched files, changed lines and surviving lines in a repository."
pubDate: Fri, 7 November 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2627778103.png
---

Commit counts and lines of code are the easiest engineering metrics to compute: Git already records who changed what, and a few lines of Bash turn that history into a ranking. This post shows four scripts that do it.

Be clear about what the numbers mean before you use them. They measure activity, not value. They're cheap and repeatable, but they're easy to game (split commits, reformat files, commit generated code) and they penalise work that removes code or happens outside the repository: reviews, design, debugging, mentoring. Use them as a conversation starter alongside code quality, bug fixing and collaboration, not as a score.

## Files each author changed most, by extension

```bash
#!/usr/bin/env bash
# Usage: ./files_by_author.sh /path/to/repository
cd "${1:-.}" || exit 1

# File extensions to report on
EXTENSIONS=("html" "scss" "tsx" "ts")

git log --format='%ae' | sort -u | while read -r author; do
    for extension in "${EXTENSIONS[@]}"; do
        echo "Changes made by $author to .$extension files:"
        git log --no-merges --fixed-strings --author="$author" --name-only --pretty=format: \
            | grep "\.$extension$" | sort | uniq -c | sort -rn | head -n 10
    done
done
```

For each author email in the history and each extension, this lists the 10 files that author touched in the most commits:

- `git log --format='%ae' | sort -u` lists every distinct author email.
- `--author` matches against the author's name and email; `--fixed-strings` stops characters like `.` and `+` in an email being read as a regex.
- `--name-only --pretty=format:` prints only the changed file paths for each commit, and `--no-merges` skips merge commits, which would otherwise repeat files.
- `grep` keeps paths with the current extension, `sort | uniq -c` counts how many commits touched each file, and `sort -rn | head -n 10` keeps the top 10.

## Commits per author

```bash
#!/usr/bin/env bash
cd "${1:-.}" || exit 1

git shortlog -s -n --no-merges --all | while read -r count author; do
    echo "$author: $count"
done
```

`git shortlog` groups commits by author. `-s` prints only the count, `-n` sorts by count (highest first), and `--all` counts commits reachable from every branch and tag, each commit once. Without a revision such as `--all` or `HEAD`, `git shortlog` reads a log from standard input when it isn't run in a terminal, so keep one in scripts. Add `-e` to show email addresses if two people share a name.

## Lines added and removed per author

```bash
#!/usr/bin/env bash
cd "${1:-.}" || exit 1

git log --no-merges --numstat --format='@%aN' \
    | awk '/^@/ { author = substr($0, 2); next }
           $1 ~ /^[0-9]+$/ { added[author] += $1; removed[author] += $2 }
           END { for (a in added) printf "%d\t%d\t%s\n", added[a], removed[a], a }' \
    | sort -rn
```

`--numstat` prints `added<TAB>removed<TAB>path` for each file in each commit, and the `@%aN` format line marks which author the following numbers belong to. Binary files show `-` instead of numbers and are skipped. The output columns are lines added, lines removed and author name, sorted by lines added.

## Lines each author owns today

```bash
#!/usr/bin/env bash
cd "${1:-.}" || exit 1

git ls-files -z | xargs -0 -n1 git blame --line-porcelain 2>/dev/null \
    | sed -n 's/^author //p' | sort | uniq -c | sort -rn \
    | while read -r count author; do
        echo "$author: $count"
    done
```

This counts the lines in the current checkout that `git blame` attributes to each author, so it measures code that survived rather than code written:

- `git ls-files -z | xargs -0 -n1` passes each tracked file to `git blame` one at a time; the NUL separators keep file names with spaces intact.
- `--line-porcelain` repeats the full commit header for every line, including an `author <name>` line, which `sed` extracts.
- `2>/dev/null` hides errors from paths `git blame` can't annotate, such as submodules.

It runs `git blame` once per file, so expect it to be slow on large repositories. Restrict it to source files with a pathspec, for example `git ls-files -z -- '*.ts' '*.tsx'`.

## Gotchas

- The same person often commits under several names or emails (work laptop, GitHub web UI). Add a [`.mailmap`](https://git-scm.com/docs/gitmailmap) file to merge them; `git shortlog`, `%aN` and `git blame` respect it.
- Bots, formatters, lockfiles and vendored or generated code inflate line counts. Exclude them with pathspecs such as `':!package-lock.json'` or by filtering author names.
- Commit counts depend on the merge strategy: a squash merge turns a pull request of many commits into one, so teams that squash and teams that don't can't be compared by commit count.
