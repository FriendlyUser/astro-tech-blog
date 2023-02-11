---
tags: ['python', 'latex', 'openbb']
title: How I generate stock reports with python and latex
description: Generating premarket and postmarket reports with python and latex
pubDate: Mon, 20 Feburary 2023
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1678591372_a_blade_in_the_desert_under_the_sun.png"
---

Premarket refers to the trading activity that occurs before the regular market hours. In the United States, the regular market hours are 9:30 AM to 4:00 PM Eastern Time. The premarket session usually starts at 4:00 AM Eastern Time and ends at 9:30 AM Eastern Time. During the premarket session, investors can trade stocks through electronic communication networks (ECNs) that are open for trading.

The premarket session provides an opportunity for investors to trade stocks ahead of important market-moving events such as earnings releases or economic data releases. The trading volume and liquidity during the premarket session are usually lower compared to the regular market hours, so investors should be aware that the prices may be more volatile and less accurate.

It's worth noting that not all stocks are available for trading during the premarket session, and the prices quoted during this time may not necessarily be indicative of the prices that will be available during the regular market hours.


```python 
 import sys

# all tex related stuff is in src/tex.py
import numpy as np
import pylatex as pl
import pandas as pd
import datetime
from marketwatch import split_tables
from utils.parse_reddit import fetch_reddit_posts, parse_reddit_posts, make_dirs
from utils.tex import escape_latex
from utils.openbb_data import openbb_economy

def main():

    doc = pl.Document()

    doc.packages.append(pl.Package('booktabs'))
    doc.packages.append(pl.Package('adjustbox'))
    doc.packages.append(pl.Package("hyperref"))

    dfs, captions = split_tables()
    # MARKET EVENTS
    for index, df in enumerate(dfs):
        # only add these ta
        try:
            column_format = 'l' + 'c' * (len(df.columns) - 1)
            tex_table = df.to_latex(escape=True, index=False, column_format=column_format)
            with doc.create(pl.Table(position='htbp')) as table:
                table.add_caption(captions[index])
                table.append(pl.Command('centering'))
                doc.append(pl.NoEscape(r'\begin{adjustbox}{width=1\textwidth}'))
                table.append(pl.NoEscape(tex_table))
                doc.append(pl.NoEscape(r'\end{adjustbox}'))
        except Exception as e:
            print(e)
    # PULL REDDIT DATA
    # TODO integrate custom commands
    # eventually https://jeltef.github.io/PyLaTeX/current/examples/own_commands_ex.html
    reddit_posts = fetch_reddit_posts()
    # eventually do a md framed component per post
    if reddit_posts is not None and len(reddit_posts) > 0:
        df_posts = parse_reddit_posts(reddit_posts)
        # add reddit post to tex report
        with doc.create(pl.Itemize()) as itemize:
            for index, row in df_posts.iterrows():
                itemize.add_item(pl.NoEscape(r"\href{" + escape_latex(row['url']) + r"}{" + escape_latex(row['title']) + r"}," + escape_latex(row["linkFlairText"])))

    economy_dfs, file_names = openbb_economy()
    for index, df in enumerate(economy_dfs):
        tex_table = df.to_latex(escape=True, index=False)
        with doc.create(pl.Table(position='htbp')) as table:
            table.add_caption(file_names[index])
            table.append(pl.Command('centering'))
            doc.append(pl.NoEscape(r'\begin{adjustbox}{width=1\textwidth}'))
            table.append(pl.NoEscape(tex_table))
            doc.append(pl.NoEscape(r'\end{adjustbox}'))
    # make images
    # make dirs files
    curr_month = datetime.datetime.now().strftime("%B")
    base_folder = f"data/reports/{curr_month}"
    make_dirs(base_folder)
    output_path = f"{base_folder}/report_{datetime.datetime.now().strftime('%Y_%m_%d')}_pre"
    doc.generate_tex(output_path)
    doc.generate_tex("data/latest")

if __name__ == '__main__':
    main()
 
 ```

This code is a script for generating a LaTeX report on stock market data. The report includes information about market events and economy, as well as data from Reddit posts. The script makes use of several imported modules and functions, including:

* `numpy` and `pandas` for numerical and data manipulation, respectively.
* `pylatex` to generate a LaTeX report.
* `split_tables` from `marketwatch` to obtain data on market events.
* `fetch_reddit_posts` and `parse_reddit_posts` from `parse_reddit` to fetch and parse data from Reddit posts.
* `make_dirs` from `utils.parse_reddit` to create necessary directories.
* `openbb_economy` from `openbb_data` to obtain data on the economy.

The code first creates a LaTeX document and adds some necessary packages for formatting. It then retrieves data on market events and economy and formats it into LaTeX tables, which are added to the report. The code also fetches and parses data from Reddit posts and adds it to the report as a list. Finally, the code generates the LaTeX report and saves it to a file.


