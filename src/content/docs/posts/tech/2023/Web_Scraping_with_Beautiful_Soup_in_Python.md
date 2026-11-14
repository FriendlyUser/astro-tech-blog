---
description: Fetch a Wikipedia page with Requests and pull out its title, section headings, first paragraph and infobox using Beautiful Soup's find, find_all and select.
imgSrc: /imgs/2023/262205434.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-02-10T08:30:57.000Z'
lastUpdated: 2026-11-14
tags: ["python", "web scraping"]
title: "Web scraping with Beautiful Soup: extract headings and tables from a Wikipedia page"
---

Beautiful Soup parses HTML into a tree you can search by tag, attribute or CSS selector. It doesn't fetch pages itself, so it's usually paired with Requests: Requests downloads the HTML, Beautiful Soup finds the parts you want. This post scrapes the Wikipedia article on Python as a worked example.

## Install

```bash
pip install beautifulsoup4 requests
```

## Fetch the page

```python
import requests
from bs4 import BeautifulSoup

URL = "https://en.wikipedia.org/wiki/Python_(programming_language)"
HEADERS = {"User-Agent": "bs4-tutorial/1.0 (learning example)"}

response = requests.get(URL, headers=HEADERS, timeout=10)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")
```

Two details matter here:

- **Send a User-Agent.** Wikipedia's [User-Agent policy](https://meta.wikimedia.org/wiki/User-Agent_policy) asks clients to identify themselves. With the default `python-requests/...` header, this request currently comes back as `403 Forbidden`.
- **Stop on errors.** `raise_for_status()` raises an exception for 4xx and 5xx responses. Printing a message and carrying on, as the first version of this post did, leaves `soup` undefined and fails a line later with a confusing `NameError`.

`"html.parser"` is Python's built-in parser. If you install `lxml` you can pass `"lxml"` instead, which is faster.

## Find elements

The three methods you'll use most:

- `find(name, attrs)` returns the first matching tag, or `None`.
- `find_all(name, attrs)` returns a list of every matching tag.
- `select(css)` and `select_one(css)` take a CSS selector.

### Page title

```python
print(soup.title.get_text(strip=True))
# Python (programming language) - Wikipedia
```

### Section headings

The article body lives inside `#mw-content-text`. Searching only inside it skips the "Contents" heading and other page chrome:

```python
content = soup.select_one("#mw-content-text")
for heading in content.find_all(["h2", "h3"]):
    indent = "  " if heading.name == "h3" else ""
    print(indent + heading.get_text(strip=True))
```

This also stands in for a table of contents. The original version of this post read a `<div id="toc">`, but Wikipedia's current Vector 2022 skin no longer has that element, so `find("div", {"id": "toc"})` returns `None` and the next line crashes. Building the outline from the headings doesn't depend on the skin.

### First paragraph

Wikipedia puts empty `<p class="mw-empty-elt">` tags before the lead paragraph, so skip them:

```python
first_para = content.select_one("p:not(.mw-empty-elt)")
print(first_para.get_text(" ", strip=True))
```

### Infobox rows

The box on the right of the article is a `table.infobox`. Each row with a `<th>` label and a `<td>` value is a fact:

```python
for row in content.select("table.infobox tr"):
    label, value = row.find("th"), row.find("td")
    if label and value:
        print(f"{label.get_text(' ', strip=True)}: {value.get_text(' ', strip=True)}")
```

## Complete script

```python
import requests
from bs4 import BeautifulSoup

URL = "https://en.wikipedia.org/wiki/Python_(programming_language)"
HEADERS = {"User-Agent": "bs4-tutorial/1.0 (learning example)"}

response = requests.get(URL, headers=HEADERS, timeout=10)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

print("Page title:", soup.title.get_text(strip=True))

content = soup.select_one("#mw-content-text")
print("\nSection headings:")
for heading in content.find_all(["h2", "h3"]):
    indent = "  " if heading.name == "h3" else ""
    print(indent + heading.get_text(strip=True))

print("\nFirst paragraph:")
first_para = content.select_one("p:not(.mw-empty-elt)")
print(first_para.get_text(" ", strip=True))

print("\nInfobox:")
for row in content.select("table.infobox tr"):
    label, value = row.find("th"), row.find("td")
    if label and value:
        print(f"{label.get_text(' ', strip=True)}: {value.get_text(' ', strip=True)}")
```

## Gotchas

- **Markup changes.** Scrapers break when a site changes its HTML, which is exactly what happened to the table-of-contents example here. Prefer stable hooks (IDs, semantic class names like `infobox`) over long tag paths, and check for `None` before using a result.
- **JavaScript-rendered pages.** Beautiful Soup only sees the HTML the server sends. If the content is built in the browser, you need the site's API or a browser tool such as Playwright.
- **Use an API when there is one.** For Wikipedia specifically, the [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Main_page) returns structured data and is the better choice for anything beyond a learning exercise.
- **Be polite.** Check the site's terms and `robots.txt`, set a descriptive User-Agent, and don't hammer the server with rapid requests.

## Further reading

- [Beautiful Soup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
- [Requests documentation](https://requests.readthedocs.io/)
