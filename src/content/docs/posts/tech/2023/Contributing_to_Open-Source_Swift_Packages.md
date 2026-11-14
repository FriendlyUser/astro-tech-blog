---
description: "Find a Swift package to work on, fork and clone it, build and test with SwiftPM or Xcode, and open a pull request that maintainers can review quickly."
imgSrc: /imgs/2023/1738634340-a-dream-of-a-distant-galaxy-concept-art-matte-painting-hq-4k.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-23T23:13:25.000Z'
lastUpdated: 2026-11-14
tags: ["swift"]
title: "Contributing to an open-source Swift package: fork, test and open a pull request"
---

Most Swift libraries are distributed as Swift Package Manager (SwiftPM) packages hosted on GitHub, and most accept outside contributions. The workflow is the standard GitHub fork-and-pull-request flow, plus building and testing the package with SwiftPM.

## Find a package

Good places to look:

- [Swift Package Index](https://swiftpackageindex.com/), which lists packages along with the platforms and Swift versions they build on
- [GitHub's Swift topic](https://github.com/topics/swift)
- [Awesome Swift](https://github.com/matteocrippa/awesome-swift), a curated list of Swift libraries

A package you already use is the easiest start, since you know where it falls short. Many projects label beginner-friendly issues `good first issue`. For anything bigger than a small fix, comment on the issue first so you don't build something the maintainers won't merge.

## Read the contribution guidelines

Look for `CONTRIBUTING.md` in the repository root or `.github/` folder. It usually covers code style, how to run the tests, commit message format, and whether you need to sign a contributor licence agreement. Check for a code of conduct too.

## Fork, clone and branch

Fork the repository on GitHub, then clone **your fork** and add the original as a remote called `upstream` so you can pull in new changes:

```bash
git clone https://github.com/<your-username>/<package>.git
cd <package>
git remote add upstream https://github.com/<owner>/<package>.git
git checkout -b fix-issue-123
```

Use a descriptive branch name, like `fix-issue-123` or `add-async-api`.

## Build and run the tests

You need a Swift toolchain: Xcode on macOS, or the toolchain from [swift.org](https://www.swift.org/install/) on Linux and Windows. From the package root:

```bash
swift build
swift test
```

To use Xcode, open the package folder (or run `xed .` in it). Xcode reads `Package.swift` directly, with no `.xcodeproj` needed, and you can run tests with **Product > Test** (`Cmd+U`).

Run the tests before you change anything so you know what passes on a clean checkout. Packages may use XCTest, the newer Swift Testing framework (`import Testing`), or both, and `swift test` runs either. If the package supports Linux, check the project's CI configuration to see what it runs there, since Foundation APIs differ slightly between platforms.

## Make the change

- Follow the existing code style. Many projects enforce one with SwiftLint or swift-format; if there's a config file for either in the repo, run it.
- Add or update tests for the behaviour you changed. A bug fix with a test that fails without it is much easier to review.
- Keep commits focused and write messages that say why the change was made, not only what changed.

## Open the pull request

Before pushing, bring your branch up to date with the upstream default branch (often `main`):

```bash
git fetch upstream
git rebase upstream/main
git push origin fix-issue-123
```

GitHub then shows a **Compare & pull request** button on your fork. Check that the base repository is the original project and the head is your branch. In the description, say what the change does, how you tested it, and which issue it addresses. Writing `Fixes #123` closes that issue automatically when the PR is merged into the default branch.

## Respond to review

Maintainers will often ask for changes. Push new commits to the same branch and they appear on the existing PR. If the project prefers a clean history, they may ask you to squash commits or rebase again. Reviews on volunteer-run projects can take days or weeks, so a polite ping after a week or two is fine, but repeated pings aren't.

## Further reading

- [Swift Package Manager documentation](https://www.swift.org/documentation/package-manager/)
- [GitHub: Creating a pull request from a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork)
