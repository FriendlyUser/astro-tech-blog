---
tags: ['python', 'indeed', 'pandas', 'selenium']
title: Scraping Indeed job listings with BeautifulSoup and pandas (no longer works)
description: My old Indeed scraper, which pulled job listings into pandas, tagged skills and degrees with regex, and emailed charts via Mailjet, until Cloudflare blocked it.
pubDate: Mon, 25 October 2023
lastUpdated: 2026-11-14
imgSrc: "/imgs/2023/2378351187.webp"
---
:::caution
These scripts no longer work. Indeed now sits behind Cloudflare's bot protection, which challenges plain HTTP requests, and the HTML class names used below (`searchCount`, `row`, `company`, `location`) have changed since 2021. The code is kept as a record of the project, which I have since open sourced.
:::

Back in 2021 I wrote a small scraper that searched Indeed for jobs in Victoria, BC, pulled each posting, counted which skills, degrees and keywords showed up, and emailed me a report with a couple of charts. Once Indeed added Cloudflare protection, the requests started getting a human-verification page instead of results.

The code below has three parts: fetching the listings, analysing each posting, and sending the email. `get_xml`, `largest_number` and `get_config` come from the project's own `scrapper` package (`get_xml` downloads a URL and returns a `BeautifulSoup` object).

## Fetching the job listings

`get_num_jobs` reads the job count shown above the search results to work out how many result pages there are (Indeed showed 10 jobs per page). `get_jobs_data` then walks through each page and collects the title, company, location and link of every job card.

```python
import math

import bs4
import pandas as pd

from scrapper.fetch_data import get_xml
from scrapper.util import largest_number


def get_num_jobs(url_indeed) -> int:
    indeed_data = get_xml(url_indeed)
    job_string = indeed_data.find("div", {"id": "searchCount"})
    job_number_str = ""
    for item in job_string.contents[0:3]:
        if isinstance(item, bs4.element.Tag):
            job_number_str += item.get_text()
    if job_number_str.split()[-1] != "jobs":
        raise ValueError(f"Expected a job count, got {job_number_str!r}")
    total_jobs = float(largest_number(job_number_str))
    return int(math.ceil(total_jobs / 10.0))


# TODO Get a config file
def get_jobs_data(url_indeed, num_pages, default_location="Victoria, BC"):
    base_url = "https://ca.indeed.com"
    rows = []
    for i in range(num_pages):
        # Indeed pages are offset by 10: start=0, 10, 20, ...
        url = f"{url_indeed}&start={i * 10}"
        print(url)
        soup = get_xml(url)
        job_divs = [d for d in soup.find_all("div") if "row" in (d.get("class") or [])]

        for job in job_divs:
            try:
                job_id = job["data-jk"]
                link = f"{base_url}/rc/clk?jk={job_id}"
                title = job.find("a", attrs={"data-tn-element": "jobTitle"})["title"]
                company = job.find("span", {"class": "company"})
                company = company.text.strip() if company else None
                location = job.find("span", {"class": "location"})
                location = location.text.strip() if location else default_location
            except (KeyError, TypeError) as e:
                print(f"Skipping job card: {e}")
                continue

            rows.append({
                "job_title": title,
                "job_company": company,
                "job_location": location,
                "job_link": link,
            })

    job_df_indeed = pd.DataFrame(
        rows, columns=["job_title", "job_company", "job_location", "job_link"]
    )
    # the same job can appear on more than one page
    return job_df_indeed.drop_duplicates(["job_link"], keep="first")
```

The original version built the DataFrame with `DataFrame.append` in the loop. That method was removed in pandas 2.0, so the code above collects plain dicts and builds the DataFrame once at the end, which is also much faster. It also fixes an off-by-one: the old loop started at `start=10`, so it skipped the first page of results.

## Tagging skills, degrees and keywords

For each job link, `process_jobs` downloads the posting, strips scripts and styles, lowercases and cleans the text, then looks for whole-word matches against hardcoded lists. Each list maps lowercase matches back to a canonical name, so "full time" and "full-time" both count as `Full-Time`.

