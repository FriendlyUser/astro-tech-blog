---
tags: ['latex', 'git']
title: Collaborating on LaTeX documents with Git and Overleaf
description: How to share a LaTeX project with co-authors using Git, Overleaf, or both, and how to keep diffs, merges, and formatting manageable.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2469646353.webp
---

LaTeX source is plain text, so co-authoring a paper or thesis works much like working on code. The two usual setups are a Git repository that everyone edits locally, or a shared Overleaf project edited in the browser. Overleaf can also sync with Git, so a team can mix the two.

LaTeX itself has no collaboration or version-control features; all of that comes from the tools around it.

:::note
ShareLaTeX, which older guides list as a separate option, merged into Overleaf in 2017. Its open-source code is what Overleaf Community Edition is built on today.
:::

## Choosing a setup

| | Git + local editor | Overleaf |
|---|---|---|
| Setup | Each author installs a TeX distribution and Git | Browser only |
| Editing | Offline, any editor | Online, real-time co-editing |
| History | Full history, branches, tags | 24 hours on the free plan, full history on paid plans |
| Review | Pull requests, `git diff`, `latexdiff` | Comments (all plans), track changes (paid plans) |
| Cost | Free | Free plan allows one invited collaborator per project |

Git suits co-authors who already use it and want branches and review. Overleaf suits mixed groups where some authors won't install anything. Plan limits change, so check [Overleaf's plans page](https://www.overleaf.com/user/subscription/plans) before you rely on them.

## Collaborating with Git

### Repository layout

Split long documents into one file per chapter or section and pull them in with `\input` or `\include`. Two people editing different files almost never conflict.

```latex
% main.tex
\documentclass{report}
\begin{document}
\include{chapters/introduction}
\include{chapters/methods}
\include{chapters/results}
\bibliography{refs}
\end{document}
```

Commit only the sources (`.tex`, `.bib`, figures, class/style files). Ignore build output so it doesn't cause pointless conflicts:

```gitignore
*.aux
*.bbl
*.blg
*.fdb_latexmk
*.fls
*.log
*.out
*.toc
*.synctex.gz
*.pdf
```

If the PDF of a figure is a source file, add it back explicitly (for example `!figures/*.pdf`).

### Write one sentence per line

Git diffs and merges work line by line. If each paragraph is one long line, a one-word change shows as the whole paragraph changing, and two authors editing the same paragraph always conflict. Putting each sentence on its own line keeps diffs small, and LaTeX renders the output the same because single line breaks are treated as spaces. When you do have long lines, `git diff --word-diff` shows the changed words instead of whole lines.

### A typical workflow

```bash
git clone https://github.com/<you>/<paper>.git
cd <paper>
git switch -c methods-rewrite
# edit chapters/methods.tex, build locally
git add chapters/methods.tex
git commit -m "Rewrite methods section 3.2"
git push -u origin methods-rewrite
# open a pull request; a co-author reviews and merges it
git switch main
git pull
```

Pull before you start each session. Short-lived branches merged often conflict far less than a branch that runs for weeks.

### Showing changes to non-Git readers

Supervisors and reviewers usually want a marked-up PDF rather than a diff. [latexdiff](https://ctan.org/pkg/latexdiff) produces one from two versions of the source:

```bash
git show submitted-v1:main.tex > old.tex
latexdiff old.tex main.tex > diff.tex
pdflatex diff.tex
```

This works best on a single file; for documents split with `\input`, see latexdiff's `--flatten` option.

## Collaborating with Overleaf

1. Create a project from a blank document or a template.
2. Click **Share** and invite people by email. Each invited collaborator gets a role: **Editor** can change content, **Reviewer** can comment and their edits are recorded as tracked changes, and **Viewer** can read and download. Link sharing is also available, but the Reviewer role can only be given to named collaborators.
3. Everyone edits the same project in real time. Use comments for discussion about specific text and the project chat for everything else.
4. Use **History** to see who changed what and to restore an earlier version, within your plan's history limit.

## Using Git and Overleaf together

Git integration and GitHub sync are premium features on Overleaf Cloud, and both work differently from a normal Git remote.

**Git integration** lets you clone the Overleaf project directly:

```bash
git clone https://git.overleaf.com/<project-id>
```

The project ID is the last part of the project's URL. When prompted, use `git` as the username and a Git authentication token (generated in Account Settings) as the password; account passwords are no longer accepted. Overleaf's Git bridge does not support branches or tags, so you push to the single default branch, and the result appears in the Overleaf editor.

**GitHub sync** links a project to a github.com repository from **Integrations > GitHub**. It is not automatic: you pull GitHub changes and push Overleaf changes from that menu. If both sides changed, Overleaf pushes its version to a separate, date-stamped branch, and you merge that branch on GitHub or locally. Only github.com is supported; for GitLab or other hosts, use the Git integration instead.

Either way, Overleaf won't merge branches for you. Branching and conflict resolution happen in Git, outside Overleaf.

## Gotchas

- **Agree on the build.** Pin the engine (pdfLaTeX, XeLaTeX, or LuaLaTeX) and the bibliography tool (BibTeX or Biber). A `latexmkrc` file in the repository, or the compiler setting in Overleaf, keeps everyone's output the same.
- **Put shared formatting in one place.** Keep custom macros and package loading in a single preamble or `.sty` file so co-authors don't each redefine `\vec` or margins in their own chapter.
- **Lint the source.** [ChkTeX](https://ctan.org/pkg/chktex) flags common LaTeX mistakes, and the [nag](https://ctan.org/pkg/nag) package warns about obsolete commands and packages. Neither checks spelling or style; run a spell checker separately.
- **Large or binary files.** Overleaf's Git bridge doesn't support Git LFS, and very large pushes can time out. Keep figures reasonably sized, and if a push fails, Overleaf's docs suggest raising `http.postBuffer`.

## Further reading

- [Overleaf Git integration](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/git-integration)
- [Overleaf GitHub synchronization](https://docs.overleaf.com/integrations-and-add-ons/git-integration-and-github-synchronization/github-synchronization)
- [Sharing an Overleaf project](https://docs.overleaf.com/collaborating/sharing-a-project)
- [latexdiff on CTAN](https://ctan.org/pkg/latexdiff)
