---
tags: ['python', 'chatgpt', 'openai']
title: Generating blog post drafts from a YAML config with ChatGPT and Stable Diffusion
description: A Python script that reads a YAML config, asks ChatGPT for each section, writes Markdown with frontmatter, and generates a header image.
pubDate: Mon, 20 September 2023
lastUpdated: 2026-11-14
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3842597075.png'
---

:::caution
The original script used [pyChatGPT](https://github.com/terry3041/pyChatGPT), which scraped the ChatGPT web app with a browser session cookie. That project was archived in December 2023 because ChatGPT now has an official API. It also used the gRPC `stability_sdk` client with the `stable-diffusion-v1-5` engine; Stability now recommends its REST v2beta API. The script below is updated to use the official `openai` package and Stability's REST endpoint.
:::

This script turns a YAML file into a Markdown blog post. The config lists the frontmatter, the prompts for each section, and optionally an image prompt. The script sends each prompt to ChatGPT, appends the replies to the output file, and saves a generated header image.

## The config file

The script expects a config like this:

```yaml
outputFile: posts/chatgpt_blog_generation.md
programmingLanguage: python
frontMatter:
  title: "Using ChatGPT to generate blog posts"
  tags: ['python', 'chatgpt']
imageArgs:
  prompt: "an open notebook on a desk, digital art"
sections:
  - "What are the main ways to monetize a blog?"
  - type: file
    src: chatgpt_blog_generation.py
```

A section is either a plain prompt string, or a `file` entry. For a file, the script writes the source code into the post and then asks ChatGPT to explain it.

## The script

Install the dependencies with `pip install openai requests pyyaml`, and set `OPENAI_API_KEY` and `STABILITY_API_KEY` in your environment.

````python
import argparse
import os
import sys

import requests
import yaml
from openai import OpenAI

MODEL = "gpt-5.5"
client = OpenAI()  # reads OPENAI_API_KEY from the environment


def generate_image(cfg: dict) -> str:
    """Generate a header image with Stability's Stable Image Core endpoint."""
    response = requests.post(
        "https://api.stability.ai/v2beta/stable-image/generate/core",
        headers={
            "Authorization": f"Bearer {os.environ['STABILITY_API_KEY']}",
            "Accept": "image/*",
        },
        files={"none": ""},  # forces a multipart/form-data request
        data={"prompt": cfg["imageArgs"]["prompt"], "output_format": "png"},
        timeout=120,
    )
    response.raise_for_status()

    os.makedirs("images", exist_ok=True)
    stem = os.path.splitext(os.path.basename(cfg["outputFile"]))[0]
    image_path = os.path.join("images", f"{stem}.png")
    with open(image_path, "wb") as f:
        f.write(response.content)
    return image_path


def generate_frontmatter(cfg: dict) -> None:
    # yaml.safe_dump quotes values that need it (e.g. titles containing a colon)
    with open(cfg["outputFile"], "w", encoding="utf-8") as f:
        f.write("---\n")
        f.write(yaml.safe_dump(cfg["frontMatter"], sort_keys=False, allow_unicode=True))
        f.write("---\n\n")


def use_programming_language(cfg: dict, text: str) -> str:
    """Tag bare ``` opening fences with the configured language."""
    language = cfg["programmingLanguage"]
    lines = []
    in_block = False
    for line in text.split("\n"):
        if line.strip().startswith("```"):
            if not in_block and line.strip() == "```":
                line = f"```{language}"
            in_block = not in_block
        lines.append(line)
    return "\n".join(lines)


def generate_body(cfg: dict) -> None:
    messages = []  # keep the conversation so later sections have context
    with open(cfg["outputFile"], "a", encoding="utf-8") as f:
        for section in cfg["sections"]:
            if isinstance(section, str):
                prompt = section
            elif section.get("type") == "file":
                with open(section["src"], encoding="utf-8") as src_file:
                    src_text = src_file.read()
                f.write(f"```{cfg['programmingLanguage']}\n{src_text.rstrip()}\n```\n\n")
                prompt = f"Explain what this code does:\n\n{src_text}"
            else:
                raise ValueError(f"Unsupported section: {section!r}")

            messages.append({"role": "user", "content": prompt})
            completion = client.chat.completions.create(model=MODEL, messages=messages)
            reply = completion.choices[0].message.content
            messages.append({"role": "assistant", "content": reply})
            f.write(use_programming_language(cfg, reply) + "\n\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default="posts/chatgpt_blog_generation.yml")
    args = parser.parse_args()

    with open(args.file, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    if os.path.exists(cfg["outputFile"]):
        print(f"{cfg['outputFile']} already exists, skipping")
        sys.exit(0)

    if cfg.get("imageArgs"):
        print("saved image to", generate_image(cfg))

    generate_frontmatter(cfg)
    generate_body(cfg)
````

## How it works

- **Skip existing posts.** If `outputFile` already exists the script exits, so re-running it over a folder of configs only generates the new ones.
- **Frontmatter.** The original wrote `key: value` lines by hand, which produced invalid YAML as soon as a title contained a colon. `yaml.safe_dump` handles quoting.
- **Conversation history.** pyChatGPT kept one browser conversation open, so each prompt could refer to earlier answers. With the API you have to send the history yourself, which is what the `messages` list does.
- **Code fences.** ChatGPT sometimes returns code blocks without a language tag. `use_programming_language` tags bare opening fences with the language from the config so the blog's syntax highlighter picks them up. The original version also stripped stray backticks that the web scraper left on each line; the API doesn't add those, so that step is gone.

## Gotchas

- Everything the model writes goes straight into the post. Read and edit the output before publishing: generated text tends to be generic, and generated explanations of code can be wrong.
- Every section is a paid API call, and the whole conversation is resent each time, so long configs get more expensive per section.
- If the image request fails (bad key, no credits, rejected prompt), `raise_for_status()` stops the run before any Markdown is written.

## Further reading

- [OpenAI Python library](https://github.com/openai/openai-python)
- [Stability AI API reference](https://docs.stability.ai/api-reference)
