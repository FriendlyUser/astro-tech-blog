---
tags: ['latex']
title: "Typesetting math in LaTeX: inline and display math, amsmath and mathtools"
description: "How to write equations in LaTeX: inline and display math, numbering and cross-references, multi-line alignment, matrices, custom macros, and common errors."
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1710982917.png
---

LaTeX is the standard tool for documents with a lot of mathematics: you write equations as markup and the engine handles spacing, sizing and numbering. Almost everything below needs the `amsmath` package, so load it (and usually `amssymb` and `mathtools`) in every document that contains math.

## A minimal document

This compiles with `pdflatex` and contains every package used in the rest of the post:

```latex
\documentclass{article}
\usepackage{amsmath}   % align, gather, multline, split, cases, \eqref, \DeclareMathOperator
\usepackage{amssymb}   % \mathbb, extra symbols
\usepackage{mathtools} % extends amsmath: dcases, \DeclarePairedDelimiter, \prescript, \mathclap

\begin{document}

The line $y = mx + b$ has slope $m$.

\begin{equation}
  y = mx + b \label{eq:linear}
\end{equation}

From \eqref{eq:linear}, the $y$-intercept is $b$.

\end{document}
```

`mathtools` loads `amsmath` itself, but listing both does no harm.

## Inline and display math

- **Inline math** sits in the line of text: `$y = mx + b$` (or `\(y = mx + b\)`).
- **Display math** goes on its own centred line. Use `\[ ... \]` for an unnumbered equation and the `equation` environment for a numbered one. `equation*` (from `amsmath`) is also unnumbered.

```latex
\[ a^2 + b^2 = c^2 \]          % unnumbered

\begin{equation}
  f(x) = x^2 + 2x + 1           % numbered (1)
\end{equation}
```

Avoid `$$ ... $$` for display math. It is plain TeX syntax, not supported LaTeX, and it gets vertical spacing and the `fleqn` option wrong.

## Symbols and basic expressions

| What | Input | Notes |
| --- | --- | --- |
| Greek letters | `\alpha`, `\beta`, `\Gamma`, `\Delta` | Uppercase only exists where it differs from Latin: there is no `\Alpha`, just write `A`. |
| Sub/superscripts | `x_{1}`, `x^{2}`, `x_{i}^{2}` | Braces are needed for more than one character: `x^{10}`, not `x^10`. |
| Fractions | `\frac{3}{4}`, `\dfrac{a}{b}` | `\dfrac` (amsmath) forces display size inside inline math. |
| Roots | `\sqrt{3x+1}`, `\sqrt[3]{x}` | The optional argument is the root's index. |
| Operators | `\times`, `\div`, `\pm`, `\cdot` | |
| Relations | `\leq`, `\geq`, `\neq`, `\approx`, `\sim`, `\in` | |
| Functions | `\sin x`, `\log x`, `\exp x` | Upright text with correct spacing; plain `sin x` is set as three italic variables. |
| Sums and integrals | `\sum_{n=1}^{k} n`, `\int_{a}^{b} f(x)\,dx` | `\iint` and `\iiint` need amsmath. `\,` adds a thin space before `dx`. |
| Derivatives | `\frac{d}{dx} f(x)` | |
| Binomials | `\binom{n}{k}` | amsmath. |
| Blackboard bold | `\mathbb{R}` | amssymb (or amsfonts). |

Delimiters that grow with their contents use `\left` and `\right`:

```latex
\[ \left( \frac{a}{b} \right)^2 \qquad \left\{ x : x > 0 \right\} \]
```

Literal braces need escaping as `\{` and `\}`; parentheses and square brackets can be typed directly.

## Multi-line equations

All of these come from `amsmath`. Inside them, `&` marks the alignment point and `\\` ends a line. Each environment has a starred form (`align*`, `gather*`, `multline*`) that turns off numbering.

### align

Use `align` for several equations aligned at a common point, usually `=`. Every line gets a number unless you add `\notag` to it or use `align*`.

```latex
\begin{align}
  2x + 3y &= 5 \\
  4x - 5y &= 6
\end{align}
```

The same environment handles a derivation:

```latex
\begin{align*}
  f(x) &= x^2 + 2x + 1 \\
       &= (x + 1)^2
\end{align*}
```

### gather and multline

`gather` centres each line with no alignment. `multline` is for one equation too long for a line: the first line is set flush left, the last flush right, and any middle lines are centred. It gets a single number.

```latex
\begin{multline}
  p(x) = 3x^6 + 14x^5y + 590x^4y^2 + 19x^3y^3 \\
         - 12x^2y^4 - 12xy^5 + 2y^6 - a^3b^3
\end{multline}
```

### split and aligned

`split` goes inside `equation` and aligns a single equation over several lines, with one number for the whole thing:

```latex
\begin{equation}
  \begin{split}
    (a + b)^2 &= (a + b)(a + b) \\
              &= a^2 + ab + ba + b^2 \\
              &= a^2 + 2ab + b^2
  \end{split}
\end{equation}
```

`aligned` is similar but can sit anywhere inside math, so you can place several aligned blocks next to each other or put one next to a brace:

```latex
\begin{equation}
  \begin{aligned}
    \frac{d}{dx} \ln x       &= \frac{1}{x} \\
    \frac{d}{dx} \log_{a} x  &= \frac{1}{x \ln a}
  \end{aligned}
\end{equation}
```

### alignat

