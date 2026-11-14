---
tags: ['pycaret', 'python']
title: What changed in PyCaret 3.0.0
description: A summary of the PyCaret 3.0.0 release, covering the time series module, the new object-oriented API, pipeline-based preprocessing and breaking changes.
pubDate: Fri, 14 June 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.png
---

PyCaret is an open-source, low-code machine learning library for Python that wraps scikit-learn and other libraries behind a few functions such as `setup`, `compare_models` and `tune_model`. Version 3.0.0, released in March 2023, was a major rewrite with breaking changes. The release notes warn that PyCaret 2 code will most likely not run without changes.

## What's new

- **Time series forecasting module.** `pycaret.time_series` gives forecasting the same compare-and-tune workflow as classification and regression.
- **Object-oriented API.** Each module now has an experiment class (`ClassificationExperiment`, `RegressionExperiment`, and so on) that can be used alongside the older functional API. This lets you run several experiments in the same Python session without them sharing global state.
- **Reworked preprocessing.** Preprocessing was rebuilt around pipelines, and cross-validation applies those pipelines inside each fold, which prevents target leakage from steps like imputation or scaling seeing the validation data.
- **Experiment logging** with MLflow, Weights & Biases, DagsHub and Comet ML.
- **Distributed execution** through [Fugue](https://fugue-tutorials.readthedocs.io/), so functions like `compare_models` can run across Spark or Dask.
- **Optional Intel Extension for scikit-learn** (scikit-learn-intelex) as an engine for faster training on CPUs.
- **Compatibility with the then-current scikit-learn release.**

## Breaking changes

Besides the API changes, the NLP and association rules (`arules`) modules were removed. If you depended on them, stay on PyCaret 2.x or move that work to a dedicated library.

## Functional vs object-oriented API

Both styles below do the same thing. The functional version keeps the experiment in module-level state; the object-oriented version keeps it on `exp`:

```python
from pycaret.datasets import get_data
from pycaret.classification import ClassificationExperiment, setup, compare_models

data = get_data("diabetes")

# Functional API
setup(data, target="Class variable", session_id=123)
best = compare_models()

# Object-oriented API
exp = ClassificationExperiment()
exp.setup(data, target="Class variable", session_id=123)
best_oop = exp.compare_models()
```

## Installing

```bash
pip install -U pycaret          # core dependencies
pip install -U "pycaret[full]"  # all optional dependencies
```

As of this update the latest release on PyPI is 3.3.2 (April 2024), which supports Python 3.9 to 3.11. If you're on a newer Python, create a separate virtual environment with 3.11 for PyCaret.

## Further reading

- [PyCaret 3.0.0 release notes](https://github.com/pycaret/pycaret/releases/tag/3.0.0)
- [PyCaret documentation](https://pycaret.gitbook.io/docs)
- [PyCaret on PyPI](https://pypi.org/project/pycaret/)
