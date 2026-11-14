---
title: Scraping 13F filings from SEC EDGAR with Python and secedgar
description: A small Python CLI that uses secedgar to list the institutional managers filing 13F reports for a quarter and download their filings from EDGAR.
alt: Applying nlp to various youtube videos
pubDate: Friday, 7 April 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["sec", "python", "secedgar", "investing"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/dalle-2022-12-10-21-55-07-magnifying-glass-on-stonks.webp'
imgAlt: 'rbc stock analyzer'
---

Public companies and large investors file reports with the US Securities and Exchange Commission (SEC), and all of them end up on EDGAR, the SEC's public filing system. The ones I care about here are 13F reports. Institutional investment managers with at least $100 million in 13(f) securities must file a Form 13F within 45 days after the end of each calendar quarter, listing their holdings. It's how you see what funds owned at the end of the last quarter.

[secedgar](https://github.com/sec-edgar/sec-edgar) is a Python package for downloading filings from EDGAR. Its `QuarterlyFilings` class reads EDGAR's quarterly index of every filing and lets you filter the entries before downloading anything. The examples below were written against secedgar 0.6.0.

```bash
pip install secedgar
```

## The script

The script has two modes: `get_list` writes the names of every manager that filed a 13F in a quarter to `companies_list.txt`, and `download_companies` downloads those filings into `filings/`.

```python
import argparse
import time
from functools import wraps

from secedgar import QuarterlyFilings


def time_it(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        print(f"Elapsed time: {time.time() - start:.1f} seconds for {func.__name__}")
        return result
    return wrapper


def is_13f(entry) -> bool:
    # Matches 13F-HR, 13F-NT and their amendments (13F-HR/A, ...)
    return entry.form_type.startswith("13F")


def make_quarterly(args) -> QuarterlyFilings:
    return QuarterlyFilings(
        year=args.year,
        quarter=args.quarter,
        user_agent=args.user_agent,
        entry_filter=is_13f,
        rate_limit=args.rate_limit,  # passed through to secedgar's NetworkClient, max 10
    )


@time_it
def fetch_filings(args) -> None:
    """Download every 13F filing in the quarter into ./filings."""
    make_quarterly(args).save("filings")


@time_it
def get_list(args) -> None:
    """Write the unique names of 13F filers for the quarter to companies_list.txt."""
    filings_dict = make_quarterly(args).get_filings_dict()
    names = {entry.company_name for entries in filings_dict.values() for entry in entries}
    if args.verbose:
        print(f"Found {len(names)} 13F filers")
    with open("companies_list.txt", "w") as f:
        for name in sorted(names):
            f.write(name + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="List or download 13F filings from EDGAR")
    parser.add_argument("--mode", "-m", choices=["get_list", "download_companies"], default="get_list")
    parser.add_argument("--year", "-y", type=int, default=2022)
    parser.add_argument("--quarter", "-q", type=int, choices=[1, 2, 3, 4], default=2)
    parser.add_argument("--user_agent", "-ua", required=True, help='e.g. "Your Name you@example.com"')
    parser.add_argument("--rate_limit", "-rl", type=int, default=5, help="requests per second, 1-10")
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    if args.mode == "get_list":
        get_list(args)
    else:
        fetch_filings(args)
```

Run it with:

```bash
python main.py --year 2022 --quarter 2 --user_agent "Your Name you@example.com"
```

## How it works

`QuarterlyFilings(year, quarter, ...)` points at EDGAR's full index for that quarter. `get_filings_dict()` downloads the index file and returns a dict keyed by CIK, where each value is a list of `FilingEntry` named tuples with `cik`, `company_name`, `form_type`, `date_filed`, `file_name`, `path` and `num_previously_valid` fields. The `entry_filter` function decides which entries are kept, so `is_13f` cuts the index down to 13F filings before anything else happens.

`save("filings")` uses the same filtered index to download each filing. Expect this to take a while: a quarter has thousands of 13F filings, and each is a separate request.

To track only some managers, extend the filter. For example, read a list of names from a file and return `True` only when `entry.company_name.lower()` is in it.

## Gotchas

- **User agent is required.** The SEC's [fair access policy](https://www.sec.gov/os/accessing-edgar-data) asks automated tools to declare a user agent with your name and email, and EDGAR blocks requests that don't. secedgar's docs say to pass `user_agent` or a client that already has one. Use your own details, not a placeholder.
- **Rate limit.** The SEC allows at most 10 requests per second. secedgar enforces this and raises an error if `rate_limit` is above 10.
- **`type=bool` in argparse doesn't work.** An earlier version of this script used `type=bool` for `--verbose`, which turns any non-empty string, including `"False"`, into `True`. Use `action="store_true"` instead.
- **13F covers only 13(f) securities**, mostly US-listed stocks and some options and convertibles. It doesn't show short positions, cash, or most non-US holdings, and it's up to 45 days stale by the time it's filed.

## References

- [FriendlyUser/13F-sec](https://github.com/FriendlyUser/13F-sec), the repo this script comes from
- [secedgar documentation](https://sec-edgar.github.io/sec-edgar/)
- [SEC: Frequently asked questions about Form 13F](https://www.sec.gov/rules-regulations/staff-guidance/division-investment-management-frequently-asked-questions/frequently-asked-questions-about-form-13f)