```python
import re

from scrapper.fetch_data import get_xml


def make_map(raw, canonical=None):
    """Map lowercase search terms to the label we want to report."""
    canonical = canonical or raw
    return {r.lower(): c for r, c in zip(raw, canonical)}


# Get an analyzer class, especially with all these hardcoded values
type_dic = make_map(
    ["Full-Time", "Full Time", "Part-Time", "Part Time", "Contract", "Contractor"],
    ["Full-Time", "Full-Time", "Part-Time", "Part-Time", "Contract", "Contract"],
)

skills_dic = make_map([
    "R", "Shiny", "RStudio", "Markdown", "Latex", "SparkR", "D3", "D3.js",
    "Unix", "Linux", "MySQL", "Microsoft SQL server", "SQL",
    "Python", "SPSS", "SAS", "C++", "C", "C#", "Matlab", "Java",
    "JavaScript", "HTML", "HTML5", "CSS", "CSS3", "PHP", "Excel", "Tableau",
    "AWS", "Amazon Web Services", "Google Cloud Platform", "GCP",
    "Microsoft Azure", "Azure", "Hadoop", "Pig", "Spark", "ZooKeeper",
    "MapReduce", "Map Reduce", "Shark", "Hive", "Oozie", "Flume", "HBase", "Cassandra",
    "NoSQL", "MongoDB", "GIS", "Haskell", "Scala", "Ruby", "Perl",
    "Mahout", "Stata", "Solidity",
])

edu_dic = make_map([
    "Bachelor", "Bachelor's", "BS", "B.S", "B.S.", "Master", "Master's", "Masters",
    "M.S.", "M.S", "MS", "PhD", "Ph.D.", "PhD's", "MBA",
])

major_dic = make_map([
    "Computer Science", "Statistics", "Mathematics", "Math", "Physics",
    "Machine Learning", "Economics", "Software Engineering", "Engineering",
    "Information System", "Quantitative Finance", "Artificial Intelligence",
    "Biostatistics", "Bioinformatics", "Quantitative",
])

# AI and blockchain keywords, since those are the areas I want to get into
keywords_dic = make_map([
    "Blockchain", "Hashgraph", "Ethereum", "Solidity", "Truffle", "Drizzle", "Vyper",
    "Smart Contract", "Machine Learning", "Deep Learning", "Data Science", "Big Data",
    "Web Analytics", "Regression", "Classification", "User Experience",
    "Streaming Data", "Real-Time", "Real Time", "Time Series",
])


def process_type(text, data_dict) -> list:
    matches = []
    for term, label in data_dict.items():
        # re.escape handles terms like 'c++', 'c#' and 'd3.js'
        if re.search(r"(?:^|(?<=\s))" + re.escape(term) + r"(?=\s|$)", text):
            matches.append(label)
    return matches


def clean_text(texts):
    job_text = re.sub(r"[\n\r\t,/()]", " ", texts)    # newlines, tabs, commas, slashes, brackets
    job_text = re.sub(r"r\s?&\s?d", " ", job_text)     # don't count 'r & d' as the R language
    job_text = re.sub(r"\.\s+", " ", job_text)         # full stops at the end of sentences
    return re.sub(r" +", " ", job_text)


def process_jobs(job_df_indeed):
    columns = {
        "job_type": type_dic,
        "job_skills": skills_dic,
        "job_edu": edu_dic,
        "job_major": major_dic,
        "job_keywords": keywords_dic,
    }
    results = {col: [] for col in columns}

    for job_url in job_df_indeed["job_link"]:
        try:
            soup = get_xml(job_url)
            for elem in soup.find_all(["script", "style", "head", "title"]):
                elem.extract()
            job_text = clean_text(soup.get_text(separator=" ").lower())
            for col, data_dict in columns.items():
                results[col].append(process_type(job_text, data_dict))
        except Exception as e:
            print(e)
            for col in columns:
                results[col].append(["Forbidden"])

    for col, values in results.items():
        job_df_indeed[col] = values
    return job_df_indeed
```

The matching is deliberately crude. A term counts only when it is surrounded by whitespace or the start/end of the text, which is why the cleaning step replaces commas, slashes and brackets with spaces first. Single-letter skills like "R" and "C" still produce false positives, which is why "r & d" is stripped out.

## Emailing the report with Mailjet

The last step counts how often each skill and job type appears, draws a bar chart of skills and a pie chart of job types, and sends them as inline images through Mailjet's Send API v3.1. The API keys come from the `MJ_APIKEY_PUBLIC` and `MJ_APIKEY_PRIVATE` environment variables, and the from/to addresses come from a config file.

