---
title: Analyzing RBC Stock Trades with python
description: Analyzing rbc stock trades with python
alt: Applying nlp to various youtube videos
pubDate: Friday, 12 December 2022 13:00:00 GMT
tags: ["youtube", "nlp", "python", "astro"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-05 15.52.34 - Kazusa playing the piano at sunset, digital art.png'
imgAlt: 'rbc stock analyzer'
---

```python
import argparse
# script to download a file from a url with an iframe
from icecream import ic
import time
import os
from tqdm import tqdm
from cad_tickers.sedar.tsx import get_ticker_filings, get_news_and_events
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium import webdriver
from selenium.webdriver.common.by import By
import requests


def make_webdriver(build_name="stonk_doc_search"):
    remote_url = os.environ.get("REMOTE_SELENIUM_URL")
    if remote_url == None:
        raise Exception("Missing REMOTE_SELENIUM_URL in env vars")
    desired_cap = {
        "os_version": "10",
        "resolution": "1920x1080",
        "browser": "Chrome",
        "browser_version": "latest",
        "os": "Windows",
        "name": "stonk_reports-[Python]",  # test name
        "build": build_name,  # CI/CD job or build name
    }
    driver = webdriver.Remote(
        command_executor=remote_url,
        desired_capabilities=desired_cap,
    )
    return driver
```

This script uses the argparse module to parse command-line arguments, the icecream module to print debug messages, the time module to handle time-related operations, the os module to interact with the operating system, the tqdm module to display a progress bar, and the requests module to make HTTP requests.

The script also uses the get_ticker_filings and get_news_and_events functions from the cad_tickers.sedar.tsx module to retrieve information about a company's filings and news events from the SEDAR website.

The make_webdriver function uses the selenium module to create a new webdriver instance for a remote Selenium server, which is used to automate the process of downloading a file from a URL with an iframe. The WebDriverWait and expected_conditions classes from the selenium.webdriver.support module are also used to wait for a specific element to be loaded on the page before interacting with it.


```python
def get_pdf_from_url(
    investorx_url: str = "https://www.investorx.ca/doc/2111300436476926",
    pdf_name: str = "test.pdf",
):
    driver = make_webdriver()
    # driver = webdriver.Chrome(options=options)

    driver.get(investorx_url)
    try:
        WebDriverWait(driver, 5).until(EC.presence_of_element_located((By.TAG_NAME, 'iframe')))
    except TimeoutException:
        time.sleep(2)
    pdf_url = driver.find_element(By.TAG_NAME, 'iframe').get_attribute("src")
    driver.quit()
    chunk_size  = 2000
    r = requests.get(pdf_url, stream=True)
    with open(pdf_name, 'wb') as fd:
        for chunk in r.iter_content(chunk_size):
            fd.write(chunk)
```

The get_pdf_from_url function takes two arguments: investorx_url, which is the URL of the page that contains the iframe with the PDF file, and pdf_name, which is the name of the file to save the PDF to.

The function uses the make_webdriver function to create a new webdriver instance, and then navigates to the given URL using the driver.get method. It uses the WebDriverWait class to wait for the iframe element to be loaded on the page, and then retrieves the src attribute of the iframe to get the URL of the PDF file.

Once the URL of the PDF file has been obtained, the function uses the requests module to download the file and save it to the specified location on the filesystem. The chunk_size variable is used to specify the size of each chunk of data that is downloaded and written to the file. The iter_content method of the requests response object is used to iterate over the chunks of data and write them to the file.

```python
def get_stonk_data_news(stock_name: str = "PKK", start_date = "2020-09-03", end_date = "2021-12-03"):
    ic("Eating ice cream")
    filings_data = get_news_and_events(stock_name, 1, 1000)
    filings = filings_data.get("news")
    if filings is None:
        ic("NO FILINGS")
        return
    ic(filings)
    mk_dir(f"../docs/{stock_name}")
    total_downloads = 0
    startTime = time.time()
    # use tqdm to show progress bar
    for filing in tqdm(filings, desc = f'Downloading PDFs for {stock_name}'):
        # get data tp
        filing_date = filing.get("filingDate")
        description = filing.get("description", "")
        description = description.replace(" ", "_")
        name = filing.get("name", "")
        name = name.replace("-", " ").replace(" ", "_").replace("/", "_")
        pdf_url = filing.get("urlToPdf")
        pdf_name = f"docs/{stock_name}/pdf/{filing_date}_{name}.pdf"
        # if file exists skip
        if os.path.exists(pdf_name):
            ic(f"Skipping {pdf_name}")
            continue
        else:
            total_downloads += 1
            ic(f"Downloading {pdf_name}")
            try:
                get_pdf_from_url(pdf_url, pdf_name)
            except Exception as e:
                print(e)
                print(f"Skipping {pdf_name}")
                continue

    # get all urls from data
    executionTime = (time.time() - startTime)
    print('Execution time in seconds: ' + str(executionTime))
    print(f"Total downloads: {total_downloads}")
    if total_downloads == 0:
        print("No filings found")
    else:
        print(f"Average dl time: {executionTime / total_downloads}")
```

The get_stonk_data_news function takes three arguments: stock_name, which is the name of the company to retrieve news events for, start_date, which is the start date for the date range to search within, and end_date, which is the end date for the date range.

The function uses the get_news_and_events function from the cad_tickers.sedar.tsx module to retrieve news events for the given company within the specified date range. If no news events are found, the function returns immediately.

If news events are found, the function iterates over the events and downloads the associated PDF files using the get_pdf_from_url function. It uses the tqdm module to display a progress bar while the PDFs are being downloaded. The function also calculates and prints some statistics about the download process, such as the total number of downloads, the total time taken to download the files, and the average time taken to download each file.
