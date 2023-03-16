---
title: Getting Started with Cad Tickers and Python
description: Cad Tickers is a python package that allows you to extract exchange data from the Canadian stock market websites such as CSE and TSX.
pubDate: Friday, 25 August 2023 13:00:00 GMT
tags: ["python", "cad_tickers"]
projects: ["cad_tickers"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/260870876.png'
imgAlt: 'Conscrap'
---

# Getting Started with Cad Tickers and Python

Cad Tickers is a python package that allows you to extract exchange data from the Canadian stock market websites such as CSE and TSX.

In this article, we will show you how to install and use Cad Tickers to get some basic information about Canadian stocks.

## Prerequisites

To follow this tutorial, you will need:

- Python 3.6 or higher installed on your machine
- Pip package manager installed on your machine
- A code editor of your choice (we recommend Visual Studio Code)

## Installing Cad Tickers

To install Cad Tickers, you can use pip:

```bash
pip install cad-tickers
```

This will download and install the latest version of Cad Tickers and its dependencies.

## Using Cad Tickers

To use Cad Tickers, you need to import it in your python script:

```python
import cad_tickers
```

Then, you can use various functions provided by the package to get different types of data.

For example, if you want to get a pandas dataframe of all tickers traded on CSE, you can use:

```python
cse_df = cad_tickers.get_cse_tickers_df()
print(cse_df)
```

This will print a dataframe containing ticker symbols and company names for each stock on CSE.

If you want to get a list of recent documents from the CSE website for a specific ticker symbol, such as press releases or financial statements, you can use:

```python
docs = cad_tickers.get_recent_docs_from_url("ACB")
print(docs)
```

This will print a list of dictionaries containing document titles and URLs for Aurora Cannabis Inc.

If you want to find news links and text for a specific ticker symbol from Yahoo Finance, you can use:

```python
news = cad_tickers.find_news_link_and_text("ACB")
print(news)
```

This will print a list of dictionaries containing news titles, URLs and text summaries for Aurora Cannabis Inc.

Saving Dataframes as CSV Files
If you want to save the dataframes that you get from Cad Tickers as CSV files, you can use the pandas to_csv method. For example, if you want to save the CSE dataframe as a CSV file named cse.csv, you can use:

```python
cse_df = cad_tickers.get_cse_tickers_df()
cse_df.to_csv("cse.csv", index=False)
```

This will create a CSV file in your current working directory with the same columns and rows as the dataframe.

You can also specify other parameters for the to_csv method, such as the separator character, the encoding format, or whether to include headers or not. You can find more information about this method at https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.DataFrame.to_csv.html.

You can find more examples and documentation for Cad Tickers at https://pypi.org/project/cad-tickers/.

Source: Conversation with Bing, 3/15/2023(1) How to download reports from the CSE exchange with python. https://dlcoder.medium.com/how-to-download-reports-from-the-cse-exchange-with-python-52cbcf079c10 Accessed 3/15/2023.
(2) python - How can efficiently download a large list of tickers from .... https://stackoverflow.com/questions/63859786/how-can-efficiently-download-a-large-list-of-tickers-from-yahoo-finance Accessed 3/15/2023.
(3) Welcome to cad_tickers’s documentation! — cad_tickers v0.1.3 documentation. https://cad-tickers.readthedocs.io/en/v1.5.2/ Accessed 3/15/2023.