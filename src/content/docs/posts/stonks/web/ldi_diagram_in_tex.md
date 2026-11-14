---
tags: ['diagrams', 'latex', 'investing']
title: A TikZ flow chart of liability-driven investing (LDI)
description: A TikZ diagram of how money flows from a company's pension promise into an LDI fund, and why I don't believe in LDI's use of leverage.
pubDate: Mon, 13 October 2023
lastUpdated: 2026-11-14
imgSrc: /imgs/2023/investing.png
layout: '@/templates/BasePost.astro'
---

Liability-driven investing (LDI) is how many UK defined benefit pension schemes manage their money. Instead of chasing returns, the scheme tries to make its assets move like its liabilities, the pensions it has promised to pay. Those liabilities behave like long-dated bonds, so LDI funds hold a lot of long-dated gilts and interest-rate hedges.

I personally don't believe in LDI investing, and the main reason is leverage. To hedge more of their liabilities without tying up all their cash, LDI funds borrowed against their gilts (through repo) and used interest-rate swaps. Leverage cuts both ways. When gilt yields rise quickly, the hedges lose value and the fund has to post more collateral, often by selling gilts, which pushes yields up further.

That spiral is what happened in September 2022. After the UK government's mini-budget on 23 September, long-dated gilt yields jumped, LDI funds faced collateral calls they couldn't meet, and the forced selling fed on itself. The Bank of England stepped in on 28 September with temporary purchases of long-dated gilts, which ran until 14 October 2022. Although I correctly predicted the LDI collapse, I didn't profit from it.

## The diagram

This standalone TikZ document draws the chain from employer to LDI fund, and the asset classes the fund invests in:

```tex
\documentclass{standalone}
\usepackage{tikz}
\usetikzlibrary{positioning}
\begin{document}
\begin{tikzpicture}[node distance=5cm]

\tikzset{
    connector/.style={
        -latex,
        font=\scriptsize
    },
    rectangleReverse connector/.style={
        connector,
        to path={(\tikztotarget) -- ++(#1,0pt) \tikztonodes |- (\tikztostart) },
        pos=0.75
    },
    rectangleReverse connector/.default=-2cm
}
  \node (company) [shape=rectangle, draw, fill=blue!5, align=left, text width=7cm, inner sep=1cm] {
    \textbf{Company} \\
    Employers promise to pay their staff a pension
  };
  \node (pension) [shape=rectangle, draw, fill=blue!5, below of=company, text width=7cm, align=left, inner sep=1cm] {
    \textbf{Defined Benefit Pension Scheme} \\
    A workplace pension based on salary and length of employment, rather than how much is paid in. These schemes are increasingly rare.
  };
  \node (asset) [shape=rectangle, draw, fill=blue!5, below of=pension, text width=7cm, align=left, inner sep=1cm] {
    \textbf{Asset Manager} \\
    Appointed by pension scheme trustees to manage assets on their behalf
  };
  \node (fund) [shape=rectangle, draw, fill=blue!5, below of=asset, text width=7cm, align=left, inner sep=1cm] {
    \textbf{Liability Driven Investment Fund} \\
    A type of fund used by the asset manager to invest the pension scheme's money.
  };
  \draw [->] (company) -- (pension);
  \draw [->] (pension) -- (asset);
  \draw [->] (asset) -- (fund);

  \node (equities) [shape=rectangle, draw, fill=red!5, below left=3cm and 2cm of fund, text width=2cm, align=left, inner sep=1cm] {\textbf{Equities}};
  \node (bonds) [shape=rectangle, draw, fill=red!5, right of=equities, text width=2cm, align=left, inner sep=1cm] {\textbf{Bonds}};
  \node (gilts) [shape=rectangle, draw, fill=red!5, right of=bonds, text width=2cm, align=left, inner sep=1cm] {\textbf{Gilts}};
  \node (derivatives) [shape=rectangle, draw, fill=red!5, below, right of=gilts, text width=2cm, align=left, inner sep=1cm] {\textbf{Derivatives}};

  \node [above left=2cm and -5.5cm of equities, align=left, text width=2cm] {Funds can invest in a variety of assets};
  \draw [rectangleReverse connector=2cm] (fund.west) to (equities.north west);
  \draw [rectangleReverse connector=2cm] (fund.east) to (derivatives.north west);
  \draw [->] (bonds.north) to (fund);
  \draw [->] (gilts.north) to (fund);
\end{tikzpicture}
\end{document}
```

Compile it with `pdflatex ldi.tex`. The `standalone` class crops the page to the drawing, so the PDF can be dropped straight into another document or converted to PNG.

## Notes on the TikZ

- `below of=company` and `right of=equities` are the old TikZ placement syntax. They still work, but they measure `node distance` between node centres. The `positioning` library's `below=of company` measures between node edges, which is usually what you want with large boxes like these. I use `positioning` only for the `below left=3cm and 2cm of fund` placement.
- The `rectangleReverse connector` style draws an elbow path (`|-`) instead of a straight line. It builds the path from the target back to the start, so the arrowhead ends at the fund's side.
- `inner sep=1cm` and `text width=7cm` make the boxes big. With `node distance=5cm`, longer descriptions start to overlap the next box; increase the distance if you add text.

## Further reading

- [TikZ and PGF manual](https://tikz.dev/)
- [Bank of England staff paper: LDI minimum resilience (March 2023)](https://www.bankofengland.co.uk/financial-policy-summary-and-record/2023/bank-staff-paper-ldi-minimum-resilience)
