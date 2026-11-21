---
title: "Pulling company fundamentals from the SEC's XBRL company facts API"
description: "Fetch revenue and net income for US-listed companies from data.sec.gov: CIK lookup, companyfacts and companyconcept, us-gaap tags, and deduplicating 10-K facts."
tags: ["Python", "SEC", "XBRL", "EDGAR", "Financial Data", "Investing"]
pubDate: "2026-06-25T16:00:00.000Z"
imgSrc: "/imgs/2026/sec_xbrl_company_facts.webp"
imgAlt: "A JSON tree from the company facts API branching from a CIK into us-gaap tags, units and a list of facts, with duplicate facts folded into one row"
---

Every 10-K and 10-Q filed with the SEC includes the financial statements in XBRL, a machine-readable format where each number is tagged with a concept like `NetIncomeLoss`, a period and a unit. The SEC extracts those facts and serves them as JSON from `data.sec.gov`, free and without an API key.

That makes it the simplest source for a company's reported revenue, earnings, share count or cash, going back to around 2009 when XBRL filing started. The catch is that the JSON is a list of every fact from every filing, so the same number appears several times and the concept names change over the years. This post covers the endpoints, the access rules, and the deduplication you need before the numbers are usable. Examples were run with Python 3.12, `requests` and pandas.

:::note
This is about getting data, not about what to do with it. Nothing here is investment advice.
:::

## The rules: User-Agent and rate limit

The SEC's developer FAQ asks automated clients to **declare a User-Agent** with a company or name and an admin contact email, in the form `Sample Company Name AdminContact@<sample company domain>.com`. Requests with a generic library user agent can be refused.

The **fair access limit is 10 requests per second** per user, regardless of how many machines you use, and the SEC reserves the right to block IPs that exceed it. For bulk work there are nightly ZIP files instead (`companyfacts.zip` and `submissions.zip`), which hold the same data for every company.

`data.sec.gov` does not send CORS headers, so you can't call it directly from browser JavaScript. Use a server or a script.

## The endpoints

| Endpoint | URL | Returns |
|---|---|---|
| Ticker list | `https://www.sec.gov/files/company_tickers.json` | ticker, CIK and name for listed companies |
| Company facts | `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | every XBRL fact for one company |
| Company concept | `https://data.sec.gov/api/xbrl/companyconcept/CIK##########/us-gaap/{Tag}.json` | every fact for one company and one concept |
| Frames | `https://data.sec.gov/api/xbrl/frames/us-gaap/{Tag}/{Unit}/{Period}.json` | one fact per company for one period, e.g. `CY2023` or `CY2024Q1I` |

The CIK (Central Index Key) is the SEC's company id. In these URLs it is always **zero-padded to 10 digits**: Apple's CIK 320193 becomes `CIK0000320193`.

## What a fact looks like

The company concept endpoint is the easiest way to see the shape. This asks for Apple's `NetIncomeLoss` and prints the facts for the fiscal year ending September 30, 2023:

```python
# concept.py
import json
from sec_facts import get_json   # defined in the next section

url = "https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/NetIncomeLoss.json"
concept = get_json(url)
print(concept["label"], "|", list(concept["units"]))
facts = [f for f in concept["units"]["USD"] if f["end"] == "2023-09-30" and f["form"] == "10-K" and "start" in f]
for f in facts:
    print(json.dumps(f))
```

```text
Net Income (Loss) Attributable to Parent | ['USD']
{"start": "2022-09-25", "end": "2023-09-30", "val": 96995000000, "accn": "0000320193-23-000106", "fy": 2023, "fp": "FY", "form": "10-K", "filed": "2023-11-03"}
{"start": "2022-09-25", "end": "2023-09-30", "val": 96995000000, "accn": "0000320193-24-000123", "fy": 2024, "fp": "FY", "form": "10-K", "filed": "2024-11-01"}
{"start": "2022-09-25", "end": "2023-09-30", "val": 96995000000, "accn": "0000320193-25-000079", "fy": 2025, "fp": "FY", "form": "10-K", "filed": "2025-10-31", "frame": "CY2023"}
```

One period, three facts. An income statement in a 10-K shows three years, so each annual number is filed three times. The fields:

