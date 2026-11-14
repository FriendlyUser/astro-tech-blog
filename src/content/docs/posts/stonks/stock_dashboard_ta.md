---
title: 'Stock technical analysis dashboard with Streamlit, yfinance and pandas-ta'
description: A small Streamlit app that downloads prices with yfinance and charts SMA, EMA, Bollinger Bands, RSI and price-volume using pandas-ta.
alt: Applying nlp to various youtube videos
pubDate: Friday, 3 January 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-10 21.55.07 - magnifying glass on stonks.png'
imgAlt: 'rbc stock analyzer'
---

:::caution
The original `pandas-ta` project is effectively gone: its GitHub repository (`twopirllc/pandas-ta`) returns 404, its docs site is offline, and PyPI only carries 0.4.x betas that need Python 3.12+. The code below uses the community fork [`pandas-ta-classic`](https://github.com/xgboosted/pandas-ta-classic), which keeps the same `df.ta` accessor and column names.
:::

This is a one-file Streamlit app for eyeballing a stock: pick a ticker and a date range in the sidebar, and it charts moving averages, Bollinger Bands, RSI and price-volume. Streamlit turns a top-to-bottom Python script into a web page and reruns it whenever an input changes, so there is no front-end code. [yfinance](https://github.com/ranaroussi/yfinance) pulls daily prices from Yahoo Finance, and pandas-ta adds indicators as new DataFrame columns.

The first version of this app (2023) stopped working on Streamlit Cloud, and it no longer runs anywhere: it called `yf.pdr_override()` and `st.beta_columns()`, both since removed, and it charted an `adj_close` column that yfinance never returned. The version below was rewritten and tested against Streamlit 1.67, yfinance 1.8, pandas 3.1 and pandas-ta-classic 0.9.

## Install

```bash
pip install streamlit yfinance pandas-ta-classic
```

## The app

Save this as `app.py`:

```python
import datetime

import pandas_ta_classic as ta  # registers the DataFrame.ta accessor
import streamlit as st
import yfinance as yf

st.title("Technical analysis dashboard")

st.sidebar.header("Inputs")
ticker = st.sidebar.text_input("Ticker", "RY.TO")
start = st.sidebar.date_input("Start date", datetime.date(2019, 1, 1))
end = st.sidebar.date_input("End date", datetime.date.today())
length = st.sidebar.number_input("Indicator length", min_value=2, max_value=200, value=20)


@st.cache_data(ttl=3600)
def load(ticker: str, start: datetime.date, end: datetime.date):
    # multi_level_index=False keeps flat column names (Close, Volume, ...)
    return yf.download(ticker, start=start, end=end, progress=False, multi_level_index=False)


data = load(ticker, start, end)
if data.empty:
    st.error(f"No data returned for {ticker}")
    st.stop()

data = data.copy()
data.ta.sma(length=length, append=True)
data.ta.ema(length=length, append=True)
data.ta.bbands(length=length, append=True)
data.ta.rsi(length=length, append=True)
data.ta.pvol(append=True)

st.header(f"{ticker}: close vs. SMA and EMA")
st.line_chart(data[["Close", f"SMA_{length}", f"EMA_{length}"]])

st.header("Bollinger Bands")
st.line_chart(data[["Close", f"BBL_{length}_2.0", f"BBM_{length}_2.0", f"BBU_{length}_2.0"]])

st.header("RSI")
st.line_chart(data[f"RSI_{length}"])

st.header("Price-volume")
col1, col2 = st.columns(2)
col1.line_chart(data["PVOL"])
col2.bar_chart(data["Volume"])

with st.expander("Raw data"):
    st.dataframe(data)
```

Run it with:

```bash
streamlit run app.py
```

Yahoo tickers for Canadian listings need an exchange suffix: `.TO` for the TSX, `.V` for the TSX Venture and `.CN` for the CSE. The default here is RBC (`RY.TO`).

## How the pandas-ta calls work

Importing the library registers a `.ta` accessor on every DataFrame. Each indicator method finds the `open`/`high`/`low`/`close`/`volume` columns by name (case-insensitive), and `append=True` adds the result to the same frame instead of returning a new one. The new columns are named after the indicator and its parameters:

| Call | Columns added |
| --- | --- |
| `ta.sma(length=20)` | `SMA_20` |
| `ta.ema(length=20)` | `EMA_20` |
| `ta.bbands(length=20)` | `BBL_20_2.0`, `BBM_20_2.0`, `BBU_20_2.0`, plus bandwidth `BBB_20_2.0` and %B `BBP_20_2.0` |
| `ta.rsi(length=20)` | `RSI_20` |
| `ta.pvol()` | `PVOL` (close × volume) |

That naming is why the chart code builds column names with f-strings. If you change a default such as the Bollinger standard deviation (`std=2.5`), the suffix changes too (`BBL_20_2.5`).

## Gotchas

- **yfinance column layout.** Current yfinance releases return MultiIndex columns like `('Close', 'RY.TO')` from `yf.download`, even for one ticker. Pass `multi_level_index=False` or every `data["Close"]` lookup returns a DataFrame instead of a Series.
- **Adjusted prices.** `auto_adjust=True` is now the default in `yf.download`, so `Close` is already split- and dividend-adjusted and there is no `Adj Close` column. Pass `auto_adjust=False` if you want both.
- **Caching.** Without `@st.cache_data`, every widget change re-downloads the data. Yahoo rate-limits aggressive clients, and that is a common reason these apps break on shared hosting.
- **Indicator length vs. data range.** A 200-day SMA on six months of data is all `NaN`. Streamlit charts the gaps as blanks rather than raising an error.

## Further reading

- [Streamlit API reference](https://docs.streamlit.io/develop/api-reference)
- [yfinance documentation](https://ranaroussi.github.io/yfinance/)
- [pandas-ta-classic documentation](https://xgboosted.github.io/pandas-ta-classic/)
