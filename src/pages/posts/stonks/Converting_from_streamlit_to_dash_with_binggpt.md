---
title: "Attempting to convert a streamlit app to dash"
description: Finding out if it's possible to convert a streamlit app to dash completely with AI
alt: Applying nlp to various youtube videos
pubDate: Friday, 12 March 2023 13:00:00 GMT
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/241285989.png'
imgAlt: 'rbc stock analyzer'
---

Disclaimer: This article was generated with bing and binggpt, was curious how far bing gpt was willing to go with conversion from dash to streamlit. I'm not sure if this is a good idea, but I'm going to try it out.


Hello, this is Bing. I can help you with converting your streamlit app to use dash instead.😊

According to ¹, streamlit and dash are two popular Python libraries for building data dashboard web apps. Streamlit focuses on rapid prototyping, while dash focuses on production and enterprise settings. Streamlit is more concise and takes care of more decisions for you, while dash gives you more control and flexibility over your app structure and interactivity.

To convert your streamlit app to use dash, you will need to make some changes in your code. Here are some general steps:

- Import dash and its components instead of streamlit
- Create a dash app object with `app = dash.Dash(__name__)`
- Define a layout for your app with `app.layout = html.Div([...])` where you can use html tags or dash components to create your UI elements
- Use `dcc.Input`, `dcc.DatePickerRange`, `dcc.Graph` etc. to create interactive widgets and graphs
- Use `@app.callback` decorators to define functions that update your outputs based on user inputs
- Run your app with `app.run_server()`

For example, here is a possible conversion of the first part of your code:

```python
# import streamlit as st # comment out this line
import datetime
import pandas as pd
import requests
import os
import sys
from PIL import Image
from io import StringIO

# import dash and its components instead of streamlit
import dash 
import dash_core_components as dcc 
import dash_html_components as html 

from openbb_terminal.stocks.stocks_helper import load
from openbb_terminal.common.technical_analysis.volatility_view import display_bbands, display_donchian

# create a dash app object 
app = dash.Dash(__name__)

# define a layout for your app 
app.layout = html.Div([
    # use html tags or dash components to create UI elements 
    html.H1("Technical Analysis Web Application"),
    html.P("Leveraging the openbb sdk, we can build a web application to display technical analysis graphs for any stock."),
    # use dcc.Input to create a text input for ticker 
    dcc.Input(id="ticker-input", type="text", value="ZIM"),
    # use dcc.DatePickerRange to create a date range picker for start and end dates 
    dcc.DatePickerRange(id="date-range-picker", start_date="2020-05-01", end_date=datetime.date.today()),
    # use dcc.Graph to create an empty graph that will be updated by callbacks later 
    dcc.Graph(id="bbands-graph"),
    dcc.Graph(id="donchian-graph")
])
```

Source: Conversation with Bing, 3/16/2023(1) How do Dash, Shiny, and Streamlit compare? - Plotly. https://plotly.com/comparing-dash-shiny-streamlit/ Accessed 3/16/2023.
(2) Plotly Dash vs Streamlit - Towards Data Science. https://towardsdatascience.com/plotly-dash-vs-streamlit-which-is-the-best-library-for-building-data-dashboard-web-apps-97d7c98b938c Accessed 3/16/2023.
(3) Convert streamlit to dash · Issue #1 · ds4a-team08/webui. https://github.com/ds4a-team08/webui/issues/1 Accessed 3/16/2023.


To write the callback functions, you need to use the `@app.callback` decorator above your function definition. The decorator takes two arguments: `Output` and `Input`, which specify the component id and property that you want to update and the component id and property that you want to use as input respectively. You can also use `State` as an additional argument if you want to pass some information that does not trigger a callback.

For example, here is a possible callback function that updates the bbands-graph based on the ticker-input and date-range-picker values:

```python
# import Input, Output and State from dash.dependencies
from dash.dependencies import Input, Output, State

# use @app.callback decorator 
@app.callback(
    # specify output component id and property 
    Output("bbands-graph", "figure"),
    # specify input component ids and properties 
    Input("ticker-input", "value"),
    Input("date-range-picker", "start_date"),
    Input("date-range-picker", "end_date")
)
# define callback function with input arguments 
def update_bbands_graph(ticker, start_date, end_date):
    # load data for ticker and date range 
    data = load(ticker=ticker,start=start_date,end=end_date)
    # build bbands image with openbb
    img_path = build_bbands_img(data=data,symbol=ticker)
    # read image as bytes
    img_bytes = Image.open(img_path).tobytes()
    # create a figure with dash_core_components.Graph
    fig = dcc.Graph(
        figure={
            "data": [
                {
                    "type": "image",
                    "source": img_bytes,
                    "xref": "x",
                    "yref": "y",
                    "x0": 0,
                    "y0": 0,
                    "x1": 1,
                    "y1": 1,
                }
            ],
            # adjust layout to fit image size
            "layout": {
                "width": 800,
                "height": 600,
                # hide x-axis and y-axis labels
                'xaxis': {'visible': False},
                'yaxis': {'visible': False},
            }
        }
    )
    
    return fig
```

You would need to make a similar function to update the donchian-graph. You can also use the `@app.callback` decorator to create a function that updates multiple outputs based on the same inputs.

Overall using AI to convert from streamlit and dash is pretty powerful. Microsoft will not let the AI do all the coding.

Source: Conversation with Bing, 3/16/2023(1) Part 3. Basic Callbacks | Dash for Python Documentation | Plotly. https://dash.plotly.com/basic-callbacks Accessed 3/16/2023.
(2) Advanced Callbacks | Dash for Python Documentation | Plotly. https://dash.plotly.com/advanced-callbacks Accessed 3/16/2023.
(3) Dash - How does the dash call functions - Stack Overflow. https://stackoverflow.com/questions/62672368/dash-how-does-the-dash-call-functions Accessed 3/16/2023.
(4) Dash Callback inside a Function - Plotly Community Forum. https://community.plotly.com/t/dash-callback-inside-a-function/42772 Accessed 3/16/2023.
(5) Long Callbacks in Dash Web Apps - Towards Data Science. https://towardsdatascience.com/long-callbacks-in-dash-web-apps-72fd8de25937 Accessed 3/16/2023.