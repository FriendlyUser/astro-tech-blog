---
tags: ['latex']
title: "LaTeX text formatting: fonts, sizes, alignment, lists, colour and tables"
description: A practical reference for formatting text in LaTeX, covering font commands, sizes, alignment, special characters, lists, xcolor, tables, macros and fontspec.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/303236472.webp
---

LaTeX separates what text *is* (a heading, an emphasised word, a list item) from how it looks.
Most formatting is done with a small set of commands and environments, and once you know the
difference between a *command* (`\textbf{...}`) and a *declaration* (`\bfseries`), the rest
follows. This post walks through the everyday ones, with examples that compile with a current
TeX Live or MiKTeX.

## A complete example

Everything below can be pasted into this skeleton. It compiles with `pdflatex`:

```latex
\documentclass[11pt]{article}   % 10pt (default), 11pt or 12pt
\usepackage[T1]{fontenc}        % better hyphenation and copy/paste for accented text
\usepackage[dvipsnames]{xcolor} % colours, plus named colours like ForestGreen
\usepackage{graphicx}           % \includegraphics
\usepackage{booktabs}           % \toprule, \midrule, \bottomrule

\newcommand{\term}[1]{\textbf{#1}}

\begin{document}

This is \textbf{bold}, \textit{italic}, \texttt{monospace} and \textsc{small caps}.
We define a \term{central limit theorem} once and format it the same way everywhere.

{\large Larger text for the rest of this group.\par}

\textcolor{ForestGreen}{Green text} and \colorbox{yellow}{highlighted text}.

\end{document}
```

## Font style: commands and declarations

Each style has two forms. The command form takes an argument and only affects that argument.
The declaration form changes the font until the end of the current group (`{...}` or an
environment).

| Effect | Command | Declaration |
| --- | --- | --- |
| Bold | `\textbf{...}` | `\bfseries` |
| Italic | `\textit{...}` | `\itshape` |
| Small caps | `\textsc{...}` | `\scshape` |
| Monospace | `\texttt{...}` | `\ttfamily` |
| Sans serif | `\textsf{...}` | `\sffamily` |
| Roman (serif) | `\textrm{...}` | `\rmfamily` |
| Document default | `\textnormal{...}` | `\normalfont` |

```latex
This word is \textbf{bold}.
{\bfseries This whole sentence is bold.}
\textbf{\textit{Bold and italic.}}
```

Use the command form for a few words and the declaration form for longer stretches. The old
two-letter forms `\bf` and `\it` are obsolete in LaTeX2e and don't combine (`{\bf\it x}` is just
italic); don't use them.

`\emph{...}` is different from `\textit`: it means "emphasise", so it renders italic inside
upright text and upright inside italic text. Prefer it for emphasis in prose.

`\underline{...}` exists, but underlined text can't break across lines. If you need that, the
`ulem` package's `\uline` or the `soul` package's `\ul` can. Load `ulem` as
`\usepackage[normalem]{ulem}`, otherwise it changes `\emph` to underline.

## Font sizes

Sizes are declarations, not commands with arguments. From smallest to largest:

`\tiny`, `\scriptsize`, `\footnotesize`, `\small`, `\normalsize`, `\large`, `\Large`,
`\LARGE`, `\huge`, `\Huge`

The actual point sizes depend on the class and its base size (`10pt`, `11pt` or `12pt` in
`article`). Wrap a size change in a group:

```latex
This is normal, {\small this is smaller}, and back to normal.

{\Large
A whole paragraph in a larger size.\par}
```

Writing `\small{text}` looks like it works, but the braces aren't an argument: `\small` applies
to everything after it until the enclosing group ends.

The `\par` matters for whole paragraphs. Line spacing is decided when the paragraph ends, so if
the group closes before the paragraph does, you get large text on the small line spacing.

## Alignment

Text is fully justified by default. To change that:

| Environment | Declaration | Result |
| --- | --- | --- |
| `center` | `\centering` | centred |
| `flushleft` | `\raggedright` | left-aligned, ragged right edge |
| `flushright` | `\raggedleft` | right-aligned |

```latex
\begin{center}
This paragraph is centred.
\end{center}

{\raggedleft This paragraph is right-aligned.\par}
```

The environments add vertical space above and below. Inside a `figure` or `table`, use
`\centering` instead of `\begin{center}` to avoid that extra gap.

## Special characters

Ten characters have special meaning in LaTeX. Escape them like this:

| Character | Input |
| --- | --- |
| `#` `$` `%` `&` `_` `{` `}` | `\#` `\$` `\%` `\&` `\_` `\{` `\}` |
| `~` | `\textasciitilde` |
| `^` | `\textasciicircum` |
| `\` | `\textbackslash` |

`\~` and `\^` don't print those characters: they are accent commands (`\~{n}` gives ñ). A bare
`~` is a non-breaking space, and `\\` is a line break, not a backslash.

Accents can be typed directly as UTF-8 (ä, é, ß) or with commands such as `\"{a}` and `\'{e}`.
Since the 2018-04-01 LaTeX release, UTF-8 is the default input encoding, so
`\usepackage[utf8]{inputenc}` is no longer needed. With `pdflatex`, still load
`\usepackage[T1]{fontenc}` so words with accented letters hyphenate properly. With XeLaTeX or
LuaLaTeX, don't load either package; `fontspec` handles encoding.

## Lists

`itemize` gives bullets, `enumerate` gives numbers, and they nest (up to four levels deep):

