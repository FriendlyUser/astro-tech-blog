---
tags: ['latex']
title: "LaTeX syntax basics: commands, environments, math and document structure"
description: How LaTeX source is put together, covering commands, special characters, environments, math, figures, tables, custom macros and compiling to PDF.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1836890630.webp
---

LaTeX is a markup language for typesetting documents. You write plain text with commands mixed in, run it through a compiler, and get a PDF. It is the usual choice for papers, theses and anything with a lot of mathematics, because the math typesetting and automatic numbering of sections, equations and references work without manual effort.

This post covers the syntax you need to read and write a typical LaTeX document.

## A minimal document

Every document has a **preamble** (everything before `\begin{document}`) and a **body** (between `\begin{document}` and `\end{document}`). The preamble picks the document class, loads packages and sets metadata. Nothing in the preamble is printed.

```latex
\documentclass[12pt]{article}   % article, report, book, beamer, ...

\usepackage{amsmath}            % extra math environments
\usepackage{graphicx}           % \includegraphics
\usepackage{hyperref}           % clickable links and references

\title{My Document Title}
\author{My Name}
\date{\today}

\begin{document}
\maketitle

\section{Introduction}
Some text with \textbf{bold} and \textit{italic} words.

\subsection{Background}
More text.

\end{document}
```

`\maketitle` prints the title, author and date set in the preamble. In the `article` class it goes at the top of the first page; pass the `titlepage` class option if you want a separate title page. `\section`, `\subsection` and `\subsubsection` create numbered headings (`report` and `book` add `\chapter` above them). Use the starred form, such as `\section*{Notes}`, for an unnumbered heading.

## Commands, arguments and special characters

A command starts with a backslash followed by letters: `\section`, `\textbf`, `\today`. Arguments follow it:

- Required arguments go in curly braces: `\textbf{bold text}`.
- Optional arguments go in square brackets, before the required ones: `\includegraphics[width=5cm]{myimage.png}`.

Commands can be nested, as in `\textbf{\textit{bold italic}}`. Braces on their own also make a group, which limits the effect of declarations such as `\bfseries` or `\small`:

```latex
Normal text {\small this part is small} and normal again.
```

A command name made of letters swallows the spaces after it, so `\LaTeX is` prints as "LaTeXis". Write `\LaTeX{} is` or `\LaTeX\ is` to keep the space.

These ten characters have special meaning: `\ { } $ & # ^ _ % ~`. To print them as text:

| Character | Write |
| --- | --- |
| `%` | `\%` |
| `$` | `\$` |
| `&` | `\&` |
| `#` | `\#` |
| `_` | `\_` |
| `{` `}` | `\{` `\}` |
| `~` | `\textasciitilde` |
| `^` | `\textasciicircum` |
| `\` | `\textbackslash` |

So "10% discount" is written `10\% discount`. Ordinary punctuation like `!` or `?` needs no escaping.

`%` starts a comment that runs to the end of the line. A blank line starts a new paragraph, and `\\` forces a line break.

## Environments

An environment applies formatting to a region and is opened and closed with matching `\begin{name}` and `\end{name}`.

### Lists

```latex
\begin{itemize}          % bullets
  \item First item
  \item Second item
\end{itemize}

\begin{enumerate}        % numbers
  \item First step
  \item Second step
    \begin{itemize}      % lists can be nested
      \item Sub-point
    \end{itemize}
\end{enumerate}

\begin{description}      % labelled items
  \item[pdfLaTeX] The default engine.
  \item[XeLaTeX] Unicode input and system fonts.
\end{description}
```

To change the bullet or number style, redefine the label macros in the preamble, for example `\renewcommand{\labelitemi}{--}`. The `enumitem` package gives finer control, such as `\begin{enumerate}[label=(\alph*)]`.

Other environments you will see often are `quote`, `center`, `verbatim`, `abstract` (in `article` and `report`, not `book`), `figure` and `table` (below), and the math environments in the next section.

## Math

Math is typed in math mode. Superscripts, subscripts and Greek letters only work there.

- Inline: `$x^2$` or `\(x^2\)`.
- Displayed and numbered: the `equation` environment.
- Displayed, unnumbered: `\[ ... \]` or `equation*` (needs `amsmath`).
- Several aligned lines: `align` from `amsmath`, with `&` marking the alignment point and `\\` ending each line.

```latex
The area is $A = \pi r^2$ and the first index is $x_1$.

\begin{equation}
  f(x) = x^2 + 2x + 1
\end{equation}

\begin{align}
  \sum_{i=1}^{n} i &= \frac{n(n+1)}{2} \\
  \int_{0}^{\infty} e^{-x}\,dx &= 1
\end{align}

\[
  A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}
