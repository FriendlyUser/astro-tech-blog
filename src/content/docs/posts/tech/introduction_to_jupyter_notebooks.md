---
tags: ['python', 'jupyter']
title: "Getting started with Jupyter notebooks: install, run cells, avoid hidden state"
description: What a Jupyter notebook is, how to install and launch JupyterLab with pip, how cells and kernels work, and the common pitfalls of notebook-based work.
pubDate: Fri, 7 Feburary 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/45c8f451-5ee8-4f76-8769-691be0cfc6c2.webp"
---

A Jupyter notebook is a document made of cells. Code cells run in a live interpreter (the *kernel*) and show their output (text, tables, plots) directly underneath; Markdown cells hold notes, headings and LaTeX equations. That mix makes notebooks popular for data exploration, teaching and sharing an analysis along with its results.

Notebooks are saved as `.ipynb` files, which are JSON containing the cells and their most recent outputs. The name comes from Julia, Python and R, and kernels exist for those and many other languages, but Python (via the `ipykernel` package) is by far the most common.

## Installing and launching

The simplest route is pip, ideally inside a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install jupyterlab
jupyter lab
```

`jupyter lab` starts a local server and opens JupyterLab in your browser. Create a new notebook from the launcher by picking the Python 3 kernel.

Alternatives:

- `pip install notebook` and `jupyter notebook` give you the classic single-document interface. Notebook 7 is built on JupyterLab components, so the two look similar.
- VS Code opens `.ipynb` files directly once the Python and Jupyter extensions are installed; it still needs `ipykernel` in the selected environment.
- The Anaconda distribution (from Anaconda, Inc., formerly Continuum Analytics) bundles JupyterLab with NumPy, pandas, Matplotlib and other scientific packages. Check its terms of service before using it in an organisation.

## Running cells

Type into a code cell and press **Shift+Enter** to run it and move to the next cell:

```python
a = 3
b = 5
c = a + b
print("The sum of", a, "and", b, "is", c)
```

Output:

```text
The sum of 3 and 5 is 8
```

Variables live in the kernel, not in the cell, so a later cell can use them:

```python
c * 2
```

The last expression in a cell is displayed automatically (here `16`), which is why notebooks often end a cell with a bare DataFrame or chart object instead of a `print`.

A few other basics:

- **Esc** switches to command mode, where **A**/**B** insert a cell above/below, **M** turns a cell into Markdown and **Y** back into code.
- **Tab** completes names, and **Shift+Tab** shows a function's signature and docstring.
- `%timeit expr` times an expression, and `!pip install package` runs a shell command. Prefer `%pip install package`, which installs into the kernel's environment rather than whichever `pip` is first on your `PATH`.

## Pitfalls

- **Hidden state.** Cells can be run in any order, and deleting a cell doesn't delete the variables it created. A notebook can work for you and fail for someone else. Before sharing, use **Kernel → Restart Kernel and Run All Cells** to check it runs top to bottom.
- **Noisy version control.** Because `.ipynb` stores outputs and execution counts, diffs are hard to read. Tools like [nbstripout](https://github.com/kynan/nbstripout) strip outputs on commit, and [Jupytext](https://github.com/mwouts/jupytext) pairs each notebook with a plain `.py` or `.md` file.
- **Notebooks aren't modules.** Once code stabilises, move functions into a `.py` file and import them; that makes them testable and reusable.

## Further reading

- [Project Jupyter documentation](https://docs.jupyter.org/en/latest/)
- [JupyterLab documentation](https://jupyterlab.readthedocs.io/en/stable/)
