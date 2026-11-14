---
description: Train and evaluate a k-nearest neighbours classifier on the Iris dataset
  with scikit-learn, then use a pipeline and cross-validation for a more honest score.
imgSrc: /imgs/2023/3072838870.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-02T15:09:55.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: "Scikit-learn basics: training and evaluating a classifier in Python"
---

Scikit-learn is an open-source Python library for classical machine learning: linear models, tree ensembles, nearest neighbours, clustering, preprocessing and model evaluation. Every model uses the same `fit` / `predict` / `score` interface, so once you have trained one estimator you know how to train the rest. This post walks through a small classification example.

## Installation

```bash
pip install -U scikit-learn
```

Scikit-learn 1.9.1, the current release on PyPI when this post was updated, requires Python 3.11 or later. It pulls in NumPy and SciPy; install Matplotlib separately if you want plots.

## Classifying the Iris dataset

The Iris dataset ships with scikit-learn. It has 150 samples of three iris species, each with four measurements (sepal and petal length and width).

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

X, y = load_iris(return_X_y=True)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

knn = KNeighborsClassifier(n_neighbors=3)
knn.fit(X_train, y_train)

print(f"Accuracy: {knn.score(X_test, y_test):.2f}")
```

This prints `Accuracy: 1.00`. `score` on a classifier returns mean accuracy on the data you pass it.

## Getting a more honest score

A perfect score on 30 test samples mostly tells you that this particular split was easy. Two changes make the evaluation more trustworthy:

- **Scale the features.** k-NN uses distances, so a feature measured on a larger scale dominates the others. `StandardScaler` puts every feature on the same scale.
- **Cross-validate.** `cross_val_score` trains and tests on several different splits and reports each score.

Wrapping the scaler and the model in a pipeline means the scaler is fitted only on the training part of each fold, so no information leaks from the test fold.

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import cross_val_score
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_iris(return_X_y=True)

model = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=3))
scores = cross_val_score(model, X, y, cv=5)

print(f"Accuracy: {scores.mean():.2f} +/- {scores.std():.2f}")
```

This prints `Accuracy: 0.95 +/- 0.03`, which is a better estimate of how the model will do on new flowers than the single 1.00.

## Next steps

- Swap `KNeighborsClassifier` for `LogisticRegression` or `RandomForestClassifier`; the rest of the code stays the same.
- Use `GridSearchCV` to tune `n_neighbors` instead of picking 3 by hand.
- `sklearn.metrics.classification_report` and `ConfusionMatrixDisplay` show per-class results, which matters once classes are imbalanced.
- Scikit-learn is not a deep learning library and does not use GPUs. For neural networks on images, text or audio, use PyTorch or similar.

## Further reading

- [Scikit-learn getting started](https://scikit-learn.org/stable/getting_started.html)
- [User guide: cross-validation](https://scikit-learn.org/stable/modules/cross_validation.html)
- [User guide: pipelines](https://scikit-learn.org/stable/modules/compose.html)
