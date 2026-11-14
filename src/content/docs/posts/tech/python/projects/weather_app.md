---
tags: ['python', 'weather']
title: Build a tkinter weather app in Python with the OpenWeatherMap API
description: Call the OpenWeatherMap geocoding and current-weather APIs with requests, handle errors, and show temperature, humidity and conditions in a small tkinter window.
pubDate: Mon, 20 September 2023
lastUpdated: 2026-11-14
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3842597075.png'
---

A weather app is a good first API project. You send an HTTP request, get JSON back, and pull out a few fields. This post uses the [OpenWeatherMap](https://openweathermap.org/api) free tier and the `requests` library. The first part fetches the weather in a plain script; the second wraps it in a tkinter window.

## Setup

1. Create a free account on OpenWeatherMap and copy your API key from the account page. New keys can take a while to activate, so a `401` right after sign-up usually just means "wait".
2. Install `requests`:

   ```bash
   pip install requests
   ```

3. Keep the key out of your source code. Set it as an environment variable, for example `export OPENWEATHER_API_KEY=...` on macOS/Linux or `setx OPENWEATHER_API_KEY ...` on Windows. Open a new terminal after `setx`, because it doesn't change the current one.

## Fetch the current weather

OpenWeatherMap has deprecated looking up current weather by city name with `/data/2.5/weather?q=...`. It still works, but the [docs](https://openweathermap.org/current) say it no longer gets fixes. The recommended approach takes two calls. First, the [Geocoding API](https://openweathermap.org/api/geocoding-api) turns the city name into coordinates. Then the current-weather endpoint looks up those coordinates.

```python
import os

import requests

API_KEY = os.environ["OPENWEATHER_API_KEY"]


def get_weather(city: str) -> dict:
    # 1. City name -> latitude/longitude
    geo = requests.get(
        "https://api.openweathermap.org/geo/1.0/direct",
        params={"q": city, "limit": 1, "appid": API_KEY},
        timeout=10,
    )
    geo.raise_for_status()
    places = geo.json()
    if not places:
        raise ValueError(f"City not found: {city}")
    place = places[0]

    # 2. Coordinates -> current weather, in Celsius
    resp = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": place["lat"], "lon": place["lon"], "units": "metric", "appid": API_KEY},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    return {
        "place": f"{place['name']}, {place['country']}",
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"],
    }


if __name__ == "__main__":
    print(get_weather("New York"))
```

Some details worth knowing:

- Without `units`, temperatures come back in Kelvin. `units=metric` returns Celsius and `units=imperial` returns Fahrenheit, so you don't need to subtract 273.15 yourself.
- Passing `params=` lets `requests` URL-encode the city name. Writing `?q={city}` into an f-string breaks on names with spaces or accents.
- `raise_for_status()` turns a bad key (401) or other HTTP errors into an exception. Without it, `response.json()` returns an error body and the next `["main"]` lookup fails with a confusing `KeyError`.
- `timeout=` stops the request from hanging forever on a bad network.

## Add a tkinter window

The GUI is an entry for the city, a button, and one label for the result. Errors appear in the same label instead of crashing the app.

```python
import os
import tkinter as tk

import requests

API_KEY = os.environ["OPENWEATHER_API_KEY"]


def get_weather(city: str) -> dict:
    geo = requests.get(
        "https://api.openweathermap.org/geo/1.0/direct",
        params={"q": city, "limit": 1, "appid": API_KEY},
        timeout=10,
    )
    geo.raise_for_status()
    places = geo.json()
    if not places:
        raise ValueError(f"City not found: {city}")
    place = places[0]

    resp = requests.get(
        "https://api.openweathermap.org/data/2.5/weather",
        params={"lat": place["lat"], "lon": place["lon"], "units": "metric", "appid": API_KEY},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "place": f"{place['name']}, {place['country']}",
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "description": data["weather"][0]["description"],
    }


def on_get_weather():
    city = city_entry.get().strip()
    if not city:
        result_var.set("Enter a city name.")
        return
    try:
        w = get_weather(city)
    except (requests.RequestException, ValueError) as exc:
        result_var.set(f"Error: {exc}")
        return
    result_var.set(
        f"{w['place']}\n"
        f"Temperature: {w['temperature']:.1f}°C\n"
        f"Humidity: {w['humidity']}%\n"
        f"Conditions: {w['description']}"
    )


root = tk.Tk()
root.title("Weather App")

tk.Label(root, text="City:").grid(row=0, column=0, padx=5, pady=5)
city_entry = tk.Entry(root)
city_entry.grid(row=0, column=1, padx=5, pady=5)
city_entry.bind("<Return>", lambda event: on_get_weather())

tk.Button(root, text="Get Weather", command=on_get_weather).grid(row=1, column=0, columnspan=2)

result_var = tk.StringVar(value="")
tk.Label(root, textvariable=result_var, justify="left").grid(row=2, column=0, columnspan=2, padx=5, pady=5)

root.mainloop()
```

Pressing Enter in the city box does the same as clicking the button.

## Gotchas and next steps

- The request runs on the GUI thread, so the window freezes until the API answers. That's fine for one quick call. For anything slower, run the request in a `threading.Thread` and update the label with `root.after(...)`.
- An ambiguous name like "Springfield" returns the first match. Raise `limit` (up to 5) and let the user pick, or accept `city,state,country` input such as `Springfield,IL,US`.
- The free tier is rate-limited. Cache results for a few minutes instead of calling the API on every click.
- Each response includes an icon code in `weather[0]["icon"]`, which you can use to show a weather image next to the text.