- `start`, `end`: the period the number covers. Balance sheet items (assets, cash) have only `end`, because they are a point in time.
- `val`: the number, in the unit of the key it sits under (`USD`, `shares`, `USD/shares`).
- `accn`: the accession number of the filing it came from.
- `fy`, `fp`, `form`, `filed`: describe **the filing**, not the fact. The FY2023 number appears with `fy: 2024` and `fy: 2025` because it was repeated in those years' 10-Ks. Grouping by `fy` is the most common mistake with this API.
- `frame`: present on only one fact per period, the one the SEC picked to represent that calendar period (`CY2023`) in the frames API. Apple's fiscal year ends in September, so its "CY2023" frame is the year that is closest to calendar 2023, not an exact match.

## Revenue tags change over time

Net income has been `NetIncomeLoss` for as long as XBRL has existed. Revenue has not. Companies have used, among others:

- `SalesRevenueNet`, common before 2018;
- `Revenues`, a general tag that some companies use throughout;
- `RevenueFromContractWithCustomerExcludingAssessedTax`, introduced with the ASC 606 revenue standard and used by most companies since around 2018.

To get a continuous series, query several tags and merge them, and choose a priority for periods that appear under more than one.

## The script

Save as `sec_facts.py`, and change the User-Agent to your own name and email:

```python
"""Annual revenue and net income from the SEC's XBRL company facts API."""
import sys
import time
from datetime import date

import pandas as pd
import requests

# The SEC asks automated clients to identify themselves: name plus a contact email.
HEADERS = {"User-Agent": "Example Research admin@example.com"}
REVENUE_TAGS = [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet",
]

session = requests.Session()
session.headers.update(HEADERS)
_last_request = 0.0


def get_json(url: str) -> dict:
    """GET with a simple throttle well under the SEC's 10 requests/second limit."""
    global _last_request
    wait = 0.2 - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()
    resp = session.get(url, timeout=30)
    resp.raise_for_status()
    return resp.json()


def ticker_to_cik(ticker: str) -> str:
    data = get_json("https://www.sec.gov/files/company_tickers.json")
    for row in data.values():
        if row["ticker"].upper() == ticker.upper():
            return f"{row['cik_str']:010d}"
    raise KeyError(f"unknown ticker {ticker}")


def annual_values(facts: dict, tags: list[str], unit: str = "USD", as_of: str = "9999-12-31") -> pd.DataFrame:
    """One row per fiscal year end, from 10-K full-year facts filed on or before `as_of`."""
    rows = []
    for priority, tag in enumerate(tags):
        concept = facts["facts"].get("us-gaap", {}).get(tag)
        if not concept:
            continue
        for f in concept["units"].get(unit, []):
            if f.get("form") not in ("10-K", "10-K/A") or "start" not in f or f["filed"] > as_of:
                continue
            days = (date.fromisoformat(f["end"]) - date.fromisoformat(f["start"])).days
            if not 350 <= days <= 380:          # skip quarters reported inside the 10-K
                continue
            rows.append({"end": f["end"], "value": f["val"], "tag": tag, "priority": priority,
                         "filed": f["filed"], "accn": f["accn"], "fy_of_filing": f["fy"]})
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    # The same period appears in up to three 10-Ks (and amendments). Prefer the first tag
    # in `tags`, then the most recent filing.
    df = df.sort_values(["end", "priority", "filed"], ascending=[True, True, False])
    return df.drop_duplicates("end").drop(columns="priority").reset_index(drop=True)


if __name__ == "__main__":
    ticker = sys.argv[1] if len(sys.argv) > 1 else "AAPL"
    cik = ticker_to_cik(ticker)
    facts = get_json(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
    print(facts["entityName"], "CIK", cik)

    as_of = sys.argv[2] if len(sys.argv) > 2 else date.today().isoformat()
    revenue = annual_values(facts, REVENUE_TAGS, as_of=as_of)
    income = annual_values(facts, ["NetIncomeLoss"], as_of=as_of)
    table = revenue[["end", "value", "tag"]].merge(
        income[["end", "value"]], on="end", how="left", suffixes=("_revenue", "_net_income"))
    table["margin"] = (table["value_net_income"] / table["value_revenue"]).round(3)
    with pd.option_context("display.width", 140, "display.max_columns", 10):
        print(table.to_string(index=False))
```

The deduplication works on what the fact *covers*, not on the filing metadata:

1. Keep only facts from annual reports (`10-K`, `10-K/A`) that have a `start` date.
2. Keep only periods of roughly one year (350 to 380 days, which allows for 52/53-week fiscal years). A 10-K can also contain fourth-quarter or other sub-year facts.
3. For each period `end`, keep one fact: the highest-priority tag, then the latest `filed`.

