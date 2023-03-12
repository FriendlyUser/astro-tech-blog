---
title: Streamlining Technical Analysis with OpenBB and Streamlit II
description: This post highlights the recent changes made to the stocks ta app, which provides users with an easy-to-use interface for conducting technical analysis on financial data. The article explains how the addition of the Donchian channel indicator and the cache_data decorator, along with other updates, have improved the app's functionality and user experience. Readers will learn how these changes enable users to quickly generate and view technical analysis graphs and export them for further analysis.
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 March 2023 13:00:00 GMT
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/sample.png'
imgAlt: 'rbc stock analyzer'
---

In this article, we will be exploring the changes made to the stocks ta app using the git diff provided. The stocks ta app is a web application used for technical analysis of stocks.

## Introduction to the stocks ta app
The stocks ta app is a user-friendly web application that provides technical analysis of stocks using OpenBB SDK. 

Changes to the stocks ta app include the addition of a new feature that allows users to view Donchian channels. Refactoring to make the code more streamlined and readable was also done. Updating to the latest version of OpenBB SDK was also done to ensure that the app is compatible latest version of streamlit.

In finance, a Donchian Channel is a technical indicator used to identify the current price trend, volatility, and potential price breakouts. It is a channel created by plotting the highest high and lowest low over a specified period of time. The channel is then used to identify potential buy or sell signals based on whether the price is trading above or below the channel. The Donchian Channel is named after its creator, Richard Donchian, who is considered to be one of the pioneers of modern trend following strategies in the financial markets.


The application allows users to input a stock symbol and date range, and provides information on the adjusted close price, Bollinger Bands, and Donchian channels.

Changes Made to the stocks ta app
The git diff provided shows the changes made to the app.py file of the stocks ta app. Let's go through the changes line by line to understand what was added, removed, or modified.
```
diff --git a/app.py b/app.py
```

```diff
@@ -3,10 +3,11 @@ import datetime
 import pandas as pd
 import requests
 import os
+import sys
 from PIL import Image
+from io import StringIO
 from openbb_terminal.stocks.stocks_helper import load
-from openbb_terminal.common.technical_analysis.volatility_model import bbands
-from openbb_terminal.common.technical_analysis.volatility_view import display_bbands
+from openbb_terminal.common.technical_analysis.volatility_view import display_bbands, display_donchian
```

In this section, two new imports were added. import sys was added to import the sys module, and from io import StringIO was added to import the StringIO class from the io module.

In addition, the import for display_bbands was modified to include display_donchian. The display_donchian function is used to display Donchian channels, which is a new feature that was added to the stocks ta app.

```diff
 st.write("""
 # Technical Analysis Web Application
 """)

@@ -27,22 +28,37 @@ def user_input_features():
 symbol, start, end = user_input_features()
```

```diff
-@st.cache  # 👈 Added this
-def build_bbands_img(data, symbol, file_name="sample.png"):
-    stream = os.popen('cd ~ && pwd')
-    root_dir = stream.read()
-    sample_dir = root_dir.strip()
-    # remove /home/codespace/OpenBBUserData/exports/bbands.png already
-    temp_image = os.path.join(sample_dir, "OpenBBUserData", "exports", file_name)
-    # if exists erase
-    if os.path.exists(temp_image):
-        os.remove(temp_image)
-    display_bbands(data, symbol, 15, 2, export=file_name)
-    # root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
-    temp_image = os.path.join(sample_dir, "OpenBBUserData", "exports", file_name)
-    # image = Image.open(temp_image)
-    return temp_image
```

These lines show that the build_bbands_img function was modified. The function now uses a new decorator remove_existing_file that checks if the file already exists and removes it before creating a new one. This ensures that only the latest version of the file is used.

In addition, the cache decorator was replaced with the cache_data decorator, which is a newer version of cache. This was updated a recent change to the streamlit sdk.

```python
@remove_existing_file
@st.cache_data
def build_donchian_img(data, symbol, export="donchian.png"):
    return display_donchian(data, symbol, export=export)

```

This code defines a function named build_donchian_img, which takes in three arguments: data, symbol, and export.

The @remove_existing_file decorator is used to remove any existing image file with the same name as the export argument, which is the name of the image file to be saved. This decorator wraps the function and performs the file removal before executing the function.

The @st.cache_data decorator is used to cache the function's output based on the input arguments. This means that if the function is called again with the same input arguments, the previously cached output will be returned instead of recomputing the function.

The function calls another function named display_donchian, passing in the data, symbol, and export arguments. The display_donchian function creates a donchian chart using the data and symbol arguments and saves it as an image file with the filename specified by the export argument.

The build_donchian_img function returns the path of the saved image file, which can be used to display the image in the Streamlit app using the st.image() function.

### References
- https://friendlyuser-stonk-ta-app-app-fhrcso.streamlit.app/
