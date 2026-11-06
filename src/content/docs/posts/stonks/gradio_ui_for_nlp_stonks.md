---
title: Building an interactive nlp ui for a custom nlp pipeline in spacy
description: Web app that uses openbb-sdk to display technical analysis graphs for a given stock
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 January 2023 13:00:00 GMT
tags: ["spacy", "gradio", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-12 20.50.12 - big topology graph with shapes with paper straws.png'
imgAlt: 'rbc stock analyzer'
---


## Summary

For the stonk pipeline I tend to focus on stock tickers from various csv files automatic generate.

This code initializes the spacy library with some custom configurations and data, such as company names, stock symbols, and exchange information. It also adds an entity_ruler to the pipeline, which allows the library to identify specific entities in text, such as stocks and companies, based on pre-defined patterns. The entity_ruler is populated with patterns using data from various CSV files.

```python
def init_nlp(exchange_data_path: str = "https://raw.githubusercontent.com/dli-invest/fin_news_nlp/main/nlp_articles/core/data/exchanges.tsv", indicies_data_path: str = "https://raw.githubusercontent.com/dli-invest/fin_news_nlp/main/nlp_articles/core/data/indicies.tsv"):
    SPLIT_COMPANY_INTO_WORDS = False
    BEAR_MARKET_ADJUSTMENT = True
    nlp = spacy.load("en_core_web_sm")
    ticker_df = pd.read_csv(
                "https://raw.githubusercontent.com/dli-invest/eod_tickers/main/data/us.csv"
            )
    ticker_df = ticker_df.dropna(subset=['Code', 'Name'])
    ticker_df = ticker_df[~ticker_df.Name.str.contains("Wall Street", na=False)]
```

This code reads a CSV file containing stock ticker data using the pandas library. It then filters out rows that have missing values in the "Code" and "Name" columns, or that contain the string "Wall Street" in the "Name" column. These operations ensure that the data used for pattern matching is as clean and accurate as possible.

```python
    ticker_df = ticker_df.dropna(subset=['Code', 'Name'])
    ticker_df = ticker_df[~ticker_df.Name.str.contains("Wall Street", na=False)]
    # remove exact matches
    ticker_df = ticker_df[~ticker_df['Name'].isin(['Wall Street'])]
    # remove bad symbols
    ticker_df = ticker_df[~ticker_df['Code'].isin(['ET'])]
    symbols = ticker_df.Code.tolist()
    companies = ticker_df.Name.tolist()
```

After filtering the data, the code extracts the stock symbols and company names from the "Code" and "Name" columns of the dataframe, respectively. These lists of symbols and names will be used to create the patterns that the entity_ruler will use to identify entities in text.

```
 ruler = nlp.add_pipe("entity_ruler")
  patterns = []

  first_words_added = []
  endings = [".TO", ".V", ".CN", ".HK"]
  #List of Entities and Patterns
  for symbol in symbols:
      if len(symbol) > 1:
          patterns.append({"label": "STOCK", "pattern": symbol})
          patterns.append({"label": "STOCK", "pattern": f"${symbol}"})
          for ending in endings:
              patterns.append({"label": "STOCK", "pattern": symbol+f".{ending}"})



  for company in companies:
      if company not in stops and len(company) > 1:
          patterns.append({"label": "COMPANY", "pattern": company})
          if SPLIT_COMPANY_INTO_WORDS:
              words = company.split()
              if len(words) >= 1:
                  new = " ".join(words)
                  if new not in first_words_added and new.isnumeric() == False:
                      patterns.append({"label": "COMPANY", "pattern": new})
                  # add first word to list as well
                  first_word = words[0]
                  # ignore the numbers
                  if (
                      first_word.isnumeric() == False
                      and first_word.lower() not in stops
                      and first_word not in first_words_added
                  ):
                      first_words_added.append(first_word)
                      patterns.append({"label": "COMPANY", "pattern": words[0]})
```

This code creates a list of dictionaries called patterns, which will be used to populate the entity_ruler with the appropriate patterns. For each stock symbol in the symbols list, it creates a pattern that matches the symbol and another that matches the symbol preceded by a dollar sign. It also creates a pattern for each symbol with a suffix from the endings list, such as .TO and .V.

For each company name in the companies list, it creates a pattern that matches the full name of the company. If the SPLIT_COMPANY_INTO_WORDS flag is True, it also creates patterns for the individual words in the company name and for the first word of the company name. These additional patterns allow the entity_ruler to match entities even when they appear in a different form than their exact name. For example, a company named "Apple Inc." would also be matched if it appears as "Apple" or "Inc." in the text.


Similar logic is applied to the indicies.

```python
 patterns.append({
      "label": "COMPANY",
      "pattern": cse_pattern,
  })
  patterns.append({
      "label": "COMPANY",
      "pattern": tsx_pattern,
  })

  # ignore investor conference
  # can be useful in bull markets, but not in bear markets
  if BEAR_MARKET_ADJUSTMENT:
      patterns.append({
          "label": IGNORE_LABEL,
          "pattern": [{"LOWER": "investor"}, {"LOWER": "conference"}]
      })

  # search for MOU
  patterns.append({
      "label": "NEWS",
      "pattern": [{"LOWER": "mou"}]
  })
  ruler.add_patterns(patterns)
  return nlp
```

This code appends additional patterns to the patterns list for matching Canadian companies listed on the CSE and TSX exchanges, as well as for ignoring investor conferences and identifying news related to "MOU" (memorandum of understanding) agreements. Finally, it adds the patterns to the entity_ruler and returns the nlp object with the updated pipeline.

To view the full source code please visit

https://huggingface.co/FriendlyUser/en_stonk_pipeline


## Deployment
Gradio is a free and open-source tool that allows users to quickly and easily create interactive web-based interfaces for machine learning models. With Gradio, users can create a simple interface with a few lines of code, which allows others to test and interact with the model in a web browser. This can be useful for sharing and explaining machine learning models to a broader audience, as well as for collecting feedback and real-world data from users.


```python
import gradio as gr
import spacy
nlp = spacy.load("en_stonk_pipeline", disable=["lemmatizer"])

def text_analysis(text):
    doc = nlp(text)
    rendered_spacy = spacy.displacy.render(
            doc, style="ent", page=False)
    return rendered_spacy

iface = gr.Interface(fn=text_analysis, inputs="text", outputs="html")
iface.launch()
```

Huggingspace is a website and community forum for natural language processing (NLP) researchers and practitioners. It provides a platform for discussing the latest developments and research in the field, as well as sharing resources and code. Huggingspace also hosts workshops and events related to NLP. Overall, it is a valuable resource for anyone interested in the field of NLP.


View the full package at hugging space

https://huggingface.co/spaces/FriendlyUser/en_stonk_pipeline