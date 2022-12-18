---
title: Scrapping sec filings with python and secedgar
description: sec filings with python and secedgar
alt: Applying nlp to various youtube videos
pubDate: Friday, 13 January 2023 13:00:00 GMT
tags: ["sec", "python", "secedgar"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-10 21.55.07 - magnifying glass on stonks.png'
imgAlt: 'rbc stock analyzer'
---

The Securities and Exchange Commission (SEC) is a U.S. government agency that is responsible for regulating the securities industry, including the stock and bond markets. It was created in 1934 in response to the stock market crash of 1929 and the subsequent Great Depression. The SEC's main functions are to protect investors, maintain fair and orderly functioning of the markets, and facilitate capital formation. It does this by enforcing federal securities laws, regulating the securities industry, and providing transparency and disclosure to the markets. The SEC also oversees the registration and reporting of public companies, mutual funds, and other investment products, and it reviews and approves new financial products and trading strategies.


SEC filings are documents that publicly traded companies are required to file with the Securities and Exchange Commission (SEC). These documents provide information about a company's financial performance, business operations, and ownership structure. They are intended to provide transparency and disclosure to investors, analysts, and the general public.

There are several types of SEC filings, including:

1. Annual reports: Companies must file an annual report, also known as a Form 10-K, with the SEC each year. This report provides a detailed overview of the company's financial performance and business operations over the past year. It includes financial statements, a discussion of the company's business and financial condition, and other information about the company's management, compensation, and risks.
2. Quarterly reports: Companies must also file quarterly reports, known as Form 10-Q, with the SEC each quarter. These reports provide financial information for the quarter, including financial statements and a discussion of the company's business and financial condition.
3. Registration statements: Companies that are issuing securities, such as stocks or bonds, must file a registration statement with the SEC. This statement provides information about the company, the securities being offered, and the underwriters involved in the offering.
4. Proxy statements: Companies that are holding shareholder meetings must file a proxy statement with the SEC. This statement provides information about the meeting, including the matters to be voted on, the nominees for the board of directors, and executive compensation.
5. Other reports: There are many other types of reports that companies may be required to file with the SEC, depending on their circumstances. For example, companies with large insider ownership or significant changes in their financial condition may be required to file additional reports.

SEC filings are available to the public on the SEC's website, EDGAR (Electronic Data Gathering, Analysis, and Retrieval system).


To download filings from the SEC, you can use the secedgar package. It is a Python package that provides a simple interface to download filings from the SEC EDGAR database. It is built on top of the `requests` package, `beautifulsoup4` package and uses the EDGAR search API to download filings. 

```python
from secedgar import filings, FilingType, QuarterlyFilings
import argparse
import time

def time_it(func):
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        elapsed = end - start
        print(f"Elapsed time: {elapsed} seconds for {func.__name__}")
        return result
    return wrapper

with open("holdings_list.txt", "r") as f:
    holdings_list = f.read().splitlines()
company_list = []
def get_13F(filing_entry):
    if "13F" in filing_entry.form_type: #
        # and filing_entry.company_name.lower() in (name.lower() for name in holdings_list):
        company_list.append(filing_entry.company_name)
        return True
    return False
    
def get_company_ab_10k(filing_entry):
    if "13F" in filing_entry.form_type and filing_entry.company_name.lower() in (name.lower() for name in holdings_list):
        company_list.append(filing_entry.company_name)
        return True
    return False

@time_it
def fetch_filings(data: dict):
    # 13F filings for Apple (ticker "aapl")
    # read list from holdings_list.txt
    year, month, useragent, rate_limit = data["year"], data["month"], data["useragent"], data["rate_limit"]
    quarterly = QuarterlyFilings(year, month, user_agent=useragent, entry_filter=get_13F, rate_limit=rate_limit)
    # map folder to year and quarter
    quarterly.save("filings")

@time_it
def get_list(data: dict):
    """ Get list of companies from 13F filings
    """
    # get year, month , useragent, rate_limit from data
    year, month, useragent, rate_limit = data["year"], data["month"], data["useragent"], data["rate_limit"]
    quarterly = QuarterlyFilings(year, month, user_agent=useragent, entry_filter=get_13F, rate_limit=rate_limit)

    verbose = data["verbose"]
    test_file = quarterly.get_filings_dict()
    if verbose:
        print("Getting list of companies from 13F filings")
        print(test_file)
    # remove duplicates in company_list
    all_company_list = list(dict.fromkeys(company_list))
    # save company_list to file
    with open("companies_list.txt", "w") as f:
        for company in all_company_list:
            f.write(company + "\n")

def main():
    pass

if __name__ == '__main__':
    # cli parsing with argparse
    # two modes of operation: get_list and download_companies

    parser = argparse.ArgumentParser(description='Get list of companies from 13F filings')
    parser.add_argument('--mode',"-m", type=str, help='get_list or download_companies', default="get_list", required=False)
    parser.add_argument('--year', "-y", type=int, help='year of 13F filings', default=2022, required=False)
    parser.add_argument('--quarter', "-q", type=int, help='quarter of 13F filings', default=2, required=False)
    parser.add_argument('--user_agent', "-ua", type=str, help='user agent for secedgar', default="Your name <dlcoding20@gmail.com>", required=False)
    parser.add_argument('--rate_limit', "-rl", type=int, help='rate limit for secedgar', default=5, required=False)
    parser.add_argument('--verbose', "-v", type=bool, help='verbose mode', default=False)
    args = parser.parse_args()
    data = {
        "year": args.year,
        "month": args.quarter,
        "useragent": args.user_agent,
        "rate_limit": args.rate_limit,
        "verbose": args.verbose
    }
    if args.mode == "get_list":
        get_list(data)
    elif args.mode == "download_companies":
        pass
    # main()
```
The fetch_filings function is used to download 13F filing documents from the SEC Edgar website using the secedgar library. It takes a dictionary called data as an argument and extracts the values for the year, month, user agent, and rate limit. It then creates an instance of the QuarterlyFilings class with the specified year, month, user agent, and rate limit, and sets the entry_filter parameter to the get_13F function. The entry_filter parameter allows you to specify a function that will be applied to each filing entry in the list of quarterly filings. If the function returns True for a particular filing entry, the filing will be included in the list of results.

The get_13F function checks whether a filing entry's form type is "13F" and, if it is, appends the company name to the company_list global variable and returns True. This means that the fetch_filings function will only download 13F filings for companies that have their name included in the holdings_list file. The fetch_filings function then saves the resulting list of quarterly filings to the "filings" folder.

The get_list function is used to generate a list of companies that have 13F filings available for a given year and month. It works in a similar way to the fetch_filings function, but instead of downloading the actual filing documents, it uses the get_13F function to append the company names of the filing entries to the company_list global variable. The get_list function then removes duplicates from the company_list and saves the resulting list of unique company names to a file called "companies_list.txt".

The main function is currently empty and does not do anything. The if __name__ == '__main__': block at the end of the script handles command line input with the argparse library. It allows you to specify the mode of operation (either "get_list" or "download_companies"), the year and month of the 13F filings you want to retrieve, the user agent string to use when making requests to the SEC Edgar website, the rate limit for the requests, and whether you want to run the script in verbose mode. It then passes these values to the data dictionary and calls the appropriate function (get_list or fetch_filings) with the data dictionary as an argument.

## References
* https://github.com/dli-invest/13F-sec