`alignat{n}` takes the number of alignment columns and adds no space between them, so you control the spacing. Here the first `&` aligns the `=` signs and the next pair aligns the comments:

```latex
\begin{alignat}{2}
  2x + y &= 5 &\qquad& \text{(first)} \\
   x - y &= 1 &&       \text{(second)}
\end{alignat}
```

### cases

`cases` builds a piecewise function. `mathtools` adds `dcases`, which sets each case in display style (useful when cases contain fractions).

```latex
\[
  |x| =
  \begin{cases}
    x  & \text{if } x \geq 0 \\
    -x & \text{if } x < 0
  \end{cases}
\]
```

## Matrices

`amsmath` provides `matrix` (no delimiters), `pmatrix` ( ), `bmatrix` [ ], `Bmatrix` { }, `vmatrix` | | and `Vmatrix` ‖ ‖. Columns are separated by `&` and rows by `\\`.

```latex
\[
  A = \begin{bmatrix}
    1 & 2 \\
    3 & 4
  \end{bmatrix}
  \qquad
  \det\begin{pmatrix} a & b \\ c & d \end{pmatrix}
  = \begin{vmatrix} a & b \\ c & d \end{vmatrix} = ad - bc
\]
```

For a matrix inside a line of text, `amsmath` has `smallmatrix` (no delimiters) and `mathtools` adds `psmallmatrix`, `bsmallmatrix` and friends.

## Numbering and cross-references

Put `\label` inside the numbered environment and refer to it with `\eqref` or `\ref`:

```latex
\begin{equation}
  E = mc^2 \label{eq:einstein}
\end{equation}

Equation~\eqref{eq:einstein} gives the rest energy.  % prints "Equation (1)"
See~\ref{eq:einstein}.                              % prints "See 1"
```

`\eqref` adds the parentheses for you; `\ref` prints the bare number. Neither adds the word "Equation". The `~` is a non-breaking space so the number never starts a new line. Compile twice (or use `latexmk`) so the references resolve instead of showing `??`.

To replace a number with your own tag, use `\tag` (from `amsmath`):

```latex
\begin{align}
  x^2 + y^2 &= r^2 \tag{$*$} \\
  x + y     &= 1   \tag{$**$}
\end{align}
```

## Custom commands and operators

Define shortcuts in the preamble with `\newcommand`:

```latex
\newcommand{\RR}{\mathbb{R}}
\newcommand{\norm}[1]{\left\lVert #1 \right\rVert}
```

Then `Let $x \in \RR$` gives "Let x ∈ ℝ", and `$\norm{\mathbf{v}}$` gives ‖**v**‖. The `[1]` is the number of arguments, referenced as `#1`.

For function-like names, `\DeclareMathOperator` (amsmath, preamble only) sets the name upright with operator spacing:

```latex
\DeclareMathOperator{\grad}{grad}
\DeclareMathOperator*{\argmax}{arg\,max}   % starred: limits go underneath in display math
```

`mathtools` has `\DeclarePairedDelimiter` for delimiters you use often:

```latex
\DeclarePairedDelimiter{\abs}{\lvert}{\rvert}
% \abs{x}     fixed-size bars
% \abs*{\frac{a}{b}}  bars that scale like \left...\right
```

Two other `mathtools` commands worth knowing:

```latex
\prescript{14}{6}{\mathrm{C}}               % pre-super- and subscripts: isotope notation
\sum_{\mathclap{1 \le i \le j \le n}} x_{ij}  % wide limit that doesn't widen the sum's spacing
```

`\sideset` (from `amsmath`, not `mathtools`) puts scripts on the corners of a big operator such as `\sum`.

## Math in section headings

Ordinary inline math works in headings: `\section{The value of $\mathcal{X}$}` compiles fine. The problem appears with `hyperref`, which turns headings into PDF bookmarks that can't contain math. Give it a plain-text fallback with `\texorpdfstring`:

```latex
\section{The value of \texorpdfstring{$\mathcal{X}$}{X}}
```

## Common errors

- **`Undefined control sequence`**: a misspelled command, or one from a package you didn't load (`\mathbb` without `amssymb`, `\eqref` without `amsmath`).
- **`Missing $ inserted`**: math-only syntax such as `_`, `^` or `\alpha` used in text mode, or a blank line inside `\[ ... \]`.
- **`Misplaced alignment tab character &`**: an `&` outside an alignment environment, for example in `equation` instead of `align`, or a literal ampersand in text (write `\&`).
- **`Extra alignment tab has been changed to \cr`**: more `&` in a row than the environment allows, such as a `matrix` with more than 10 columns (raise the limit with `\setcounter{MaxMatrixCols}{20}`) or too many columns for `alignat{n}`.
- **``File `foo.sty' not found``**: the package isn't installed. Install it with your distribution's manager (`tlmgr` for TeX Live, the MiKTeX console on Windows).
- **`Overfull \hbox`**: a warning, not an error. A line sticks into the margin, often a long inline equation; break it or move it to display math.

## Further reading

- [amsmath user's guide (PDF)](https://ctan.org/pkg/amsmath)
- [mathtools documentation](https://ctan.org/pkg/mathtools)
- [siunitx](https://ctan.org/pkg/siunitx) for numbers and units (`\qty{9.81}{\metre\per\second\squared}`)
- [unicode-math](https://ctan.org/pkg/unicode-math) for OpenType math fonts; requires XeLaTeX or LuaLaTeX
- [The Comprehensive LaTeX Symbol List](https://ctan.org/pkg/comprehensive)
