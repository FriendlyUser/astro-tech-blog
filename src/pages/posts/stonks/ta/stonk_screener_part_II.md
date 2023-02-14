---
tags: ['python', 'jsx', 'react']
title: How I implemented a stock screener in python Part II
description: A stock screener is a tool that helps you find stocks that meet your criteria. In this post I will show you how I implemented a stock screener in python.
pubDate: Fri, 18 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2994756722.png
---
The previous post focused on how to extract ticker symbols using Python, with a code example provided to illustrate the process. The code example demonstrated how to use the Pandas library to read data from a CSV file and apply filters to the data to extract relevant ticker symbols.
This post covers the logic used in my screeners. The logic is written in Python and is used to filter out stocks that do not meet the criteria of the screener. The logic is stored in a JSON file and is used by the Python code to filter out stocks that do not meet the criteria of the screener.
```js 
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

This is a configuration file for a program or algorithm that focuses on identifying high and low performing technology stocks on the Toronto Stock Exchange (TSX) and the Canadian Securities Exchange (CSE).

The program uses the tickers\_config settings to filter out stocks in specific sectors and industries. For the TSX, it only considers stocks in the technology sector, while for the CSE, it considers stocks in both CleanTech and Technology industries.

The settings section defines the parameters used by the algorithm to determine which stocks are considered high or low performing. The percent\_cutoff parameter is set to 0.35, which means that stocks with a daily percent change greater than or equal to 0.35% will be considered high performing, while stocks with a daily percent change less than or equal to -0.35% will be considered low performing. The day\_cutoff parameter is set to 3, which means that only stocks that have met the high or low performing criteria for at least 3 days will be included in the program's final output.

Overall, this configuration file sets the criteria and filters for a program to identify high and low performing technology stocks on the TSX and CSE based on their percent change over a specified number of days.


```python 
 """
Scans for stocks with a change from the low to high with a high number
"""
import yfinance as yf
import numpy as np
import sys
import os
import dateutil.relativedelta
import pandas as pd
import glob
import json
import multiprocessing
from datetime import datetime, date
from stock_screener.util import post_webhook
from stock_screener.interfaces import ScannerInterface
import time

class Scanner(ScannerInterface):
    def __init__(self, tickers, cfg):
        self.tickers = tickers
        self.cfg = cfg
        self.search_settings = cfg.get("settings", {})

    def get_data(self, ticker: str, day_cutoff=5) -> pd.DataFrame:
        """
        Grab daily days for high and low
        """
        current_date = datetime.strptime(date.today().strftime("%Y-%m-%d"), "%Y-%m-%d")
        past_date = current_date - dateutil.relativedelta.relativedelta(days=day_cutoff)
        sys.stdout = open(os.devnull, "w")
        data = yf.download(ticker, past_date, current_date)
        sys.stdout = sys.__stdout__
        return data

    def find_anomaly(self, data: pd.DataFrame, PERCENT_CUTOFF=0.40) -> dict:
        max_value = data["High"].max()
        min_value = data["Low"].min()
        value_diff = abs(max_value - min_value)
        max_per_diff = value_diff / max_value
        min_per_diff = value_diff / min_value
        if max_per_diff >= PERCENT_CUTOFF or min_per_diff >= PERCENT_CUTOFF:
            Direction = "N/A"
            try:
                if data.empty == False:
                    # first open
                    d_open = data["Open"].iloc[1]
                    # last close
                    d_close = data["Close"].iloc[-1]
                    Direction = "up" if d_close > d_open else "down"
            except Exception as e:
                print(e)
            d = dict(
                Max=max_value,
                Min=min_value,
                Diff=value_diff,
                MaxPercentDiff=max_per_diff,
                MinPercentDiff=min_per_diff,
                Direction=Direction,
            )
        else:
            d = dict(Max=max_value, Min=min_value, Diff=value_diff)
        return d

    def get_match(self, ticker):
        """
        get match for ticker
        for the past five days
        """
        PERCENT_CUTOFF = self.search_settings.get("percent_cutoff", 0.35)
        DAY_CUTOFF = self.search_settings.get("day_cutoff", 5)
        ticker_data = self.get_data(ticker, DAY_CUTOFF)
        d = self.find_anomaly(ticker_data, PERCENT_CUTOFF)
        if d.get("MaxPercentDiff") or d.get("MinPercentDiff"):
            d["Ticker"] = ticker
            d["Max % Diff"] = round(d["MaxPercentDiff"], 2)
            d["Min % Diff"] = round(d["MinPercentDiff"], 2)
            d["Diff"] = round(d["Diff"], 2)
            return d

    def main_func(self):
        """
        Main function for the unusual volume scanner

        .. todo
          Determine if this is the best place to send discord messages
          probably with seperation of concerns, no.
        """
        cpus = multiprocessing.cpu_count()
        title = self.cfg.get("name", "")
        with multiprocessing.Pool(cpus) as p:
            positive_scans = p.map(self.get_match, self.tickers)
        post_webhook(f"**{title}**")
        not_none_values = filter(None.__ne__, positive_scans)
        list_of_values = list(not_none_values)
        post_webhook(f"Length: **{len(list_of_values)}**")
        content_df = pd.DataFrame(list_of_values).reindex(
            columns=[
                "Ticker",
                "Max",
                "Min",
                "Diff",
                "MaxPercentDiff",
                "MinPercentDiff",
                "Direction",
            ]
        )
        if content_df.empty == True:
            post_webhook(f"**{title}**")
            return
        content_str = content_df.to_string(index=False)
        # move later, just return df
        for chunk in [
            content_str[i : i + 1950] for i in range(0, len(content_str), 1950)
        ]:
            time.sleep(2)
            post_webhook(f"```{chunk}```")
        return content_df


