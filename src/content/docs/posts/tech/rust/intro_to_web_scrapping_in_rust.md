---
tags: ['chatgpt', 'flutter', 'rust']
title: Web scraping in Rust with reqwest and scraper
description: Fetch a page with reqwest, pull out elements with CSS selectors using the scraper crate, and write the results to a file, using Hacker News as the example.
pubDate: Fri, 7 July 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

Web scraping means downloading a page's HTML and extracting the parts you need. In Rust that takes two crates: [`reqwest`](https://crates.io/crates/reqwest) to make the HTTP request and [`scraper`](https://crates.io/crates/scraper) to parse the HTML and query it with CSS selectors. `scraper` is built on Servo's `html5ever` parser and `selectors` crate, so it handles messy real-world HTML the way a browser would.

This post scrapes the story titles and links from the Hacker News front page.

Before scraping a site, check its terms of service and `robots.txt`, keep your request rate low, and prefer an official API when one exists.

## Setup

```bash
cargo new my_scraper
cd my_scraper
cargo add reqwest scraper
cargo add tokio --features macros,rt-multi-thread
```

That gives you a `Cargo.toml` like this (versions current as of November 2026):

```toml
[dependencies]
reqwest = "0.13"
scraper = "0.29"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

`reqwest`'s async API needs a runtime, which is why `tokio` is there.

## Fetching and parsing the page

On the Hacker News front page, each story title is a link inside `<span class="titleline">`. Older tutorials (including an earlier version of this one) used a `.storylink` class, which Hacker News no longer emits.

```rust
use scraper::{Html, Selector};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let body = reqwest::get("https://news.ycombinator.com/")
        .await?
        .error_for_status()?
        .text()
        .await?;

    let document = Html::parse_document(&body);
    let selector = Selector::parse("span.titleline > a").expect("valid CSS selector");

    for link in document.select(&selector) {
        let href = link.value().attr("href").unwrap_or("");
        let title: String = link.text().collect();
        println!("{title} ({href})");
    }

    Ok(())
}
```

What each step does:

- `reqwest::get` sends the request. `error_for_status()` turns a 4xx/5xx response into an error; without it you'd happily parse an error page.
- `Html::parse_document` parses the body into a DOM tree.
- `Selector::parse` compiles the CSS selector. It only fails on invalid selector syntax, so `expect` is reasonable for a hard-coded string.
- `document.select` yields an `ElementRef` for each match. `.value().attr("href")` reads an attribute, and `.text()` iterates over the element's text nodes.

Run it with `cargo run`.

## Saving the results to a file

Swap the `println!` for a buffered file writer:

```rust
use scraper::{Html, Selector};
use std::error::Error;
use std::fs::File;
use std::io::{BufWriter, Write};

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let body = reqwest::get("https://news.ycombinator.com/")
        .await?
        .error_for_status()?
        .text()
        .await?;

    let document = Html::parse_document(&body);
    let selector = Selector::parse("span.titleline > a").expect("valid CSS selector");

    let mut out = BufWriter::new(File::create("output.txt")?);
    for link in document.select(&selector) {
        let href = link.value().attr("href").unwrap_or("");
        let title: String = link.text().collect();
        writeln!(out, "{title} ({href})")?;
    }
    out.flush()?;

    Ok(())
}
```

Errors from creating or writing the file now propagate through `?` instead of panicking with `unwrap()`.

## Gotchas

- **Selectors break when the site changes.** The `.storylink` example above is a real case. Keep selectors in one place and fail loudly when they match nothing.
- **`scraper` doesn't run JavaScript.** If the content is rendered client-side, the HTML you download won't contain it. Look for the JSON API the page calls, or use a headless browser.
- **Relative links.** Some `href` values (for example "Ask HN" posts) are relative like `item?id=...`. Resolve them against the page URL with `reqwest::Url::join`.
- **Hacker News has an official API.** For anything beyond a demo, use the [Hacker News API](https://github.com/HackerNews/API) instead of scraping the HTML.

## Further reading

- [`scraper` docs](https://docs.rs/scraper)
- [`reqwest` docs](https://docs.rs/reqwest)
