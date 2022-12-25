---
title: Building
description: sec filings with python and secedgar
alt: Applying nlp to various youtube videos
pubDate: Friday, 7 April 2023 13:00:00 GMT
tags: ["sec", "python", "secedgar"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-10 21.55.07 - magnifying glass on stonks.png'
imgAlt: 'rbc stock analyzer'
---

View the previous post at https://friendlyuser.github.io/posts/stonks/scrap_from_sec_with_python


This code fetches 13F filings for a list of companies from the Securities and Exchange Commission's (SEC) Electronic Data Gathering, Analysis, and Retrieval (EDGAR) system. 13F filings are quarterly reports that detail the holdings of investment managers with at least $100 million in assets. The filings function from the secedgar library is used to retrieve these 13F filings, and the get_company_of_interest function acts as a filter to only return the 13F filings for the companies specified in the company_list variable. This list is read from the holdings_list.txt file. The fetch_filings function uses the save method of the combo_filings object to save the retrieved 13F filings to the temp folder. The get_year_quarter_from_path function extracts the year and quarter from the path of a file and returns them as a tuple of strings.

```python
from secedgar import filings, FilingType
from datetime import date
import glob
import matplotlib.pyplot as plt
import seaborn as sns
import re
import pandas as pd
import json
from typing import List
from parser import DocParser

# read company list from holdings_list.txt
with open("holdings_list.txt", "r") as f:
    holdings_list = f.read().splitlines()

company_list = holdings_list

def get_company_of_interest(filing_entry):
    if "13F" in filing_entry.form_type and filing_entry.company_name.lower() in (name.lower() for name in company_list):
        company_list.append(filing_entry.company_name)
        return True
    return False

def fetch_filings():
    # 13F filings for Apple (ticker "aapl")
    # read list from holdings_list.txt
    combo_filings = filings(start_date=date(2022, 1, 1),
                             end_date=date(2022, 12, 20),
                             # filing_type=FilingType.FILING_13F,
                             user_agent="Your name <dlcoding20@gmail.com>",
                             entry_filter=get_company_of_interest,
                             rate_limit=5
    )
    # map folder to year and quarter
    combo_filings.save("temp")


def get_year_quarter_from_path(path: str):
    """ Get year and quarter from path
    """
    # get all numbers from path using regex
    year, quarter = re.findall(r'\d+', path)[0:2]
    return year, quarter
```

This code appears to be parsing 13F filing documents and outputting the results to a file in markdown format. The parse_filings function takes a dictionary of data (data) as input and retrieves a company's CIK number (a unique identifier assigned by the SEC to publicly traded companies) from the cik field in the data dictionary. If the cik field is not present, it defaults to "1649339". It also retrieves the desired output filename from the filename field in the data dictionary, defaulting to "burry" if the field is not present. The function then uses the glob library to find all the text files under the temp folder that match the specified CIK number and stores their filenames in the filename variable. It uses the DocParser class to parse each file and filters the resulting documents for those of type "INFORMATION_TABLE". It then adds the year and quarter of each document to its data frame and stores the resulting document in the final_docs list. If the final_docs list has four elements, the loop breaks. Finally, the function sorts the elements of final_docs by quarter and calls the output_to_md function to output the data to a markdown file. The metadata dictionary stores some metadata about the 13F filing that is included in the output file.

```python

def parse_filings(data: dict = {}):
    """ Parse filings
    """
    cik = data.get("cik", "1649339")
    output_name = data.get("filename", "burry")
    # find files under temp/2022/QTR{1,2,3,4}/*.txt with glob
    final_docs = []
    for filename in glob.iglob(f'temp/2022/QTR*/{cik}/*.txt', recursive=True):
        documents = DocParser(filename, "13F").parse()
        # filter for INFORMATION_TABLE
        for document in documents:
            if document["type"] == "INFORMATION_TABLE":
                document["filename"] = filename
                # add year and quarter to document
                year, quarter = get_year_quarter_from_path(filename)
                temp_df = document["df"]
                # add year quarter to df
                temp_df["year"] = year
                temp_df["quarter"] = quarter
                final_docs.append(document)

        if len(final_docs) == 4:
            break


    # sort by quarter
    final_docs = sorted(final_docs, key=lambda x: x["df"]["quarter"].iloc[0])
    
    metadata ={
        "filename": f"{output_name}.md",
        "company_name": data.get("outputLabel", "Burry"),
        "category": "13F",
        "date": "2022-12-21",
        "start_date": "2022-01-01",
        "end_date": "2022-12-20",
        "cik": cik,
    }
    # eventually parse all this from a metadata yaml file or json file
    output_to_md(final_docs, metadata)
```


This code appears to be processing and outputting data from 13F filing documents. The output_to_md function takes a list of data frames (final_docs) and a dictionary of metadata (metadata) as input. It first combines all the data frames in final_docs into a single data frame called combined_df. It then groups combined_df by the cusip column and stores the resulting data frame in grouped_df. It then extracts the last two quarters of data from final_docs and stores them in a data frame called last_two_quarters. It then converts the value column in last_two_quarters to numeric values and pivots the data frame by nameOfIssuer and quarter, storing the resulting data frame in pivot_df. It then plots pivot_df as a bar chart and saves the chart to a file. It then merges the last two quarters of data from final_docs using the pd.merge function and stores the resulting data frame in last_two_quarter_diff.

The function then opens a file with the name specified in the filename field of the metadata dictionary and writes some metadata and the pivoted data frame to it in markdown format. It also writes the data from each data frame in final_docs to the file, grouped by cusip. Finally, it writes the merged data frame (last_two_quarter_diff) to the file in markdown format.

```python

def output_to_md(final_docs: List[pd.DataFrame], metadata: dict):
    """ Output dataframe to markdown file
    """

    combined_df = None
    # iterate across final_docs and append them all
    for doc in final_docs:
        if combined_df is None:
            combined_df = doc["df"]
        else:
            # pandas.concat
            combined_df = pd.concat([combined_df, doc["df"]])

    # combine df then group by cusip
    grouped_df = combined_df.groupby("cusip")

    # get 2nd last element in list
    last_quarter = final_docs[-2]
    current_quarter = final_docs[-1]

    filename = metadata["filename"]

    csv_filename = filename.replace(".md", ".csv")
    # write to csv
    combined_df.to_csv(csv_filename, index=False)
    merge_df = pd.merge(last_quarter["df"], current_quarter["df"], how="outer") 


    # quarterly_df = combined_df.groupby("quarter")
    # append last two quarters
    last_two_quarters = pd.concat([last_quarter["df"], current_quarter["df"]])
    last_two_quarters = last_two_quarters[["quarter", "nameOfIssuer", "value"]]
    # plot ax grouped by quarter
    # make value numeric
    # use .loc[row_indexer, col_indexer]
    last_two_quarters.loc[:, "value"] = pd.to_numeric(last_two_quarters["value"])
    png_filename = filename.replace(".md", ".png")

    # make pivot table
    pivot_df = last_two_quarters.pivot(index="nameOfIssuer", columns="quarter", values="value")
    # plot pivot table
    # first color red, second color blue
    ax = pivot_df.plot(kind="bar", color=["blue", "green"])
    # make image big enough for labels
    ax.figure.savefig(png_filename, bbox_inches="tight")

    # quarter diff combined
    last_two_quarter_diff = pd.merge(last_quarter["df"], current_quarter["df"], how="outer", indicator=True)
    with open(filename, "w") as f:
        f.write(f"Title: {metadata['company_name']} - {metadata['cik']} \n")
        f.write(f"Date: {metadata['date']} \n")
        f.write(f"Category: {metadata['category']} \n")
        # merge df
        f.write("## Quarterly holdings \n\n")

        # write png_filename
        f.write(f"![quarterly holdings]({{attach}}images/{png_filename}) \n\n")

        f.write("uses last two quarters to compare \n\n")


        f.write(f"## All tables \n\n")
        # write all tables
        reduced_df = combined_df[["nameOfIssuer", "value", "sshPrnamt", "sshPrnamtType",  "year", "quarter"]]
        # if combined_df has putCall column
        if "putCall" in combined_df.columns:
            reduced_df["putCall"] = combined_df["putCall"]
        f.write(reduced_df.to_markdown(index=False))

        f.write("\n\n")
        # write header
        f.write("## Tables by cusip \n\n")
        for cusip, group in grouped_df:
            f.write("\n \n")
            f.write(f"### {cusip} \n\n")
            simple_group = group[["nameOfIssuer", "value", "sshPrnamt", "sshPrnamtType", "year", "quarter"]]
            if "putCall" in group.columns:
                simple_group["putCall"] = group["putCall"]
            f.write(simple_group.to_markdown(index=False))
            f.write("\n \n")

        f.write("\n\n")
```

To view the sample output, please go to the following link:

13F.grandfleet.eu.org

It is generated by pelican, a static site generator written in python. The source code for the site is available at the following link:

https://github.com/FriendlyUser/13F-sec

Pelican is a static site generator written in Python. It is used to generate static HTML files for a website from templates and content written in a markup language such as Markdown or reStructuredText. Pelican is designed to be flexible, allowing users to customize the look and feel of their website and to extend its functionality through plugins. It also integrates with popular tools such as Jinja2 templates and the Pygments syntax highlighter. Pelican is a popular choice for bloggers, documentation authors, and other users who want to create a simple, fast-loading website without the need for a dynamic backend.