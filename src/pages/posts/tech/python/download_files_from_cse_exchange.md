---
tags: ['python', 'requests', 'bs4']
title: How to download reports from the CSE exchange with python
description: By using the cad tickers library we can easily get links to docs from stocks.
pubDate: Fri, 3 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3702590653.png"
---
CSE exchange refers to the Canadian Securities Exchange, which is a stock exchange located in Canada. The CSE is a fully electronic exchange that provides a marketplace for the trading of securities listed on its platform. It offers a range of listing options, including equity, debt, and structured products, and operates with a focus on serving emerging and growth companies. The exchange aims to provide an efficient, transparent, and accessible marketplace for issuers and investors, and is regulated by the Ontario Securities Commission.


Downloading reports from the CSE exchange can provide valuable information for investors, traders, and other market participants. The reports contain data on market activity, financial performance, and other key metrics for the companies listed on the exchange. By accessing these reports, you can gain insight into the financial health and performance of the companies, which can help inform your investment decisions.

For example, the CSE provides annual and quarterly financial statements, press releases, and other disclosures for companies listed on the exchange. By downloading and reviewing these reports, you can get a better understanding of a company's financial performance, including revenue, expenses, profits, and growth trends. This information can help you make more informed decisions about whether to buy, sell, or hold a company's stock.

Additionally, downloading CSE reports can provide you with insights into the overall health of the Canadian securities market, as well as emerging trends and opportunities. This information can be especially useful for traders and investors looking to make strategic decisions about their portfolios.

In summary, downloading reports from the CSE exchange can provide valuable information for market participants and


```python 
 import pandas as pd
import time
import os
import requests
import json
from cad_tickers.exchanges.cse import get_recent_docs_from_url
from extract_doc import mk_dir, handle_logic
from io import BytesIO, StringIO
"""
1. Get the list of documents from the CSE website
2. For each document, get the document url
3. If the document url is not in the csv file, add it to the csv file
4. For each document url, download the document and add it to the docs folder
5. For each document url, make a discord request with the document url
6. For each document url, make a discord request with the document summary
"""


def fig_to_buffer(fig):
  """ returns a matplotlib figure as a buffer
  """
  buf = BytesIO()
  fig.savefig(buf, format='png')
  buf.seek(0)
  imgdata = buf.read()
  return imgdata

def make_discord_request(content, embeds = [], filename = None, file = None):
    url = os.getenv("DISCORD_WEBHOOK")
    if url == None:
        print('DISCORD_WEBHOOK Missing')
        pass
    data = {}
    data["content"] = content
    files = {'file': (filename, file, 'application/pdf')}
    if filename != None and file != None:
        resp = requests.post(
            url, data=data, files=files
        )
    elif len(embeds) != 0:
        data["embeds"] = embeds
        resp = requests.post(
            url, data=json.dumps(data), headers={"Content-Type": "application/json"}
        )
    print(resp) 
 ```

This code is a Python script that downloads documents from the Canadian Securities Exchange (CSE) website and makes a Discord request with the document URL and summary. Here's a brief overview of what it does:

1. It retrieves a list of documents from the CSE website using the `get_recent_docs_from_url` function.
2. For each document, it retrieves the document URL.
3. If the document URL is not already in a CSV file, it adds it to the CSV file.
4. It downloads the document and saves it to a directory called `docs`.
5. For each document URL, it makes a Discord request with the document URL.
6. For each document URL, it makes another Discord request with the document summary.

The Discord request is sent using the `requests` library. The `make_discord_request` function takes in several arguments, including the content, embeds, filename, and file data. If the filename and file data are provided, the function makes a request with the file attached. If the embeds argument is provided, the function makes a request with the embeds data. The URL for the Discord webhook is read from an environment variable `DISCORD_WEBHOOK`.


```python 
 
stockList = ["PKK", "IDK", "ADDC", "VPH", "VST", "ACT"]
def get_cse_tickers_data():
    url = "https://github.com/FriendlyUser/cad_tickers_list/blob/main/static/latest/cse.csv?raw=true"
    r = requests.get(url, allow_redirects=True)
    s = r.content
    return pd.read_csv(StringIO(s.decode('utf-8')))

stock_df = get_cse_tickers_data()
stock_rows = stock_df.loc[stock_df['Symbol'].isin(stockList)]
stock_rows.loc[:, 'stock'] = stock_rows['Symbol']
stock_rows.loc[:, 'url'] = stock_rows['urls']
stockUrls = stock_rows.to_dict('records')
csv_file = "docs.csv"
if os.path.isfile(csv_file):
    # read from csv
    df = pd.read_csv(csv_file)
else:
    # make new df
    df = pd.DataFrame(columns=["stock", "url", "docUrl"])
 
 ```

