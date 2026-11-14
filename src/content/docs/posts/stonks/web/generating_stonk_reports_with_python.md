---
tags: ['python', 'latex', 'openbb', 'stonks', 'pandas']
title: How I generate premarket stock reports with Python, PyLaTeX and Discord
description: My pipeline for premarket stock reports, pulling market events, Reddit posts and economic data into a PyLaTeX document and posting it to Discord.
pubDate: Mon, 20 March 2023
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1678591372-a-blade-in-the-desert-under-the-sun.webp"
---

:::caution
The economy tables come from a helper built on the OpenBB SDK v3 (`from openbb_terminal.sdk import openbb`). OpenBB has since replaced the SDK with the OpenBB Platform v4 (`from openbb import obb`), which has breaking changes: `source` became `provider`, and results come back as `OBBject` models rather than DataFrames. If you rebuild this, port that helper to the Platform. See the [OpenBB docs](https://docs.openbb.co/).
:::

Each morning before the US market opens, I generate a report that collects the day's scheduled market events, recent posts from investing subreddits and some economic data. The report is a LaTeX document built from Python and then sent to a Discord channel.

Regular US market hours are 9:30 AM to 4:00 PM Eastern. Premarket trading on ECNs can start as early as 4:00 AM, though many brokers open later. Volume is thin before the open, so premarket prices move a lot and don't always hold once regular trading starts. That makes it worth having the day's events in one place before the bell.

The full project is at [dli-invest/stonk_events](https://github.com/dli-invest/stonk_events).

## Building the report

`pylatex` assembles the document, and `DataFrame.to_latex` turns each pandas table into LaTeX. `split_tables`, `fetch_reddit_posts`, `parse_reddit_posts`, `make_dirs`, `escape_latex` and `openbb_economy` are helpers from my repo, not library functions.

```python
import datetime

import pylatex as pl

# project helpers from the stonk_events repo
from marketwatch import split_tables
from utils.openbb_data import openbb_economy
from utils.parse_reddit import fetch_reddit_posts, make_dirs, parse_reddit_posts
from utils.tex import escape_latex


def add_table(doc: pl.Document, tex_table: str, caption: str) -> None:
    with doc.create(pl.Table(position="htbp")) as table:
        table.add_caption(caption)
        table.append(pl.Command("centering"))
        table.append(pl.NoEscape(r"\begin{adjustbox}{width=1\textwidth}"))
        table.append(pl.NoEscape(tex_table))
        table.append(pl.NoEscape(r"\end{adjustbox}"))


def main():
    doc = pl.Document()
    doc.packages.append(pl.Package("booktabs"))
    doc.packages.append(pl.Package("adjustbox"))
    doc.packages.append(pl.Package("hyperref"))

    # Market events scraped from MarketWatch
    dfs, captions = split_tables()
    for df, caption in zip(dfs, captions):
        try:
            column_format = "l" + "c" * (len(df.columns) - 1)
            tex_table = df.to_latex(escape=True, index=False, column_format=column_format)
            add_table(doc, tex_table, caption)
        except Exception as e:
            print(e)

    # Reddit posts as a list of links
    reddit_posts = fetch_reddit_posts()
    if reddit_posts is not None and len(reddit_posts) > 0:
        df_posts = parse_reddit_posts(reddit_posts)
        with doc.create(pl.Itemize()) as itemize:
            for _, row in df_posts.iterrows():
                itemize.add_item(pl.NoEscape(
                    r"\href{" + escape_latex(row["url"]) + "}{" + escape_latex(row["title"]) + "}, "
                    + escape_latex(row["linkFlairText"])
                ))

    # Economy tables
    economy_dfs, file_names = openbb_economy()
    for df, name in zip(economy_dfs, file_names):
        add_table(doc, df.to_latex(escape=True, index=False), name)

    now = datetime.datetime.now()
    base_folder = f"data/reports/{now.strftime('%B')}"
    make_dirs(base_folder)
    doc.generate_tex(f"{base_folder}/report_{now.strftime('%Y_%m_%d')}_pre")
    doc.generate_tex("data/latest")


if __name__ == "__main__":
    main()
```

A few things that are easy to trip over:

- Since pandas 2.0, `to_latex` is implemented on top of `Styler` and needs `jinja2` installed.
- `adjustbox` scales wide tables down to the text width. Without it, the MarketWatch tables run off the page.
- `generate_tex` only writes `data/latest.tex`. To get the PDF that gets posted to Discord, compile it with `pdflatex`, or call `doc.generate_pdf("data/latest", clean_tex=False)`, which runs `latexmk` or `pdflatex` for you. Either way you need a TeX distribution installed.

## Pulling Reddit posts

The Reddit data comes from my Go project [finreddit](https://github.com/dli-invest/finreddit), which I wrote about in [scraping comments from Reddit](/posts/stonks/web/scrapping_comments_from_reddit/). Python shells out to it and reads the tab-separated output into a DataFrame:

```python
import datetime
import os
import subprocess
from io import StringIO

import pandas as pd


def fetch_reddit_posts() -> pd.DataFrame | None:
    try:
        output = subprocess.run(
            ["go", "run", "main.go"],
            cwd="tools/reddit",
            capture_output=True,
            text=True,
            check=True,
        )
        return pd.read_csv(StringIO(output.stdout), sep="\t", on_bad_lines="warn")
    except Exception as e:
        print("FAILING TO PARSE ARTICLES")
        print(e)
        return None


def make_dirs(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def parse_reddit_posts(df: pd.DataFrame) -> pd.DataFrame:
    """Save the posts to data/reddit/<Month>/<YYYY_MM_DD>_pre.csv and return them."""
    now = datetime.datetime.now()
    base_folder = f"data/reddit/{now.strftime('%B')}"
    make_dirs(base_folder)
    df.to_csv(f"{base_folder}/{now.strftime('%Y_%m_%d')}_pre.csv", index=False)
    return df


if __name__ == "__main__":
    df = fetch_reddit_posts()
    if df is not None and len(df) > 0:
        parse_reddit_posts(df)
```

`check=True` matters here: without it, a failed `go run` returns an empty stdout, and the error shows up later as a confusing pandas parse error instead of the Go compiler or runtime message.

The Go side is just a call into finreddit, which reads the list of subreddits to scan from a YAML file:

```go
package main

import "github.com/dli-invest/finreddit/pkg/reddit"

func main() {
	reddit.ScanSRs("investing.yml")
}
```

`ScanSRs` doesn't return an error, so a missing config file or bad Reddit credentials only show up in the program's own output. finreddit authenticates with Reddit's OAuth API, so you need your own Reddit app credentials to run it.

## Sending the report to Discord

The last step posts the PDF to a Discord channel through a webhook. The webhook URL comes from the `DISCORD_WEBHOOK` environment variable:

```python
import argparse
import os

import requests


def send_file(path: str, content: str = "MarketWatch Report", username: str = "Marketwatch") -> None:
    """Upload a file to Discord through a webhook."""
    url = os.environ["DISCORD_WEBHOOK"]
    with open(path, "rb") as f:
        resp = requests.post(
            url,
            files={"file": f},
            data={"username": username, "content": content},
            timeout=30,
        )
    resp.raise_for_status()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", default="latest.pdf")
    parser.add_argument("--content", default="MarketWatch Report")
    parser.add_argument("--username", default="Marketwatch")
    args = parser.parse_args()
    send_file(args.path, args.content, args.username)
```

Discord caps attachment size per message (the limit depends on the server's boost level), so a report with many tables or images can be rejected. `raise_for_status()` makes that failure visible instead of silently doing nothing.

## References

- [dli-invest/stonk_events](https://github.com/dli-invest/stonk_events)
- [Scraping comments from Reddit](/posts/stonks/web/scrapping_comments_from_reddit/)
- [Simple Deta micro service to view uploaded files](/posts/tech/python/simple_deta_micro_service_to_view_uploaded_files/)
- [PyLaTeX documentation](https://jeltef.github.io/PyLaTeX/current/)
- [Discord webhook docs](https://discord.com/developers/docs/resources/webhook#execute-webhook)
