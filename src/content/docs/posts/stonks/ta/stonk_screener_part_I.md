---
tags: ['python', "stocks", "pandas"]
title: 'How I implemented a stock screener in Python, part I: scanner interface and ticker list'
description: Part I of my Python stock screener, covering a shared scanner interface and a class that loads Canadian and US tickers as Yahoo Finance symbols.
pubDate: Fri, 11 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1231025858.webp
---

A stock screener filters thousands of listings down to a short list that matches your rules, such as price, market cap, industry or recent price action. I wrote my own in Python, with each screen described by a JSON config and matches posted to Discord. The full code is in [FriendlyUser/stock_screener](https://github.com/FriendlyUser/stock_screener/tree/master).

This first part covers two pieces: an interface that every scanner implements, and a controller that builds the list of tickers to scan.

## The scanner interface

Every scanner implements the same two methods, so calling code can run any of them without knowing which one it has:

```python
from abc import ABC, abstractmethod


class ScannerInterface(ABC):
    """Each scanner has an interface and get_match for the ticker"""

    @abstractmethod
    def main_func(self):
        pass

    @abstractmethod
    def get_match(self, ticker):
        pass
```

`main_func` runs the scanner's own workflow, and `get_match(ticker)` decides whether a single ticker passes. Because both are marked `@abstractmethod`, Python raises a `TypeError` if you try to instantiate a subclass that forgets one of them, so a half-written scanner fails at startup instead of halfway through a scan.

## Building the ticker list

The tickers come from my [cad_tickers_list](https://github.com/FriendlyUser/cad_tickers_list) repo, which publishes a CSV of TSX and TSX Venture listings with columns such as `symbol`, `exShortName`, `industry`, `price` and `MarketCap`. Optionally the controller also loads a US ticker CSV and applies price and market cap limits to it.

Yahoo Finance needs an exchange suffix for Canadian listings (`.TO` for the TSX, `.V` for the TSX Venture, `.CN` for the CSE). It also writes share classes and trust units with a dash, so `BBD.B` on the TSX becomes `BBD-B.TO`. US listings need no suffix.

```python
"""
Grab stocks from cad_tickers
"""
import pandas as pd

CAD_TICKERS_CSV = (
    "https://raw.githubusercontent.com/FriendlyUser/"
    "cad_tickers_list/main/static/latest/stocks.csv"
)


class TickerControllerV2:
    """Loads cad_tickers dataframes and normalizes symbols for Yahoo Finance."""

    def __init__(self, cfg: dict):
        ticker_df = pd.read_csv(CAD_TICKERS_CSV)
        us_df = pd.DataFrame()

        tickers_config = cfg.get("tickers_config") or {}
        industries = tickers_config.get("industries")
        if industries:
            ticker_df = ticker_df[ticker_df["industry"].isin(industries)]

        us_cfg = tickers_config.get("us_tickers")
        if us_cfg:
            us_df = pd.read_csv(us_cfg["url"])
            if "price" in us_cfg:
                us_df = us_df[us_df["price"] < us_cfg["price"]]
            if "market_cap" in us_cfg:
                us_df = us_df[us_df["MarketCap"] < us_cfg["market_cap"]]
            if industries:
                us_df = us_df[us_df["industry"].isin(industries)]

        frames = [df for df in (ticker_df, us_df) if not df.empty]
        self.yf_tickers = [
            self.ex_to_yahoo_ex(row) for df in frames for _, row in df.iterrows()
        ]

    def get_ytickers(self) -> list[str]:
        return self.yf_tickers

    @staticmethod
    def ex_to_yahoo_ex(row: pd.Series) -> str:
        """Convert a cad_tickers row (symbol + exShortName) to a Yahoo symbol."""
        ticker = str(row["symbol"]).replace(":CNX", "").replace(":US", "")
        suffix = {"TSX": "TO", "TSXV": "V", "CSE": "CN"}.get(row["exShortName"])
        if suffix is None:
            # US listings need no suffix on Yahoo
            return ticker
        # Yahoo writes share classes and units with a dash: BBD.B -> BBD-B.TO
        return f"{ticker.replace('.', '-')}.{suffix}"


if __name__ == "__main__":
    import json

    with open("cfg/penny_stocks.json") as file_:
        cfg = json.load(file_)
    ticker_list = TickerControllerV2(cfg).get_ytickers()
    print(ticker_list)
```

A config that keeps only Canadian oil and gas producers looks like this. Industry names must match the `industry` column in the CSV exactly:

```json
{
  "tickers_config": {
    "industries": ["Oil & Gas Exploration and Production"]
  }
}
```

Running the script with that config prints Yahoo-ready symbols:

```text
['AAV.TO', 'ARX.TO', 'BTE.TO', 'BNG.TO', 'BIR.TO', ...]
```

To add US tickers, include a `us_tickers` block with a `url` to a CSV that has `symbol`, `exShortName`, `price`, `MarketCap` and `industry` columns, plus optional `price` and `market_cap` upper limits.

## Fixes since the first version

When I first published this, the US market cap filter compared `MarketCap` against the price limit (`us_df["MarketCap"] < price_filter`), so it dropped nearly every row. The version above fixes that. It also skips a filter when its key is missing from the config (comparing a column against `None` silently returns all `False`, which empties the frame), and it converts dotted share-class symbols to Yahoo's dashed form.

## Things to watch

- The CSV is downloaded on every run. If you scan often, cache it locally and refresh it daily.
- `pd.read_csv` on a URL raises on network errors. Wrap it if the screener runs unattended.
- Yahoo symbols for delisted or recently renamed companies return empty data, so later scanners should treat an empty download as "no match", not as an error.

[Part II](/posts/stonks/ta/stonk_screener_part_II/) covers the scanners themselves.
