---
tags: ['python', 'requests', 'bs4', 'pandas', 'web scraping']
title: Downloading CSE company filings with Python and posting them to Discord
description: A Python script that uses cad_tickers to find new documents for CSE-listed stocks, saves the PDFs, and posts each one to a Discord webhook.
pubDate: Fri, 3 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3702590653.webp"
---

The Canadian Securities Exchange (CSE) lists mostly small and early-stage companies, and their press releases and filings are posted on each company's listing page on thecse.com. This post walks through a script from the [cse_file_downloader](https://github.com/dli-invest/cse_file_downloader/blob/main/scrap_cse_releases.py) repo that checks a watchlist of CSE tickers for new documents, downloads them, and posts each one to a Discord channel with a short summary.

The script does five things:

1. Loads the list of CSE tickers (with their listing-page URLs) and filters it down to a watchlist.
2. For each ticker, scrapes the listing page for recent document links with `cad_tickers`.
3. Skips any link already recorded in `docs.csv`.
4. Downloads new documents into `docs/<ticker>/` and summarises them.
5. Posts the link, summary and PDF to a Discord webhook.

Install the dependencies with:

```bash
pip install cad-tickers pandas requests
```

`get_recent_docs_from_url` comes from the [cad_tickers](https://github.com/FriendlyUser/cad_tickers) package. `mk_dir` and `handle_logic` come from `extract_doc.py` in the same repo as the script: `mk_dir` creates a folder, and `handle_logic` takes the document URL and target path and returns a dict with the file `contents` and a text `summary`.

## Posting to a Discord webhook

```python
import json
import os
import time
from io import StringIO

import pandas as pd
import requests
from cad_tickers.exchanges.cse import get_recent_docs_from_url
from extract_doc import mk_dir, handle_logic


def make_discord_request(content, embeds=None, filename=None, file=None):
    url = os.getenv("DISCORD_WEBHOOK")
    if url is None:
        print("DISCORD_WEBHOOK missing")
        return None

    payload = {"content": content}
    if embeds:
        payload["embeds"] = embeds

    if filename is not None and file is not None:
        # With an attachment the request is multipart, so the JSON body
        # (content + embeds) goes in the payload_json field.
        resp = requests.post(
            url,
            data={"payload_json": json.dumps(payload)},
            files={"files[0]": (os.path.basename(filename), file, "application/pdf")},
        )
    else:
        resp = requests.post(url, json=payload)
    print(resp.status_code)
    return resp
```

The webhook URL comes from the `DISCORD_WEBHOOK` environment variable. When a PDF is attached, Discord expects a multipart request with the message JSON in `payload_json`. The original version of this function sent only `content` alongside the file, so the embed with the summary never arrived.

## Loading the watchlist

```python
stock_list = ["PKK", "IDK", "ADDC", "VPH", "VST", "ACT"]


def get_cse_tickers_data():
    url = "https://github.com/FriendlyUser/cad_tickers_list/blob/main/static/latest/cse.csv?raw=true"
    r = requests.get(url, allow_redirects=True, timeout=30)
    r.raise_for_status()
    return pd.read_csv(StringIO(r.content.decode("utf-8")))


stock_df = get_cse_tickers_data()
stock_rows = stock_df.loc[stock_df["Symbol"].isin(stock_list)].copy()
stock_rows["stock"] = stock_rows["Symbol"]
stock_rows["url"] = stock_rows["urls"]
stock_urls = stock_rows.to_dict("records")

csv_file = "docs.csv"
if os.path.isfile(csv_file):
    df = pd.read_csv(csv_file)
else:
    df = pd.DataFrame(columns=["stock", "url", "docUrl"])
```

The CSV comes from the `cad_tickers_list` repo and has `Company`, `Symbol` and `urls` (the thecse.com listing page) columns, among others. `.copy()` avoids pandas' `SettingWithCopyWarning` when the new columns are added to the filtered frame. `docs.csv` is the record of documents already posted, so each run only sends new ones.

## Finding and posting new documents

```python
for stock in stock_urls:
    stock_name = stock["stock"]
    stock_url = stock["url"]
    try:
        urls = get_recent_docs_from_url(stock_url) or []
    except Exception as e:
        print(f"Failed to get docs for {stock_name}: {e}")
        continue

    for doc_url in urls:
        # skip relative links
        if doc_url.startswith("/"):
            continue
        if doc_url in df["docUrl"].tolist():
            continue

        print(f"Adding {stock_name}: {doc_url}")
        df.loc[len(df)] = [stock_name, stock_url, doc_url]

        stock_doc_dir = f"docs/{stock_name}"
        mk_dir(stock_doc_dir)
        pdf_file_name = f"{stock_doc_dir}/{doc_url.split('/')[-1]}.pdf"
        company_name = stock["Company"].replace("Inc.", "").replace("Pharma", "").strip()

        result_obj = handle_logic(
            {"url": doc_url, "path": pdf_file_name, "company_name": company_name}
        )
        file_contents = result_obj.get("contents")
        summary = (result_obj.get("summary") or "N/A")[:1980]

        embeds = [{"title": stock_name, "url": doc_url, "description": summary}]
        if file_contents is not None:
            make_discord_request(f"*{stock_name}*: \n {doc_url}", embeds, pdf_file_name, file_contents)
            time.sleep(2)
        else:
            make_discord_request(f"*{stock_name}*: \n {doc_url}", embeds)
            time.sleep(1)

df = df.drop_duplicates().sort_values(by=["stock"])
df.to_csv(csv_file, index=False)
```

The company name, with "Inc." and "Pharma" stripped, is passed to `handle_logic` along with the URL and file path. The `sleep` calls space out the webhook posts so a ticker with several new documents doesn't hit Discord's rate limit.

## Gotchas

- `get_recent_docs_from_url` scrapes the listing page's HTML and looks for the news-release section by its element id. If thecse.com changes its markup, it returns nothing or raises an error, so check it against a live page before you rely on this script.
- The original script swallowed every scraping error with `except Exception: pass`. The version above logs the error and moves on to the next ticker, which makes a broken scraper visible.
- The script runs at module level. If you import it from elsewhere, wrap the loop in a `main()` function behind `if __name__ == "__main__":`.

## References

- https://github.com/dli-invest/cse_file_downloader/blob/main/scrap_cse_releases.py
- [Discord webhook docs: execute webhook](https://discord.com/developers/docs/resources/webhook#execute-webhook)
