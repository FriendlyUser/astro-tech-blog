---
tags: ['python', 'streamlit']
title: Using chatgpt to write my posts instead of edge gpt.
description: Comparing differences between chatgpt and edge gpt.
pubDate: Fri, 14 June 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other/output_1.png
---

Tracking commodities is important for investing because commodities are essential raw materials used in the production of goods and services, and their prices can have a significant impact on the economy and financial markets. Investors can use commodity price movements to make investment decisions, hedge against inflation, and diversify their portfolios.

Commodities are typically classified into three categories: energy, metals, and agricultural products. Energy commodities include crude oil, natural gas, and gasoline, while metals commodities include gold, silver, copper, and platinum. Agricultural commodities include wheat, corn, soybeans, and coffee.

Investors can use various tools to track commodity prices, including commodity price indexes, futures contracts, and exchange-traded funds (ETFs). These tools allow investors to monitor price trends and make informed decisions about buying, selling, or holding commodities.

For example, if an investor expects the price of crude oil to rise due to geopolitical tensions or supply disruptions, they may choose to invest in oil futures or an oil ETF. Alternatively, if an investor wants to hedge against inflation, they may invest in gold or other precious metals, which tend to hold their value during times of economic uncertainty.

In summary, tracking commodities is important for investing because it provides valuable insights into the global economy and financial markets, and can help investors make informed decisions about their portfolios.

```python
import streamlit as st
from openbb_terminal.economy.wsj_model import market_overview, us_indices, us_bonds, top_commodities, global_bonds, global_currencies

def openbb_economy():
    economy_dfs = []
    file_names = []
    # append two entries to economy dfs from top_commodities and us_bonds
    economy_dfs.append(top_commodities())
    file_names.append("top_commodities")
    economy_dfs.append(us_bonds())
    file_names.append("us_bonds")
    economy_dfs.append(us_indices())
    file_names.append("us_indices")
    economy_dfs.append(global_bonds())
    file_names.append("global_bonds")
    economy_dfs.append(global_currencies())
    file_names.append("global_currencies")
    economy_dfs.append(market_overview())
    file_names.append("market_overview")

    return economy_dfs, file_names

economy_dfs, file_names = openbb_economy()

if st.button("Refresh Data"):
    economy_dfs, file_names = openbb_economy()

# output all economy tables with labels above
for i in range(len(economy_dfs)):
    st.write(f"# {file_names[i]}")
    st.write(economy_dfs[i])
```

The code above is a Python script that uses the Streamlit library to create a web application that displays real-time financial data. Specifically, the script imports six functions from the openbb_terminal.economy.wsj_model module that retrieve data on top commodities, US bonds, US indices, global bonds, global currencies, and market overviews.

The openbb_economy() function creates a list of dataframes (economy_dfs) and a list of strings (file_names) that correspond to the names of the data sources. Each dataframe is populated by calling one of the six imported functions. The function then returns the two lists as a tuple.

The economy_dfs and file_names lists are initially populated with data by calling the openbb_economy() function at the start of the script. If the "Refresh Data" button is clicked in the Streamlit app, the openbb_economy() function is called again to update the data.

The final part of the script uses a for loop to display the dataframes in the Streamlit app. For each dataframe, the code displays a header with the corresponding file_names string using the st.write() function, followed by the dataframe itself. The # symbol before the file_names string formats the header as a level 1 heading in Markdown syntax, which makes it larger and bolder than the rest of the text.

In summary, the code creates a Streamlit app that displays real-time data on top commodities, US bonds, US indices, global bonds, global currencies, and market overviews. It allows the user to refresh the data by clicking a button, and presents the data in a clear and organized format using Markdown headers.