---
tags: ['latex']
title: Drawing diagrams in LaTeX with TikZ, CircuiTikZ, blox and PGFPlots
description: Compilable examples of TikZ flowcharts and mind maps, CircuiTikZ circuits, blox control-system block diagrams and PGFPlots charts, plus PNG export.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/403791778.webp
---

TikZ is the drawing package most LaTeX diagrams are built on. You describe shapes and paths as code inside a `tikzpicture`, so diagrams use the same fonts as the document, diff cleanly in version control, and scale without blurring. Several packages build on it for specific jobs:

- **PGFPlots**: function plots, bar charts, scatter plots, 3D surfaces.
- **CircuiTikZ**: electrical circuits.
- **blox**: control-system block diagrams.
- **flowchart**: predefined flowchart shapes.

Graphviz is a separate, non-LaTeX tool; it lays out graphs automatically, which TikZ does not do by default.

The circuit, block-diagram and architecture examples below come from the [LatexDiagrams](https://github.com/FriendlyUser/LatexDiagrams/tree/master) repository, with their rendered output.

## Standalone documents and PNG export

Put each diagram in its own file using the `standalone` class. It crops the PDF to the drawing, so you can compile and check one diagram at a time, then reuse it in a paper, a slide deck or a web page.

```latex
\documentclass[tikz, border=4pt]{standalone}
\begin{document}
\begin{tikzpicture}
  \draw (0,0) -- (2,2);
\end{tikzpicture}
\end{document}
```

To get a PNG for a web page, rasterise the PDF. With ImageMagick 7 the command is `magick` (`convert` is the ImageMagick 6 name, and on Windows `convert` is also an unrelated system tool). ImageMagick needs Ghostscript installed to read PDFs.

```bash
magick -density 300 diagram.pdf diagram.png
```

Poppler's `pdftoppm` does the same without Ghostscript:

```bash
pdftoppm -png -r 300 -singlefile diagram.pdf diagram
```

## TikZ basics

Load TikZ with `\usepackage{tikz}` and draw inside a `tikzpicture`. `\draw` strokes a path, `--` joins points with straight lines, and options in square brackets control style:

```latex
\documentclass[tikz, border=4pt]{standalone}
\begin{document}
\begin{tikzpicture}
  \draw (0,0) -- (2,2);                           % line
  \draw (4,1) circle [radius=1];                  % circle centred at (4,1)
  \draw (6,0) rectangle (8,2);                    % rectangle from two corners
  \draw [->, thick, blue] (0,-1) -- (8,-1);       % arrow
\end{tikzpicture}
\end{document}
```

Coordinates are in centimetres by default.

## Flowcharts and simple block diagrams

Flowcharts are named nodes joined by arrows. Use the `positioning` library to place nodes relative to each other (`right=of a` rather than the older `right of=a`), and `shapes.geometric` for the decision diamond:

```latex
\documentclass[tikz, border=4pt]{standalone}
\usetikzlibrary{positioning, shapes.geometric}
\begin{document}
\begin{tikzpicture}[
    node distance=1.5cm,
    block/.style={rectangle, draw, minimum width=2.5cm, minimum height=1cm},
    decision/.style={diamond, draw, aspect=2}
  ]
  \node[block] (read) {Read input};
  \node[decision, right=of read] (valid) {Valid?};
  \node[block, right=of valid] (process) {Process};
  \node[block, below=of valid] (error) {Report error};

  \draw[->] (read) -- (valid);
  \draw[->] (valid) -- node[above] {yes} (process);
  \draw[->] (valid) -- node[right] {no} (error);
\end{tikzpicture}
\end{document}
```

`node[above] {yes}` placed after `--` puts a label at the midpoint of that edge.

## Mind maps

The `mindmap` library styles a tree of `child` nodes as concept bubbles. `grow cyclic` spreads children around their parent, and `sibling angle` sets the spacing at each level:

```latex
\documentclass[tikz, border=4pt]{standalone}
\usetikzlibrary{mindmap}
\begin{document}
\begin{tikzpicture}[mindmap, grow cyclic, every node/.style=concept,
    concept color=blue!40,
    level 1/.append style={level distance=5cm, sibling angle=120},
    level 2/.append style={level distance=3cm, sibling angle=45}]
  \node {Root}
    child { node {Topic 1}
      child { node {Idea 1a} }
      child { node {Idea 1b} } }
    child { node {Topic 2}
      child { node {Idea 2a} }
      child { node {Idea 2b} } }
    child { node {Topic 3}
      child { node {Idea 3a} }
      child { node {Idea 3b} } };
\end{tikzpicture}
\end{document}
```

## Circuits with CircuiTikZ

CircuiTikZ adds components that you place along a path with `to[...]`. The first key is the component (`R`, `C`, `L`, `V`, `I`, and so on), `l=` sets its label and `a=` adds an annotation on the opposite side:

```latex
\documentclass[border=4pt]{standalone}
\usepackage{circuitikz}
\begin{document}
\begin{circuitikz}
  \draw (0,0) to[R, l=$R_1$, a=$5\,\Omega$] (2,0);
  \draw (4,0) node[npn] (Q1) {};   % NPN transistor with anchors Q1.base, Q1.collector, Q1.emitter
\end{circuitikz}
\end{document}
```

Useful key variants in the examples below:

- `l^=` / `l_=` put the label above or below the component.
- `v>=`, `v_>=` draw a voltage arrow; `i_>=` draws a current arrow.
- `-*` or `*-*` end a segment with a filled dot (a node).
- `cV` and `cI` are controlled (dependent) voltage and current sources.
- `open` draws nothing but still allows a voltage label across two terminals.

### Circuit with a dependent voltage source

A 4 V source and 10 Ω resistor feed a voltage-controlled voltage source of value 3V<sub>ab</sub>, with a 2 A current source and terminals a and b on the right.

```latex
\documentclass[tikz]{standalone}
\usepackage{circuitikz}
\usepackage{siunitx}
\usepackage{amsmath,amssymb}
\begin{document}
\begin{circuitikz}
  \draw (0,2) to[V,l_=$4 \si{\volt}$] (0,0); %% Note _>= instead of >=
  \draw (0,2) to [R,l^=$10 \si{\ohm}$] (2,2);
  \draw (2,2) to [cV,l^=$3V_{ab}$] (4,2);
  \draw (4,0) to [I,l^=$2\si{\ampere}$] (4,2);
  \draw (4,2) to [short,-*] (6,2)
    node[label={[font=\footnotesize]right:$a$}] {};
  \draw (0,0) to [short,-*] (6,0)
    node[label={[font=\footnotesize]right:$b$}] {};
  \draw (6,2) to [open,v_>=$V_{ab}$] (6,0);
\end{circuitikz}
\end{document}
```

![Circuit with a dependent voltage source](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/Circuits/SuperPosition.png)

### Bridge circuit

A 20 V source drives two half-bridges (2 kΩ/5 kΩ and 1 kΩ/30 kΩ), with a 5 kΩ resistor carrying current i<sub>o</sub> between their midpoints. The `american voltages` option draws voltages with +/− signs.

```latex
\documentclass[tikz]{standalone}
\usepackage{circuitikz}
\usepackage{siunitx}
\usepackage{amsmath,amssymb}
\begin{document}
\begin{circuitikz}[american voltages]
  % Voltage source
  \draw (0,0) to [V, v>=$20 \si{\volt}$] (0,6) to (6,6)
  % Left half bridge
  to [R, l_=$2 \si{k\ohm}$, *-*] (3,3)   % Top left resistor
  to [R, l_=$5 \si{k\ohm}$, -*] (6,0);   % Bottom left resistor
  % Right half bridge
  \draw (6,6)
  to [R, l_=$1 \si{k\ohm}$, -*] (9,3)    % Top right resistor
  to [R, l_=$30 \si{k\ohm}$, -*] (6,0)   % Bottom right resistor
  % Connection to the (-) terminal of the voltage source
  to (6,0) to (0,0);

  % Bridge resistor between the two midpoints
  \draw (3,3) to [R, l_=$5 \si{k\ohm}$, i_=$i_o$, -*] (9,3);
\end{circuitikz}
\end{document}
```

![Bridge circuit](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/Circuits/NodeAnalysis.png)

### Thévenin equivalent problem

This one combines a voltage-controlled current source (10<sup>−3</sup>v<sub>2</sub>) and a current-controlled voltage source (5000i<sub>1</sub>), with output terminals a and b.

```latex
\documentclass[tikz]{standalone}
\usepackage{circuitikz}
\usepackage{siunitx}
\usepackage{amsmath,amssymb}
\begin{document}
\begin{circuitikz}
  \draw (0,2) to[V,v>=$100\si{\volt}$] (0,0);
  \draw (0,2) to [R,l^=$2.5 \si{k\ohm}$,i_>=$i_1$,-*] (2,2)
  to [R=$625\si{\ohm}$,-*] (2,0);
  \draw (2,2) to [short] (4,2);
  \draw (4,0) to [cI,l_=$10^{-3}v_2$] (4,2);
  \draw (4,0)
  to [R,l^=$4\si{\ohm}$] (2,0);
  \draw (0,0) to [short,-*] (2,0);

  \draw (4,0) to [short,-*] (8,0);
  \draw (8,2) to [cV,l_=$5000i_1$] (8,0)
  to [short] (10,0);
  \draw (8,2)
  to [R,l^=$4\si{k \ohm}$] (10,2)
  to [R,l^=$6\si{k \ohm}$,v_>=$v_2$] (10,0)
  to [short, -*] (12,0)
  node[label={[font=\footnotesize]above:$b$}] {};

  \draw (10,2) to [short, -*] (12,2)
  node[label={[font=\footnotesize]above:$a$}] {};
\end{circuitikz}
\end{document}
```

![Thévenin equivalent circuit](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/Circuits/TheveinEquivalent.png)

The examples use siunitx's `\si`, which still works in siunitx 3; the newer spelling is `\unit{\volt}` or `\qty{4}{\volt}`.

## Control-system block diagrams with blox

You can draw block diagrams with plain TikZ nodes as in the flowchart above, but the blox package has commands for the usual parts: `\bXInput` (start point), `\bXComp` (summing junction), `\bXBloc` (transfer-function block), `\bXLink` (arrow between elements), `\bXBranchx`/`\bXBranchy` (invisible points for routing wires) and `\bXReturn` (feedback path).

A unity-feedback loop with forward-path transfer function K/(s(s²+4s+5)):

```latex
\documentclass{standalone}
\usepackage{amsmath}  % For \cfrac
\usepackage{amssymb}
\usepackage{blox}
\usepackage{tikz}
\begin{document}
\begin{tikzpicture}
\bXInput{A}
\bXComp{B}{A}
\bXLink[$R(s)$]{A}{B}
\bXBloc[2]{C}{$\cfrac{K}{s(s^2+4s+5)}$}{B}
\bXLink{B}{C}
\bXOutput{E}{C}
\bXLink[$C(s)$]{C}{E}
\bXReturn{C-E}{B}{}
\end{tikzpicture}
\end{document}
```

![Unity feedback block diagram](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/ControlSystems/CSI/Q2Diagram614.png)

A larger diagram with blocks G<sub>1</sub>, G<sub>2</sub>, G<sub>3</sub>, two feedback paths (H<sub>1</sub> and H<sub>2</sub>/G<sub>1</sub>) and unity feedback. Branch points are placed with `\bXBranchx`/`\bXBranchy` and joined with plain `\draw` commands where blox's links don't route the way you want:

```latex
\documentclass{standalone}

\usepackage{blox}
\usepackage{tikz}
\usetikzlibrary{positioning}

\begin{document}
\begin{tikzpicture}
\bXLineStyle{very thick}
\bXInput{A}
\bXComp{B}{A}
\bXLink[R]{A}{B}
\bXCompa{C}{B}
\bXLink{B}{C}
\bXSumb{D}{C}
\bXLink{C}{D}
\bXBloc[2]{E}{$G_1$}{D}
\bXLink{D}{E}
\bXBloc[2]{F}{$G_2$}{E}
\bXLink{E}{F}

\bXBranchx[5]{F}{FX1}

\bXBranchy[5]{FX1}{FDown1}
\draw[-,very thick] (F) -- (FX1.center);
\draw[-,very thick] (FX1.center) -- (FDown1.center);
\bXBranchx[-5.5]{FDown1}{FRight1}
\draw[->,very thick] (FDown1.center) -- (FRight1.center);
\bXBloc[-3.5]{H1}{$H_1$}{FRight1}
\bXBranchy[5]{D}{DDown1}
\draw[->,very thick] (DDown1.center) -- (D);
\draw[-,very thick] (H1) -- (DDown1.center);

\bXBloc[2]{G}{$G_3$}{FX1}
\draw[->,very thick] (F) -- (G);

\bXBranchx[3]{G}{GX1}
\bXBranchx[3]{GX1}{GX2}
\draw[-,very thick] (G) -- (GX2);
\bXBranchx[3]{GX2}{GX3}
\bXBranchy[-5]{GX2}{GUp1}

\bXBranchx[1.5]{GX2}{GX4}
\bXBranchy[7.5]{GX4}{GDown1}
\draw[-,very thick] (GX1.center) -- (GX2.center);
\draw[-,very thick] (GX2.center) -- (GUp1.center);
\draw[->,very thick] (GX2.center) -- (GX3.center);
\node[right = 0.05cm of GX3] (end) {$C$};

\draw[-,very thick] (GX4.center) -- (GDown1.center);

\bXBranchy[7.5]{B}{BDown1}
\bXLink{BDown1.center}{B}
\draw[-,very thick] (GDown1.center) -- (BDown1.center);

%% Top part
\bXBranchx[-20]{GUp1}{GLUp1}
\bXBloc[-0]{BlockHG}{$\frac{H_2}{G_1}$}{GLUp1}
\draw[->,very thick] (GUp1.center) -- (BlockHG);
\bXLinkxy{BlockHG}{C}
\end{tikzpicture}
\end{document}
```

![Block diagram with multiple feedback loops](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/ControlSystems/CSI/BlockDiagramex2.png)

## Software architecture diagrams

Plain TikZ also works for architecture diagrams. This one redraws the VS Code Dev Containers architecture: VS Code with UI extensions on the local OS, connected through an exposed port to a VS Code Server running workspace extensions, terminals, the app and the debugger inside a container, with the source code volume-mounted. Custom styles (`orange`, `database`) keep the repeated boxes consistent, and the `shapes.geometric` cylinder draws the storage icons.

```latex
% Duplicated from https://code.visualstudio.com/docs/remote/containers
\documentclass[11pt]{standalone}
\usepackage[T1]{fontenc}
\usepackage{tikz}
\usetikzlibrary{calc,positioning,shapes.geometric}
\begin{document}
\begin{tikzpicture}[
    >=stealth,
    node distance=1cm,
    orange/.style={
      minimum width = 11em,
      fill=orange!50,
      draw=red!40,
      text width = 0.35\textwidth,
      text centered,
    },
    database/.style={
      cylinder,
      cylinder uses custom fill,
      cylinder body fill=green!60!black!50,
      cylinder end fill=green!10,
      shape border rotate=90,
      aspect=0.25,
      draw
    }
  ]

  % Outer boxes
  \node[rounded corners, text depth=5em, draw=blue!80,
    minimum height=20em, minimum width=20em,
    label={[anchor=north, color=blue!90, inner sep=0pt, xshift=3em, yshift=-1em] north west:{Local OS}}] (dw) {};
  \node[rounded corners, text depth=5em, draw=blue!80,
    minimum height=20em, minimum width=30em,
    label={[anchor=north, color=blue!90, inner sep=0pt, xshift=3em, yshift=-1em] north west:{Container}},
    right=of dw] (container) {};

  % VS Code (local)
  \node[draw=blue!90, text centered, text width=0.20\textwidth, fill=blue!50,
    minimum height=7em, minimum width=15em,
    label={[anchor=north, inner sep=0pt, yshift=-0.2em] north:{\Large \textcolor{white}{VS Code}}}]
    at ([yshift=2em] dw.center) (code) {};
  \node[orange] at ([yshift=-1.25em] code.center) (t1) {Theme/UI Extension};
  \node[orange] at ([yshift= 0.75em] code.center) (t2) {Theme/UI Extension};

  % VS Code Server (container)
  \node[draw=blue!90, text centered, text width=0.20\textwidth, fill=blue!50,
    minimum height=7em, minimum width=15em,
    label={[anchor=north, inner sep=0pt, yshift=-0.2em] north:{\Large \textcolor{white}{VS Code Server}}}]
    at ([xshift=10em, yshift=2em] container.west) (codeserver) {};
  \node[orange] at ([yshift=-1.25em] codeserver.center) (we1) {WorkSpace Extension};
  \node[orange] at ([yshift= 0.75em] codeserver.center) (we2) {WorkSpace Extension};

  % Source code
  \node[database] at ([yshift=-5em] code.south) (scOS) {Source Code};
  \node[database, opacity=0.6] at ([yshift=-5em] codeserver.south) (scContainer) {Source Code};

  % Container widgets
  \node[draw=black!10, text centered, fill=green!30, minimum width=10em]
    at ([xshift=7em, yshift=-3em] codeserver.north east) (tp) {Terminal Processes};
  \node[draw=black!10, text centered, fill=green!30, minimum width=10em]
    at ([xshift=7em, yshift=-5em] codeserver.north east) (ra) {Running Application};
  \node[draw=black!10, text centered, fill=green!30, minimum width=10em]
    at ([xshift=7em, yshift=-7em] codeserver.north east) (debug) {Debugger};
  \node[database] at ([yshift=2em, xshift=7em] codeserver.north east) (fs) {File System};

  % Arrows and labels
  \draw[->, very thick, draw=blue!40] (code.east) -- (codeserver.west);
  \node[rounded corners, draw=none, minimum height=2em, fill=white,
    text width=0.11\textwidth, text centered, minimum width=1.5em,
    xshift=3.75em] at (code.east) {Exposed port};

  \draw[->, very thick, draw=blue!40] (scOS.east) -- (scContainer.west);
  \node[rounded corners, draw=none, minimum height=2em, fill=white,
    text width=0.11\textwidth, text centered, minimum width=1.5em,
    xshift=8.25em] at (scOS.east) {Volume Mount};

  \draw[->, very thick, draw=blue!40] (codeserver) -- (fs.west);
  \draw[->, very thick, draw=blue!40] (codeserver) -- (tp);
  \draw[->, very thick, draw=blue!40] (codeserver) -- (ra.west);
  \draw[->, very thick, draw=blue!40] (codeserver) -- (debug.west);
\end{tikzpicture}
\end{document}
```

![VS Code remote container architecture](https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/software/vscodeArch.png)

## Plots with PGFPlots

PGFPlots is a separate package built on TikZ (load it with `\usepackage{pgfplots}`, not `\usetikzlibrary`). Plots go in an `axis` environment and each data series is an `\addplot`. Set `compat` so output doesn't change when the package is updated:

```latex
\documentclass[border=4pt]{standalone}
\usepackage{pgfplots}
\pgfplotsset{compat=1.18}
\begin{document}
\begin{tikzpicture}
\begin{axis}[ybar, symbolic x coords={A,B,C,D,E,F}, xtick=data,
             ylabel={Count}, ymin=0]
  \addplot coordinates {(A,3) (B,2) (C,1) (D,4) (E,5) (F,2)};
\end{axis}
\end{tikzpicture}

\begin{tikzpicture}
\begin{axis}[xlabel={$x$}, ylabel={$y$}, legend pos=north west]
  \addplot[blue, domain=-2:2, samples=50] {x^2};
  \addlegendentry{$x^2$}
  \addplot[red, only marks, mark=*] table {
    x    y
    -1   1.2
    0    0.1
    1    0.9
  };
  \addlegendentry{measured}
\end{axis}
\end{tikzpicture}
\end{document}
```

Other plot types are options on the same pattern: `\addplot3[surf]` for surfaces, `matrix plot` for heatmaps, the `polar` library's `polaraxis` environment for polar plots, and `\addplot table {data.csv}` (with `col sep=comma`) to read data from a file.

## Using diagrams in a document

To include a standalone diagram file in a larger document without copying its code, load the `standalone` package in the main document and use `\includestandalone`:

```latex
\usepackage{standalone}   % in the preamble
...
\begin{figure}
  \centering
  \includestandalone[width=0.8\textwidth]{diagrams/control-loop}
  \caption{Unity-feedback control loop.}
  \label{fig:controlloop}
\end{figure}
```

`\includegraphics` works too if you prefer to include the compiled PDF.

Reference figures by label rather than hard-coding numbers: `Figure~\ref{fig:controlloop}`. With `hyperref` loaded, `\autoref{fig:controlloop}` adds the word "Figure" for you, and `\nameref{fig:controlloop}` prints the caption text.

For several diagrams side by side in one figure, use the `subcaption` package. The older `subfig` package still works but is no longer maintained.

```latex
\usepackage{subcaption}   % in the preamble
...
\begin{figure}
  \centering
  \begin{subfigure}{0.45\textwidth}
    \centering
    \includegraphics[width=\linewidth]{diagramA}
    \caption{Diagram A}
  \end{subfigure}
  \hfill
  \begin{subfigure}{0.45\textwidth}
    \centering
    \includegraphics[width=\linewidth]{diagramB}
    \caption{Diagram B}
  \end{subfigure}
  \caption{Two diagrams.}
\end{figure}
```

To let text flow around a small diagram, use `wrapfig`. The first argument is the side (`r` or `l`) and the second is the width:

```latex
\usepackage{wrapfig}   % in the preamble
...
\begin{wrapfigure}{r}{0.5\textwidth}
  \centering
  \includegraphics[width=0.48\textwidth]{diagramC}
  \caption{Diagram C.}
\end{wrapfigure}
```

## Common errors

- **"Giving up on this path. Did you forget a semicolon?"**: every `\draw`, `\node` and `\path` must end with `;`. It also appears if you write an invalid path operation, such as `->` instead of `--` between coordinates (`->` belongs in the options: `\draw[->]`).
- **"I do not know the key '/tikz/diamond'"** (or another shape or style): load the library that defines it, e.g. `\usetikzlibrary{shapes.geometric}`.
- **"Dimension too large"**: TeX lengths are limited to about 16384 pt. Scale your data down, or use the `fpu` library for calculations; PGFPlots already uses floating point internally.
- **Diagram fonts don't match the document**: avoid `scale=` on pictures with text (it scales positions, not fonts); set sizes with `node distance` and `minimum width` instead.

Compile often while drawing. A diagram that's built up a few lines at a time is much easier to debug than one written in one go.

## References

- https://grandfleet.eu.org
- https://github.com/FriendlyUser/LatexDiagrams/tree/master
- [PGF/TikZ on CTAN](https://ctan.org/pkg/pgf) (includes the manual)
- [CircuiTikZ on CTAN](https://ctan.org/pkg/circuitikz)
- [blox on CTAN](https://ctan.org/pkg/blox)
- [PGFPlots on CTAN](https://ctan.org/pkg/pgfplots)