This code is retrieving data for a list of stocks (`stockList`) from the Canadian Securities Exchange (CSE). It uses the `get_cse_tickers_data` function to retrieve the data from a CSV file hosted on GitHub, which contains information about CSE stocks, such as their symbol, name, and URLs. The function uses the `requests` library to make a GET request to the URL of the CSV file, and the returned content is then converted into a Pandas DataFrame using `pd.read_csv`.

Next, the code filters the data for only the stocks in the `stockList` by using the `loc` method on the DataFrame and checking if the value in the `Symbol` column is in the `stockList` using the `isin` method. The filtered data is then saved in the `stock_rows` DataFrame.

The code then creates two new columns in the `stock_rows` DataFrame, one named `stock` and the other named `url`, which contain the values from the `Symbol` and `urls` columns, respectively. The filtered data is then converted into a list of dictionaries (`stockUrls`) using the `to_dict` method.

Finally, the code checks if there is an existing CSV file named `docs.csv` in the current directory. If there is, it reads the data into a DataFrame using `pd.


```python 
 for stock in stockUrls:
    stockName = stock.get("stock")
    stockUrl = stock.get("url")
    urls = []
    try:
        urls = get_recent_docs_from_url(stockUrl)
    except Exception as e:
        pass
    
    for docUrl in urls:
        # skip malformed relative urls
        if docUrl[0] == '/':
            continue
        # add each element to list
        exists = docUrl in df["docUrl"].tolist()
        if exists == False:
            print(f"Adding {stockName}: {docUrl}")
            df.loc[len(df)] = [stockName, stockUrl, docUrl]
            # wrap in todo
            stock_doc_dir = f"docs/{stockName}"
            mk_dir(stock_doc_dir)
            stock_doc_file_path = docUrl.split("/")[-1]
            pdf_file_name = f"{stock_doc_dir}/{stock_doc_file_path}.pdf"
            companyName = stock.get("Company").\
                replace('Inc.', '').\
                replace('Pharma', '').\
                strip()
            dataDict = {
                "url": docUrl,
                "path": pdf_file_name,
                "company_name": companyName
            }
            result_obj = handle_logic(dataDict)
            file_contents = result_obj.get("contents")
            summary = "N/A"
            try:
                summary = result_obj.get("summary")[:1980]
            except TypeError as e:
                pass
            embeds = [
                {
                    "title": stockName,
                    "url": docUrl,
                    "description": summary
                }
            ]
            if file_contents != None:
                make_discord_request(f"*{stockName}*: \n {docUrl}", embeds, pdf_file_name, file_contents)
                time.sleep(2)
            else:
                make_discord_request(f"*{stockName}*: \n {docUrl}", embeds)
                time.sleep(1)
            pass

df = df.drop_duplicates()
df = df.sort_values(by=['stock'])
df.to_csv(csv_file, index=False) 
 ```

This code is a script that downloads and summarizes recent documents from a list of stock symbols. The stock symbols are stored in the list `stockList`, and the data for these symbols is obtained by calling the `get_cse_tickers_data` function, which retrieves data from a CSV file stored on GitHub.

The code then loops through each of the stocks in `stockList`, and for each stock, it retrieves a list of recent documents by calling the `get_recent_docs_from_url` function and passing it the URL for the stock.

For each document, the code checks if the document URL already exists in the DataFrame `df`. If the URL does not exist, the code adds the document information (i.e., stock name, URL, and a summary) to `df` and makes a Discord request to post the information to a Discord channel. The information posted to the Discord channel includes the stock name, document URL, and a summary of the document's contents. If the contents of the document are available, they are also included in the Discord request as an attachment.

After all the documents have been processed, the code removes any duplicates in `df` and sorts the entries by the stock name. Finally, the updated `df` is saved to a CSV file.



## References
- https://github.com/dli-invest/cse_file_downloader/blob/main/scrap_cse_releases.py
