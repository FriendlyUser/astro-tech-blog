---
tags: ['python', 'introtopython', 'pandas']
title: "Chapter 10: Introduction to data science in Python"
description: What data science is, how it differs from data analytics, and three starter examples using matplotlib, pandas, and requests.
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1651429035.png
---
Data science is the practice of using statistics and programming to answer questions with data. A typical project goes through the same steps: collect the data, clean it, explore it, model or analyze it, and communicate the result. This chapter introduces the idea and then walks through three small Python examples: a chart with matplotlib, a chart from a pandas DataFrame, and loading data from a web API.

## Where it's used

- **Healthcare**: flagging patients at higher risk of a disease so they can be screened earlier.
- **Finance**: spotting fraudulent card transactions that don't match a customer's usual spending pattern.
- **Marketing and retail**: predicting which customers are likely to buy a product, or testing how price changes affect sales.

## Data science vs. data analytics

The two terms overlap and are often used interchangeably. A rough distinction:

- **Data analytics** answers specific questions about existing data: "Which region had the highest sales last quarter?" The tools are descriptive statistics, SQL, spreadsheets, and dashboards.
- **Data science** covers that and also builds models that predict or classify: "Which customers are likely to cancel next month?" It leans more on programming and machine learning.

In practice, job titles and team boundaries vary a lot between companies.

## Plotting with matplotlib

Install the libraries used in this chapter first:

```bash
pip install matplotlib pandas requests
```

A bar chart of monthly sales:

```python
import matplotlib.pyplot as plt

months = ["January", "February", "March", "April", "May", "June"]
sales = [10, 15, 20, 25, 30, 35]

fig, ax = plt.subplots()
ax.bar(months, sales)
ax.set_title("Monthly Sales")
ax.set_xlabel("Month")
ax.set_ylabel("Sales ($)")

plt.show()
```

`ax.bar()` takes the category labels for the x-axis and the bar heights. `plt.show()` opens a window with the chart; in a Jupyter notebook the chart appears below the cell.

## Plotting a pandas DataFrame

pandas DataFrames have a `.plot()` method that calls matplotlib for you:

```python
import matplotlib.pyplot as plt
import pandas as pd

df = pd.DataFrame({
    "year": [2016, 2017, 2018, 2019, 2020],
    "sales": [1000, 1500, 2000, 2500, 3000],
    "expenses": [800, 1000, 1200, 1500, 1800],
})

ax = df.plot(x="year", y=["sales", "expenses"], kind="bar")
ax.set_title("Sales and Expenses by Year")
ax.set_xlabel("Year")
ax.set_ylabel("Amount ($)")

plt.show()
```

The DataFrame has three columns and one row per year. `df.plot()` uses `year` as the x-axis and draws a pair of bars (sales and expenses) for each year. It returns the matplotlib `Axes`, so you can set the title and labels on it directly.

## Loading data from an API

Most real data comes from files, databases, or web APIs. This example fetches sample posts from [JSONPlaceholder](https://jsonplaceholder.typicode.com/), a free fake REST API, and loads them into a DataFrame:

```python
import pandas as pd
import requests

url = "https://jsonplaceholder.typicode.com/posts"

response = requests.get(url, timeout=10)
response.raise_for_status()

df = pd.DataFrame(response.json())
print(df.head())
print(df.groupby("userId").size())
```

- `timeout=10` stops the request from hanging forever if the server doesn't respond.
- `raise_for_status()` raises an exception for 4xx and 5xx responses instead of letting you parse an error page.
- `response.json()` returns a list of dictionaries (one per post with `userId`, `id`, `title`, and `body`), and `pd.DataFrame()` turns each dictionary into a row.
- `groupby("userId").size()` counts how many posts each user wrote, which is a first small piece of analysis.

If an API returns nested JSON, `pd.json_normalize()` flattens it into columns.

## Further reading

- [pandas getting started tutorials](https://pandas.pydata.org/docs/getting_started/index.html)
- [matplotlib quick start guide](https://matplotlib.org/stable/users/explain/quick_start.html)
- [Requests quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/)