\]
```

`^` and `_` apply to the next single character, so use braces for anything longer: `x^{10}`, `x_{ij}`. Greek letters are `\alpha`, `\beta`, `\pi` and so on, with capitals such as `\Gamma` and `\Delta`. `bmatrix`, `pmatrix` and `align` come from `amsmath`.

## Figures and tables

`figure` and `table` are **floats**: LaTeX decides where they go on the page, and they carry a caption and a label you can reference. The content inside is whatever you like, whether an image, a TikZ drawing or a `tabular`.

### Images

Load `graphicx` in the preamble, then:

```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.5\textwidth]{example.png}
  \caption{Example image}
  \label{fig:example}
\end{figure}

As shown in Figure~\ref{fig:example}, ...
```

pdfLaTeX accepts PNG, JPEG and PDF images. The optional `[htbp]` lists where the float may go: here, top of a page, bottom, or a page of floats.

### Tables

The `tabular` argument gives one letter per column (`l`, `c`, `r`) and `|` for vertical rules. `&` separates cells, `\\` ends a row and `\hline` draws a horizontal rule.

```latex
\begin{table}[htbp]
  \centering
  \begin{tabular}{|l|r|}
    \hline
    Item & Price \\
    \hline
    Apples & 1.20 \\
    Pears  & 0.90 \\
    \hline
  \end{tabular}
  \caption{Example table}
  \label{tab:example}
\end{table}
```

The `booktabs` package (`\toprule`, `\midrule`, `\bottomrule`) gives better-looking tables without vertical lines.

### Drawings with TikZ

With `\usepackage{tikz}` in the preamble you can draw directly in the document. This draws four bars of a simple bar chart:

```latex
\begin{figure}[htbp]
  \centering
  \begin{tikzpicture}
    \draw (0,0)   rectangle (1,4);
    \draw (1.2,0) rectangle (2.2,2);
    \draw (2.4,0) rectangle (3.4,3);
    \draw (3.6,0) rectangle (4.6,1);
  \end{tikzpicture}
  \caption{Bars drawn with TikZ}
  \label{fig:bars}
\end{figure}
```

For real charts from data, `pgfplots` (built on TikZ) is the usual package.

## Layout packages

Packages are loaded in the preamble with `\usepackage[options]{name}`. Some common ones for page layout:

- `geometry` for paper size and margins: `\usepackage[a4paper, margin=2cm]{geometry}`, or `\geometry{left=1in, right=1in, top=1in, bottom=1in}` after loading it.
- `fancyhdr` for custom headers and footers.
- `titlesec` for changing how section headings look.
- `setspace` for line spacing (`\onehalfspacing`, `\doublespacing`).
- `hyperref` for clickable cross-references and URLs. Load it near the end of the preamble, because it patches many other packages.

## Defining your own commands

`\newcommand` defines a macro in the preamble. The name must be a backslash followed by letters only, with no hyphens or digits.

```latex
% No arguments
\newcommand{\foxphrase}{the quick brown fox jumps over the lazy dog}

% Three required arguments, referenced as #1, #2, #3
\newcommand{\dateformat}[3]{#1/#2/#3}

% Two arguments, the first optional with default "Note"
\newcommand{\callout}[2][Note]{\textbf{#1:} #2}
```

Used in the body:

```latex
Here is the phrase: \foxphrase.
Today's date is \dateformat{12}{3}{2023}.
\callout{Check the margins.}
\callout[Warning]{This overwrites the file.}
```

`\newcommand` fails if the name already exists. Use `\renewcommand` to redefine an existing command on purpose.

## Compiling

The three common engines are:

- `pdflatex`: the default; fast and widely supported, but limited Unicode and font support.
- `xelatex`: native Unicode input and system OpenType fonts through the `fontspec` package.
- `lualatex`: also Unicode and OpenType through `fontspec`, plus Lua scripting. It is generally slower than pdfLaTeX.

From the command line:

```bash
pdflatex report.tex
```

Cross-references, the table of contents and bibliographies need more than one pass, so run the compiler twice (or more with BibTeX/Biber). `latexmk` reruns as many times as needed:

```bash
latexmk -pdf report.tex      # pdflatex
latexmk -lualatex report.tex # lualatex
```

Editors such as TeXstudio, or the online editor Overleaf, run these for you behind a "Build" or "Recompile" button.

## Tips and common errors

- Compile often. LaTeX error messages give a line number, but a missing `}` or `\end{...}` can surface much later than the actual mistake.
- `Undefined control sequence` usually means a typo in a command name or a missing `\usepackage`.
- `Missing $ inserted` means you used `^`, `_` or a math command outside math mode, or an unescaped `_` in text.
- For blocks of commented-out text, the `comment` package provides a `comment` environment. Otherwise prefix each line with `%`.
- For long documents, split chapters into separate files and pull them in with `\input{chapter1}` or `\include{chapter1}`.
- Keep `.tex` files in Git. They are plain text, so diffs are readable.

## Further reading

- [LaTeX Project documentation](https://www.latex-project.org/help/documentation/)
- [Overleaf's Learn LaTeX guides](https://www.overleaf.com/learn)
- [CTAN](https://ctan.org/) for package documentation
