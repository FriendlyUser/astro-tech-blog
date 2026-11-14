---
tags: ['python', 'jsx', 'react', 'stocks']
title: "How I implemented a stock screener in Python, part II: the scanners"
description: "The JSON config and two yfinance scanners from my stock screener: one flags big high-low ranges, the other finds liquid penny stocks and posts to Discord."
pubDate: Fri, 18 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2994756722.png
---
[Part I](/posts/stonks/ta/stonk_screener_part_I/) covered how the screener builds its list of ticker symbols from a CSV with pandas. This post covers the scanners: the code that takes those tickers, downloads recent prices, and decides which ones to report. Each screen is described by a JSON config, and the matching scanner class does the filtering.

## The config

```json
{
  "name": "High low Technology Stocks",
  "type": "high_low",
  "tsx": {
    "tickers_config": {
      "sectors": "technology"
    }
  },
  "cse": {
    "tickers_config": {
      "industries": ["CleanTech", "Technology"]
    }
  },
  "settings": {
    "percent_cutoff": 0.35,
    "day_cutoff": 3
  }
}
```

- `type` picks the scanner class.
- `tsx` and `cse` hold the `tickers_config` used in part I: technology-sector stocks on the Toronto Stock Exchange, and CleanTech or Technology stocks on the Canadian Securities Exchange.
- `settings` is passed to the scanner. For the high-low scanner, `percent_cutoff: 0.35` means a 35% range (not 0.35%) between the highest high and lowest low, and `day_cutoff: 3` is the lookback window in calendar days. The scanner looks at the whole window at once; it doesn't require the condition to hold on each day.

## High-low scanner

This scanner flags stocks whose price range over the last few days is large compared with the price, then records whether the stock moved up or down over the window.

```python
"""
Scans for stocks with a large high-low range over the last few days.
"""
import multiprocessing
import time
from datetime import date

import pandas as pd
import yfinance as yf
from dateutil.relativedelta import relativedelta

from stock_screener.interfaces import ScannerInterface
from stock_screener.util import post_webhook


class Scanner(ScannerInterface):
    def __init__(self, tickers, cfg):
        self.tickers = tickers
        self.cfg = cfg
        self.search_settings = cfg.get("settings", {})

    def get_data(self, ticker: str, day_cutoff=5) -> pd.DataFrame:
        """Daily bars for the last `day_cutoff` calendar days."""
        end = date.today()
        start = end - relativedelta(days=day_cutoff)
        return yf.download(
            ticker,
            start=start,
            end=end,
            progress=False,           # no progress bar, so no stdout redirect needed
            multi_level_index=False,  # flat "High"/"Low" columns for a single ticker
        )

    def find_anomaly(self, data: pd.DataFrame, percent_cutoff=0.40) -> dict:
        max_value = data["High"].max()
        min_value = data["Low"].min()
        value_diff = max_value - min_value
        max_per_diff = value_diff / max_value
        min_per_diff = value_diff / min_value
        d = dict(Max=max_value, Min=min_value, Diff=value_diff)
        if max_per_diff >= percent_cutoff or min_per_diff >= percent_cutoff:
            first_open = data["Open"].iloc[0]
            last_close = data["Close"].iloc[-1]
            d.update(
                MaxPercentDiff=max_per_diff,
                MinPercentDiff=min_per_diff,
                Direction="up" if last_close > first_open else "down",
            )
        return d

    def get_match(self, ticker):
        percent_cutoff = self.search_settings.get("percent_cutoff", 0.35)
        day_cutoff = self.search_settings.get("day_cutoff", 5)
        data = self.get_data(ticker, day_cutoff)
        if data.empty:  # delisted ticker or no trades in the window
            return None
        d = self.find_anomaly(data, percent_cutoff)
        if "MaxPercentDiff" not in d:
            return None
        d["Ticker"] = ticker
        for key in ("Diff", "MaxPercentDiff", "MinPercentDiff"):
            d[key] = round(d[key], 2)
        return d

    def main_func(self):
        """
        .. todo
          Sending Discord messages from here mixes concerns; return the df instead.
        """
        title = self.cfg.get("name", "")
        with multiprocessing.Pool(multiprocessing.cpu_count()) as p:
            results = p.map(self.get_match, self.tickers)
        matches = [r for r in results if r is not None]

        post_webhook(f"**{title}**")
        post_webhook(f"Length: **{len(matches)}**")
        if not matches:
            return pd.DataFrame()

        content_df = pd.DataFrame(matches).reindex(
            columns=["Ticker", "Max", "Min", "Diff",
                     "MaxPercentDiff", "MinPercentDiff", "Direction"]
        )
        content_str = content_df.to_string(index=False)
        # Discord caps a message at 2,000 characters, so send it in chunks
        for i in range(0, len(content_str), 1950):
            time.sleep(2)
            post_webhook(f"```{content_str[i:i + 1950]}```")
        return content_df


if __name__ == "__main__":
    test_tickers = ["IP.CN", "NTAR.CN", "API.CN", "IGN.CN"]
    scanner = Scanner(test_tickers, {})
    scanner.main_func()
```