```python
import base64
import os
from collections import Counter

import matplotlib

matplotlib.use("Agg")  # render to files, no display needed
import matplotlib.pyplot as plt
import pandas as pd
from mailjet_rest import Client

from scrapper.util import get_config


def count_items(list_of_lists):
    return Counter(item for items in list_of_lists for item in items)


def generate_attachments(jobs_df):
    skill_lists = jobs_df["job_skills"].tolist()
    skill_counts = count_items(skill_lists)
    type_counts = count_items(jobs_df["job_type"].tolist())

    result = pd.DataFrame({"Skill": list(skill_counts), "Count": list(skill_counts.values())})
    # share of postings that mention each skill
    result["Ranking"] = result["Count"] / float(len(skill_lists))
    result_type = pd.DataFrame({"Type": list(type_counts), "Count": list(type_counts.values())})

    # GitLab didn't send attachments with spaces in the file name
    skill_rank_plotname = "skill-ranking.png"
    pie_plotname = "pie.png"

    try:
        fig = plt.figure()
        default_size = fig.get_size_inches()
        ax = fig.add_subplot(111)
        ax2 = ax.twinx()  # second y-axis sharing the same x-axis
        width = 0.4
        result.plot(x="Skill", y="Count", kind="bar", ax=ax, width=width, position=1, legend=False)
        result.plot(x="Skill", y="Ranking", kind="bar", ax=ax2, width=width, position=0, legend=False)
        ax.set_ylabel("Count")
        ax2.set_ylabel("Ranking")
        fig.set_size_inches((default_size[0] * 2, default_size[1] * 2))
        fig.tight_layout()
        plt.savefig(skill_rank_plotname, dpi=200)
    except Exception as e:
        print(f"Failed to make skill ranking chart: {e}")

    try:
        result_type.plot.pie(y="Count", labels=result_type["Type"], autopct="%1.1f%%",
                             figsize=(5, 5), legend=False)
        plt.savefig(pie_plotname, dpi=200)
    except Exception as e:
        print(f"Failed to make job type pie chart: {e}")

    attachments = []
    for index, plot_file in enumerate([pie_plotname, skill_rank_plotname]):
        if not os.path.exists(plot_file):
            continue
        with open(plot_file, "rb") as img_file:
            base64_image = base64.b64encode(img_file.read()).decode("ascii")
        attachments.append({
            "ContentType": "image/png",
            "Filename": plot_file,
            "ContentID": f"id{index}",
            "Base64Content": base64_image,
        })
    return attachments


def send_mailjet_email(jobs_df):
    api_key = os.environ["MJ_APIKEY_PUBLIC"]
    api_secret = os.environ["MJ_APIKEY_PRIVATE"]
    mailjet = Client(auth=(api_key, api_secret), version="v3.1")
    cfg = get_config()

    html = f"""
    <div>
      <h4>Graphs</h4>
      <img src="cid:id0" alt="Job type chart not generated" style="width:100%"/>
      <img src="cid:id1" alt="Skill chart not generated" style="width:100%"/>
      <h5>Potential Jobs</h5>
      {jobs_df.to_html()}
    </div>
    """
    data = {
        "Messages": [
            {
                "From": {"Email": cfg["email"]["from"], "Name": "Indeed Scrapper"},
                "To": [{"Email": cfg["email"]["to"], "Name": "Receiver"}],
                "Subject": "Job Report",
                "HTMLPart": html,
                "InlinedAttachments": generate_attachments(jobs_df),
            }
        ]
    }
    result = mailjet.send.create(data=data)
    print(result.status_code)
    print(result.json())
```

Each image is referenced in the HTML as `cid:id0` / `cid:id1`, matching the `ContentID` of the inline attachment.

## What about Selenium?

The obvious next step is to drive a real browser with Selenium instead of sending plain requests. That gets you JavaScript rendering, but it won't reliably get past Cloudflare's human-verification check, which is built to detect automated browsers. For sites that don't block automation, a minimal Selenium 4 script looks like this:

```python
from selenium import webdriver
from selenium.webdriver.common.by import By

browser = webdriver.Firefox()  # or webdriver.Chrome()
try:
    browser.get("https://www.example.com")
    heading = browser.find_element(By.XPATH, "//h1")
    print(heading.text)
finally:
    browser.quit()
```

Two things have changed since older tutorials:

- You no longer need to download a driver by hand. Since Selenium 4.6, Selenium Manager finds or downloads the right driver for the browser you have installed.
- The `find_element_by_id`, `find_element_by_xpath` and similar helpers were removed in Selenium 4.3. Use `find_element(By.ID, ...)`, `find_element(By.XPATH, ...)` and so on.

If you need job data today, look for an official source first (a job board's API or partner feed, or the employer's own careers page) rather than scraping.
