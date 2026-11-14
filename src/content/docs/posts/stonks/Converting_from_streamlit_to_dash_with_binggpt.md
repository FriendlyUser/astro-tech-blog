---
title: "Asking Bing Chat to convert a Streamlit app to Dash"
description: "I asked Bing Chat to port my Streamlit technical analysis app to Plotly Dash. What it got right, where its code broke, and a working Dash version."
alt: Applying nlp to various youtube videos
pubDate: Friday, 12 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/241285989.webp'
imgAlt: 'rbc stock analyzer'
---

:::caution[Outdated APIs in the original answer]
Bing Chat (now Microsoft Copilot) suggested `dash_core_components`, `dash_html_components` and `app.run_server()`. The first two were merged into the `dash` package in Dash 2.0, and `run_server` was removed in Dash 3.0 in favour of `app.run()`. The `openbb_terminal` package it imported has been replaced by the [OpenBB Platform](https://docs.openbb.co/). The code below is corrected for current Dash.
:::

In March 2023 I was curious how far Bing Chat would go in converting my [Streamlit technical analysis app](/posts/stonks/build_dashboard_with_openbb/) to Plotly Dash. I pasted the Streamlit code in and asked for a Dash version. Most of this post was originally Bing's answer; I've kept what it suggested and fixed the code.

## What Bing suggested

It started with a fair summary, taken from Plotly's own [Dash vs Shiny vs Streamlit comparison](https://plotly.com/comparing-dash-shiny-streamlit/): Streamlit is aimed at quick prototypes and makes more decisions for you, while Dash gives you more control over layout and interactivity. The structural changes it listed are right:

- Create the app with `app = Dash(__name__)` instead of calling `st.*` functions at the top level.
- Describe the page in `app.layout` using `html.*` elements and `dcc.*` components (`dcc.Input`, `dcc.DatePickerRange`, `dcc.Graph`).
- Replace Streamlit's top-to-bottom rerun with `@app.callback` functions that map `Input` component properties to `Output` properties.
- Start the server with `app.run()`.

The layout it produced was close. With current imports it looks like this:

```python
import datetime

from dash import Dash, dcc, html

app = Dash(__name__)

app.layout = html.Div([
    html.H1("Technical Analysis Web Application"),
    dcc.Input(id="ticker-input", type="text", value="ZIM", debounce=True),
    dcc.DatePickerRange(
        id="date-range-picker",
        start_date=datetime.date(2020, 5, 1),
        end_date=datetime.date.today(),
    ),
    dcc.Graph(id="bbands-graph"),
    dcc.Graph(id="donchian-graph"),
])
```

`debounce=True` makes the input fire its callback on Enter or blur instead of on every keystroke, which matters when each update downloads prices.

## Where the callback went wrong

Bing's callback for the Bollinger Bands graph had the right decorator shape (`Output("bbands-graph", "figure")` plus three `Input`s), but the body wouldn't work:

- It called `build_bbands_img`, a helper from my Streamlit app that saved OpenBB's chart to a PNG, then read the PNG with `Image.open(path).tobytes()`. That gives raw pixel bytes, not an encoded image a browser can display.
- It put those bytes in a trace dict with `"type": "image"` and a `source` key. Plotly's `image` trace expects `source` to be a data URI string such as `data:image/png;base64,...`.
- It returned a `dcc.Graph` component from a callback whose output is the `figure` property, so Dash would receive a component where it expected a figure.

The bigger point is that a Dash app doesn't need the save-a-PNG workaround at all. `dcc.Graph` renders Plotly figures, so the callback can calculate the indicators and return figures directly.

## A working version

This callback updates both graphs from the same inputs. It uses `yfinance` for prices and pandas for the indicators, since the OpenBB SDK functions in the original are gone. Tested with Dash 4.5 and yfinance 1.8, together with the layout above:

```python
import plotly.graph_objects as go
import yfinance as yf
from dash import Input, Output
from dash.exceptions import PreventUpdate


@app.callback(
    Output("bbands-graph", "figure"),
    Output("donchian-graph", "figure"),
    Input("ticker-input", "value"),
    Input("date-range-picker", "start_date"),
    Input("date-range-picker", "end_date"),
)
def update_graphs(ticker, start_date, end_date):
    if not ticker:
        raise PreventUpdate
    df = yf.Ticker(ticker).history(start=start_date, end=end_date)
    close = df["Close"]

    # Bollinger Bands: 15-day SMA +/- 2 standard deviations
    mid = close.rolling(15).mean()
    std = close.rolling(15).std()
    bbands = go.Figure([
        go.Scatter(x=df.index, y=close, name="Close"),
        go.Scatter(x=df.index, y=mid + 2 * std, name="Upper band"),
        go.Scatter(x=df.index, y=mid - 2 * std, name="Lower band"),
    ])
    bbands.update_layout(title=f"{ticker.upper()} Bollinger Bands (15, 2)")

    # Donchian Channels: 20-day highest high / lowest low
    donchian = go.Figure([
        go.Scatter(x=df.index, y=close, name="Close"),
        go.Scatter(x=df.index, y=df["High"].rolling(20).max(), name="Upper"),
        go.Scatter(x=df.index, y=df["Low"].rolling(20).min(), name="Lower"),
    ])
    donchian.update_layout(title=f"{ticker.upper()} Donchian Channels (20)")
    return bbands, donchian


if __name__ == "__main__":
    app.run(debug=True)
```

Put the layout and the callback in one `app.py`, run `python app.py`, and open <http://127.0.0.1:8050>.

## Verdict

Using AI to convert from Streamlit to Dash is useful for the boilerplate: the layout and the callback wiring were mostly right. But Microsoft won't let Bing do all the coding: it only converted part of the app, used imports that were already deprecated, and wrote a callback that couldn't have run. You still need to know how Dash callbacks work to finish the job.

## Further reading

- [Dash basic callbacks](https://dash.plotly.com/basic-callbacks)
- [Dash 3.0 migration guide](https://dash.plotly.com/dash-3-0-migration)
- [How do Dash, Shiny, and Streamlit compare?](https://plotly.com/comparing-dash-shiny-streamlit/)