`ScannerInterface` and `post_webhook` come from the [stock_screener repo](https://github.com/FriendlyUser/stock_screener); `post_webhook` sends a string to a Discord webhook.

How it works:

- `get_data` downloads daily bars from Yahoo Finance with `yf.download`. The `end` date is exclusive, so today's bar isn't included.
- `find_anomaly` takes the highest high and lowest low in the window and divides the range by each. Because the low is always the smaller number, `min_per_diff` is the larger ratio, so in practice the test is `(high - low) / low >= percent_cutoff`. Direction compares the first open with the last close.
- `main_func` runs `get_match` over the tickers in a process pool, drops the non-matches, and posts the table to Discord.

## Liquid penny stock scanner

The second scanner uses the same structure with a different `get_match`. It keeps stocks that last closed under $5 but traded more than $1 million (close × volume) on that day, i.e. cheap stocks with enough liquidity to actually trade.

```python
    def get_data(self, ticker: str, months_cutoff=1) -> pd.DataFrame:
        end = date.today()
        start = end - relativedelta(months=months_cutoff)
        return yf.download(ticker, start=start, end=end,
                           progress=False, multi_level_index=False)

    def get_match(self, ticker):
        months = self.search_settings.get("months_cutoff", 1)
        data = self.get_data(ticker, months)
        if data.empty:
            return None
        last = data.iloc[-1]
        price_volume = last["Close"] * last["Volume"]
        # penny stock with enough liquidity
        if last["Close"] < 5 and price_volume > 1e6:
            return {
                "Ticker": ticker,
                "Volume": last["Volume"],
                "PriceVolume": price_volume,
                "Close": last["Close"],
            }
        return None
```

`main_func` is the same as above, except the title includes today's date and the columns are `["Ticker", "Volume", "PriceVolume", "Close"]`. Only the last bar is used, so a month of data is more than enough; it just guarantees there is a recent trading day in the window.

## Gotchas

- **yfinance changed its defaults.** The original 2023 code used `data["High"]` directly. Newer yfinance releases return MultiIndex columns (`("High", "IP.CN")`) from `download()` even for one ticker, so `data["High"].max()` returns a Series instead of a number. Pass `multi_level_index=False` as above. `auto_adjust` now defaults to `True`, so `Close` is the split- and dividend-adjusted close.
- **Don't filter with `None.__ne__`.** The original used `filter(None.__ne__, results)`. It only worked because `NotImplemented` was truthy; newer Python versions warn about or reject `NotImplemented` in a boolean context. Use `r is not None`.
- **Off-by-one on the open.** The original took `data["Open"].iloc[1]` for the "first open", which is the second bar. It's `iloc[0]` now.
- **Yahoo data is unofficial.** yfinance scrapes Yahoo's endpoints, which get rate-limited and change without notice. Running a pool of processes against hundreds of tickers will hit those limits.

## References

- [stock_screener source](https://github.com/FriendlyUser/stock_screener/tree/master)
- [Part I](/posts/stonks/ta/stonk_screener_part_I/)
- [yfinance on PyPI](https://pypi.org/project/yfinance/)
