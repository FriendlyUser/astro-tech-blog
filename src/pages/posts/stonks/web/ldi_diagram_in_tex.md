---
tags: ['diagrams', 'latex']
title: Liability Driven Investing flow chart
description: Although I correctly predicted the collapse of ldi, I did not profit from it.
pubDate: Mon, 13 October 2023
imgSrc: /img/2023/investing.png
---
Liability Driven Investing (LDI) is a portfolio management strategy where the investment decisions are driven by the specific needs of the investor's liabilities (e.g. pension obligations). The goal is to match the duration, currency, and risk profile of the assets with the liabilities, to minimize the risk of not being able to meet future obligations.


The risk of high leverage in investing is that it amplifies potential gains, but also increases the risk of losses. If the invested assets underperform, the leveraged positions can result in large losses that exceed the initial investment. Additionally, leveraged investments can be subject to margin calls and other forms of forced selling, which can amplify losses in declining markets. High leverage can also increase the risk of bankruptcy or financial distress.


```tex 
 \documentclass{standalone}
\usepackage[utf8]{inputenc}
\usepackage{tikz}
\usetikzlibrary{positioning}
\usepackage{xcolor}
\begin{document}
\begin{tikzpicture}[node distance=5cm]

\tikzset{
    connector/.style={
        -latex,
        font=\scriptsize
    },
    connectorReverse/.style={
        -stealth,
        font=\scriptsize
    },
    rectangle connector/.style={
        connector,
        to path={(\tikztostart) -- ++(#1,0pt) \tikztonodes |- (\tikztotarget) },
        pos=0.5
    },
    rectangle connector/.default=-2cm,
    rectangleReverse connector/.style={
        connector,
        to path={(\tikztotarget) -- ++(#1,0pt) \tikztonodes |- (\tikztostart) },
        pos=0.75
    },
    rectangleReverse  connector/.default=-2cm,
    straight connector/.style={
        connector,
        to path=--(\tikztotarget) \tikztonodes
    }
}
  \node (company) [shape=rectangle, draw, fill=blue!5, align=left, text width = 7cm,  inner sep=1cm] {
    \textbf{Company} \\
    Employers promise to pay their staff a pension
  };
  \node (pension) [shape=rectangle, draw, fill=blue!5, below of=company, text width = 7cm, align=left, inner sep=1cm] {
  \textbf{Defined Benefit Pension Scheme} \\
    A workplace pension based  on salary and term of employment, rather than how much is paid in. These schemes are increasing rare.
  };
  \node (asset) [shape=rectangle, draw, fill=blue!5, below of=pension,  text width = 7cm, align=left, inner sep=1cm] { \textbf{Asset Manager} \\
  Appointed by pension scheme trustees to manage assets on their behalf} ;
  \node (fund) [shape=rectangle, draw, fill=blue!5, below of=asset,  text width = 7cm, align=left, inner sep=1cm] { \textbf{Liability Driven Investment Fund} \\ 
  A type of fund used by the asset manager to invest the pension scheme's money.
  };
  \draw [->] (company) -- (pension);
  \draw [->] (pension) -- (asset);
  \draw [->] (asset) -- (fund);


   \node (equities) [shape=rectangle, draw, fill=red!5, below left=3cm and 2cm of fund, text width = 2cm, align=left, inner sep=1cm] { \textbf{Equities}};
  \node (bonds) [shape=rectangle, draw, fill=red!5, right of=equities, text width = 2cm, align=left, inner sep=1cm] { \textbf{Bonds}};
  \node (gilts) [shape=rectangle, draw, fill=red!5, right of=bonds, text width = 2cm, align=left, inner sep=1cm] { \textbf{Gilts}};
  \node (derivatives) [shape=rectangle, draw, fill=red!5, below, right of=gilts, text width = 2cm, align=left, inner sep=1cm] { \textbf{Derivatives}};

  \node [above left=2cm and -5.5cm of equities, align=left, text width=2cm] {Funds can invest in a variety of assets};
  \node (fwaypoint)[draw=none, below =1.75cm of fund] {};
  % \draw [-] (fund.south) to (fwaypoint);
  \draw [-stealth, rectangleReverse connector=2cm] (fund.west) to (equities.north west);
  \draw [-stealth, rectangleReverse connector=2cm] (fund.east) to (derivatives.north west);
  \draw [->] (bonds.north) to (fund);
   \draw [->] (gilts.north) to (fund);
\end{tikzpicture}

\end{document}
 
 ```

This is a diagram that demonstrates how the ldi (liability driven investing) is intended to work. I personally do not believe in ldi investing.


Flow charts are important because they help to:

1. Visualize and understand complex processes: Flow charts help to break down a complex process into simple and easily understandable steps.
2. Communicate ideas effectively: Flow charts are a visual representation of information, making it easier to convey ideas to others and collaborate effectively.
3. Improve efficiency: By mapping out processes and identifying areas for improvement, flow charts can help organizations streamline their workflows and make them more efficient.
4. Track progress: Flow charts allow you to see the progress of a project or process and make adjustments if needed.
5. Identify bottlenecks: Flow charts help to identify bottlenecks or areas of a process where improvement is needed.

Overall, flow charts play a crucial role in improving communication, making processes more efficient, and helping to achieve desired outcomes in various settings.


