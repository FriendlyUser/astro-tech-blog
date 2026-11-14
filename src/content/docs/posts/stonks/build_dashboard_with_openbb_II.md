---
title: "Streamlit and OpenBB part II: Donchian Channels and st.cache_data"
description: "Adding a Donchian Channels chart to my Streamlit technical analysis app, moving from st.cache to st.cache_data, and a caching bug in the file-cleanup decorator."
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["openbb", "streamlit", "python", "pandas"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/sample.png'
imgAlt: 'rbc stock analyzer'
---

:::caution[OpenBB SDK is retired]
This app uses the `openbb-terminal` package (OpenBB SDK v3), which OpenBB has replaced with the [OpenBB Platform](https://docs.openbb.co/) (`pip install openbb`, `from openbb import obb`). The `openbb_terminal` imports below won't install on a current setup. [Part I](/posts/stonks/build_dashboard_with_openbb/) ends with a version of the app that uses yfinance and pandas instead.
:::

This is a follow-up to [Building a Bollinger Bands web app with Streamlit and the OpenBB SDK](/posts/stonks/build_dashboard_with_openbb/). The second round of changes to the app added a Donchian Channels chart, moved the shared file-handling code into a decorator, and replaced `st.cache` with `st.cache_data`.

## Donchian Channels

A Donchian Channel plots the highest high and the lowest low over the last N periods (20 by default), with a middle line halfway between them. When price closes at a new N-period high it touches the upper band, which trend followers treat as a breakout signal; a new low touches the lower band. The width of the channel gives a rough read on volatility. It's named after Richard Donchian, an early systematic trend follower.

OpenBB had a view function for it next to the Bollinger Bands one, so the import changed to:

```python
from openbb_terminal.common.technical_analysis.volatility_view import display_bbands, display_donchian
```

## A decorator for the exported image

Both charts work the same way: the OpenBB view function writes a PNG to `~/OpenBBUserData/exports/<name>.png` and the app shows that file. Instead of repeating the path handling, I moved it into a decorator that deletes any old export, runs the chart function, and returns the file path if a new image was written:

```python
import os
import sys
from io import StringIO

def remove_existing_file(func):
    def wrapper(*args, **kwargs):
        old_stdin = sys.stdin
        sys.stdin = StringIO("y")
        root_dir = os.popen("cd ~ && pwd").read().strip()
        export = args[-1]  # the export file name is passed as the last positional argument
        temp_image = os.path.join(root_dir, "OpenBBUserData", "exports", export)
        if os.path.exists(temp_image):
            os.remove(temp_image)
        func(*args, **kwargs)
        sys.stdin = old_stdin
        if os.path.exists(temp_image):
            return temp_image
        return None
    return wrapper


@remove_existing_file
@st.cache_data
def build_bbands_img(data, symbol, window=15, n_std=2, export="bbands.png"):
    return display_bbands(data, symbol, window, n_std, export=export)


@remove_existing_file
@st.cache_data
def build_donchian_img(data, symbol, export="donchian.png"):
    return display_donchian(data, symbol, export=export)
```

The `sys.stdin` swap feeds a `"y"` to any confirmation prompt OpenBB shows while exporting, so the Streamlit script doesn't block waiting for input. The functions are called with every argument positional, for example `build_donchian_img(data, symbol, "donchian.png")`, because the wrapper reads the file name from `args[-1]`.

`st.cache_data` arrived in Streamlit 1.18 (February 2023) together with `st.cache_resource`, and the old `st.cache` was deprecated in favour of them. `st.cache_data` hashes the arguments (including the DataFrame) and returns a copy of the cached return value when they match.

## Gotcha: the decorator order breaks reruns

With `@remove_existing_file` on the outside, the wrapper runs on every Streamlit rerun, but the inner cached function only runs on a cache miss. So on the second run with the same inputs, the wrapper deletes the PNG, the cached function returns without calling OpenBB, the file is never recreated, and the wrapper returns `None`. The chart disappears after the first rerun.

A simpler shape is to do the file work inside the cached function and cache the image bytes, which `st.image` accepts directly:

```python
from pathlib import Path

@st.cache_data
def build_donchian_img(data, symbol, export="donchian.png"):
    path = Path.home() / "OpenBBUserData" / "exports" / export
    path.unlink(missing_ok=True)
    display_donchian(data, symbol, export=export)
    return path.read_bytes() if path.exists() else None
```

Now a cache hit returns the image without touching the disk, and the export folder no longer has to survive between reruns.

## Further reading

- [Source code on GitHub](https://github.com/FriendlyUser/stonk_ta_app)
- [Streamlit caching overview](https://docs.streamlit.io/develop/concepts/architecture/caching)
- The app was hosted at <https://friendlyuser-stonk-ta-app-app-fhrcso.streamlit.app/>; it still depends on `openbb-terminal`, so it may no longer load.
