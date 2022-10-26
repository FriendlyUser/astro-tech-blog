---
title: Analyzing RBC Stock Trades with python
description: Analyzing rbc stock trades with python
alt: Applying nlp to various youtube videos
pubDate: Friday, 5 September 2022 13:00:00 GMT
tags: ["youtube", "nlp", "python", "astro"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-05 15.52.34 - Kazusa playing the piano at sunset, digital art.png'
imgAlt: 'rbc stock analyzer'
---

## Summary

This post goes over some of the code in my github repo for analyzing rbc stock trades. The code is written in python and uses the pandas library to analyze the data.

First we need to import the pandas library and the csv file we want to analyze.

Then remove bad data and entries we dont want to analyze
```python
  @staticmethod
  def clean_data(df: pd.DataFrame, currency: str = "CAD")->pd.DataFrame:

      df = df[df.Activity != "Deposits & Contributions"]
      df = df[df.Activity != "Dividends"]
      df = df[df.Activity != "Withdrawals & De-registrations"]
      # add option to remove transfers in config
      # df = df[df.Activity != "Transfers"]
      df = df[df.Symbol != "RBF558"]
      df = df[df.Symbol != "RBF556"]
      df = df[df['Currency'] == currency]
      df = df[df['Activity'] != 'Reorganization']
      return df
```


In order to count the cost of the trades, I simply count the number of buys and sells and multiply it by the transaction cost. The transaction cost is 9.95 for rbc direct investing.


```python
def count_commissions(df: pd.DataFrame, tnx_cost = 9.95):
    activity_df = df[df.Activity.isin(["Buy", "Sell"])]

    total_cost = len(activity_df) * tnx_cost

    return int(total_cost)
```



In order to calculate profit, we need to calculate the average price of the stock when we bought it. We can do this by taking the average price of all of the buys for a particular ticker. 

Then we can calculate the profit by multiplying the average price of the stock when we bought it by the quantity of stocks we sold, and subtracting the total cost of the transaction. 

```python
  @staticmethod
  def calc_profit_for_years(ticker_df: pd.DataFrame, txn_cost=9.95):
      """ Calculates the profit for all years in the given df for a particular ticker
      Returns an array of object, year: profit
      """
      profits = []
      ticker_df['tnx_year'] = ticker_df['Date'].dt.strftime('%Y')
      for tnx_year in ticker_df["tnx_year"].unique():
          year_df = ticker_df[ticker_df.tnx_year == tnx_year]
          sell_df = year_df[year_df.Activity == 'Sell'] 
          raw_profit = ((sell_df['Price'] - sell_df['average_price']) * abs(sell_df['Quantity'])).sum().round(2)
          num_txns = len(year_df[year_df.Activity.isin(['Sell', 'Buy'])])
          yearly_profit = raw_profit - num_txns * txn_cost
          profits.append({
              "year": tnx_year,
              "profit": yearly_profit,
              "raw_profit": raw_profit,
              "num_txns": num_txns
          })
      return profits
```


In order to calculate average cost basis, this is a function I created, its somewhat inaccurate, need to adjust and remove a lot of bad data.


```python
@staticmethod
def calc_acb(sorted_df: pd.DataFrame)-> pd.DataFrame:
    """calculate acb for a sorted dataframe only containing
    trades with a single ticker
    
    see https://stackoverflow.com/questions/45448532/dataframe-calculating-average-purchase-price
    this method does not account for stock purchasing fees.
    """
    df = sorted_df
    df['prev_cum_qty'] = df['TotalQty'].shift(1, fill_value=0)
    df['average_price'] = np.nan
    for i, row in df.iterrows():
        # transfers dont work very well
        # if you transfer a cad stock to usd and
        # thats the only time you it was bought
        # it works
        if row['Activity'] == 'Transfers':
            # grab last value
            if i == 0:
                df.at[i, 'average_price'] = 0
            else:
                df.at[i, 'average_price'] = df.at[i-1, 'average_price']
            continue
        # Quantity positive for buying
        if row['Quantity'] > 0:
            if i == 0:
                df.at[i, 'average_price'] = abs(df.at[i, 'Price'])
            else:
                # check for transfer
                # get share value by grabbing last average_price and current cumulative shares
                share_value = df['average_price'].shift(1, fill_value=df.at[i, 'Price'])[i] * row['prev_cum_qty']
                # Buying is treated as a loss of money
                # Selling treated as a gain of money in Value
                acb = (-row['Value'] + share_value) / row['TotalQty']
                df.at[i, 'average_price'] = abs(acb)
        # quantity negative for selling
        else:
            # use last value, selling transaction does not impact average_price
            # sales do not impact acb as selling does not lower average cost basis
            if i == 0:
                df.at[i, 'average_price'] = abs(df.at[i, 'Price'])
            else:
                df.at[i, 'average_price' ] = df['average_price'][i-1]
    # TODO add function to control rounding
    # or let pandas only show 2 decimal places
    df = df.round(decimals=3)
    return df
```

The basic formula am I using to calculate the average cost basis is:

For the first entry (buy), grab the average purchase price, then go through each row and only look where we have purhases (positive quantity) and calculate the average cost basis.

We grab the last average cost basis and multiply it by the cumulative shares, then add the value of the current transaction, and divide it by the cumulative shares.

Overall, this is a very basic analysis of my stock trades, I plan on adding more features and making it more accurate. I also plan on adding a web interface to make it easier to use.

# References

* https://github.com/FriendlyUser/rbc-stock-trade-analyzer
* https://stackoverflow.com/questions/45448532/dataframe-calculating-average-purchase-price