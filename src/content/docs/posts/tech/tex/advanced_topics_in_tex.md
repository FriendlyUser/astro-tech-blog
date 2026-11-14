---
tags: ['latex']
title: "LaTeX beyond the basics: CVs, invoices, theses and books"
description: Working examples of the LaTeX classes and packages for CVs (moderncv, europecv), invoices, theses (biblatex, siunitx) and books (memoir, KOMA-Script).
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2338311710.png
---

Once you can write an `article`, most "advanced" LaTeX work is choosing the right document
class or package for the job and learning its few commands. This post covers the usual
choices for a CV, an invoice, a thesis or a book, with examples you can compile.

One distinction trips people up: a **class** is loaded with `\documentclass{...}` and defines
the whole document (`moderncv`, `europecv`, `memoir`, `scrbook`, `beamer`). A **package** is
loaded with `\usepackage{...}` on top of a class (`invoice`, `biblatex`, `siunitx`). Writing
`\usepackage{moderncv}` won't work, because moderncv is a class.

## Packages worth knowing

These come up in almost every larger document:

- `geometry`: page size and margins, e.g. `\usepackage[margin=1in]{geometry}`.
- `hyperref`: clickable cross-references, URLs (`\url`, `\href`) and PDF bookmarks. Load it
  near the end of the preamble.
- `amsmath`: `align`, `cases`, matrices and other multi-line maths.
- `siunitx`: numbers and units with consistent spacing (`\qty{25}{\celsius}`).
- `biblatex` (with the `biber` backend) or `natbib` (with BibTeX): citations and bibliographies.
- `glossaries`: glossaries and acronym lists.
- TikZ (`\usepackage{tikz}`): diagrams drawn in LaTeX code.
- `beamer` (a class): slides.
- `minted` or `listings`: source code listings. `minted` highlights with Python's Pygments,
  so it needs Python at compile time; `listings` is pure LaTeX.

## CVs and résumés

### moderncv

`moderncv` is a class with five built-in styles: `casual`, `classic`, `banking`, `oldstyle`
and `fancy`. A complete CV:

```latex
\documentclass[11pt,a4paper,sans]{moderncv}
\moderncvstyle{classic}   % casual, classic, banking, oldstyle, fancy
\moderncvcolor{blue}

\name{Jane}{Doe}
\title{Software Engineer}
\address{123 Main Street}{Anytown}{Canada}
\phone[mobile]{+1~(555)~555~5555}
\email{jane@example.com}

\begin{document}
\makecvtitle

\section{Experience}
\cventry{2014--Present}{Software Engineer}{ABC Inc.}{Anytown}{}{Built and ran the billing service.}

\section{Education}
\cventry{2010--2014}{B.Sc. Computer Science}{University of XYZ}{Anytown}{}{}

\section{Skills}
\cvitem{Languages}{Python, Go, SQL}
\end{document}
```

`\cventry` takes six arguments: dates, title, organisation, location, grade, and description.
Leave the ones you don't need empty (`{}`), but keep the braces.

### europecv

`europecv` is an unofficial class for the Europass CV layout. The CV goes inside a `europecv`
environment, personal details are set in the preamble and printed with `\ecvpersonalinfo`,
and each row is an `\ecvitem{left column}{right column}`. The class manual marks
`\ecvsection` as deprecated; use a normal `\section` instead.

```latex
\documentclass[helvetica,narrow]{europecv}
\usepackage{graphicx} % needed for the Europass logo

\ecvname{Jane, Doe}
\ecvaddress{123 Main Street, Anytown}
\ecvemail{jane@example.com}

\begin{document}
\begin{europecv}
\ecvpersonalinfo

\section{Work experience}
\ecvitem{Dates}{2014--Present}
\ecvitem{Position}{Software Engineer, ABC Inc.}

\section{Education and training}
\ecvitem{Dates}{2010--2014}
\ecvitem{Qualification}{B.Sc. Computer Science, University of XYZ}
\end{europecv}
\end{document}
```

Commands such as `\ecvworkexperience` or `\ecvskills` don't exist. Check `texdoc europecv`
for the full list.

### Templates

If you'd rather start from a finished design than a class, Awesome CV and AltaCV are popular
templates on GitHub and Overleaf. Awesome CV uses `fontspec`, so it needs XeLaTeX or LuaLaTeX
rather than pdfLaTeX.

## Invoices and letters

The `invoice` package gives you an `invoice` environment that does the arithmetic. It takes
two arguments: the currency name and the VAT rate as a plain number (`0` hides the VAT lines).
Inside it you open a project with `\ProjectTitle`, list fees with
`\Fee{description}{rate}{count}`, then expenses with `\EBC{description}{amount}`. Fees must
come before expenses.

