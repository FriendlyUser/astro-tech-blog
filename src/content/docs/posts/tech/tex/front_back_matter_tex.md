---
tags: ['latex']
title: "Front and back matter in LaTeX: title pages, contents, bibliography, glossary and index"
description: How to structure a LaTeX book with \frontmatter, \mainmatter and \backmatter, and add a table of contents, appendices, BibTeX bibliography, glossary and index.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2062539924.png
---

Front matter is everything before the main text: title page, abstract or preface, dedication, table of contents, lists of figures and tables. Back matter comes after it: appendices, bibliography, glossary, index. In LaTeX most of these are one command each. What trips people up is page numbering, getting unnumbered sections into the table of contents, and the extra tool runs that bibliographies, glossaries and indexes need.

What you include depends on the document. A book usually has most of the list above. A research paper has a title, abstract and references. A thesis adds acknowledgements, a list of figures and appendices, and the university usually dictates the order.

## Splitting a book into front, main and back matter

The `book` class (and `memoir`) has three commands that switch page numbering and chapter numbering for you:

- `\frontmatter` sets roman page numbers (i, ii, iii) and makes `\chapter` unnumbered, though those chapters still appear in the table of contents.
- `\mainmatter` starts a new right-hand page, resets the page number to 1 in arabic numerals and turns chapter numbering back on.
- `\backmatter` makes chapters unnumbered again; page numbering carries on.

`\appendix` goes inside the main matter, before `\backmatter`. It doesn't need a package: it resets the chapter counter and switches chapter numbering to letters, so `\chapter{Data tables}` becomes "Appendix A". `\chapter` exists only in `book` and `report`; in `article`, `\appendix` letters the `\section`s instead.

Here is a complete skeleton. It expects a `refs.bib` file (shown later) next to it.

```latex
\documentclass{book}
\usepackage{graphicx}
\usepackage[nottoc]{tocbibind}   % list the bibliography and index in the TOC
\usepackage{makeidx}
\makeindex
\usepackage{hyperref}            % clickable TOC entries, citations and cross-references

\title{My Book}
\author{Jane Doe}
\date{\today}

\begin{document}

\frontmatter
\maketitle

\chapter{Preface}
Why this book exists.

\cleardoublepage
\thispagestyle{empty}
\vspace*{\fill}
\begin{center}
  \emph{To my family.}
\end{center}
\vspace*{\fill}

\tableofcontents
\listoffigures
\listoftables

\mainmatter
\chapter{Introduction}\label{ch:intro}
\LaTeX\index{LaTeX} is described in \cite{lamport94}.
See Appendix~\ref{app:data} for the raw numbers.

\begin{figure}
  \centering
  \includegraphics[width=0.6\textwidth]{example-image}
  \caption{A placeholder figure}
  \label{fig:placeholder}
\end{figure}

\appendix
\chapter{Raw data}\label{app:data}
Tables go here.

\backmatter
\bibliographystyle{plain}
\bibliography{refs}
\printindex

\end{document}
```

`example-image` ships with the `mwe` package, which TeX Live and MiKTeX include, so the figure compiles without an image of your own. `hyperref` should normally be the last package you load. The packages that need to come after it, such as `glossaries`, say so in their manuals.

## Title page, abstract and dedication

`\maketitle` builds the title from `\title`, `\author` and `\date`. In `book` it gets a page of its own. In `article` it sits at the top of the first page unless you pass the `titlepage` class option. For a custom layout, write a `titlepage` environment by hand instead of calling `\maketitle`:

```latex
\begin{titlepage}
  \centering
  {\Huge My Book\par}
  \vspace{2cm}
  {\Large Jane Doe\par}
  \vfill
  {\large \today\par}
\end{titlepage}
```

`article` and `report` provide an `abstract` environment. `book` does not, so in a book use an unnumbered chapter in the front matter (`\chapter{Abstract}` after `\frontmatter`). If you need `\chapter*`, add it to the table of contents yourself with `\addcontentsline{toc}{chapter}{Abstract}`.