The fetch_reddit command calls a function from my finreddit project available on github at [finreddit](https://github.com/dli-invest/finreddit) and the corresponding article is at [scrapping comments from reddit](https://friendlyuser.github.io/posts/stonks/web/scrapping_comments_from_reddit/)
```python 
 # parse reddit data resulting from subprocess into pandas dataframe
import pandas as pd
import subprocess
import datetime
import os
from io import StringIO

def fetch_reddit_posts():
    try:
        output = subprocess.run("go run main.go", shell=True, cwd="tools/reddit", capture_output=True)
        raw_text = output.stdout.decode("utf-8")
        # read raw text in csv format in pandas df
        csvStringIO = StringIO(raw_text)
        print(raw_text)
        df = pd.read_csv(csvStringIO, sep="\t", on_bad_lines='warn')
        return df
    except Exception as e:
        print("FAILING TO PARSE ARTICLES")
        print(e)
        return None

def make_dirs(path: str) -> None:
    if not os.path.exists(path):
        os.makedirs(path)

def parse_reddit_posts(df: pd.DataFrame)-> None:
    # get curr month from curr date
    curr_month = datetime.datetime.now().strftime("%B")
    base_folder = f"data/reddit/{curr_month}"
    make_dirs(base_folder)
    # date in YYYY_MM_DD format plus - pre/post
    file_name = f"{datetime.datetime.now().strftime('%Y_%m_%d')}_pre.csv"
    # make folder for reddit data
    csv_path = f"{base_folder}/{file_name}"
    df.to_csv(csv_path, index=False)
    return df

def main():
    df = fetch_reddit_posts()
    if df is not None and len(df) > 0:
        parse_reddit_posts(df)

if __name__ == '__main__':
    main()
 
 ```

This code appears to scrape Reddit data using the `go run main.go` command, which is run via a subprocess in Python. The data is then processed and saved as a CSV file in a specified directory.

The `fetch_reddit_posts` function runs the `go run main.go` command using the `subprocess.run` method, captures the output of the command, and decodes it into a string. The string is then passed as an argument to the `pd.read_csv` function and saved as a pandas DataFrame.

The `make_dirs` function creates a new directory if it doesn't already exist. The `parse_reddit_posts` function formats the current date and uses it to create a directory path to store the data, along with a filename based on the date and the string "pre" or "post." The resulting DataFrame is then saved to a CSV file in the specified location.

The `main` function calls the `fetch_reddit_posts` function, checks if the returned DataFrame is not `None` and has a length greater than 0, and if so, calls the `parse_reddit_posts` function and passes the DataFrame to it as an argument.

Finally, the code sets up an `if __name__ == '__main__':` block, which calls the `main` function when the code is run as a standalone script.


```python 
 package main

import (
	// "os"

	"github.com/dli-invest/finreddit/pkg/reddit"
)

func main() {
	reddit.ScanSRs("investing.yml")
	// argsWithProg := os.Args
	// if len(argsWithProg) > 1 {
	// 	reddit.ScanSRs(argsWithProg[1])
	// } else {
	// 	panic("No arguments passed in")
	// }

}
 
 ```

This is the Go code for the main function of a Reddit scrapper tool. The function calls the `ScanSRs` method from the `reddit` package, passing the file name "investing.yml" as an argument. The `ScanSRs` method takes a file name as an argument, which specifies the subreddit names to be scanned. The function does not provide any error handling in case the file does not exist, which may cause the application to panic. A possible improvement would be to add error handling to handle cases where the file does not exist, or the file name argument is missing.


Generating stock reports is important for several reasons:

1. Monitoring performance: Stock reports provide a comprehensive view of a company's financial performance and help to track its progress over time. They can help investors make informed decisions about whether to buy, sell, or hold a stock.
2. Compliance: Publicly traded companies are required to file regular reports with regulatory bodies such as the Securities and Exchange Commission (SEC). These reports provide transparency and accountability to the public and help to ensure compliance with financial reporting regulations.
3. Investors: Stock reports provide investors with key financial information, including revenue, expenses, profits, and cash flow. They can use this information to make informed investment decisions and evaluate the financial health of a company.
4. Management: Stock reports can also help management to identify areas of the business that need improvement and track the company's progress towards achieving its goals. They can be used as a tool for planning and decision-making, and to measure the success of strategies and initiatives.

Overall, generating stock reports is an important aspect of financial reporting that provides valuable information to investors, management, and regulators.


```python 
 import os 
import requests
import argparse


def send_file(path: str, content = "MarketWatch Report", username="Marketwatch") -> None:
    """ send discord file from path to discord using requests"""
    url = os.getenv("DISCORD_WEBHOOK")
    files = {'file': open(path, 'rb')}
    data = {
        "username": username,
        "content": content,
    }
    requests.post(url, files=files, data=data)

    

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", type=str, required=False, default="latest.pdf")
    parser.add_argument("--content", type=str, required=False, default="MarketWatch Report")
    parser.add_argument("--username", type=str, required=False, default="Marketwatch")
    args = parser.parse_args()
    send_file(args.path, args.content, args.username) 
 ```

This script sends a file located at `path` to a Discord channel using a Discord webhook URL. The webhook URL is retrieved from an environment variable named "DISCORD\_WEBHOOK". The script also accepts optional arguments for the file's content and the Discord username to display when sending the file. The file is sent using a `POST` request to the Discord webhook URL with the file and the content and username data in the request body.

## References
- https://github.com/dli-invest/stonk_events
- https://friendlyuser.github.io/posts/stonks/web/scrapping_comments_from_reddit/
- https://friendlyuser.github.io/posts/tech/python/simple_deta_micro_service_to_view_uploaded_files
