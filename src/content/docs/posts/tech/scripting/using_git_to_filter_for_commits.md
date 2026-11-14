---
title: Listing git commits between two tags, filtered by author or message
description: Use git log ranges with --author, --grep and --no-merges to list the commits that went into a release, such as all JIRA tickets between two tags.
alt: Applying nlp to various youtube videos
pubDate: Friday, 30 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["git", "bash"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-17 09.01.21 - two tags and lines between them.png'
imgAlt: 'two tags and lines'
---

When writing release notes I usually want "every commit that landed between the last release tag and this one", often narrowed to one author or to commits that reference a ticket. `git log` does all of this with a range plus a few filters.

## Commits between two tags

```sh
#!/bin/bash

OLD_TAG=v3.0.22
NEW_TAG=v3.1.0

git log --oneline --decorate "$OLD_TAG..$NEW_TAG"
```

`A..B` means "commits reachable from `B` but not from `A`", so the **older** tag goes on the left. If you write it the other way round (`v3.1.0..v3.0.22`) you usually get no output at all, because everything in the older release is already in the newer one.

- `--oneline` prints the abbreviated hash and the subject line.
- `--decorate` adds the branch and tag names that point at each commit, which makes the tag boundaries easy to spot.

## Filtering by author

```sh
#!/bin/bash

OLD_TAG=v3.0.22
NEW_TAG=v3.1.0
AUTHOR="John Doe"

git log --oneline --decorate --no-merges --author="$AUTHOR" "$OLD_TAG..$NEW_TAG"
```

`--author` is a regular expression matched against the author name and email, so `--author="john"` or `--author="@example.com"` also work. `--no-merges` drops merge commits, which in a pull-request workflow are mostly "Merge pull request #123" noise.

## Filtering by commit message

`--grep` is also a regular expression, matched against the whole commit message. To list commits whose message starts with a ticket key like `JIRA-123`:

```sh
#!/bin/bash

git log --oneline --decorate --grep='^JIRA-[0-9]'
```

Anchor the pattern and be careful with `*`: in a regex, `JIRA-*` means "`JIRA` followed by zero or more hyphens", so it matches any message that contains `JIRA` anywhere, not "starts with `JIRA-`". Add `-i` (`--regexp-ignore-case`) for case-insensitive matching, and `-E` if you want extended regex syntax.

## Putting it together

All the JIRA commits between two releases, without merges:

```sh
git log --oneline --decorate --no-merges --grep='^JIRA-[0-9]' v3.0.22..v3.1.0
```

Two things to know when combining filters:

- Several `--grep` patterns are ORed together by default; add `--all-match` to require every pattern to match.
- `--author` and `--grep` together must both match (a commit has to be by that author *and* match the message pattern).

To get just the ticket keys for a changelog, pipe the subjects through `grep -o`:

```sh
git log --no-merges --format=%s --grep='^JIRA-[0-9]' v3.0.22..v3.1.0 \
  | grep -oE '^JIRA-[0-9]+' | sort -u
```

## Afterword

Despite building projects like

* https://github.com/FriendlyUser/git_log_parser_go

and using ChatGPT to mostly generate

* https://github.com/FriendlyUser/git_log_parser

I should have dedicated the time to master git.

## References

* https://friendlyuser.github.io/posts/tech/parsing_git_commits_with_dotnet/
* [git log documentation](https://git-scm.com/docs/git-log)
