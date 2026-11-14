---
title: "Building a Bollinger Bands web app with Streamlit and the OpenBB SDK"
description: "How my Streamlit app loaded stock prices with the OpenBB SDK, rendered OpenBB's Bollinger Bands chart as an image, and what to use now that the SDK is retired."
alt: Applying nlp to various youtube videos
pubDate: Friday, 12 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/sample.webp'
imgAlt: 'rbc stock analyzer'
---

:::caution[OpenBB SDK and st.cache are retired]
This app was built on the `openbb-terminal` package (the "OpenBB SDK" v3). OpenBB has since sunset the Terminal and replaced the SDK with the [OpenBB Platform](https://docs.openbb.co/) (`pip install openbb`, `from openbb import obb`), so the `openbb_terminal` imports below no longer work on a fresh install. `st.cache` was deprecated in Streamlit 1.18 and removed in 1.62; use `st.cache_data` instead. The last section shows a version without OpenBB.
:::

This project is a small Streamlit app that draws technical analysis charts for a stock. You type a ticker, start date and end date in the sidebar, and it shows a line chart of the closing price plus a Bollinger Bands chart produced by the OpenBB SDK. OpenBB writes the chart to a PNG, and the app displays that file.

## Reading the inputs

The sidebar holds three text inputs, defaulting to ZIM from May 2020 to today:

```python
import datetime

import streamlit as st

today = datetime.date.today()

def user_input_features():
    ticker = st.sidebar.text_input("Ticker", "ZIM")
    start_date = st.sidebar.text_input("Start Date", "2020-05-01")
    end_date = st.sidebar.text_input("End Date", f"{today}")
    return ticker, start_date, end_date

symbol, start, end = user_input_features()
```

The dates go to OpenBB's `load` helper (`from openbb_terminal.stocks.stocks_helper import load`), which fetched daily prices, from Yahoo Finance by default. The ticker is only upper-cased for the chart headings; the app doesn't look up the company name.

## Rendering the OpenBB chart

OpenBB's `display_bbands` view function didn't return a figure. Instead it saved the chart when you passed `export="bbands.png"`, writing it to `~/OpenBBUserData/exports/`. So the app builds that path, calls the view function, and hands the file to `st.image`:

```python
import os

from openbb_terminal.common.technical_analysis.volatility_view import display_bbands

@st.cache  # removed in current Streamlit; use @st.cache_data
def build_bbands_img(data, symbol, file_name="bbands.png"):
    temp_image = os.path.join(os.path.expanduser("~"), "OpenBBUserData", "exports", file_name)
    if os.path.exists(temp_image):
        os.remove(temp_image)
    display_bbands(data, symbol, 15, 2, export=file_name)
    return temp_image
```

The first version found the home directory with `os.popen('cd ~ && pwd')`, which only works where a POSIX shell is available. `os.path.expanduser("~")` (or `pathlib.Path.home()`) does the same thing on every OS.

Caching the function means a rerun with the same ticker and dates skips regenerating the image. Streamlit reruns the whole script on every widget change, so without the cache every sidebar change would regenerate the chart.

```python
bbands_img = build_bbands_img(data, symbol, "bbands.png")
st.header(f"Bollinger Bands\n {symbol.upper()}")

if bbands_img:
    st.image(bbands_img, caption="Bollinger Bands chart")
```

## The same app without OpenBB

Since the OpenBB SDK is gone, here is an equivalent that fetches prices with `yfinance` and calculates the bands with pandas. Plotting the series with `st.line_chart` gives an interactive chart and no temporary files. Tested with Streamlit 1.67 and yfinance 1.8:

```python
import datetime

import pandas as pd
import streamlit as st
import yfinance as yf


@st.cache_data(ttl="1h")
def load_prices(ticker: str, start: datetime.date, end: datetime.date) -> pd.DataFrame:
    return yf.Ticker(ticker).history(start=start, end=end)


ticker = st.sidebar.text_input("Ticker", "ZIM")
start = st.sidebar.date_input("Start date", datetime.date(2020, 5, 1))
end = st.sidebar.date_input("End date", datetime.date.today())

prices = load_prices(ticker, start, end)
close = prices["Close"]

st.header(f"Adjusted close: {ticker.upper()}")
st.line_chart(close)

# Bollinger Bands: 15-day SMA +/- 2 standard deviations
mid = close.rolling(15).mean()
std = close.rolling(15).std()
st.header("Bollinger Bands (15, 2)")
st.line_chart(pd.DataFrame({"Close": close, "Upper": mid + 2 * std, "Lower": mid - 2 * std}))
```

Run it with `streamlit run app.py`. `Ticker.history()` returns split- and dividend-adjusted prices by default. If you want to stay with OpenBB, the Platform's `openbb-technical` extension provides `obb.technical.bbands(data=..., length=15, std=2)`, which takes a DataFrame you've already loaded.

## Source

- Source code: [FriendlyUser/stonk_ta_app](https://github.com/FriendlyUser/stonk_ta_app)
- The app was hosted on Streamlit Community Cloud at <https://friendlyuser-stonk-ta-app-app-fhrcso.streamlit.app/>. It still depends on `openbb-terminal`, so it may no longer load.
- Follow-up post: [adding Donchian Channels and `st.cache_data`](/posts/stonks/build_dashboard_with_openbb_II/)