```latex
\begin{enumerate}
  \item First step
  \item Second step
    \begin{itemize}
      \item A detail
      \item Another detail
    \end{itemize}
  \item Third step
\end{enumerate}
```

There is also `description` for term/definition lists: `\item[Term] Definition`. To change
labels or spacing, the `enumitem` package is the usual tool (for example
`\begin{enumerate}[label=(\alph*)]`).

## Colour with xcolor

Load `xcolor` in the preamble. Base colour names (`red`, `blue`, `teal`, `orange`, `gray` and
others) work straight away; the `dvipsnames` option adds about 70 more, such as `ForestGreen`.

```latex
\definecolor{myblue}{RGB}{50,100,200}  % RGB 0-255
\definecolor{brand}{HTML}{1E88E5}      % hex

\textcolor{myblue}{Blue text}
{\color{brand} Everything in this group is brand-coloured.}
\textcolor{red!60!black}{60\% red mixed with black}
\colorbox{yellow}{Text on a yellow background}
\fcolorbox{black}{lightgray}{Text with a frame and background}
```

`\pagecolor{...}` sets the background of the current and following pages.

## Tables and figures

`tabular` builds the table itself. The required argument gives one letter per column: `l`, `c`
or `r` for alignment, or `p{4cm}` for a fixed-width column that wraps text. `&` separates cells
and `\\` ends a row. The optional argument (`[t]`, `[c]`, `[b]`) sets vertical alignment
relative to the surrounding line, not the width. For a table of a given total width, use the
`tabularx` package.

`table` and `figure` are *floats*: LaTeX moves them to a good spot and gives them a caption and
a number. Put `\label` after `\caption` so references point to the right number.

```latex
\begin{table}[htbp]
  \centering
  \begin{tabular}{lcr}
    \toprule
    Left & Center & Right \\
    \midrule
    1 & 2 & 3 \\
    4 & 5 & 6 \\
    \bottomrule
  \end{tabular}
  \caption{A small table}
  \label{tab:small}
\end{table}

\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.5\textwidth]{myfigure.png}
  \caption{A figure}
  \label{fig:myfigure}
\end{figure}

See Table~\ref{tab:small} and Figure~\ref{fig:myfigure}.
```

The placement options are `h` (here), `t` (top of page), `b` (bottom), `p` (separate float
page) and `!` (relax some restrictions). A lone `[h]` is often too strict, and LaTeX changes it
to `[ht]` with a warning. If a float really must stay exactly where it is in the source, the
`float` package adds an `[H]` option. `booktabs` rules (`\toprule` etc.) look better than
`\hline` but are meant to be used without vertical lines.

## Macros

`\newcommand` defines a macro; `#1`, `#2` are its arguments. Semantic macros keep formatting
consistent and let you change it in one place:

```latex
\newcommand{\term}[1]{\textbf{#1}}
\newcommand{\pkg}[1]{\textsf{#1}}

We use \pkg{xcolor} to colour the \term{central limit theorem}.
```

`\newcommand` errors if the name already exists; `\renewcommand` replaces an existing one. Be
careful redefining built-ins. For example, `\renewcommand{\section}[1]{\Large\textbf{#1}}`
breaks numbering, the table of contents and `\label`. To restyle headings, use the
`titlesec` package instead:

```latex
\usepackage{titlesec}
\titleformat{\section}{\Large\bfseries}{\thesection}{1em}{}
```

## Custom fonts with fontspec

`fontspec` lets you use any installed OpenType or TrueType font. It only works with XeLaTeX or
LuaLaTeX, not `pdflatex`. This example uses TeX Gyre Pagella, which ships with TeX Live and
MiKTeX, and loads it by file name so it works whether or not the font is installed system-wide:

```latex
% compile with xelatex or lualatex
\documentclass{article}
\usepackage{fontspec}

\setmainfont{texgyrepagella}[
  Extension      = .otf,
  UprightFont    = *-regular,
  BoldFont       = *-bold,
  ItalicFont     = *-italic,
  BoldItalicFont = *-bolditalic
]

\begin{document}
This is Pagella, with \textbf{bold} and \textit{italic}.
\end{document}
```

For a font installed on your system, `\setmainfont{Font Name}` is usually enough.
`\setsansfont` and `\setmonofont` set the `\textsf` and `\texttt` fonts. Font size is not a
`fontspec` option; set it with the class option (`\documentclass[12pt]{article}`).

## Gotchas

- Blank lines end paragraphs. Don't use `\\` or repeated blank lines to add space; use
  `\vspace{...}`, or change `\parskip` (or load the `parskip` package) for spacing between
  paragraphs.
- Quotes: open with two backticks and close with two apostrophes, not with `"`, or use the
  `csquotes` package's `\enquote{...}`.
- Dashes: `-` for hyphens, `--` for ranges (1--5), `---` for an em dash.
- Prefer semantic macros and environments over hand-applied bold and sizes. If every heading is
  made with `\section`, restyling them later is one line.

## Further reading

- [LaTeX2e unofficial reference manual: Fonts](https://latexref.xyz/Fonts.html)
- [xcolor documentation (CTAN)](https://ctan.org/pkg/xcolor)
- [fontspec documentation (CTAN)](https://ctan.org/pkg/fontspec)
- [booktabs documentation (CTAN)](https://ctan.org/pkg/booktabs)
- [Overleaf: Font sizes, families and styles](https://www.overleaf.com/learn/latex/Font_sizes%2C_families%2C_and_styles)
