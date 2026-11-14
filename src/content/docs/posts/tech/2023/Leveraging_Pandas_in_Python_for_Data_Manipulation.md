---
description: "Pandas basics in Python: build DataFrames and Series, load a CSV, then select, filter, sort and group rows, with a note on Copy-on-Write and .loc."
imgSrc: /imgs/2023/481242631.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-12-03T08:17:39.000Z'
lastUpdated: 2026-11-14
tags: ["python", "pandas"]
title: "Pandas basics: create, select, filter, sort and group DataFrames"
---

Pandas is the standard Python library for working with tabular data: it loads CSVs, Excel files and SQL query results into a `DataFrame`, then gives you vectorized operations to filter, reshape and aggregate them. The name comes from "panel data", the econometrics term for multi-dimensional data sets.

## Install and import

```sh
pip install pandas
```

```python
import pandas as pd
```

`pd` is the conventional alias. You'll see it in the docs and almost every example online.

## DataFrame and Series

A `DataFrame` is a two-dimensional table with labelled rows (the index) and labelled columns, where each column can have its own dtype. A `Series` is a single labelled column. Selecting one column from a DataFrame gives you a Series.

The examples below all use this DataFrame:

```python
import pandas as pd

df = pd.DataFrame(
    {
        "col1": [1, 2, 3, 4],
        "col2": ["A", "B", "A", "B"],
        "col3": [1.1, 2.2, 3.3, 4.4],
    }
)

s = pd.Series([1, 2, 3, 4], index=["a", "b", "c", "d"])
```

## Load data from a file

```python
df = pd.read_csv("example.csv")
```

There are matching readers for other formats, such as `pd.read_excel`, `pd.read_parquet`, `pd.read_json` and `pd.read_sql`. Call `df.head()`, `df.info()` and `df.describe()` right after loading to check that the columns and dtypes are what you expect.

## Select columns and rows

One column returns a Series. A list of columns returns a DataFrame:

```python
col1 = df["col1"]
subset = df[["col1", "col3"]]
```

For rows, use the two indexers. `iloc` selects by position and `loc` selects by label (or by a boolean mask):

```python
first_row = df.iloc[0]          # first row by position
first_two = df.iloc[0:2]        # rows 0 and 1
by_label = df.loc[0, "col3"]    # row label 0, column "col3" -> 1.1
```

With the default integer index, labels and positions happen to match. After filtering or sorting they won't, so be clear which one you mean.

## Filter rows

A comparison on a column produces a boolean Series, which you can use as a mask:

```python
big = df[df["col1"] > 2]
```

Combine conditions with `&` (and), `|` (or) and `~` (not). Each condition needs its own parentheses, because `&` binds more tightly than `>`:

```python
filtered = df[(df["col1"] > 2) & (df["col3"] < 4)]   # only the row where col1 == 3
```

## Sort

```python
sorted_df = df.sort_values("col1", ascending=False)
sorted_df = df.sort_values(["col2", "col3"])          # sort by several columns
```

## Aggregate and group

Columns have the usual aggregations: `sum()`, `mean()`, `min()`, `max()`, `count()`:

```python
mean_col1 = df["col1"].mean()   # 2.5
```

`groupby` splits the rows by a key, applies an aggregation to each group, and combines the results:

```python
totals = df.groupby("col2")["col1"].sum()
# col2
# A    4
# B    6
# Name: col1, dtype: int64

summary = df.groupby("col2").agg(total=("col1", "sum"), avg_col3=("col3", "mean"))
```

## Gotcha: modify with `.loc`, not chained indexing

This looks like it should set `col3` to zero for the filtered rows, but it doesn't change `df`:

```python
df[df["col1"] > 2]["col3"] = 0   # assigns to a temporary copy
```

Since pandas 3.0, Copy-on-Write is always on, so the first indexing step always produces a new object and the assignment is lost (pandas emits a `ChainedAssignmentError` warning). Older versions raised `SettingWithCopyWarning`. Do the selection and the assignment in a single `.loc` call:

```python
df.loc[df["col1"] > 2, "col3"] = 0
```

## Further reading

- [10 minutes to pandas](https://pandas.pydata.org/docs/user_guide/10min.html)
- [Indexing and selecting data](https://pandas.pydata.org/docs/user_guide/indexing.html)
- [Group by: split-apply-combine](https://pandas.pydata.org/docs/user_guide/groupby.html)
- [Migration guide: Copy-on-Write](https://pandas.pydata.org/docs/user_guide/migration.html#copy-on-write-cow)
