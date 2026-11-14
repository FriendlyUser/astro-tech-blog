---
tags: ['bs4', 'python', 'pandas']
title: Scraping HTML tables with pandas and Beautiful Soup
description: Pull an HTML table into a pandas DataFrame with read_html, parse it by hand with Beautiful Soup when that fails, then clean it and save it as CSV.
pubDate: Fri, 14 August 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3325476992.webp
---

If the data you want is already in an HTML `<table>`, you usually don't need a full scraper.
`pandas.read_html()` turns every table on a page into a DataFrame in one call. When the
markup is too messy for that, Beautiful Soup (`bs4`) lets you walk the table yourself.

The examples use the S&P 500 constituents table on Wikipedia, which has `id="constituents"`.

## Setup

`read_html()` needs an HTML parser: lxml, or Beautiful Soup plus html5lib. Install them along
with `requests`:

```bash
pip install pandas lxml beautifulsoup4 html5lib requests
```

## Fetch the page

You can pass a URL straight to `read_html()`, but many sites (Wikipedia included) reject
requests that don't send a descriptive `User-Agent`. Fetching the page with `requests` gives
you control over headers and lets you check the response before parsing:

```python
import requests

URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
HEADERS = {"User-Agent": "table-scraper-example/1.0 (contact: you@example.com)"}

response = requests.get(URL, headers=HEADERS, timeout=30)
response.raise_for_status()
html = response.text
```

## Parse tables with pandas

`read_html()` returns a list of DataFrames, one per matching table. Use `attrs` or `match`
to pick the table you want instead of relying on its position in the list:

```python
from io import StringIO

import pandas as pd

tables = pd.read_html(StringIO(html), attrs={"id": "constituents"})
df = tables[0]
print(df.head())
```

Wrap the HTML in `StringIO`. Passing a raw HTML string to `read_html()` was deprecated in
pandas 2.1, and pandas 3.0 no longer accepts it. Two other parameters worth knowing:

- `match="some text"` keeps only tables containing text that matches the string or regex.
- `extract_links="body"` returns `(text, href)` tuples for cells that contain links, which
  pandas otherwise drops.

## Parse a table with Beautiful Soup

`read_html()` struggles with tables built for layout, cells containing nested markup you need
to keep, or data that isn't in a `<table>` at all. In those cases parse the HTML yourself:

```python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, "html.parser")
table = soup.find("table", id="constituents")

rows = []
for tr in table.find_all("tr"):
    cells = tr.find_all(["th", "td"])
    rows.append([cell.get_text(strip=True) for cell in cells])

header, *body = rows
print(header)
print(body[:3])
```

Include `th` as well as `td`, or you'll lose the header row (and the first column, on tables
that use `<th>` for row labels). If a cell holds a link you want, read it with
`cell.find("a")["href"]` instead of `get_text()`.

The rows can go straight into a DataFrame:

```python
df = pd.DataFrame(body, columns=header)
```

## Clean the data

A few DataFrame methods cover most of the cleanup scraped tables need:

```python
# Drop exact duplicate rows
df = df.drop_duplicates()

# Rename columns to something easier to type
df = df.rename(columns={"Symbol": "ticker", "Security": "name"})

# Either drop rows with missing values...
df = df.dropna()
# ...or fill them instead (don't do both: after dropna there is nothing left to fill)
# df = df.fillna("")
```

Everything parsed from HTML starts as text. Convert numeric columns explicitly, for example
`pd.to_numeric(df["col"], errors="coerce")`, which turns unparseable values into `NaN`.

## Save to CSV

```python
df.to_csv("sp500.csv", index=False)
```

`index=False` keeps pandas from writing the row index as an extra column.

## Gotchas

- `read_html()` only sees the HTML the server returns. Tables rendered by JavaScript won't be
  there; look for the JSON API the page calls, or use a browser automation tool.
- Merged cells (`rowspan`/`colspan`) are expanded by `read_html()` but not by the manual
  Beautiful Soup loop above, so rows can end up with different lengths.
- Check a site's terms and `robots.txt` before scraping it, and don't hammer it with requests.

## Further reading

- [`pandas.read_html` reference](https://pandas.pydata.org/docs/reference/api/pandas.read_html.html)
- [Beautiful Soup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Requests quickstart](https://requests.readthedocs.io/en/latest/user/quickstart/)
