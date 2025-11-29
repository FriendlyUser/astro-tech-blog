---
title: Advanced Git: Cherry-picking, Merge Strategies, and Release Management
description: Strategies for managing specific commits and handling merge conflicts automatically
alt: A diagram of git branches merging with conflict resolution
pubDate: Saturday, 30 November 2025 13:00:00 GMT
tags: ["git", "bash", "devops"]
layout: '@/templates/BasePost.astro'
imgSrc: '//imgs/2023/bear_book_1.png'
imgAlt: 'git branches merging'
---

To apply specific commits from one branch to another without merging the entire history, you can use the `git cherry-pick` command. This is particularly useful for applying hotfixes to production branches.

For example:

```sh
#!/bin/bash

# Set the commit hash you want to pick
COMMIT_HASH=<commit-hash>

# Apply the commit to the current branch
git cherry-pick "$COMMIT_HASH"
```

Replace `<commit-hash>` with the SHA identifier of the commit. If you encounter conflicts, git will pause the process, allowing you to resolve them before running `git cherry-pick --continue`.

To handle specific ranges of commits, you can also pass a range `A..B`. However, be mindful that cherry-picking creates new commit hashes, which can duplicate history if the branches are eventually merged.

When automating merges or dealing with large conflicts where one branch should take precedence, you can utilize automatic merge resolution strategies. Specifically, the `-X` (strategy-option) flag is powerful for batch operations.

For example, to merge a development branch into your current branch but always prefer the incoming changes in the event of a conflict:

```sh
#!/bin/bash

# Set the source branch
SOURCE_BRANCH="feature/new-ui"

# Merge allowing unrelated histories if necessary, favoring 'theirs' on conflict
git merge -X theirs "$SOURCE_BRANCH" --no-edit
```

The `-X theirs` option tells git to resolve conflicts by accepting the incoming changes (the branch you are merging in), whereas `-X ours` would keep the current branch's version. The `--no-edit` flag prevents the editor from opening to modify the auto-generated merge message.

For repetitive conflict resolution, you might also look into enabling `git rerere` (reuse recorded resolution), which remembers how you resolved a hunk conflict and applies it automatically next time.

For proper release management, adhering to conventions like Semantic Versioning (SemVer) and Conventional Commits allows for automated tagging.

To create a signed release tag using a Bash script based on a version variable:

```sh
#!/bin/bash

# Set the version and message convention
VERSION="1.2.0"
MSG="Release: v$VERSION - Major feature update"

# Create an annotated tag
git tag -a "v$VERSION" -m "$MSG"

# Push tags to remote
git push origin "v$VERSION"
```

Ideally, your release management strategy should pair with the `git log` filtering discussed in previous posts. By filtering for "fix:" or "feat:" in your commit messages, you can automatically determine whether to bump the major, minor, or patch version.

Despite having tools like semantic-release or custom CI/CD pipelines:

*   https://github.com/semantic-release/semantic-release
*   https://github.com/conventional-changelog/conventional-changelog

I should have dedicated the time to standardizing commit messages across teams earlier.

## References

*   https://friendlyuser.github.io/posts/tech/using_git_to_filter_for_commits_between_tags/
*   https://git-scm.com/docs/git-cherry-pick