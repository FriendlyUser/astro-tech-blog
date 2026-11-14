---
tags: ['python', 'selenium', 'bs4', 'youtube', 'web scraping']
title: Checking whether a YouTube channel is live with Selenium and BeautifulSoup
description: A Python script that loads a YouTube channel page in a remote Selenium browser and parses the HTML to tell whether its latest stream is live or upcoming.
pubDate: Fri, 10 Feb 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.png"
---

This script comes from [fdrtt](https://github.com/dli-invest/fdrtt), a project for transcribing finance livestreams (such as Federal Reserve press conferences) in real time. Before transcribing, it needs to know whether a channel is streaming right now, has a stream scheduled, or neither. YouTube's channel pages are rendered with JavaScript, so a plain `requests.get` doesn't return the video list. The script loads the page in a real browser through Selenium and parses the rendered HTML with BeautifulSoup.

Install the dependencies:

```bash
pip install selenium beautifulsoup4 dateparser
```

## Parsing the channel page

```python
"""
Grab livestream data from a YouTube channel page using Selenium
(a browser is needed because the page is rendered with JavaScript),
and check whether the latest stream is live or upcoming.
"""
import os
import sys
import time

import bs4
import dateparser
from selenium import webdriver


def get_livestreams_from_html(data: str) -> list[dict]:
    """
    Find the first video on a channel page and work out whether it is live or upcoming.
    Returns a list of dicts with keys:
      date: scheduled time (datetime) for upcoming streams, otherwise None
      status: the thumbnail overlay label (e.g. "LIVE") or "UPCOMING"
      watch_url: relative URL of the video, e.g. /watch?v=...
    """
    try:
        soup = bs4.BeautifulSoup(data, "html.parser")
        livestream_data = []
        first_section = soup.find("ytd-item-section-renderer")

        # The featured video on the channel home page, if there is one
        title_wrapper = first_section.find("ytd-channel-video-player-renderer")
        if title_wrapper is None:
            watch_link = first_section.find("a", {"class": "yt-simple-endpoint style-scope ytd-video-renderer"})
        else:
            watch_link = title_wrapper.find("yt-formatted-string").find("a")
        watch_url = watch_link.get("href")

        # Live videos have a time-status overlay on the thumbnail (e.g. "LIVE")
        overlay = first_section.find("ytd-thumbnail-overlay-time-status-renderer")
        if overlay is None:
            # No overlay: look for "Scheduled for August 22 at 6:00 AM"
            scheduled_text = first_section.find("ytd-video-meta-block").get_text()
            run_str = scheduled_text.replace("Scheduled for", "").strip()
            livestream_data.append(
                {"date": dateparser.parse(run_str), "status": "UPCOMING", "watch_url": watch_url}
            )
        else:
            livestream_data.append(
                {"date": None, "status": overlay.get_text().strip(), "watch_url": watch_url}
            )
        return livestream_data
    except Exception as e:
        print(f"Error parsing channel page: {e}")
        return []
```

The function looks at the first section of the channel page and finds the URL of the first video. Then it checks the thumbnail:

- If it has a `ytd-thumbnail-overlay-time-status-renderer` overlay, the overlay text is used as the status. For a live stream this is `LIVE`. For an ordinary video it's the duration (e.g. `12:34`), which the main block treats as "no stream".
- If it doesn't, the video is treated as upcoming, and `dateparser` turns text like "August 22 at 6:00 AM" into a `datetime`.

The selectors depend on YouTube's current markup. Any missing element raises an exception, and the function returns an empty list.

## Loading the page with a remote browser

```python
def get_webdriver():
    remote_url = os.environ.get("REMOTE_SELENIUM_URL")
    if remote_url is None:
        raise RuntimeError("Missing REMOTE_SELENIUM_URL in env vars")
    # Selenium 4 requires an options object for Remote
    return webdriver.Remote(command_executor=remote_url, options=webdriver.ChromeOptions())


def get_html_from_url(url: str) -> str:
    driver = get_webdriver()
    try:
        driver.get(url)
        time.sleep(10)  # give YouTube's JavaScript time to render the video list
        return driver.page_source
    finally:
        driver.quit()


if __name__ == "__main__":
    # TODO: read channels from a config file
    html = get_html_from_url("https://www.youtube.com/c/YahooFinance")
    livestream_data = get_livestreams_from_html(html)

    base_url = "https://www.youtube.com"
    for livestream in livestream_data:
        if livestream["status"] == "LIVE":
            print("LIVE")
            youtube_url = base_url + livestream["watch_url"]
            data = {"youtube_url": youtube_url, "iteration": -1, "table_name": "YahooFinance"}
            print(data)
        elif livestream["status"] == "UPCOMING":
            print("UPCOMING")
            sys.exit(0)
        else:
            print("NONE")
            sys.exit(1)
```

The browser runs on a Selenium Grid or standalone container (for example `selenium/standalone-chrome`), and its URL is read from `REMOTE_SELENIUM_URL`. Since Selenium 4, `webdriver.Remote` needs an `options` object, so the original call without one no longer works. The `finally: driver.quit()` closes the remote session. Without it, every run leaves a browser open on the grid until it times out.

When the channel is live, the script builds the full watch URL and the data the transcriber needs. The exit codes let a CI job or shell script decide what to do next: 0 if a stream is upcoming, 1 if there is nothing.

## Gotchas

- This is screen scraping. YouTube renames its `ytd-*` elements and reorders channel pages from time to time, and when it does the selectors break. Check them against the live page with your browser's dev tools.
- A fixed `time.sleep(10)` is slow and can still be too short. A `WebDriverWait` on the `ytd-item-section-renderer` element is more reliable.
- The function only looks at the first video, so channels that run a never-ending 24/7 stream will always show as `LIVE`.
- If you have an API key, the YouTube Data API's `search.list` with `channelId`, `type=video` and `eventType=live` (or `upcoming`) gives the same answer without a browser. It uses API quota, though.

## References

- https://github.com/dli-invest/fdrtt/blob/main/livestream_scrapper.py
- https://github.com/dli-invest/fdrtt
- [Selenium: Remote WebDriver](https://www.selenium.dev/documentation/webdriver/drivers/remote_webdriver/)
