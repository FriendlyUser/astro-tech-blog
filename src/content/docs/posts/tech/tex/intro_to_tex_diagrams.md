---
title: "LatexDiagrams: reusable TikZ diagrams for reports and blog posts"
description: A tour of my LatexDiagrams repository of standalone TikZ and CircuiTikZ diagrams, how to compile one locally or on Overleaf, and the site that previews them.
pubDate: Saturday, 16 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["latex"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

LaTeX is good for graphics as well as text. With TikZ, a LaTeX package for drawing with commands, you can produce flowcharts, block diagrams, circuits and charts that use the same fonts as the rest of your document and scale without blurring.

Over the years I collected the diagrams I drew for university reports, blog posts and side projects in a GitHub repository, [LatexDiagrams](https://github.com/FriendlyUser/LatexDiagrams) (MIT licensed). Some I wrote from scratch and some are adapted from Stack Overflow answers. This post explains what is in it and how to reuse a diagram.

## What's in the repository

The diagrams are grouped into top-level folders by topic:

- `AlgDS`: data structures.
- `ArtificialIntelligence`: genetic algorithm crossover, feature selection, a tic-tac-toe game tree.
- `Circuits` and `ElectroMag`: circuit diagrams drawn with CircuiTikZ, transformers, phasors, a Smith chart.
- `ControlSystems` and `DSP`: block diagrams, pole-zero plots, sampler systems.
- `EngineeringSoftwareDesign`: flowcharts, class and sequence diagrams, Gantt charts, a Git workflow.
- `PCC`: parallel computing diagrams such as interconnection networks and task graphs.
- `BlogDiagrams`, `ReportDiagrams` and `software`: architecture diagrams, CI pipelines, an OSI model stack and similar figures from blog posts and reports.

## Compiling a diagram

Each `.tex` file is a complete document using the `standalone` class, which crops the PDF to the size of the drawing. That means you can compile any file on its own and get a single image. A small example in the same style:

```latex
\documentclass[tikz, border=5pt]{standalone}
\usetikzlibrary{positioning, arrows.meta}

\begin{document}
\begin{tikzpicture}[
    box/.style={draw, rounded corners, minimum width=2.5cm, minimum height=1cm},
    >={Stealth}
  ]
  \node[box] (client) {Client};
  \node[box, right=2cm of client] (server) {Server};
  \node[box, below=1cm of server] (db) {Database};

  \draw[->] (client) -- node[above] {HTTP} (server);
  \draw[->] (server) -- node[right] {SQL} (db);
\end{tikzpicture}
\end{document}
```

You need a TeX distribution such as TeX Live or MiKTeX. TikZ (part of the `pgf` package) and CircuiTikZ are included in a full TeX Live install, and MiKTeX installs them on first use. Compile with:

```bash
latexmk -pdf diagram.tex
```

The repository's own build script runs `latexmk` with LuaLaTeX and then converts each PDF to PNG with ImageMagick. You can do the same for a single file:

```bash
latexmk -pdflua diagram.tex
magick -density 300 diagram.pdf diagram.png
```

To put a diagram inside a larger document, either copy the `tikzpicture` environment into your document and move its `\usepackage` and `\usetikzlibrary` lines into your preamble, or include the compiled PDF with `\includegraphics{diagram.pdf}`.

If you don't want to install anything, [Overleaf](https://www.overleaf.com/) compiles the files in the browser: upload the `.tex` file or paste its contents into a new project.

## Browsing the diagrams online

A GitHub Actions workflow compiles every diagram to PNG and builds a Nextra site, deployed to GitHub Pages at [grandfleet.eu.org](https://grandfleet.eu.org/). Each diagram has its own page with the rendered image, its TeX source, and a button that opens the file in Overleaf. It is the quickest way to find a diagram and see what it looks like before you use it.

If you'd like a diagram added or something fixed, open an issue or a pull request on [GitHub](https://github.com/FriendlyUser/LatexDiagrams).
