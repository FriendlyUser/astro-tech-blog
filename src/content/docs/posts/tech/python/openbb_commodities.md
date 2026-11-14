---
tags: ['python', 'streamlit', 'openbb']
title: Showing commodity and bond tables in Streamlit with OpenBB
description: A small Streamlit app that showed commodity and bond tables from OpenBB Terminal, plus a version rewritten for the current OpenBB Platform API.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other/output_1.png
---

:::caution
The original version of this app imported from `openbb_terminal.economy.wsj_model`, part of the old OpenBB Terminal (v3). That package has been replaced by the OpenBB Platform (`pip install openbb`, used as `from openbb import obb`), and the WSJ market-overview functions no longer exist. The original code is kept below for reference, followed by a version that works with the current package.
:::

Commodity prices feed into almost everything else: oil and natural gas drive energy and transport costs, metals track industrial demand, and gold is often bought as an inflation hedge. Commodities are usually grouped into energy (crude oil, natural gas, gasoline), metals (gold, silver, copper, platinum) and agriculture (wheat, corn, soybeans, coffee). Watching them alongside bond yields and currencies gives a quick read on what the wider market is doing, which is why I wanted them on a single page.

## The original app (OpenBB Terminal v3)

This is the script as I first wrote it. It called six functions from OpenBB Terminal's WSJ module (top commodities, US bonds, US indices, global bonds, global currencies and a market overview) and wrote each table to a Streamlit page with a heading above it. It no longer runs against current OpenBB releases.

```python
import streamlit as st
from openbb_terminal.economy.wsj_model import market_overview, us_indices, us_bonds, top_commodities, global_bonds, global_currencies

def openbb_economy():
    economy_dfs = []
    file_names = []
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

The "Refresh Data" button didn't do what it looks like. Streamlit reruns the whole script on every interaction, so the data was already re-fetched at the top of the script when the button was clicked, and the button then fetched it all a second time. The updated version below caches the data instead.

## Updated for the OpenBB Platform

The current package exposes data through the `obb` object, grouped by asset class, with a `provider` argument that picks the data source. There is no direct replacement for the WSJ overview tables, so this version uses two free sources:

- `obb.commodity.price.spot(provider="fred")`: daily US energy spot prices (WTI, Brent, natural gas, heating oil, gasoline and others) from FRED. FRED needs a free API key.
- `obb.fixedincome.government.treasury_rates(provider="federal_reserve")`: US Treasury rates across maturities from the Federal Reserve, no key needed.

Install the packages:

```bash
pip install openbb openbb-commodity openbb-fixedincome streamlit
```

Then save this as `app.py`:

```python
import os
from datetime import date, timedelta

import streamlit as st
from openbb import obb

# Free key from https://fred.stlouisfed.org/docs/api/api_key.html
obb.user.credentials.fred_api_key = os.environ["FRED_API_KEY"]


@st.cache_data(ttl=60 * 60)  # re-fetch at most once an hour
def load_tables():
    start = date.today() - timedelta(days=30)
    return {
        "Energy spot prices (FRED)": obb.commodity.price.spot(
            provider="fred", start_date=start
        ).to_df(),
        "US Treasury rates (Federal Reserve)": obb.fixedincome.government.treasury_rates(
            provider="federal_reserve", start_date=start
        ).to_df(),
    }


st.title("Commodities and rates")

if st.button("Refresh data"):
    load_tables.clear()  # drop the cache so the next call fetches fresh data

for name, df in load_tables().items():
    st.header(name)
    st.dataframe(df)
```

Run it with:

```bash
FRED_API_KEY=your_key streamlit run app.py
```

`st.cache_data` stores the result of `load_tables()`, so Streamlit's reruns don't hit FRED and the Federal Reserve every time you touch the page. The button clears the cache when you want fresh numbers.

## Notes

- These are daily series, so treat the page as a daily overview, not a live quote screen.
- Other providers (for example for metals or agricultural futures) need their own API keys; set them on `obb.user.credentials` the same way. The [OpenBB documentation](https://docs.openbb.co/) lists which providers each endpoint supports.
