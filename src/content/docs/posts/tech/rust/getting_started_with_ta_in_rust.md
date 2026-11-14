---
tags: ['rust', 'chatgpt']
title: "Technical analysis in Rust: SMA and EMA from Alpha Vantage prices"
description: "Fetch daily stock prices from the Alpha Vantage API with reqwest and serde, then calculate simple and exponential moving averages in Rust."
pubDate: Mon, 20 September 2023
lastUpdated: 2026-11-14
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3842597075.png'
---

Technical analysis looks at past prices and volume to find trends. Two of the most basic indicators are the simple moving average (SMA) and the exponential moving average (EMA), which smooth the daily closing price so the trend is easier to see.

This post fetches daily closes for a stock from the [Alpha Vantage](https://www.alphavantage.co/) API and computes a 14-day SMA and EMA in plain Rust.

## Project setup

```sh
cargo new technical_analysis_rust
cd technical_analysis_rust
```

```toml
[dependencies]
reqwest = "0.13"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

[Get a free API key](https://www.alphavantage.co/support/#api-key) and put it in an environment variable rather than in the source:

```sh
export ALPHAVANTAGE_API_KEY=your_key_here
```

## Fetching daily prices

The `TIME_SERIES_DAILY` endpoint returns JSON where the prices sit under a `"Time Series (Daily)"` key, as a map from date to an object with string fields like `"4. close"`. With the default `outputsize=compact`, you get the latest 100 trading days; `outputsize=full` requires a premium key.

```rust
use std::collections::BTreeMap;
use std::error::Error;

use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct DailyResponse {
    #[serde(rename = "Time Series (Daily)")]
    time_series: BTreeMap<String, DailyData>,
}

#[derive(Deserialize, Debug)]
struct DailyData {
    #[serde(rename = "4. close")]
    close: String,
}

async fn fetch_daily(symbol: &str, api_key: &str) -> Result<DailyResponse, Box<dyn Error>> {
    let url = format!(
        "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol={symbol}&apikey={api_key}"
    );

    let body = reqwest::get(&url).await?.error_for_status()?.text().await?;

    // On a bad key or when you hit the rate limit, Alpha Vantage still returns
    // HTTP 200, but with a message instead of the time series.
    let parsed = serde_json::from_str(&body)
        .map_err(|e| format!("unexpected response ({e}): {body}"))?;
    Ok(parsed)
}
```

Two details matter here:

- The map is a `BTreeMap`, not a `HashMap`. A `HashMap` iterates in arbitrary order, so the prices would come out shuffled and every moving average would be meaningless. The dates are `YYYY-MM-DD` strings, so a `BTreeMap` keeps them in chronological order.
- Only `close` is declared. serde ignores the other fields (open, high, low, volume) unless you add them to the struct.

## Moving averages

The SMA is the plain average of the last `period` closes. The EMA weights recent prices more heavily using a multiplier of `2 / (period + 1)`. A common convention, used here, is to start the EMA from the SMA of the first `period` prices.

```rust
fn simple_moving_average(prices: &[f64], period: usize) -> Vec<f64> {
    assert!(period > 0, "period must be at least 1");
    prices
        .windows(period)
        .map(|window| window.iter().sum::<f64>() / period as f64)
        .collect()
}

fn exponential_moving_average(prices: &[f64], period: usize) -> Vec<f64> {
    assert!(period > 0, "period must be at least 1");
    if prices.len() < period {
        return Vec::new();
    }

    let multiplier = 2.0 / (period as f64 + 1.0);
    let mut current = prices[..period].iter().sum::<f64>() / period as f64;
    let mut ema = vec![current];

    for &price in &prices[period..] {
        current = (price - current) * multiplier + current;
        ema.push(current);
    }

    ema
}
```

Both functions return `prices.len() - period + 1` values, and value `i` belongs to the day at index `i + period - 1`. `windows` also means the last window, ending on the most recent day, is included.

## Putting it together

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let api_key = std::env::var("ALPHAVANTAGE_API_KEY")?;
    let symbol = "MSFT";
    let period = 14;

    let data = fetch_daily(symbol, &api_key).await?;

    let dates: Vec<&String> = data.time_series.keys().collect();
    let closes: Vec<f64> = data
        .time_series
        .values()
        .map(|day| day.close.parse::<f64>())
        .collect::<Result<_, _>>()?;

    let sma = simple_moving_average(&closes, period);
    let ema = exponential_moving_average(&closes, period);

    // Print the five most recent days
    let offset = period - 1;
    for i in sma.len().saturating_sub(5)..sma.len() {
        println!(
            "{}  close {:>8.2}  SMA({period}) {:>8.2}  EMA({period}) {:>8.2}",
            dates[i + offset],
            closes[i + offset],
            sma[i],
            ema[i],
        );
    }

    Ok(())
}
```

All three snippets go in `src/main.rs`. Run it with `cargo run`.

## Things to watch for

- **Rate limits.** The free key has a small daily request quota. While developing, save the JSON response to a file and parse that, instead of calling the API on every run.
- **Unadjusted prices.** `TIME_SERIES_DAILY` returns raw prices, so a stock split looks like a sudden crash and drags the averages down for `period` days. The split-adjusted endpoint (`TIME_SERIES_DAILY_ADJUSTED`) is premium-only.
- **`f64` is fine for indicators, not for money.** Moving averages are approximations anyway. If you move on to tracking positions or P&L, use a decimal type such as [`rust_decimal`](https://docs.rs/rust_decimal).
- **Existing crates.** The [`ta`](https://docs.rs/ta) crate implements SMA, EMA, RSI, MACD and others as streaming indicators, though its latest release (0.5.0) dates from 2021. Writing SMA and EMA yourself, as here, is a good way to check you understand what the library computes.

## Further reading

- [Alpha Vantage API documentation](https://www.alphavantage.co/documentation/)
- [reqwest docs](https://docs.rs/reqwest)
- [serde field attributes](https://serde.rs/field-attrs.html)
