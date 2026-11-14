---
title: 'Getting started with cad_tickers: TSX and TSXV symbols and quotes in Python'
description: Install cad_tickers, my Python package for Canadian stock exchange data, and use it to list TSX and TSXV symbols, with notes on what no longer works.
pubDate: Friday, 25 August 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["python", "cad_tickers"]
projects: ["cad_tickers"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/260870876.webp'
imgAlt: 'Conscrap'
---

:::caution[Updated in November 2026]
cad_tickers hasn't had a release since 1.5.4 in August 2023, and some of the sites it scrapes have changed since. The TSX/TSXV symbol lookup below still works. `get_cse_tickers_df()` now returns `None`, because the CSE listings export URL it downloads returns a 404. The package also pins `pandas<2.0`, so install it on Python 3.11 or earlier.
:::

[cad_tickers](https://github.com/FriendlyUser/cad_tickers) is a Python package I wrote to pull Canadian stock market data: symbol lists from the Toronto Stock Exchange (TSX), TSX Venture (TSXV) and Canadian Securities Exchange (CSE), plus quotes and filings from TMX Money. I use it to build the ticker lists that feed my other stock scripts.

## Installing

The last release pins `pandas>=1.3,<2.0` and `lxml<5`. pandas 1.5.3, the last 1.x release, has no wheels for Python 3.12 or newer, so create the environment with Python 3.11 or earlier:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install cad-tickers
```

## Importing

`import cad_tickers` on its own gives you nothing useful: the package's `__init__.py` only sets the version. Import the functions from their submodules:

```python
from cad_tickers.exchanges.tsx import get_tsx_tickers, get_all_tsx_tickers, get_ticker_data
from cad_tickers.exchanges.cse import get_cse_tickers_df
```

## Listing TSX and TSXV symbols

`get_tsx_tickers` calls the TSX company directory endpoint (`https://www.tsx.com/json/company-directory/search/<exchange>/.*`) and returns a list of symbols. Pass `"tsx"` or `"tsxv"`. `get_all_tsx_tickers()` returns both lists combined.

```python
import pandas as pd
from cad_tickers.exchanges.tsx import get_tsx_tickers

tsx = get_tsx_tickers("tsx")
tsxv = get_tsx_tickers("tsxv")
print(len(tsx), tsx[:5])

df = pd.DataFrame({"symbol": tsx + tsxv, "exchange": ["TSX"] * len(tsx) + ["TSXV"] * len(tsxv)})
df.to_csv("tsx_symbols.csv", index=False)
```

The symbols are in TSX format (`RY`, `BTCQ`, `IGBT.UN`), not Yahoo Finance format. To look them up on Yahoo, append `.TO` for TSX or `.V` for TSXV, and replace the dot in unit and share-class suffixes with a dash (`IGBT-UN.TO`).

The function asserts that the response isn't empty and that the count matches the `length` field the endpoint returns. If TSX changes the endpoint, you get an `AssertionError` rather than a silently empty list.

## Quotes from TMX Money

`get_ticker_data(symbol)` posts a GraphQL query to `https://app-money.tmx.com/graphql`, the API behind money.tmx.com, and returns the `getQuoteBySymbol` result as a dict (price, volume, market cap and so on). It returns `None` if the response isn't JSON.

```python
from cad_tickers.exchanges.tsx import get_ticker_data

quote = get_ticker_data("RY")
if quote:
    print(quote.get("name"), quote.get("price"))
```

`get_all_tickers_data()` runs that query for every TSX and TSXV symbol with a thread pool and returns a DataFrame. That's a few thousand requests, so expect it to take a while and possibly get rate-limited. The TMX API is undocumented and can change without notice.

## What no longer works

- **CSE listings.** `get_cse_tickers_df()` downloaded an Excel export from `thecse.com/export-listings/xlsx`. That URL now returns a 404 page, and the function returns `None` when the response is HTML. Anything built on it, including `mk_full_tickers()`, fails too.
- **CSE documents.** `get_recent_docs_from_url(url)` takes a CSE company page URL (not a ticker) and looks for a `NewsReleasesModal` element that the redesigned CSE site doesn't use.
- **Yahoo Finance news.** `scrap_news_for_ticker(ticker)` parses Yahoo's quote page using CSS class names from its older layout. It catches every exception and returns an empty list, so an empty result usually means the markup changed, not that there's no news. `find_news_link_and_text` is an internal helper that takes a BeautifulSoup tag, not a ticker.

## Further reading

- [cad_tickers on GitHub](https://github.com/FriendlyUser/cad_tickers)
- [cad_tickers on PyPI](https://pypi.org/project/cad-tickers/)
- [cad_tickers documentation](https://cad-tickers.readthedocs.io/en/latest/)
