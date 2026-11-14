---
description: Install and launch Jupyter Notebook, work with code and Markdown cells, use IPython magics, plot inline with Matplotlib, and export or share notebooks.
imgSrc: /imgs/2023/4279596222.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-22T06:25:07.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: Getting started with Jupyter Notebook for Python
---

Jupyter Notebook is a browser-based editor for notebooks: documents made of cells that mix runnable code, its output (tables, plots), and Markdown text. Code runs in a separate kernel process that keeps state between cells, which makes it handy for exploring data step by step. This post covers the parts you use day to day with a Python kernel.

The name comes from Julia, Python, and R, but there are kernels for many other languages. The related projects you'll see mentioned are:

- **Jupyter Notebook**: the document-focused notebook interface. Since version 7 it's built on JupyterLab components.
- **JupyterLab**: a fuller IDE-style interface with tabs, a file browser, and terminals. It opens the same `.ipynb` files.
- **JupyterHub**: runs notebook servers for many users, for classes or teams.

## Installation

Install the `notebook` package into the Python environment (ideally a virtual environment) you want to work in:

```bash
pip install notebook
```

`pip install jupyter` also works; it's a metapackage that pulls in Notebook, JupyterLab, and a few other tools. If you use Anaconda or Miniconda, `conda install notebook` does the same thing.

## Launching

```bash
jupyter notebook
```

This starts a local server and opens the dashboard in your browser, rooted at the directory you ran the command from. From the dashboard you can browse files and create a new notebook with **New → Notebook** (pick the Python 3 kernel). Stop the server with `Ctrl+C` in the terminal.

## Working with cells

A notebook is a list of cells. The two you'll use most are code cells and Markdown cells.

Jupyter has two modes. In **edit mode** (the cell has a cursor) you type into the cell. Press `Esc` to switch to **command mode**, where single keys act on the selected cell:

| Key | Action |
| --- | --- |
| `Shift+Enter` | Run the cell and move to the next one |
| `Ctrl+Enter` | Run the cell and stay on it |
| `A` / `B` | Insert a cell above / below |
| `M` | Change the cell to Markdown |
| `Y` | Change the cell to code |
| `D`, `D` | Delete the cell |
| `Enter` | Back to edit mode |

The **Help** menu links to the full list of shortcuts.

### Markdown cells

Markdown cells hold notes, headings, lists, links, and LaTeX math (`$E = mc^2$` inline or `$$...$$` for display). Running the cell renders it; double-click a rendered cell to edit it again.

### Code cells

Code cells run in the kernel, and the value of the last expression is displayed below the cell. Variables persist between cells, so the order you run cells in matters more than the order they appear in. If a notebook starts behaving oddly, use **Kernel → Restart Kernel and Run All Cells** to check it still works top to bottom.

## Magics

The Python kernel is IPython, which adds "magic" commands. Line magics start with `%` and apply to one line; cell magics start with `%%` and apply to the whole cell.

- `%time` runs a statement once and reports how long it took; `%timeit` runs it many times and reports statistics.
- `%run script.py` runs a Python file and pulls its variables into the notebook.
- `%load script.py` copies a file's contents into the cell.
- `%%writefile utils.py` at the top of a cell writes the cell's contents to a file.
- `%pwd` and `%cd` show and change the working directory.
- `%reset` clears all user-defined names.
- `%pip install <package>` installs into the environment the kernel is running in, which avoids the common mistake of `pip install`-ing into a different Python.

`%lsmagic` lists every available magic, and `%magic_name?` shows help for one.

## Plotting

Matplotlib output appears inline under the cell. In current Jupyter the inline backend is the default, so you don't need `%matplotlib inline` (it's harmless if you keep it). Install Matplotlib in the kernel's environment first, for example with `%pip install matplotlib`, then:

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.plot(x, y)
plt.xlabel("x")
plt.ylabel("sin(x)")
plt.show()
```

Libraries such as Seaborn and Plotly render inline the same way.

## Exporting and sharing

The **File** menu has options to download the `.ipynb` file or export it to other formats such as HTML. From the command line, `nbconvert` does the same:

```bash
jupyter nbconvert --to html analysis.ipynb
```

Exporting to PDF through `--to pdf` needs a LaTeX installation; `--to webpdf` uses a headless browser instead.

To share a read-only view, push the notebook to a public GitHub repository (GitHub renders `.ipynb` files) or paste its URL into [nbviewer](https://nbviewer.org/). To turn a notebook into an interactive web app with the code hidden, look at [Voilà](https://voila.readthedocs.io/en/stable/).

## Gotchas

- Notebooks store outputs in the `.ipynb` JSON, which makes diffs noisy. Clear outputs before committing, or use a tool like `nbstripout`.
- Hidden state from out-of-order execution is the most common source of "it worked yesterday" bugs. Restart and run all before trusting a result.
- When the code stabilises, move it into `.py` modules and import them; notebooks are awkward to test and review.

Further reading: [Jupyter Notebook documentation](https://jupyter-notebook.readthedocs.io/en/stable/) and [IPython built-in magics](https://ipython.readthedocs.io/en/stable/interactive/magics.html).
