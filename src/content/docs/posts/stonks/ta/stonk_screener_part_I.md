---
tags: ['python', "stocks"]
title: How I implemented a stock screener in python part I
description: A stock screener is a tool that helps you find stocks that meet your criteria. In this post I will show you how I implemented a stock screener in python.
pubDate: Fri, 11 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1231025858.png
---
A stock screener is an important tool for investors and traders because it allows them to quickly filter through thousands of stocks in the market based on specific criteria, such as financial ratios, industry sector, market capitalization, and more. Here are a few reasons why a stock screener is important:

1. Time-saving: A stock screener helps to save time and effort by allowing investors to quickly find potential investment opportunities that meet their specific criteria. Instead of manually sifting through thousands of stocks, a stock screener can narrow down the options to a more manageable list.
2. Customization: Every investor has unique investment goals and preferences, and a stock screener allows investors to customize their search to find stocks that meet their specific needs. This customization can include filtering by specific financial metrics, like price-to-earnings ratios or dividend yields, or by more qualitative criteria, like industry or growth potential.
3. Opportunity identification: A stock screener can help investors identify investment opportunities that may have been overlooked otherwise. By allowing investors to filter stocks based on certain criteria, they can find stocks that are undervalued or have potential for future growth.
4. Risk management: A stock screener can also help investors manage risk by allowing them to filter out stocks that may not meet their risk tolerance level or by identifying stocks that have low volatility or are more defensive in nature.

Overall, a stock screener is an essential tool for any investor or trader looking to find potential investment opportunities in the market. It can save time, help with customization, identify investment opportunities, and manage risk.


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

This is a Python code defining an abstract base class (ABC) called `ScannerInterface`. The `ScannerInterface` class has two abstract methods: `main_func` and `get_match`. Abstract methods are methods that are declared but do not have an implementation in the base class. They must be implemented by any class that inherits from this base class.

The purpose of this code is to define a common interface for different types of scanners, each with its own implementation of the `main_func` and `get_match` methods. By using an abstract base class, the interface can be standardized, making it easier to write code that can work with different types of scanners.

The `main_func` method is left abstract so that it can be implemented by different types of scanners depending on their specific functionality. The `get_match` method, on the other hand, is a method that all scanner classes must implement to get a match for the ticker they are scanning for.

Note that this code alone does not define a concrete scanner class. Instead, it provides a blueprint that other classes can inherit from to create concrete scanner classes. Any class that inherits from the `ScannerInterface` class must implement both `main_func` and `get_match` methods to be considered a valid implementation of the interface.


```python 
 """
  Grab stocks from cad tickers 
"""
import pandas as pd


class TickerControllerV2:
    """
    Grabs cad_tickers dataframes and normalized them
    """

    def __init__(self, cfg: dict):
        """
        Extract yahoo finance tickers from website

        Consider using hardcoded csvs sheets for the tickers to
        increase speed, no need to grab all data dynamically.
        """
        self.yf_tickers = []
        # import csv from github
        ticker_df = pd.read_csv(
            "https://raw.githubusercontent.com/FriendlyUser/cad_tickers_list/main/static/latest/stocks.csv"
        )
        tickers_config = cfg.get("tickers_config")
        us_df = pd.DataFrame()
        if tickers_config != None:
            industries = tickers_config.get("industries")
            if industries != None:
                ticker_df = ticker_df[ticker_df["industry"].isin(industries)]

            us_cfg = tickers_config.get("us_tickers")
            if us_cfg != None:
                # apply filters
                # same format as above
                us_tickers_url = us_cfg.get("url")
                us_df =  pd.read_csv(us_tickers_url)
                # redo filtering if I need more filters,
                # iterate across object property
                price_filter = us_cfg.get("price")
                us_df = us_df[us_df["price"] < price_filter]
                market_cap_filter = us_cfg.get("market_cap")
                us_df = us_df[us_df["MarketCap"] < price_filter]
                if industries != None:
                    us_df = us_df[us_df["industry"].isin(industries)]

        # get symbols from tickers
        ytickers_series = ticker_df.apply(self.ex_to_yahoo_ex, axis=1)
        ytickers = ytickers_series.tolist()
        if us_df.empty == False:
            us_ytickers_series = us_df.apply(self.ex_to_yahoo_ex, axis=1)
            us_ytickers = us_ytickers_series.tolist()
            ytickers = [*ytickers, *us_ytickers]
        self.yf_tickers = ytickers

    def get_ytickers(self) -> list:
        return self.yf_tickers

    @staticmethod
    def ex_to_yahoo_ex(row: pd.Series) -> str:
        """
        Parameters:
          ticker: ticker from pandas dataframe from cad_tickers
          exchange: what exchange the ticker is for
        Returns:

        """
        ticker = str(row["symbol"])
        exchange = row["exShortName"]
        if exchange == "CSE":
            # strip :CNX from symbol
            ticker = ticker.replace(":CNX", "")
        
        # Missing a exchange code
        if exchange in ["OTCPK", "NYSE", "NASDAQ", "NYE", "NCM", "NSM", "NGS"]:
            ticker = ticker.replace(":US", "")
        ticker = ticker.replace(":US", "")
        # 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly
        switcher = {"TSXV": "V", "TSX": "TO", "CSE": "CN"}
        yahoo_ex = switcher.get(exchange, None)
        if yahoo_ex != None:
            return f"{ticker}.{yahoo_ex}"
        return ticker


if __name__ == "__main__":
    import json

    with open("cfg/penny_stocks.json") as file_:
        cfg = json.load(file_)
        ticker_controller = TickerControllerV2(cfg)
        ticker_list = ticker_controller.get_ytickers()
        print(ticker_list)
 
 ```

