---
tags: ['python', 'pandas']
title: Scraping HTML tables with pandas read_html and BeautifulSoup
description: Pull an HTML table into a DataFrame with pandas.read_html, pick the right table with match=, and use BeautifulSoup for data held in class attributes.
pubDate: Mon, 20 November 2023
lastUpdated: 2026-11-14
imgSrc: /imgs/2023/4046799380_Scrapping_oil_off_a_painting.png
layout: '@/templates/BasePost.astro'
---

`pandas.read_html()` finds every `<table>` in a page and returns each one as a DataFrame. For well-formed tables it's the quickest way to get data out of a web page. When the data you want lives in attributes (an image URL, a CSS class) rather than in cell text, use BeautifulSoup alongside it.

The examples below were run with pandas 3.0, requests 2.32 and beautifulsoup4 4.14. `read_html` needs a parser installed:

```bash
pip install pandas lxml beautifulsoup4 requests
```

## Reading a table with read_html

```python
from io import StringIO

import pandas as pd
import requests

URL = "https://en.wikipedia.org/wiki/List_of_states_and_territories_of_the_United_States"
# Wikipedia returns 403 Forbidden to clients without a descriptive User-Agent
HEADERS = {"User-Agent": "table-scraper-example/1.0 (contact: you@example.com)"}

resp = requests.get(URL, headers=HEADERS, timeout=30)
resp.raise_for_status()

# match= keeps only tables whose text matches this regex
tables = pd.read_html(StringIO(resp.text), match="Largest")
states = tables[0]
print(states.shape)   # (50, 10)
print(states.head())
```

A few things here that trip people up:

- **Don't pass the URL straight to `read_html` for Wikipedia.** pandas fetches it with urllib's default User-Agent, and Wikipedia now rejects that with HTTP 403. Fetch the page yourself with a proper `User-Agent` header.
- **Wrap HTML strings in `StringIO`.** Passing literal HTML to `read_html` was deprecated in pandas 2.1; it expects a URL, path or file-like object.
- **`tables[0]` is often not the table you want.** On this page the first `<table>` is the navigation sidebar, so `read_html(...)[0]` returns a 14-row, single-column frame of links. Use `match=` (text in the table) or `attrs=` (an exact attribute match, e.g. `attrs={"id": "..."}`) to select the right one.
- Tables with two header rows come back with a `MultiIndex` on the columns. Flatten them with `states.columns = [" ".join(dict.fromkeys(c)) for c in states.columns]` or pass `header=` to choose a row.

## Reading attributes with BeautifulSoup

`read_html` only keeps cell text, so anything stored in attributes is lost. In this table each state's flag is an `<img>` inside a `<span class="flagicon">`, and the cell text is empty. To get the flag image URLs, parse the HTML with BeautifulSoup:

```python
from urllib.parse import urljoin

from bs4 import BeautifulSoup

soup = BeautifulSoup(resp.text, "html.parser")

# CSS selector: the first <table> whose class list includes "wikitable"
table = soup.select_one("table.wikitable")
print(table["class"])  # ['wikitable', 'sortable', ...] - class is a list in bs4

flags = {}
for row in table.find_all("tr"):
    name_cell = row.find("th", scope="row")
    flag = row.find("span", class_="flagicon")
    if name_cell is None or flag is None:
        continue
    img = flag.find("img")
    flags[name_cell.get_text(" ", strip=True)] = urljoin(URL, img["src"])

print(len(flags))  # 50
print(next(iter(flags.items())))  # ('Alabama', 'https://...Flag_of_Alabama.svg...png...')
```

Notes on class attributes in BeautifulSoup:

- `class` is multi-valued in HTML, so `tag["class"]` returns a list, not a string.
- `find_all("span", class_="flagicon")` matches if *any* of the element's classes is `flagicon`. `select("table.wikitable")` does the same with CSS selector syntax.
- Use `tag.get("class")` instead of `tag["class"]` when the attribute may be missing; it returns `None` instead of raising `KeyError`.

## When this breaks

- Pages that build tables with JavaScript return no `<table>` in the raw HTML. Look for the JSON endpoint the page calls (browser dev tools, Network tab) or use a headless browser.
- Wikipedia layouts change. Selecting by heading text (`match=`) is more robust than relying on table order.
- For Wikipedia data in bulk, the [MediaWiki API](https://www.mediawiki.org/wiki/API:Main_page) is more reliable than scraping rendered pages.

## Further reading

- [pandas.read_html](https://pandas.pydata.org/docs/reference/api/pandas.read_html.html)
- [Beautiful Soup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Wikimedia User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy)
