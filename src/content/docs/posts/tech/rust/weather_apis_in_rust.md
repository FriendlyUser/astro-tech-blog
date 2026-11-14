---
title: "Build a command-line weather app in Rust with reqwest and OpenWeatherMap"
description: "A small Rust CLI that looks up current weather by city name from the OpenWeatherMap API, using reqwest's blocking client and serde for JSON."
pubDate: Saturday, 27 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.png'
---

This post builds a small interactive CLI in Rust: type a city name, get the current temperature and conditions from the [OpenWeatherMap current weather API](https://openweathermap.org/current). It uses [`reqwest`](https://crates.io/crates/reqwest) for HTTP and [`serde`](https://serde.rs/) to deserialize the JSON response into structs.

You'll need a free OpenWeatherMap account and API key. New keys can take a while to activate, so create one before you start.

## Set up the project

```sh
cargo new weather_forecast_cli
cd weather_forecast_cli
cargo add reqwest --features blocking,json,query
cargo add serde --features derive
```

At the time of this update that produced:

```toml
[dependencies]
reqwest = { version = "0.13.5", features = ["blocking", "json", "query"] }
serde = { version = "1.0.229", features = ["derive"] }
```

The features matter:

- `blocking` enables `reqwest::blocking`, a synchronous client, so you don't need an async runtime for a simple CLI.
- `json` enables `.json::<T>()` on responses.
- `query` enables `.query(...)` on requests, which URL-encodes parameters for you. In reqwest 0.13 this is an opt-in feature.
- `derive` on `serde` enables `#[derive(Deserialize)]`.

## Model the response

The current weather endpoint returns a lot of fields. You only need to declare the ones you use; serde ignores the rest.

```json
{
  "name": "Toronto",
  "main": { "temp": 4.2, "feels_like": 0.9, ... },
  "weather": [{ "description": "light rain", ... }],
  ...
}
```

## The full program

Replace `src/main.rs` with:

```rust
use serde::Deserialize;
use std::io::{self, Write};

#[derive(Debug, Deserialize)]
struct WeatherData {
    name: String,
    main: Main,
    weather: Vec<Weather>,
}

#[derive(Debug, Deserialize)]
struct Main {
    temp: f32,
    feels_like: f32,
}

#[derive(Debug, Deserialize)]
struct Weather {
    description: String,
}

const API_URL: &str = "https://api.openweathermap.org/data/2.5/weather";

fn fetch_weather_data(
    client: &reqwest::blocking::Client,
    api_key: &str,
    location: &str,
) -> Result<WeatherData, reqwest::Error> {
    client
        .get(API_URL)
        .query(&[("q", location), ("units", "metric"), ("appid", api_key)])
        .send()?
        .error_for_status()?
        .json::<WeatherData>()
}

fn display_weather_data(data: &WeatherData) {
    println!("Current weather for {}:", data.name);
    println!("  Temperature: {:.1} °C", data.main.temp);
    println!("  Feels like:  {:.1} °C", data.main.feels_like);
    if let Some(weather) = data.weather.first() {
        println!("  Conditions:  {}", weather.description);
    }
}

fn main() {
    let api_key = std::env::var("OPENWEATHER_API_KEY")
        .expect("set the OPENWEATHER_API_KEY environment variable");
    let client = reqwest::blocking::Client::new();

    loop {
        print!("Enter location (or 'quit'): ");
        io::stdout().flush().unwrap();

        let mut input = String::new();
        if io::stdin().read_line(&mut input).unwrap() == 0 {
            break; // EOF (Ctrl+D / Ctrl+Z)
        }

        let location = input.trim();
        if location.is_empty() {
            continue;
        }
        if location == "quit" {
            break;
        }

        match fetch_weather_data(&client, &api_key, location) {
            Ok(data) => display_weather_data(&data),
            // without_url() keeps the API key (part of the URL) out of the error message.
            Err(err) => println!("Error fetching weather data: {}", err.without_url()),
        }
    }
}
```

A few things worth pointing out:

- `units=metric` returns Celsius. The default (`standard`) is Kelvin, and `imperial` is Fahrenheit.
- `.error_for_status()` turns a 401 (bad or not-yet-active key) or 404 (unknown city) into an `Err`. Without it, reqwest would try to parse the error body as `WeatherData` and you'd get a confusing deserialization error instead.
- The API key comes from an environment variable instead of being hard-coded, so it doesn't end up in your Git history.
- `weather` is an array; `.first()` avoids a panic if it's ever empty, which indexing with `[0]` would not.

## Run it

```sh
export OPENWEATHER_API_KEY=your_key_here   # PowerShell: $env:OPENWEATHER_API_KEY = "your_key_here"
cargo run
```

```text
Enter location (or 'quit'): Toronto
Current weather for Toronto:
  Temperature: 4.2 °C
  Feels like:  0.9 °C
  Conditions:  light rain
```

The `q` parameter takes a city name, optionally followed by a country code (`London,GB`), or for US locations a state and country code (`Portland,OR,US`). Adding the country code avoids getting the wrong city when names collide.

## Gotchas and next steps

- **City-name lookup is deprecated.** OpenWeatherMap's docs say requests by city name, ZIP code and city ID are deprecated: they still work but no longer get fixes. The recommended approach is to resolve the name to coordinates with the [Geocoding API](https://openweathermap.org/api/geocoding-api) and then call the weather endpoint with `lat` and `lon`.
- **This only shows current conditions.** For forecasts, look at the [5 day / 3 hour forecast API](https://openweathermap.org/forecast5), which uses the same response style.
- **Don't use `reqwest::blocking` inside async code.** If you later move this into a Tokio application, switch to the async `reqwest::Client`; the blocking client panics if called from within an async runtime.

## Further reading

- [reqwest docs](https://docs.rs/reqwest)
- [serde docs](https://serde.rs/)
- [OpenWeatherMap current weather API](https://openweathermap.org/current)