if __name__ == "__main__":
    test_tickers = ["IP.CN", "NTAR.CN", "API.CN", "IGN.CN"]
    cfg = {}
    scanner = Scanner(test_tickers, cfg)
    ip = scanner.main_func()
 
 ```

This code Implements the Scanner interface for finding high and low technology stocks based on a given percentage cutoff and day cutoff. It imports several packages, including yfinance for downloading stock data, numpy, sys, os, dateutil.relativedelta, pandas, glob, json, multiprocessing, and time.

The Scanner class has three methods: **init**, get\_data, and find\_anomaly.

**init** initializes the class with a list of tickers to scan and a configuration dictionary (cfg).

get\_data takes a ticker symbol and a day cutoff and returns a DataFrame of daily data for the past day\_cutoff days, using yf.download from the yfinance package to get the data.

find\_anomaly takes a DataFrame of stock data and a percentage cutoff, and returns a dictionary of maximum and minimum values for high and low stock prices, the difference between them, the maximum and minimum percentage differences between the values, and the direction (up or down) of the stock price. If the percentage difference is greater than or equal to the percentage cutoff, the direction is calculated as the difference between the first open price and the last close price.

The main\_func method is the main function of the scanner. It creates a multiprocessing Pool with a number of processes equal to the number of CPUs and maps the get\_match method to each ticker in the list of tickers. It then creates a Pandas DataFrame of the results, filters out any None values, and prints the results to a Discord webhook. Finally, it returns the DataFrame of results.

The script also includes a test case that creates a Scanner object with a list of tickers and an empty configuration dictionary, and calls the main\_func method on the Scanner object.


```python 
 import yfinance as yf
import numpy as np
import sys
import os
import dateutil.relativedelta
import pandas as pd
import multiprocessing
from datetime import datetime, date
from stock_screener.util import post_webhook
from stock_screener.interfaces import ScannerInterface
import time


