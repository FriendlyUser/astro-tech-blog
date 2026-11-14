---
title: "Scraping Flipp grocery flyers with Python and Selenium"
description: "How flipp_flyer_parser drives Chrome through the Flipp flyer iframes on Walmart, Save-On-Foods, Superstore and Loblaws, and pulls prices into JSON and PostgreSQL."
alt: Web Scraping Retail Flyers with Python
layout: '@/templates/BasePost.astro'
pubDate: Thursday, 15 Feburary 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["python", "web scraping", "selenium", "data extraction", "retail", "automation"]
imgAlt: 'Python Web Scraping Visualization'
imgSrc: "/imgs/2023/117117315.png"
---

:::caution[undetected-chromedriver is no longer developed]
The scraper uses `undetected-chromedriver`, whose last release (3.5.5) was in February 2024. Its author now points users to [nodriver](https://pypi.org/project/nodriver/), which talks to Chrome over the DevTools Protocol instead of Selenium and ChromeDriver. The API is different, so switching means rewriting the browser code, not changing an import.
:::

[`flipp_flyer_parser`](https://github.com/FriendlyUser/flipp_flyer_parser) is a Python script I wrote to pull weekly sale prices out of Canadian grocery flyers. Walmart, Save-On-Foods, Real Canadian Superstore and Loblaws all embed their flyers through Flipp, so one scraper can handle all of them with a small per-store config. It opens the flyer in Chrome, clicks every product hotspot, reads the price and product details, and writes the results to JSON. The current version also inserts the rows into PostgreSQL.

This post walks through `main.py` as it stands on the `main` branch. When I first wrote about it in 2023 it only handled three stores and stopped at JSON.

## Why a real browser

Flipp flyers are rendered client-side inside iframes, and the product data only appears after you click a hotspot. A plain HTTP request gets you an empty shell, so the script drives Chrome with Selenium. It uses `undetected-chromedriver` (imported as `uc`) because the store sites are more likely to block a stock ChromeDriver session:

```python
import undetected_chromedriver as uc

def make_driver():
    return uc.Chrome(headless=False, use_subprocess=False)
```

The browser runs with a visible window. That makes it easier to step in by hand when a store page changes.

## Getting to the flyer

Each store has its own setup function, because the flyer depends on which store you've picked:

- **Walmart** (`selenium_setup_walmart`) opens a store page, clicks "Set as My Store" and then "View Flyers", with random 1–5 second pauses in between. If that fails it loads the flyer URL with the store code directly.
- **Superstore** (`setup_superstore`) sets a `flipp-store-code_2271` cookie, refreshes, and clicks the flyer link. If anything goes wrong it falls back to `input()` so you can navigate to the flyer yourself and press Enter.
- **Loblaws** (`selenium_setup_loblaws`) clicks the flyer link on a store-locator page.
- **Save-On-Foods** (`selenium_setup_saveon`) just loads the circular URL.

The store IDs and postal codes are hard-coded for Burnaby, BC.

## Walking the flyer

`scrap_flyer(driver, cfg)` does the main work. It switches into the Flipp iframe, finds every `sfml-flyer-image` element under `flipp-router`, and for each image clicks every `<button>` (the product hotspots). The hotspot's `aria-label` already contains the product name and usually the price, for example `"Save $2, $4.97"`, so a regex from the store config pulls that out first:

```python
cfg = {
    "save_regex": r"Save \$([\d*?]+), \$([\d.]+)",
    "rollbar_regex": r"Rollback, (\d+)",
    "item_text": "Select for details",
    "data_file": "data/walmart.json",
    "max_items": 50,
    "type": StoreType("walmart"),
}
```

If the `Save ... , $...` pattern doesn't match, the script falls back to grabbing bare numbers from the label (one number is the price, two are savings and price, a `¢` sign means cents), then to Walmart's "Rollback" pattern, then to any `$` amount.

Iframe switching goes through one helper:

```python
from selenium.webdriver.common.by import By

def swap_to_iframe(driver, iframe_class="flippiframe.mainframe"):
    driver.switch_to.default_content()
    iframe = driver.find_element(By.CLASS_NAME, iframe_class)
    driver.switch_to.frame(iframe)
```

## Reading the product panel

Clicking a hotspot opens a side panel in a second iframe. `parse_flipp_aside` switches to it (trying `flippiframe.asideframe` first and `flippiframe.navframe` as a fallback, since Flipp has renamed it before) and reads:

- `start-date` and `end-date` attributes from the `<flipp-validity-dates>` element
- the `.flipp-description` text
- a size such as `500 g` or `355 mL`, via `(\d+(?:\.\d+)?)\s*(mL|g)`
- a multipack count such as `12 X 355 mL`, via `(\d+)\s*X\s*(\d+)\s*(mL|g)`
- whether the description mentions "pack", "each" or "frozen"
- the `.see-more-link` URL, if there is one

Superstore skips this panel. For every store the script then parses the page with BeautifulSoup to find a "View Product Details" link and prefixes it with the store's base URL.

Each product becomes one dict that merges the hotspot data with the panel data. The list is rewritten to the JSON file after every item, so a crash partway through still leaves you with partial results.

## Running it

```bash
pip install -r requirements.txt
python main.py --type walmart   # saveon, walmart, superstore or loblaws
```

After scraping, `main()` reads the JSON file back and `add_to_db` inserts each row into a `grocery` table in the database given by the `DATABASE_URL` environment variable (loaded from `.env`). Missing start dates default to the coming Thursday and missing end dates to a week after that, which matches the usual weekly flyer cycle.

## Gotchas

- **It breaks when the sites change.** Everything depends on Flipp's custom element names (`flipp-router`, `sfml-flyer-image`, `flipp-validity-dates`) and the stores' button text. Expect to fix selectors every few months.
- **`find_element` raises, it doesn't return `None`.** The `if not iframe:` check in the repo's `swap_to_iframe` never runs; a missing iframe raises `NoSuchElementException`. Catch that if you want a clearer error.
- **`max_items` is only checked between flyer pages**, so a run can go past the limit by however many hotspots are on the last page.
- **It's slow on purpose.** There are fixed `time.sleep()` calls of up to 15 seconds and a 5-second wait after every click. Explicit `WebDriverWait` conditions would be faster, but the delays also keep the request rate low.
- **Check the store's terms of use** before running a scraper against it on a schedule.

## Further reading

- [flipp_flyer_parser on GitHub](https://github.com/FriendlyUser/flipp_flyer_parser)
- [Selenium Python documentation](https://www.selenium.dev/documentation/)
- [nodriver on PyPI](https://pypi.org/project/nodriver/)
