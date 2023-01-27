---
title: Building an interactive stock ta app with streamlit and openbb
description: Web app that uses openbb-sdk to display technical analysis graphs for a given stock
alt: Applying nlp to various youtube videos
pubDate: Friday, 3 January 2023 13:00:00 GMT
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-10 21.55.07 - magnifying glass on stonks.png'
imgAlt: 'rbc stock analyzer'
---


Streamlit is an open-source Python library for building web-based data science and machine learning applications. It allows you to create interactive data visualizations and user interfaces in your web browser using simple Python code. Streamlit provides a simple, intuitive API that makes it easy to build complex, interactive apps quickly and easily. It also comes with built-in support for common data science and machine learning libraries, such as Pandas and TensorFlow, and allows you to use them seamlessly in your apps. Streamlit is designed to be lightweight and fast, so you can quickly prototype and deploy your apps without having to worry about the underlying web infrastructure.


pandas-ta library, which is a Python library for performing technical analysis on stock data using Pandas. This library provides a collection of technical indicators and statistical functions that can be applied to Pandas DataFrames, making it easy to perform technical analysis on stock data in a familiar Pandas interface.

If you are looking for a library to perform technical analysis on stock data, you may want to consider using the pandas-ta library, or other libraries such as ta, talib, or alpha_vantage. These libraries provide a range of technical indicators and statistical functions that can help you analyze stock data and make informed investment decisions.


```python
import yfinance as yf
import streamlit as st
import datetime
import pandas_ta
import pandas as pd
import requests
yf.pdr_override()

st.write("""
# Technical Analysis Web Application
Shown below are the **Moving Average Crossovers**, **Bollinger Bands**, **MACD's**, **Commodity Channel Indexes**, and **Relative Strength Indexes** of any stock!
""")

st.sidebar.header('User Input Parameters')

today = datetime.date.today()
def user_input_features():
    ticker = st.sidebar.text_input("Ticker", 'IP.CN')
    start_date = st.sidebar.text_input("Start Date", '2019-01-01')
    end_date = st.sidebar.text_input("End Date", f'{today}')
    ta_range = st.sidebar.number_input("TA Range", min_value=1, max_value=50)
    return ticker, start_date, end_date, ta_range

symbol, start, end, ta_range = user_input_features()

company_name = symbol

start = pd.to_datetime(start)
end = pd.to_datetime(end)

# Read data 
data = yf.download(symbol,start,end)
st.write(data)
# Adjusted Close Price
st.header(f"Adjusted Close Price\n {company_name}")
st.line_chart(data["Close"])

# ## SMA and EMA
#Simple Moving Average
data.ta.sma(length=20, append=True)

# Exponential Moving Average
data.ta.ema(length=20, append=True)
st.write(data)
# Plot
st.header(f"Simple Moving Average vs. Exponential Moving Average\n {company_name}")
st.line_chart(data[['adj_close','SMA_20','EMA_20']])

# Bollinger Bands
data.ta.bbands(length=20, append=True)
# data['upper_band'], data['middle_band'], data['lower_band'] = talib.BBANDS(data['Adj Close'], timeperiod =20)
# Plot
st.header(f"Bollinger Bands\n {company_name}")
st.line_chart(data[['adj_close','BBL_20_2.0','BBM_20_2.0','BBU_20_2.0']])

# ## RSI (Relative Strength Index)
# RSI
data.ta.rsi(length=20, append=True)
# Plot
st.header(f"Relative Strength Index\n {company_name}")
st.line_chart(data[['RSI_20', 'adj_close']])

# ## OBV (On Balance Volume)
# OBV
# data['OBV'] = talib.OBV(data['Adj Close'], data['Volume'])/10**6
data.ta.pvol(length=20, append=True)
# Plot
st.header(f"Price-Volume\n {company_name}")
st.write(data[['adj_close', 'PVOL', 'volume']])
col1, col2 = st.beta_columns([2, 2])
col1.line_chart(data[['PVOL']])
col2.line_chart(data[['volume']])
# update
```

Although this code doesnt work on streamlit cloud anymore, it still a good example of how to pull data from streamilit and show it for ta with pandas-ta.


To use pandas ta an example is provided below

```python
# Import the pandas-ta library
import pandas_ta as ta

...

# Read the stock data using the yfinance library
data = yf.download(symbol,start,end)

...

# Use the pandas-ta library to calculate the Simple Moving Average
data.ta.sma(length=20, append=True)

# Use the pandas-ta library to calculate the Exponential Moving Average
data.ta.ema(length=20, append=True)

...

# Use the pandas-ta library to calculate the Bollinger Bands
data.ta.bbands(length=20, append=True)

...

# Use the pandas-ta library to calculate the Relative Strength Index
data.ta.rsi(length=20, append=True)
```

Once you have imported the pandas-ta library and are using it correctly, you should be able to perform technical analysis on stock data using the data.ta methods provided by the library. For example, the following code will calculate the Simple Moving Average and Exponential Moving Average of a stock using the pandas-ta library:

```python
# Import the pandas-ta library
import pandas_ta as ta

...

# Read the stock data using the yfinance library
data = yf.download(symbol,start,end)

...

# Use the pandas-ta library to calculate the Simple Moving Average
data.ta.sma(length=20, append=True)

# Use the pandas-ta library to calculate the Exponential Moving Average
data.ta.ema(length=20, append=True)

```


You can then plot the Simple Moving Average and Exponential Moving Average using the Streamlit line_chart method, as shown below:

```python
# Plot the Simple Moving Average and Exponential Moving Average
st.header(f"Simple Moving Average vs. Exponential Moving Average\n {company_name}")
st.line_chart(data[['adj_close','SMA_20','EMA_20']])

```

You can use similar code to calculate and plot other technical indicators, such as the Bollinger Bands and the Relative Strength Index.