The `as_of` argument drops facts filed after a given date. That gives you the numbers as they were known on that day, which matters if you are testing anything against history: using today's restated numbers for a 2018 decision is a form of look-ahead.

## Running it

```bash
pip install requests pandas
python sec_facts.py AAPL 2026-06-25
```

```text
Apple Inc. CIK 0000320193
       end  value_revenue                                                 tag  value_net_income  margin
2007-09-29    24578000000                                     SalesRevenueNet        3495000000   0.142
2008-09-27    37491000000                                     SalesRevenueNet        6119000000   0.163
2009-09-26    42905000000                                     SalesRevenueNet        8235000000   0.192
2010-09-25    65225000000                                     SalesRevenueNet       14013000000   0.215
2011-09-24   108249000000                                     SalesRevenueNet       25922000000   0.239
2012-09-29   156508000000                                     SalesRevenueNet       41733000000   0.267
2013-09-28   170910000000                                     SalesRevenueNet       37037000000   0.217
2014-09-27   182795000000                                     SalesRevenueNet       39510000000   0.216
2015-09-26   233715000000                                     SalesRevenueNet       53394000000   0.228
2016-09-24   215639000000                                            Revenues       45687000000   0.212
2017-09-30   229234000000 RevenueFromContractWithCustomerExcludingAssessedTax       48351000000   0.211
2018-09-29   265595000000 RevenueFromContractWithCustomerExcludingAssessedTax       59531000000   0.224
2019-09-28   260174000000 RevenueFromContractWithCustomerExcludingAssessedTax       55256000000   0.212
2020-09-26   274515000000 RevenueFromContractWithCustomerExcludingAssessedTax       57411000000   0.209
2021-09-25   365817000000 RevenueFromContractWithCustomerExcludingAssessedTax       94680000000   0.259
2022-09-24   394328000000 RevenueFromContractWithCustomerExcludingAssessedTax       99803000000   0.253
2023-09-30   383285000000 RevenueFromContractWithCustomerExcludingAssessedTax       96995000000   0.253
2024-09-28   391035000000 RevenueFromContractWithCustomerExcludingAssessedTax       93736000000   0.240
2025-09-27   416161000000 RevenueFromContractWithCustomerExcludingAssessedTax      112010000000   0.269
```

The table shows all three revenue tags in use over Apple's history, and the merge produces one continuous series. The 2007 and 2008 rows come from comparative figures in the first XBRL 10-Ks, not from XBRL filings for those years.

## Restatements: which number is "right"?

"Latest filing wins" gives you the most recent version of each number, including restatements. That is usually what you want for analysis, but be aware of what it means. Microsoft, for example, adopted ASC 606 with full retrospective restatement. Its fiscal 2016 revenue was filed as 85,320,000,000 under `SalesRevenueNet` in 2016, and as 91,154,000,000 under `RevenueFromContractWithCustomerExcludingAssessedTax` in the 10-K filed in August 2018. Running the script for `MSFT` gives the restated value.

If you need "as originally reported", sort by `filed` ascending instead and keep the first fact per period, or use `as_of` to cut off at the date you care about.

## Quarterly data

Quarterly numbers come from 10-Qs, with two complications:

- 10-Qs report both the quarter and the year to date. Q2 income statement facts include a three-month fact and a six-month fact. Filter on a period length of about 91 days.
- There is no 10-Q for the fourth quarter. Q4 is the annual number minus the first three quarters, which you have to compute.

## Gotchas

- **Custom tags are missing.** Companies can define their own extension concepts, but these APIs only aggregate standard taxonomies such as `us-gaap`, `ifrs-full`, `dei` and `srt`. A number a company tagged with its own concept is only in the filing itself. Foreign private issuers filing under IFRS use `ifrs-full` tags, not `us-gaap`.
- **Signs and scale.** Values are in base units (dollars, not millions). Some concepts are reported as positive numbers even when they reduce income, so check the concept label.
- **Tickers change; CIKs don't.** Store the CIK, and refresh the ticker mapping from `company_tickers.json` when you need it.
- **Not every number is tagged.** Non-GAAP measures, segment details in the text, and anything a company describes only in prose are not in the API.
- **Be polite with volume.** For hundreds of companies, download the nightly `companyfacts.zip` once instead of making one request per company.

## Further reading

- [SEC: EDGAR application programming interfaces](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [SEC: accessing EDGAR data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)
- [SEC: webmaster FAQ, developer section](https://www.sec.gov/os/webmaster-faq#developers)