```latex
\begin{abstract}
One paragraph on the problem, the method and the result.
\end{abstract}
```

None of the standard classes has a `dedication` environment. Either use a centred block on its own page, as in the skeleton above, or define your own environment in the preamble.

## Table of contents and lists of figures and tables

`\tableofcontents`, `\listoffigures` and `\listoftables` read the `.toc`, `.lof` and `.lot` files that the *previous* run wrote, so compile twice before they are correct. `\setcounter{tocdepth}{1}` limits the TOC to chapters and sections (in `book`: 0 = chapter, 1 = section, 2 = subsection).

The bibliography and index use starred, unnumbered headings and normally don't appear in the TOC. The `tocbibind` package adds them. `nottoc` stops the table of contents from listing itself.

To change how the TOC looks (dot leaders, indents, fonts, spacing), use `tocloft`:

```latex
\usepackage{tocloft}
\renewcommand{\cftchapleader}{\cftdotfill{\cftdotsep}}  % dotted leaders for chapters
\setlength{\cftbeforechapskip}{4pt}                     % less space before chapter entries
```

Don't load `tocloft` with `memoir`, which has its own equivalents built in.

With `hyperref` loaded, TOC entries, `\ref`s and `\cite`s become links. `\usepackage[colorlinks=true, linkcolor=blue, citecolor=blue, urlcolor=blue]{hyperref}` replaces the default coloured boxes, which show only in PDF viewers, with coloured text.

## Bibliography with BibTeX

Store references in a `.bib` file:

```bibtex
@book{lamport94,
  author    = {Leslie Lamport},
  title     = {{\LaTeX}: A Document Preparation System},
  publisher = {Addison-Wesley},
  edition   = {2nd},
  year      = {1994}
}

@article{knuth84,
  author  = {Donald E. Knuth},
  title   = {Literate Programming},
  journal = {The Computer Journal},
  volume  = {27},
  number  = {2},
  pages   = {97--111},
  year    = {1984}
}
```

Every entry type has required fields. `@book` needs `author` or `editor`, `title`, `publisher` and `year`. `@article` needs `author`, `title`, `journal` and `year`; `volume` is optional. BibTeX warns about missing fields when it runs.

The `crossref` field is for inheritance, not for citing one work from another. An `@inproceedings` entry can set `crossref = {conf2024}` to take its `booktitle`, `year` and `publisher` from the `@proceedings` entry `conf2024`. The parent entry has to come *after* the entries that point to it in the `.bib` file.

In the document, cite with `\cite{key}`, and set a style plus the `.bib` file name (without the extension) where the bibliography should go:

```latex
\bibliographystyle{plain}   % also: unsrt, alpha, abbrv, apalike
\bibliography{refs}
```

Leave out `\bibliographystyle` and BibTeX stops with an error. BibTeX has no `apa` style: `apalike` is the closest built-in one. For real APA formatting use `biblatex` with the `apa` style (see below).

### Author–year citations with natbib

`natbib` adds `\citet{key}` for textual citations ("Lamport (1994)"), `\citep{key}` for parenthetical ones ("(Lamport, 1994)"), plus `\citeauthor` and `\citeyear`. `\citeyear` prints the bare year; `\citeyearpar` adds the parentheses. Pair it with a natbib-aware style such as `plainnat`:

```latex
\usepackage[round]{natbib}
% ...
\bibliographystyle{plainnat}
\bibliography{refs}
```

For numeric citations, load `\usepackage[numbers,sort&compress]{natbib}`. `sort&compress` turns `\citep{a,b,c}` into "[1–3]". It is a *package* option. `\setcitestyle` only accepts layout keys such as `round`, `square`, `numbers`, `authoryear`, `comma` and `semicolon`.

### biblatex