This is a Python code defining a class called `TickerControllerV2`, which is used to retrieve tickers for Canadian and US stocks from a CSV file and normalize them for use in a financial application.

The `__init__` method initializes an instance of the class by reading a CSV file containing the stock tickers and filtering them based on the configuration provided in the `cfg` parameter. The tickers can be filtered by industry, price, and market capitalization.

The `get_ytickers` method returns a list of stock tickers that have been normalized and are ready to be used in a financial application.

The `ex_to_yahoo_ex` method is a static method that takes a row from the ticker data frame as input and returns the corresponding ticker symbol in the format required by Yahoo Finance. This method is used to normalize the tickers before they are used in the application.

The code includes a main block that loads the configuration from a JSON file and creates an instance of the `TickerControllerV2` class to retrieve the tickers. The tickers are then printed to the console for testing purposes.

Overall, this code provides a convenient way to retrieve and normalize Canadian and US stock tickers for use in a financial application. It can be easily modified to support other types of tickers or to add additional filters based on other criteria.


```python 
 """
  Grab stocks from cad tickers 
"""
import pandas as pd


class TickerControllerV2:
    """
    Grabs cad_tickers dataframes and normalized them
    """

    def __init__(self, cfg: dict):
        """
        Extract yahoo finance tickers from website

        Consider using hardcoded csvs sheets for the tickers to
        increase speed, no need to grab all data dynamically.
        """
        self.yf_tickers = []
        # import csv from github
        ticker_df = pd.read_csv(
            "https://raw.githubusercontent.com/FriendlyUser/cad_tickers_list/main/static/latest/stocks.csv"
        )
        tickers_config = cfg.get("tickers_config")
        us_df = pd.DataFrame()
        if tickers_config != None:
            industries = tickers_config.get("industries")
            if industries != None:
                ticker_df = ticker_df[ticker_df["industry"].isin(industries)]

            us_cfg = tickers_config.get("us_tickers")
            if us_cfg != None:
                # apply filters
                # same format as above
                us_tickers_url = us_cfg.get("url")
                us_df =  pd.read_csv(us_tickers_url)
                # redo filtering if I need more filters,
                # iterate across object property
                price_filter = us_cfg.get("price")
                us_df = us_df[us_df["price"] < price_filter]
                market_cap_filter = us_cfg.get("market_cap")
                us_df = us_df[us_df["MarketCap"] < price_filter]
                if industries != None:
                    us_df = us_df[us_df["industry"].isin(industries)]

        # get symbols from tickers
        ytickers_series = ticker_df.apply(self.ex_to_yahoo_ex, axis=1)
        ytickers = ytickers_series.tolist()
        if us_df.empty == False:
            us_ytickers_series = us_df.apply(self.ex_to_yahoo_ex, axis=1)
            us_ytickers = us_ytickers_series.tolist()
            ytickers = [*ytickers, *us_ytickers]
        self.yf_tickers = ytickers

    def get_ytickers(self) -> list:
        return self.yf_tickers

    @staticmethod
    def ex_to_yahoo_ex(row: pd.Series) -> str:
        """
        Parameters:
          ticker: ticker from pandas dataframe from cad_tickers
          exchange: what exchange the ticker is for
        Returns:

        """
        ticker = str(row["symbol"])
        exchange = row["exShortName"]
        if exchange == "CSE":
            # strip :CNX from symbol
            ticker = ticker.replace(":CNX", "")
        
        # Missing a exchange code
        if exchange in ["OTCPK", "NYSE", "NASDAQ", "NYE", "NCM", "NSM", "NGS"]:
            ticker = ticker.replace(":US", "")
        ticker = ticker.replace(":US", "")
        # 1min, 5min, 15min, 30min, 60min, daily, weekly, monthly
        switcher = {"TSXV": "V", "TSX": "TO", "CSE": "CN"}
        yahoo_ex = switcher.get(exchange, None)
        if yahoo_ex != None:
            return f"{ticker}.{yahoo_ex}"
        return ticker


if __name__ == "__main__":
    import json

    with open("cfg/penny_stocks.json") as file_:
        cfg = json.load(file_)
        ticker_controller = TickerControllerV2(cfg)
        ticker_list = ticker_controller.get_ytickers()
        print(ticker_list)
 
 ```

This code defines a class `TickerControllerV2` that reads stock ticker data from a CSV file and applies some filters to the data based on a configuration file. The resulting tickers are normalized to a format compatible with Yahoo Finance. The main function demonstrates the use of the class by loading a configuration file, creating a `TickerControllerV2` instance, and printing the list of resulting tickers.

The code could be improved in a few ways:

* It would be a good idea to add comments and docstrings to explain what the code is doing and how to use it.
* The `ex_to_yahoo_ex` function is quite long and complex. It might be worth breaking it down into smaller functions to make it more readable.
* There is an error in the market cap filtering code for the US tickers. The filter is using the `price_filter` variable instead of `market_cap_filter`.
* The `if tickers_config != None` statement can be simplified to `if tickers_config:` for readability.
* It might be a good idea to handle errors that might occur when fetching the CSV file from GitHub.


## References
- https://github.com/FriendlyUser/stock_screener/tree/master
