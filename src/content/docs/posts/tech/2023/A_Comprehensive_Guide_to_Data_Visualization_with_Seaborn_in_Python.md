---
description: How to make scatter, distribution, categorical and correlation plots with
  Seaborn 0.13, plus the figure-level vs axes-level split that trips people up.
imgSrc: /imgs/2023/2463860355.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-12-16T08:27:25.000Z'
lastUpdated: 2026-11-14
tags: ["python", "pandas"]
title: 'Seaborn basics: statistical plots from pandas DataFrames'
---

Seaborn is a Python plotting library built on Matplotlib. You hand it a pandas DataFrame and the names of columns, and it handles grouping, colouring by category, legends and statistical summaries such as histograms, kernel density estimates and confidence intervals. When you need to adjust something Seaborn doesn't expose, you drop down to the Matplotlib objects underneath.

The examples below were run with Seaborn 0.13.2, which needs Python 3.8 or later.

## Installing

```bash
pip install seaborn
# or
conda install seaborn
```

This also pulls in NumPy, pandas and Matplotlib.

## Loading data

Seaborn ships a few example datasets for learning. `load_dataset` downloads them from the [seaborn-data](https://github.com/mwaskom/seaborn-data) repository the first time you use them, so it needs a network connection. After that it reads them from a local cache.

```python
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

tips = sns.load_dataset("tips")
print(tips.head())
```

`tips` has numeric columns (`total_bill`, `tip`, `size`) and categorical ones (`sex`, `smoker`, `day`, `time`). For your own data, any DataFrame works:

```python
data = pd.read_csv("my_data.csv")
```

Seaborn prefers "long-form" (tidy) data, meaning one row per observation and one column per variable. Most plotting functions take `data=` plus column names for `x`, `y` and `hue`.

## Basic plots

### Scatter plot

```python
sns.scatterplot(data=tips, x="total_bill", y="tip", hue="time")
plt.show()
```

`hue` colours the points by a third column and adds a legend.

### Histogram

```python
sns.histplot(data=tips, x="total_bill", bins=20, kde=True)
plt.show()
```

`kde=True` overlays a kernel density estimate on the bars.

### Box plot

```python
sns.boxplot(data=tips, x="day", y="total_bill")
plt.show()
```

## Styling

`set_theme` sets the style, palette and font scale for every plot that follows:

```python
sns.set_theme(style="whitegrid", palette="deep")
```

To pick colours for one plot, pass `palette`. It only applies when `hue` is set. Without `hue`, relational plots such as `scatterplot` ignore it with a warning, and categorical plots such as `boxplot` raise a `FutureWarning` because that usage is deprecated in 0.13. For per-category colours in a box plot, set `hue` to the same column as `x` and pass `legend=False`.

```python
sns.scatterplot(data=tips, x="total_bill", y="tip", hue="time", palette="coolwarm")
plt.show()
```

## Figure-level vs axes-level functions

This is the part of Seaborn that causes the most confusion.

- **Axes-level** functions (`scatterplot`, `histplot`, `boxplot`, `violinplot`, `heatmap`) draw onto one Matplotlib `Axes`. You can pass `ax=` and size the figure with Matplotlib.
- **Figure-level** functions (`relplot`, `displot`, `catplot`, `pairplot`, `jointplot`) create their own figure, which may contain several axes. They return a grid object, and you size them with `height` and `aspect`. Calling `plt.figure(figsize=...)` beforehand has no effect on them.

Sizing an axes-level plot:

```python
fig, ax = plt.subplots(figsize=(12, 6))
sns.histplot(data=tips, x="total_bill", bins=20, ax=ax)
ax.set_title("Total bill")
plt.show()
```

Splitting a figure-level plot into panels by a column:

```python
g = sns.relplot(data=tips, x="total_bill", y="tip", hue="smoker", col="time", height=4, aspect=1.2)
g.savefig("tips_by_time.png")
```

## More plot types

### Pair plot

`pairplot` draws a scatter plot for every pair of numeric columns and a distribution plot on the diagonal:

```python
sns.pairplot(tips, hue="time")
plt.show()
```

### Correlation heatmap

`DataFrame.corr()` only works on numeric columns. Since pandas 2.0 it raises a `ValueError` if the frame has string or categorical columns, so pass `numeric_only=True`:

```python
correlation = tips.corr(numeric_only=True)
sns.heatmap(correlation, annot=True, cmap="coolwarm", vmin=-1, vmax=1)
plt.show()
```

Setting `vmin` and `vmax` keeps the colour scale centred on zero, so a weak correlation doesn't look strong.

### Violin plot

A violin plot shows a kernel density estimate for each category. `inner="quart"` draws the quartiles inside each violin:

```python
sns.violinplot(data=tips, x="day", y="total_bill", inner="quart")
plt.show()
```

### Joint plot

`jointplot` shows a bivariate plot with the distribution of each variable along the margins:

```python
sns.jointplot(data=tips, x="total_bill", y="tip", kind="reg")
plt.show()
```

`kind` can be `"scatter"`, `"kde"`, `"hist"`, `"hex"`, `"reg"` or `"resid"`.

## Gotchas

- In scripts, call `plt.show()` or `savefig`. In Jupyter the plot renders on its own.
- Seaborn draws on the current Matplotlib axes. If plots overlap in a script, create a new figure for each one or pass `ax=`.
- Seaborn's statistical plots (such as `lineplot` with repeated x values, or `barplot`) aggregate your data and draw confidence intervals by default. Check the `errorbar` parameter if the bars don't match what you expected.

## Further reading

- [Seaborn tutorial](https://seaborn.pydata.org/tutorial.html)
- [API reference](https://seaborn.pydata.org/api.html)
- [The `seaborn.objects` interface](https://seaborn.pydata.org/tutorial/objects_interface.html), a newer declarative API added in 0.12