```latex
\documentclass{article}
\usepackage{invoice}

\begin{document}
\begin{invoice}{USD}{0}
  \ProjectTitle{Website redesign}%
  \Fee{Consulting}{100.00}{10}
  \Fee{Design}{80.00}{5}
  \EBC{Stock photos}{45.00}
\end{invoice}
\end{document}
```

Subtotals and the total are calculated for you. There's no `\Total` or `\tax` command.
`\Discount{description}{amount}` deducts a down payment. The manual recommends ending each
`\ProjectTitle{...}` line with `%` so the first column lines up. The package doesn't handle
logos, addresses or bank details. Put the invoice inside a letter class for those. With
KOMA-Script's old `scrlettr` class the environment is renamed to `invoiceenv`. CTAN also lists
`invoice2`, a separate LaTeX3-based package.

For the letter itself, use the standard `letter` class or KOMA-Script's `scrlttr2` class, which
handles sender/recipient fields, window envelopes and closings.

## Theses and academic papers

Start from your institution's template if it has one. It saves you from fighting the
formatting rules. The packages that do most of the work:

```latex
\documentclass[12pt]{report}
\usepackage{amsmath}
\usepackage{siunitx}
\usepackage[style=authoryear]{biblatex}
\addbibresource{bibliography.bib}
\usepackage{hyperref}

\begin{document}
\textcite{smith2010} measured the sample at \qty{25}{\celsius},
over a range of \qtyrange{10}{40}{\celsius}.

\begin{align}
  y &= mx + b \\
  E &= mc^2
\end{align}

\printbibliography
\end{document}
```

Notes on this example:

- biblatex uses `biber` by default, so the build is `pdflatex`, `biber`, `pdflatex`,
  `pdflatex` (or let `latexmk` work it out). `\textcite` gives "Smith (2010)" and `\parencite`
  gives "(Smith 2010)".
- siunitx version 3 introduced `\qty` and `\qtyrange`. The older `\SI` and `\SIrange` still work
  for backward compatibility, but new documents should use the new names.
- If a journal requires BibTeX, use `natbib` instead: `\usepackage{natbib}`,
  `\bibliographystyle{plainnat}`, `\citet{key}` / `\citep{key}` in the text and
  `\bibliography{bibliography}` where the list should appear.

## Books

The standard `book` class gives you chapters, front/back matter and two-sided layout. For
more control, two classes do most of the work:

- `memoir`: a book class that includes many packages' features (page layout, headers, chapter
  styles, epigraphs).
- `scrbook`: KOMA-Script's book class, with its own font and layout interface.

Setting 1-inch margins in memoir. `\checkandfixthelayout` is required after changing the
layout:

```latex
\documentclass[12pt]{memoir}
\setlrmarginsandblock{1in}{1in}{*}
\setulmarginsandblock{1in}{1in}{*}
\checkandfixthelayout
```

With `scrbook`, change heading fonts through KOMA's font interface rather than another package.
For example, this switches all headings to the serif body font in bold:

```latex
\documentclass[12pt]{scrbook}
\setkomafont{disposition}{\normalfont\bfseries}
```

With the standard `book` class, `fancyhdr` handles headers and footers, and `titlesec` restyles
chapter and section headings:

```latex
\usepackage{fancyhdr}
\pagestyle{fancy}
\fancyhf{}
\fancyhead[LE,RO]{\thepage}
\fancyhead[RE]{\leftmark}
\fancyhead[LO]{\rightmark}
```

Don't combine `titlesec` with memoir or KOMA-Script classes. Both have their own heading
commands, and KOMA-Script warns when `titlesec` is loaded. For a wide-margin layout with
side notes, the `tufte-book` class (from the tufte-latex bundle) is worth a look.

## Finding documentation

- `texdoc <name>` (e.g. `texdoc moderncv`) opens a package's manual from your TeX Live install.
  The manuals are the most reliable reference, and most include complete examples.
- [CTAN](https://ctan.org): the central archive of TeX packages. Each package page links to its
  manual and shows the current version.
- [TeX Stack Exchange](https://tex.stackexchange.com): searchable answers to most error messages.
- [Overleaf documentation](https://www.overleaf.com/learn) and the
  [LaTeX Wikibook](https://en.wikibooks.org/wiki/LaTeX): readable introductions to most of the
  topics above.
- *The LaTeX Companion* (3rd edition, Mittelbach and Fischer): the book-length reference for
  packages.

## References

- https://ctan.org
