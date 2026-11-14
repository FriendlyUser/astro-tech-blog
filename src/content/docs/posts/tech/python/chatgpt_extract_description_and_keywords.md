---
tags: ['chatgpt', 'python', 'openai', 'latex']
title: Generating descriptions and keywords for LaTeX diagrams with ChatGPT
description: A Python script that walks a folder of LaTeX diagram sources and asks ChatGPT to write a description and a keyword list for each file.
pubDate: Fri, 7 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1220160824-a-dream-of-a-distant-galaxy-concept-art-matte-painting-hq-4k.webp
---

:::caution
The original script used [pyChatGPT](https://github.com/terry3041/pyChatGPT), which drove the ChatGPT web app with a browser session cookie. That project was archived in December 2023 because ChatGPT now has an official API. The script below uses the official `openai` package instead.
:::

My LaTeX Diagrams project is a collection of `.tex` files, each drawing one diagram. A short description and a list of keywords per diagram make them easier to understand and to search for, so I had ChatGPT generate them.

For each `.tex` file the script writes two text files next to it: `<name>_description.txt` and `<name>_keywords.txt`.

## The script

Install the library with `pip install openai` and set `OPENAI_API_KEY`. Put the script in the root of the folder that contains the `.tex` files.

```python
# Generate a description and keywords for every .tex file under this folder.
import time
from pathlib import Path

from openai import OpenAI

ROOT = Path(__file__).resolve().parent
MODEL = "gpt-5.5"
MAX_FILES = 20  # files to process per run

DESCRIBE = (
    "You will be given LaTeX source code for a diagram. "
    "Describe what the diagram shows. Ignore syntax errors and incomplete code. "
    "Do not correct the code or output any code."
)
KEYWORDS = (
    "You will be given LaTeX source code for a diagram. "
    "Reply with keywords for the diagram as one comma-separated line and no other text. "
    "Do not include the words latex, diagram, documentclass or usepackage. "
    "Do not give examples or code. Every keyword must be at least 3 letters."
)

client = OpenAI()  # reads OPENAI_API_KEY from the environment


def ask(instructions: str, tex_source: str) -> str:
    response = client.responses.create(
        model=MODEL,
        instructions=instructions,
        input=tex_source,
    )
    return response.output_text.strip()


def main() -> None:
    processed = 0
    for tex_path in sorted(ROOT.rglob("*.tex")):
        description_path = tex_path.with_name(f"{tex_path.stem}_description.txt")
        keywords_path = tex_path.with_name(f"{tex_path.stem}_keywords.txt")

        # Skip files that were already handled in a previous run
        if description_path.exists() and keywords_path.exists():
            continue

        tex_source = tex_path.read_text(encoding="utf-8", errors="ignore")

        if not description_path.exists():
            description_path.write_text(ask(DESCRIBE, tex_source), encoding="utf-8")
        if not keywords_path.exists():
            keywords_path.write_text(ask(KEYWORDS, tex_source), encoding="utf-8")

        processed += 1
        if processed >= MAX_FILES:
            break
        time.sleep(1)  # spread requests out a little


if __name__ == "__main__":
    main()
```

## How it works

- `ROOT.rglob("*.tex")` finds every LaTeX file below the script's folder.
- If both output files already exist, the file is skipped. That makes the script safe to re-run: each run picks up where the last one stopped.
- Each `.tex` file gets two requests, one with the description instructions and one with the keyword instructions. The prompts are strict ("no other text", "no code") because the output is written to disk as-is.
- `MAX_FILES` caps how many files a single run processes, so a bad prompt doesn't burn through the whole folder before you notice.

## Rate limits

The original version talked to the ChatGPT web app through pyChatGPT, and that needed a lot of care: the script slept a random 3–6 seconds between messages, and after a large burst of requests ChatGPT would lock the session out for about an hour. Each run was also capped at 20 files.

With the API, limits are per account and documented, and the `openai` library retries rate-limit (HTTP 429) errors automatically with backoff. The short `time.sleep` is still there to avoid hammering the API, and `MAX_FILES` is still useful to keep a run's cost predictable.

## Gotchas

- Read a sample of the output before trusting it. The model can describe what a diagram is *probably* meant to be rather than what the code actually draws.
- Models don't always follow formatting instructions exactly, so check the keyword files for extra sentences or banned words before using them.
- `errors="ignore"` drops bytes that aren't valid UTF-8, which is fine for diagram source but can mangle comments written in other encodings.

For the full project, see the LaTeX Diagrams repository and docs site below.

## References

- https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/genTxtFiles.py
- https://github.com/FriendlyUser/latex-diagrams-docs
