---
title: "Git cherry-pick, merge strategy options, and release tags in shell scripts"
description: "Applying single commits with git cherry-pick, resolving conflicts automatically with -X ours/theirs and rerere, and scripting annotated or signed release tags."
alt: A diagram of git branches merging with conflict resolution
pubDate: Saturday, 30 November 2025 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["git", "bash", "devops"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/bear-book-1.webp'
---

## Cherry-picking specific commits

`git cherry-pick` applies the changes from one or more existing commits onto the current branch without merging the rest of the source branch's history. The typical use is backporting a hotfix from `main` to a release branch.

```sh
#!/bin/bash
set -euo pipefail

# The commit to apply (full or abbreviated SHA)
COMMIT_HASH="abc1234"

# -x appends "(cherry picked from commit ...)" to the message,
# so you can trace the backport to its original later.
git cherry-pick -x "$COMMIT_HASH"
```

If the commit conflicts, Git stops and leaves the conflict markers in place. Fix the files, `git add` them, then run `git cherry-pick --continue`. To give up and return to where you started, run `git cherry-pick --abort`.

You can also pick a range. Note that `A..B` means "commits reachable from B but not from A", so it **excludes** `A` itself:

```sh
git cherry-pick A..B    # commits after A, up to and including B
git cherry-pick A^..B   # A through B, inclusive
```

Cherry-picked commits get new hashes. If the two branches are later merged, Git usually recognises the identical changes and applies them cleanly, but the history will show the same change twice, and if either copy was edited afterwards you can get conflicts.

## Resolving conflicts automatically with `-X ours` / `-X theirs`

When one side should win any conflicting hunk (for example, regenerating a branch from an upstream you don't modify), pass a strategy option to the default `ort` merge strategy with `-X`:

```sh
#!/bin/bash
set -euo pipefail

SOURCE_BRANCH="feature/new-ui"

# On conflicting hunks, take the version from $SOURCE_BRANCH.
git merge -X theirs --no-edit "$SOURCE_BRANCH"
```

- `-X theirs` resolves conflicting hunks in favour of the branch being merged in.
- `-X ours` resolves them in favour of the current branch.
- Non-conflicting changes from both sides are still merged as usual. Only the hunks that would have conflicted are decided automatically.
- `--no-edit` accepts the auto-generated merge message instead of opening an editor.

Don't confuse `-X ours` with `-s ours`. The `ours` *strategy* (`-s ours`) ignores the other branch's changes entirely and just records a merge commit; the `ours` *option* (`-X ours`) only affects conflicts.

The same `-X` option works with `git cherry-pick` and `git rebase`, but with rebase the meaning of "ours" and "theirs" is swapped, because rebase replays your commits on top of the upstream.

If you resolve the same conflicts repeatedly (for example, when rebasing a long-lived branch), enable `rerere` ("reuse recorded resolution"). Git records how you resolved each conflicting hunk and replays that resolution the next time it sees the same conflict:

```sh
git config --global rerere.enabled true
```

## Scripting release tags

If commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`fix:`, `feat:`, `feat!:` / `BREAKING CHANGE:`), you can derive the next [Semantic Version](https://semver.org/) from them: `fix` bumps the patch version, `feat` the minor version, and a breaking change the major version. The commits since the last tag are easy to list with `git log` (see my earlier post on filtering commits between tags).

Once you know the version, tagging is two commands:

```sh
#!/bin/bash
set -euo pipefail

VERSION="1.2.0"
MSG="Release v$VERSION"

# -a creates an annotated tag (stores tagger, date and message).
# Use -s instead of -a to also sign the tag with your GPG/SSH key.
git tag -a "v$VERSION" -m "$MSG"

git push origin "v$VERSION"
```

Annotated tags are what `git describe` uses by default and what most release tooling expects; lightweight tags (`git tag v1.2.0` with no `-a`) are just a name pointing at a commit.

Despite tools like these existing for automating releases:

- https://github.com/semantic-release/semantic-release
- https://github.com/conventional-changelog/conventional-changelog

I should have dedicated the time to standardizing commit messages across teams earlier. The tooling only works if the commit messages are consistent.

## References

- https://friendlyuser.github.io/posts/tech/using_git_to_filter_for_commits_between_tags/
- https://git-scm.com/docs/git-cherry-pick
- https://git-scm.com/docs/git-merge#_merge_strategies
- https://git-scm.com/docs/git-rerere
