---
tags: ['latex']
title: "Getting started with LaTeX: install, compile, commands and environments"
description: How to install a LaTeX distribution and editor, how a .tex document is structured, and how commands and environments work, with examples that compile.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2291827528.webp
---

LaTeX is a document preparation system: you write plain-text source with markup commands, and a TeX engine turns it into a typeset PDF. It is the standard tool for papers, theses and anything with a lot of mathematics, because its equation typesetting, cross-references and bibliographies are much better than what a word processor gives you.

LaTeX was written by Leslie Lamport in the early 1980s as a set of macros on top of Donald Knuth's TeX. Today it is maintained by the LaTeX Project team and distributed under the LaTeX Project Public License (LPPL). Thousands of add-on packages are published on CTAN, the Comprehensive TeX Archive Network.

## LaTeX compared with Word and Markdown

The main difference from Word or Google Docs is that you describe structure ("this is a section", "this is an equation") and LaTeX decides the layout. That has a few practical consequences:

- **Maths.** Equations are written in a compact text syntax (`\frac{a}{b}`, `\sum_{i=1}^n`) and come out properly spaced and numbered.
- **Consistency.** Numbering, tables of contents, cross-references (`\label`/`\ref`) and bibliographies are generated for you, so they stay correct as the document changes.
- **Plain text.** Source files work with Git and diff tools, and a large document can be split into several files with `\input` or `\include`.
- **Learning curve.** You have to compile to see the result, and error messages can be cryptic. For a short memo, a word processor is quicker.

Compared with Markdown and HTML, LaTeX targets print-ready PDF rather than the web. It gives you much finer control over typesetting (hyphenation, line breaking, fonts, floats), at the cost of a heavier syntax and toolchain.

## Installing a distribution

You need a TeX distribution, which provides the engines (`pdflatex`, `xelatex`, `lualatex`), the build tool `latexmk`, and the packages.

- **Windows:** [MiKTeX](https://miktex.org/download) installs missing packages on demand, which keeps the initial install small. [TeX Live](https://tug.org/texlive/) also runs on Windows if you want the same distribution as on Linux.
- **macOS:** [MacTeX](https://www.tug.org/mactex/) is TeX Live packaged as a `.pkg` installer, plus Mac tools such as TeXShop.
- **Linux:** use TeX Live from your package manager. On Ubuntu or Debian, `sudo apt install texlive-full` installs everything (several gigabytes). `texlive-latex-extra` is a smaller set that covers most documents.

If you don't want to install anything, [Overleaf](https://www.overleaf.com/) compiles LaTeX in the browser.

## Choosing an editor

Any text editor works, but a LaTeX-aware one gives you a compile button, a PDF preview and autocomplete for commands.

- [TeXstudio](https://www.texstudio.org/): set the compiler under `Options > Configure TeXstudio > Build > Default Compiler`.
- [Texmaker](https://www.xm1math.net/texmaker/): similar feature set, configured under `Options > Configure Texmaker`.
- TeXworks: a minimal editor bundled with MiKTeX and TeX Live on Windows.
- VS Code with the LaTeX Workshop extension, if you already use VS Code.

## Structure of a document

A LaTeX file has three parts:

1. **Document class** on the first line, e.g. `\documentclass{article}`. Other common classes are `report`, `book` and `beamer` (slides).
2. **Preamble**: everything between the class and `\begin{document}`. This is where you load packages with `\usepackage` and set options such as margins.
3. **Body**: the content between `\begin{document}` and `\end{document}`, organised with `\section`, `\subsection` and so on.

A minimal document:

```latex
\documentclass{article}

% Preamble
\usepackage{lipsum} % generates placeholder text

\begin{document}

\section{Introduction}
\label{sec:intro}
\lipsum[1]

\section{Results}
As described in Section~\ref{sec:intro}, \lipsum[2]

\end{document}
```

Save it as `main.tex` and compile it from your editor, or from the command line:

```bash
latexmk -pdf main.tex
```

`latexmk` reruns `pdflatex` as many times as needed so that cross-references like `\ref{sec:intro}` resolve, and produces `main.pdf`.

## Commands

A command starts with a backslash, takes mandatory arguments in curly braces and optional arguments in square brackets:

```latex
\textbf{This text will be bold.}
```

```latex
\usepackage{graphicx} % in the preamble

\includegraphics[width=5cm]{image.png} % in the body
```

Here `width=5cm` is the optional argument and `image.png` is the mandatory one. `\includegraphics` comes from the `graphicx` package, so it fails with "Undefined control sequence" unless the package is loaded.

Commands also produce special characters. `\'{e}` gives é, and characters that LaTeX reserves (`# $ % & _ { }`) are written as `\#`, `\$`, `\%`, `\&`, `\_`, `\{` and `\}`. With a modern distribution and UTF-8 source (the default since 2018), you can usually type accented characters directly.

## Environments

An environment applies to a block of content between `\begin{name}` and `\end{name}`:

```latex
\begin{center}
This text will be centered.
\end{center}
```

Environments nest. Here an `itemize` list sits inside the second item of a `description` list:

```latex
\begin{description}
  \item[First item] This is the first item in the list.
  \item[Second item] This is the second item in the list.
    \begin{itemize}
      \item A bullet point within the second item.
      \item Another bullet point within the second item.
    \end{itemize}
  \item[Third item] This is the third item in the list.
\end{description}
```

Environments can take optional arguments too. For `figure`, the argument is a list of allowed placements: `h` (here), `t` (top of page), `b` (bottom), `p` (separate float page):

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{example.png}
  \caption{This is a caption for the figure.}
  \label{fig:example}
\end{figure}
```

Figures are floats: LaTeX moves them to where they fit best. Giving only `[h]` is often overridden (LaTeX changes it to `[ht]` and warns you), so allow several placements and refer to the figure with `Figure~\ref{fig:example}` rather than "the figure below".

## Further reading

- [Learn LaTeX](https://www.learnlatex.org/): short official tutorial lessons.
- [Overleaf documentation](https://www.overleaf.com/learn): reference pages for most common tasks.
- [CTAN](https://ctan.org/): package documentation.