For new documents, `biblatex` with the Biber backend is the more flexible option. Styles are written in LaTeX rather than BibTeX's `.bst` language, and Biber handles Unicode:

```latex
\usepackage[backend=biber, style=authoryear]{biblatex}
\addbibresource{refs.bib}   % extension required here
% ...
\printbibliography
```

Swap `style=authoryear` for `style=apa` (from the `biblatex-apa` package) to get APA formatting. Run `biber` instead of `bibtex` when you build.

## Glossary and list of abbreviations

The `glossaries` package needs `\makeglossaries` in the preamble. Without it, `\printglossaries` prints nothing.

```latex
\usepackage{hyperref}
\usepackage{glossaries}     % load after hyperref
\makeglossaries

\newglossaryentry{latex}{
  name={\LaTeX},
  description={a document preparation system built on \TeX}
}
\newacronym{cpu}{CPU}{central processing unit}

\begin{document}
I wrote this in \gls{latex}. The \gls{cpu} runs it.  % first use of an acronym prints the full form
\printglossaries
\end{document}
```

After the first LaTeX run, run `makeglossaries mydoc` (no extension), then compile again. `makeglossaries` is a Perl script. If you have no Perl, `makeglossaries-lite` (Lua) does the same job.

For a simple list of symbols or abbreviations, `nomencl` is lighter:

```latex
\usepackage{nomencl}
\makenomenclature
% ...
The \nomenclature{CPU}{Central processing unit}CPU runs the code.
\printnomenclature
```

It is built with `makeindex mydoc.nlo -s nomencl.ist -o mydoc.nls` between two LaTeX runs.

## Index

Load `makeidx` and call `\makeindex` in the preamble so LaTeX writes a `.idx` file. Mark terms with `\index{term}`, or with `\index{LaTeX!packages}` for a sub-entry, and put `\printindex` where the index should go. After the first LaTeX run, process the file and compile again:

```bash
makeindex mydoc.idx
```

`imakeidx` is a drop-in replacement that runs `makeindex` for you during compilation, and supports more than one index.

## Build order

A document with all of the above needs several passes:

```bash
pdflatex mydoc
bibtex mydoc          # or: biber mydoc
makeindex mydoc.idx
makeglossaries mydoc
pdflatex mydoc
pdflatex mydoc
```

`latexmk -pdf mydoc` works out the BibTeX/Biber and `makeindex` runs on its own. For `glossaries` and `nomencl` it needs a custom rule in `.latexmkrc`; latexmk's documentation includes example rc files for both. Overleaf runs latexmk for you.

## Common problems

- **`??` or `[?]` in the output**: a reference or citation that hasn't resolved yet. Run the full build sequence. If it persists, check the key spelling and the BibTeX log (`.blg`).
- **Bibliography or index missing from the TOC**: load `tocbibind`, or add `\addcontentsline` before the command.
- **Page numbers restart in the wrong place**: in `book`, use `\frontmatter`/`\mainmatter` rather than calling `\pagenumbering` by hand.
- **Empty glossary**: `\makeglossaries` is missing, or you never ran `makeglossaries`. Entries that are defined but never used with `\gls` are left out by design.
- **Appendix chapters listed with numbers instead of letters**: `\appendix` must come before the first appendix `\chapter`.

## Further reading

- [Overleaf: Bibliography management with BibTeX](https://www.overleaf.com/learn/latex/Bibliography_management_with_bibtex)
- [natbib on CTAN](https://ctan.org/pkg/natbib) and [biblatex on CTAN](https://ctan.org/pkg/biblatex)
- [glossaries on CTAN](https://ctan.org/pkg/glossaries)
- [tocloft on CTAN](https://ctan.org/pkg/tocloft) and [tocbibind on CTAN](https://ctan.org/pkg/tocbibind)
- [The memoir class manual](https://ctan.org/pkg/memoir), which covers book design in depth
