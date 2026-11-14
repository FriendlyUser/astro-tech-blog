---
title: A Gradio demo for a spaCy entity ruler that tags stock tickers
description: How I built a spaCy pipeline that tags stock symbols and company names with an entity ruler, and served it as a Gradio app on Hugging Face Spaces.
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 January 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["spacy", "gradio", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-12 20.50.12 - big topology graph with shapes with paper straws.png'
imgAlt: 'rbc stock analyzer'
---

For my stock news pipeline I want to pull tickers and company names out of headlines and transcripts. A trained NER model won't know that `SHOP.TO` or `$AA` is a stock, but a list of every listed symbol and company name gets most of the way there. spaCy's [`EntityRuler`](https://spacy.io/api/entityruler) turns such a list into entity labels. I packaged the result as `en_stonk_pipeline` and put a [Gradio](https://www.gradio.app/) front end on it so I could paste text and see what it tags.

## Building the patterns

The symbol and company lists come from a CSV of US-listed tickers in my [eod_tickers](https://github.com/dli-invest/eod_tickers) repo, with `Code` and `Name` columns. Each symbol gets three kinds of pattern: the bare symbol, a cashtag (`$AA`), and the symbol with a Canadian or Hong Kong exchange suffix (`SHOP.TO`). Each company name becomes a `COMPANY` pattern. This is a condensed, runnable version of the `init_nlp` function I keep in my [fin_news_nlp](https://github.com/dli-invest/fin_news_nlp) repo. Save it as `build_pipeline.py`:

```python
import pandas as pd
import spacy
from spacy import displacy

TICKERS_CSV = "https://raw.githubusercontent.com/dli-invest/eod_tickers/main/data/us.csv"
SUFFIXES = [".TO", ".V", ".CN", ".HK"]
BAD_SYMBOLS = {"ET"}  # symbols that are also common words in my data


def init_nlp() -> spacy.Language:
    nlp = spacy.load("en_core_web_sm")

    df = pd.read_csv(TICKERS_CSV, dtype=str).dropna(subset=["Code", "Name"])
    df = df[~df["Name"].str.contains("Wall Street") & ~df["Code"].isin(BAD_SYMBOLS)]

    patterns = []
    for symbol in df["Code"]:
        if len(symbol) > 1:
            patterns.append({"label": "STOCK", "pattern": symbol})
            patterns.append({"label": "STOCK", "pattern": f"${symbol}"})
            patterns += [{"label": "STOCK", "pattern": symbol + s} for s in SUFFIXES]
    for name in df["Name"]:
        if len(name) > 1:
            patterns.append({"label": "COMPANY", "pattern": name})
    # a token pattern, so it matches "MOU", "MoU" and "mou"
    patterns.append({"label": "NEWS", "pattern": [{"LOWER": "mou"}]})

    ruler = nlp.add_pipe("entity_ruler", before="ner")
    ruler.add_patterns(patterns)
    return nlp


if __name__ == "__main__":
    nlp = init_nlp()
    doc = nlp("Agilent Technologies Inc signed an MoU with $AA. Shares of SHOP.TO rose.")
    print([(ent.text, ent.label_) for ent in doc.ents])
```

You need `pip install spacy pandas` and `python -m spacy download en_core_web_sm`. With spaCy 3.8 that prints:

```text
[('Agilent Technologies Inc', 'COMPANY'), ('MoU', 'NEWS'), ('$AA', 'STOCK'), ('SHOP.TO', 'STOCK')]
```

A few things I learned along the way:

- **String patterns are case-sensitive phrase matches.** `"AA"` matches `AA` but not `aa`. That keeps short symbols such as `ON` or `ALL` from matching ordinary words most of the time, but not always: a headline in all caps will light up. Skipping one-character symbols and dropping known offenders like `ET` helped.
- **Watch the suffix concatenation.** The suffixes already include the dot. My original code built `symbol + f".{ending}"`, which produced patterns like `AA..TO` that never matched.
- **Ruler position matters.** By default `add_pipe` puts the ruler last, after `ner`. With the default `overwrite_ents=False`, the ruler then skips any match that overlaps an entity `ner` already found, so `Agilent Technologies Inc` stays an `ORG`. Adding it with `before="ner"` lets the ruler's labels win, and `ner` fills in around them.
- **Building is slow.** That CSV produces about 139,000 patterns, and each phrase pattern is run through the tokenizer. It took about 35 seconds on my machine, which is why I package the pipeline instead of rebuilding it on every start.

The full pipeline also has `INDEX`, `STOCK_EXCHANGE`, `COUNTRY` and `DIVIDENDS` labels built from other TSV files the same way, plus an option to add each company's first word as a pattern (so "Agilent" alone matches). That last one catches more mentions and more false positives. The packaged model is at [huggingface.co/FriendlyUser/en_stonk_pipeline](https://huggingface.co/FriendlyUser/en_stonk_pipeline).

## The Gradio app

[Gradio](https://www.gradio.app/) is an open-source Python library for building a web UI around a function. `gr.Interface` takes the function plus input and output component types, and `launch()` starts a local server. spaCy's `displacy.render` produces HTML with highlighted entities, so the whole app is a few lines:

```python
import gradio as gr
import spacy
from spacy import displacy

nlp = spacy.load("en_stonk_pipeline", disable=["lemmatizer"])


def text_analysis(text: str) -> str:
    doc = nlp(text)
    return displacy.render(doc, style="ent", page=False)


demo = gr.Interface(fn=text_analysis, inputs="text", outputs="html")
demo.launch()
```

## Deploying to Hugging Face Spaces

[Hugging Face Spaces](https://huggingface.co/docs/hub/spaces-overview) hosts Gradio, Streamlit and Docker apps from a Git repo. A Gradio Space needs an `app.py` like the one above, a `README.md` whose YAML header sets `sdk: gradio`, and a `requirements.txt`. Mine installs the packaged pipeline straight from the model repo:

```text
https://huggingface.co/FriendlyUser/en_stonk_pipeline/resolve/main/en_stonk_pipeline-any-py3-none-any.whl
gradio
```

The pipeline was packaged with spaCy 3.4 and its metadata pins `spacy>=3.4.1,<3.5.0`. spaCy 3.4 requires pydantic 1, while Gradio 4 and later require pydantic 2, so that wheel can't be installed next to a current Gradio. It worked on the Space because the Space's config pins Gradio 3.13. To move to current versions, rebuild the pipeline with spaCy 3.8 and publish a new wheel:

```bash
python -c "from build_pipeline import init_nlp; init_nlp().to_disk('en_stonk_pipeline')"
python -m spacy package en_stonk_pipeline dist --name stonk_pipeline --version 0.0.2 --build wheel
```

Here `build_pipeline.py` is the script from the first section.

The live demo is at [huggingface.co/spaces/FriendlyUser/en_stonk_pipeline](https://huggingface.co/spaces/FriendlyUser/en_stonk_pipeline).

## Further reading

- [spaCy rule-based matching: EntityRuler](https://spacy.io/usage/rule-based-matching#entityruler)
- [Gradio quickstart](https://www.gradio.app/guides/quickstart)
- [Hugging Face Spaces documentation](https://huggingface.co/docs/hub/spaces-overview)
