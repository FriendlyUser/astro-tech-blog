---
title: Building a markdown report from 13F filings with Python and secedgar
description: "Download a year of 13F-HR filings from SEC EDGAR with secedgar, parse the holdings tables with pandas, and write a markdown report with a chart for Pelican."
alt: Applying nlp to various youtube videos
pubDate: Friday, 14 April 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["sec", "python", "secedgar", "investing"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-10 21.55.07 - magnifying glass on stonks.png'
imgAlt: 'rbc stock analyzer'
---

This follows on from [scraping SEC filings with Python](/posts/stonks/web/scrap_from_sec_with_python/). That post downloaded filings; this one turns a year of 13F filings into a markdown report, a CSV and a bar chart that a static site can publish.

A 13F is a quarterly report that institutional investment managers with at least $100 million in 13(f) securities file with the SEC within 45 days of the end of each quarter. It lists their long US equity positions, plus listed options. The code is from my [13F-sec repo](https://github.com/FriendlyUser/13F-sec); `DocParser` lives in that repo's `parser.py`. It was written against secedgar 0.5 in late 2022; the current release is 0.6.0, and it needs Python 3.10+ for the `dict | None` hint.

## Fetching the filings

`secedgar.filings()` with a date range and no CIK walks EDGAR's quarterly indexes and downloads every filing that passes `entry_filter`. The filter receives a `FilingEntry` with `cik`, `company_name`, `form_type`, `date_filed` and a few other fields. Here it keeps 13F holdings reports from managers listed in `holdings_list.txt`, one name per line, spelled as EDGAR spells them.

```python
import glob
import re
from datetime import date
from typing import List

import pandas as pd
from secedgar import filings

from parser import DocParser  # parser.py from the 13F-sec repo

with open("holdings_list.txt") as f:
    company_list = {name.strip().lower() for name in f if name.strip()}


def get_company_of_interest(filing_entry) -> bool:
    """Keep 13F-HR and 13F-HR/A filings from the managers in holdings_list.txt."""
    return (
        filing_entry.form_type.upper().startswith("13F-HR")
        and filing_entry.company_name.lower() in company_list
    )


def fetch_filings():
    combo_filings = filings(
        start_date=date(2022, 1, 1),
        end_date=date(2022, 12, 20),
        user_agent="Your Name (you@example.com)",  # the SEC requires a contact
        entry_filter=get_company_of_interest,
        rate_limit=5,  # requests per second; the SEC allows up to 10
    )
    # saves to temp/{year}/QTR{quarter}/{cik}/{accession_number}.txt
    combo_filings.save("temp")


def get_year_quarter_from_path(path: str):
    """'temp/2022/QTR3/1649339/...' -> ('2022', '3')"""
    year, quarter = re.findall(r"\d+", path)[0:2]
    return year, quarter
```

The filter checks for `13F-HR` rather than any form containing `13F`, because a `13F-NT` notice has no holdings table to parse.

## Parsing the holdings tables

`parse_filings` finds the downloaded files for one CIK, parses each with `DocParser`, and keeps the `INFORMATION_TABLE` document, which holds the positions as a DataFrame. The default CIK, 1649339, is Michael Burry's Scion Asset Management.

```python
def parse_filings(data: dict | None = None):
    data = data or {}
    cik = data.get("cik", "1649339")
    output_name = data.get("filename", "burry")

    final_docs = []
    for filename in glob.iglob(f"temp/2022/QTR*/{cik}/*.txt"):
        for document in DocParser(filename, "13F").parse():
            if document["type"] == "INFORMATION_TABLE":
                year, quarter = get_year_quarter_from_path(filename)
                document["filename"] = filename
                document["df"]["year"] = year
                document["df"]["quarter"] = quarter
                final_docs.append(document)
        if len(final_docs) == 4:
            break

    final_docs = sorted(final_docs, key=lambda d: d["df"]["quarter"].iloc[0])

    metadata = {
        "filename": f"{output_name}.md",
        "company_name": data.get("outputLabel", "Burry"),
        "category": "13F",
        "date": "2022-12-21",
        "start_date": "2022-01-01",
        "end_date": "2022-12-20",
        "cik": cik,
    }
    output_to_md(final_docs, metadata)
```

## Writing the report

`output_to_md` writes three files: a CSV of every position, a bar chart comparing the last two quarters, and a markdown page with Pelican metadata at the top, one table of all holdings and one table per CUSIP.

```python
def output_to_md(final_docs: List[dict], metadata: dict):
    """Write a CSV, a PNG chart and a Pelican markdown page."""
    filename = metadata["filename"]
    png_filename = filename.replace(".md", ".png")

    combined_df = pd.concat([doc["df"] for doc in final_docs], ignore_index=True)
    combined_df.to_csv(filename.replace(".md", ".csv"), index=False)

    # Chart the last two quarters. An issuer can appear on several rows
    # (share classes, puts, calls), so sum them per quarter.
    last_two = pd.concat([final_docs[-2]["df"], final_docs[-1]["df"]])
    last_two = last_two[["quarter", "nameOfIssuer", "value"]].assign(
        value=lambda d: pd.to_numeric(d["value"])
    )
    pivot_df = last_two.pivot_table(
        index="nameOfIssuer", columns="quarter", values="value", aggfunc="sum"
    )
    ax = pivot_df.plot(kind="bar", color=["blue", "green"])
    ax.figure.savefig(png_filename, bbox_inches="tight")

    cols = ["nameOfIssuer", "value", "sshPrnamt", "sshPrnamtType", "year", "quarter"]
    if "putCall" in combined_df.columns:
        cols.append("putCall")

    with open(filename, "w") as f:
        f.write(f"Title: {metadata['company_name']} - {metadata['cik']}\n")
        f.write(f"Date: {metadata['date']}\n")
        f.write(f"Category: {metadata['category']}\n\n")
        f.write("## Quarterly holdings\n\n")
        # {attach} is Pelican's syntax for a file linked relative to the post
        f.write(f"![quarterly holdings]({{attach}}images/{png_filename})\n\n")
        f.write("Uses the last two quarters to compare.\n\n")
        f.write("## All tables\n\n")
        f.write(combined_df[cols].to_markdown(index=False))
        f.write("\n\n## Tables by cusip\n\n")
        for cusip, group in combined_df.groupby("cusip"):
            f.write(f"### {cusip}\n\n")
            f.write(group[cols].to_markdown(index=False))
            f.write("\n\n")
```

Dependencies: `pip install secedgar pandas matplotlib tabulate`. pandas needs matplotlib for `.plot()` and tabulate for `.to_markdown()`.

Changes from the first version of this code:

- `pivot` raised `ValueError: Index contains duplicate entries` when a manager held both shares and options in the same issuer. `pivot_table(..., aggfunc="sum")` handles it.
- The filter used to append every match back onto `company_list`, which grew the list on each call for no benefit. It's a set lookup now.
- Two `pd.merge` calls built a quarter-over-quarter diff that was never written to the report. They merged on every column, including `quarter`, so no rows would ever have matched anyway. I removed them.
- Adding `putCall` to a column slice triggered pandas' `SettingWithCopyWarning`. Choosing the columns up front avoids it.

## Gotchas

- **Filing quarter is not the holdings quarter.** secedgar files by the quarter the 13F was *filed*. `temp/2022/QTR1` holds the reports for holdings as of 31 December 2021, so the `quarter` column is one quarter behind the period it describes.
- **Units changed in 2023.** Until 3 January 2023, the `value` column was reported in thousands of dollars. Filings made since then report whole dollars. All the filings above were made in 2022, so they're in thousands, but mixing 2022 and 2023 filings needs a ×1000 correction on the older ones.
- **13Fs are delayed and partial.** They show positions up to 45 days old and long positions only. Short sales aren't reported; puts show up as long option positions, valued at the underlying shares rather than what the options cost.

## Sample output

The output is published at [13f.grandfleet.eu.org](https://13f.grandfleet.eu.org), built with [Pelican](https://getpelican.com/), a Python static site generator that turns markdown with a metadata header into HTML. The site's source is in the `website/` folder of [FriendlyUser/13F-sec](https://github.com/FriendlyUser/13F-sec).

## Further reading

- [secedgar documentation](https://sec-edgar.github.io/sec-edgar/)
- [SEC Form 13F FAQ](https://www.sec.gov/divisions/investment/13ffaq)