class Scanner(ScannerInterface):
    def __init__(self, tickers, cfg):
        self.tickers = tickers
        self.cfg = cfg
        self.search_settings = cfg.get("settings", {})

    def get_data(self, ticker: str, months_cutoff=1) -> pd.DataFrame:
        current_date = datetime.strptime(date.today().strftime("%Y-%m-%d"), "%Y-%m-%d")
        past_date = current_date - dateutil.relativedelta.relativedelta(
            months=months_cutoff
        )
        sys.stdout = open(os.devnull, "w")
        data = yf.download(ticker, past_date, current_date)
        sys.stdout = sys.__stdout__
        return data

    def custom_print(self, d: pd.DataFrame, tick: str):
        print("\n\n\n*******  " + tick.upper() + "  *******")
        print("Ticker is: " + tick.upper())
        print("*********************\n\n\n")

    
    @staticmethod
    def calc_price_vol(ticker_data: pd.DataFrame):
        try:
            price = ticker_data["Close"].iloc[-1]
            volume = ticker_data["Volume"].iloc[-1]
            return price * volume
        except Exception as e:
            print(e)
            return None

    def get_match(self, ticker):
        """
        get match for ticker
        """
        DAY_CUTOFF = self.search_settings.get("day_cutoff", 1)
        ticker_data = self.get_data(ticker, DAY_CUTOFF)
        try:
            last_close = ticker_data["Close"].iloc[-1]
            price_volume = self.calc_price_vol(ticker_data)
            # penny stock with enough liquidity
            if last_close < 5 and price_volume > 1E6:
                stonk = dict()
                stonk["Ticker"] = ticker
                stonk["Volume"] = ticker_data["Volume"].iloc[-1]
                stonk["PriceVolume"] = price_volume
                stonk["Close"] = last_close
                return stonk
        except Exception as e:
            print("Index failure for stock")
            print(ticker)
            print(e)

    def main_func(self):
        """
        Main function for the unusual volume scanner

        .. todo
          Determine if this is the best place to send discord messages
          probably with seperation of concerns, no.
        """
        cpus = multiprocessing.cpu_count()
        title = self.cfg.get("name", "")
        with multiprocessing.Pool(cpus) as p:
            positive_scans = p.map(self.get_match, self.tickers)
        curr_date = date.today().strftime("%Y-%m-%d")
        post_webhook(f"**{title} - {curr_date}**")
        not_none_values = filter(None.__ne__, positive_scans)
        list_of_values = list(not_none_values)
        post_webhook(f"Number of stocks: {len(list_of_values)}")
        content_df = pd.DataFrame(list_of_values).reindex(
            columns=["Ticker", "Volume", "PriceVolume", "Close"]
        )
        content_str = content_df.to_string(index=False)

        # if else statement in case dataframe is missing
        for chunk in [
            content_str[i : i + 1950] for i in range(0, len(content_str), 1950)
        ]:
            print("SENDING CHUNK")
            time.sleep(2)
            post_webhook(f"```{chunk}```")
        return content_df
 
 ```

This is another scanner that implements an unusual volume scanner using the Yahoo Finance API. The script defines a class called `Scanner` that has a constructor, a `get_data` method, a `custom_print` method, a `calc_price_vol` method, a `get_match` method, and a `main_func` method.

The `Scanner` constructor takes two parameters, `tickers` and `cfg`. `tickers` is a list of stock tickers that will be scanned, and `cfg` is a dictionary of configuration settings.

The `get_data` method takes a `ticker` parameter and an optional `months_cutoff` parameter (default 1). It downloads historical data for the given `ticker` from `months_cutoff` months ago to the current date using the Yahoo Finance API and returns it as a pandas DataFrame.

The `custom_print` method takes a pandas DataFrame `d` and a stock ticker `tick` and prints some information about the DataFrame and the stock ticker.

The `calc_price_vol` method takes a pandas DataFrame `ticker_data` and calculates the product of the latest closing price and the latest volume for the given stock ticker. If an error occurs during this calculation, it returns `None`.

The `get_match` method takes a stock ticker `ticker`, gets the historical data for that ticker using the `get_data` method, and checks if the latest closing price is less than 5 and the product of the latest closing price and the latest volume is greater than 1E6. If these conditions are met, it returns a dictionary with information about the stock ticker, including the ticker symbol, volume, price volume, and closing price.

The `main_func` method is the main function of the script that runs the unusual volume scanner. It uses multiprocessing to run the `get_match` method in parallel for each stock ticker in the `tickers` list. It then filters out any `None` values and creates a pandas DataFrame from the remaining results. It also sends a Discord webhook with information about the number of stocks that meet the search criteria and the information about each stock.

## References
- https://github.com/FriendlyUser/stock_screener/tree/master
- https://friendlyuser.github.io/posts/stonks/ta/stonk_screener_part_I
