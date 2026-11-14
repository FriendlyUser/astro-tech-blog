---
pubDate: "2024-05-30T10:00:00.000Z"
lastUpdated: 2026-11-14
title: "Scraping a free proxy list and rotating proxies with Python requests"
description: "Why scrapers use proxies, how to pull IP:port pairs from a proxy list page with requests and BeautifulSoup, check which ones work, and rotate them."
tags: ["Web Scraping", "Proxies", "Python", "Data Collection", "Backend Development", "Programming", "Software Development", "BeautifulSoup", "Requests"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://images.unsplash.com/photos/a-large-statue-of-a-person-in-a-dark-room-Lhzabp9UrSU"
---

A proxy forwards your requests, so the target site sees the proxy's IP address instead of yours. Scrapers use them for two main reasons:

- **Per-IP rate limits and blocks.** Spreading requests over several IPs keeps each one under the site's limit, and a ban on one IP doesn't stop the whole job.
- **Location.** Some content is only served to visitors from certain countries, and a proxy in that country lets you see it.

This post scrapes a public proxy list, filters it down to proxies that actually respond, and rotates through them with `requests`.

## Scrape the proxy list

Most free proxy list sites show an HTML table with the IP in the first column and the port in the second. The selectors below assume that layout. Inspect the page you're targeting and adjust the table lookup and column indexes.

```bash
pip install requests beautifulsoup4
```

```python
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
    )
}


def scrape_proxy_table(url: str) -> list[str]:
    response = requests.get(url, headers=HEADERS, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    table = soup.find("table")
    if table is None:
        raise ValueError("No table found; the list may be rendered with JavaScript")

    proxies = []
    for row in table.find_all("tr")[1:]:  # skip the header row
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        ip = cells[0].get_text(strip=True)
        port = cells[1].get_text(strip=True)
        if ip and port.isdigit():
            proxies.append(f"http://{ip}:{port}")
    return proxies
```

Some sites hide the IPs from simple scrapers by writing them with JavaScript, for example `document.write(Base64.decode("MTkyLjE2OC4xLjE="))`. If the encoded string is in the HTML, you can decode it yourself:

```python
import base64
import re

js_code = 'document.write(Base64.decode("MTkyLjE2OC4xLjE="))'
match = re.search(r'Base64\.decode\("([^"]+)"\)', js_code)
if match:
    ip = base64.b64decode(match.group(1)).decode("utf-8")
    print(ip)  # 192.168.1.1
```

If the list is built entirely in the browser, use a browser automation tool such as Playwright or Selenium to render the page first.

## Keep only proxies that work

Most entries on a free list are dead or very slow. Test each one against an endpoint that echoes your IP, and do it in parallel so a hundred timeouts don't take minutes:

```python
from concurrent.futures import ThreadPoolExecutor

import requests


def check_proxy(proxy: str) -> str | None:
    try:
        r = requests.get(
            "https://httpbin.org/ip",
            proxies={"http": proxy, "https": proxy},
            timeout=5,
        )
        r.raise_for_status()
        return proxy
    except requests.RequestException:
        return None


def working_proxies(candidates: list[str]) -> list[str]:
    with ThreadPoolExecutor(max_workers=20) as pool:
        return [p for p in pool.map(check_proxy, candidates) if p]
```

The `https` key also uses an `http://` proxy URL. That's correct: `requests` connects to the proxy over plain HTTP and sends a `CONNECT` request to open a tunnel, and TLS to the target site runs through that tunnel.

## Rotate through them

Pick a proxy per request, and drop one from the pool when it fails:

```python
import random

import requests


def fetch(url: str, pool: list[str], attempts: int = 3) -> requests.Response:
    last_error = None
    for _ in range(attempts):
        if not pool:
            break
        proxy = random.choice(pool)
        try:
            r = requests.get(
                url,
                headers=HEADERS,
                proxies={"http": proxy, "https": proxy},
                timeout=10,
            )
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            last_error = e
            pool.remove(proxy)
    raise RuntimeError(f"All attempts failed for {url}") from last_error


candidates = scrape_proxy_table("https://example.com/proxy-list")  # replace with a real list page
pool = working_proxies(candidates)
response = fetch("https://example.com/target-page", pool)
```

## What sites do about it, and the limits of proxies

Sites rate-limit by IP, block IP ranges known to belong to data centres and public proxies, show CAPTCHAs, and fingerprint the browser or TLS client. Rotating IPs only helps with the first of these. Free proxy IPs are often already on blocklists, so expect a low success rate on any site that actively defends itself.

A few more cautions:

- **Free proxies can read and modify your traffic.** Anything sent over plain HTTP through an unknown proxy is visible to its operator. Never send credentials or session cookies through one.
- **Proxies don't change what you're allowed to do.** Check the site's terms and `robots.txt`, keep your request rate reasonable, and prefer an official API when there is one.
- **For anything you rely on, pay for proxies.** Paid residential or data-centre providers are far more reliable than scraped lists.

## Further reading

- [Requests: Proxies](https://requests.readthedocs.io/en/latest/user/advanced/#proxies)
- [Beautiful Soup documentation](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
