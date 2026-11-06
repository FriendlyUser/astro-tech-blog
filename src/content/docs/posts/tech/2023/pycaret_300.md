---
tags: ['pycaret']
title: What is New in the pycaret 3.0.0 release.
description: Explaining what changed in pycaret 3.0.0.
pubDate: Fri, 14 June 2023
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1900267581.png
---

PyCaret 3.0.0 is a major update of the open-source, low-code machine learning library in Python that automates machine learning workflows. It introduces multiple new features and bug fixes as well as breaking API changes². Here is a technical analysis of some of the main changes:

- A new Time Series Forecasting module that allows users to create and compare various time series models with a simple and consistent API.
- A far-reaching internal refactor for better performance, consistency and developer productivity². This includes using pipelines to prevent target leakage by applying preprocessing steps within cross-validation folds.
- A new object-oriented API that can be used alongside the functional API, giving users more flexibility and control over their experiments².
- Compatibility with the latest scikit-learn version and support for scikit-learn-intelex for better performance on CPU .
- A new experiment logging API with MLFLow, Weights & Biases, DagsHub and CometML support for tracking and managing experiments.
- Distributed parallel computation with Fugue for speeding up model training and tuning on large datasets.
- Reworked tutorials and documentation with more examples and use cases.

PyCaret 3.0.0 is a significant improvement over the previous versions, but it also requires users to adapt their code to the new API changes. Users who want to try the release version can install it using `pip install -U pycaret` ⁴. PyCaret 3.0.0 was released recently.
