---
description: Create, share and remove isolated Python environments with conda, install packages with conda and pip, and avoid Anaconda's licensing trap.
imgSrc: /imgs/2023/3563897667.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-23T15:04:55.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: Managing Python environments with Anaconda and conda
---

Anaconda is a Python distribution for data science that bundles Python, the `conda` package and environment manager, and a few hundred preinstalled packages. Its main use is giving each project its own isolated environment, with its own Python version and dependencies, including compiled libraries (CUDA, MKL, GDAL) that are awkward to install with pip alone.

## Installing

Download the installer from the [Anaconda download page](https://www.anaconda.com/download) and run it. On Windows, use the **Anaconda Prompt** it installs; on macOS and Linux the installer can set up your shell so `conda` works in a normal terminal.

If you don't want the few hundred preinstalled packages, install **Miniconda** (conda plus Python only) or **Miniforge** (the same, but configured to use the community `conda-forge` channel). All the commands below work the same in each.

### Check the licence first

Anaconda's own package channel (`defaults`) is free for individuals and small organisations, but Anaconda's terms of service require a paid licence for organisations with more than 200 employees or contractors. Packages from community channels such as `conda-forge` don't carry that fee. If you're installing at work, check the [Anaconda terms of service FAQ](https://www.anaconda.com/pricing/terms-of-service-faqs) or use Miniforge.

## Creating and using environments

Create an environment with a specific Python version:

```bash
conda create --name my_env python=3.12
```

Activate it. Anything you install now goes into this environment only:

```bash
conda activate my_env
```

Go back to the base environment, list environments, and delete one you no longer need:

```bash
conda deactivate
conda env list
conda remove --name my_env --all
```

## Managing packages

```bash
conda search numpy        # see available versions
conda install numpy pandas
conda update numpy
conda remove pandas
```

Packages that aren't on a conda channel can be installed with pip inside the active environment:

```bash
pip install some-package
```

Mixing the two causes most broken environments. The conda docs recommend installing as much as you can with conda first, then pip. If you need to change the environment after using pip, create a fresh environment rather than running conda on top.

## Sharing an environment

Export the environment to a file you can commit with the project:

```bash
conda env export --from-history > environment.yml
```

`--from-history` writes only the packages you explicitly asked for, not every resolved dependency, which keeps the file portable across operating systems. A teammate recreates it with:

```bash
conda env create --file environment.yml
```

## Jupyter

Install Jupyter into the environment and start it from there, so the notebook uses that environment's packages:

```bash
conda install jupyter
jupyter notebook
```

This starts a local server and opens the notebook interface in your browser.

## Gotchas

- Don't install project packages into `base`. Keep it for conda itself and create an environment per project.
- An environment is tied to its path. To move a project to another machine, share `environment.yml` rather than copying the environment folder.
- If you only need pure-Python packages, `venv` plus pip (or uv) is lighter. Conda earns its keep when you need non-Python binaries.

## Further reading

- [conda user guide: managing environments](https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html)
- [Miniforge](https://github.com/conda-forge/miniforge)
