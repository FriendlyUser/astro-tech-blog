---
tags: ['python', 'chatgpt', 'edgegpt']
title: Why my blog post generator uses ChatGPT instead of EdgeGPT (Bing Chat)
description: Notes from porting my ChatGPT blog post generator to EdgeGPT (Bing Chat), including how to strip Bing's citation markers from responses.
pubDate: Fri, 14 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other/output-1.webp
---

:::caution
[EdgeGPT](https://github.com/acheong08/EdgeGPT) was an unofficial, reverse-engineered client for Bing Chat. It was archived in August 2023 and Bing Chat has since been rebranded as Microsoft Copilot, so the code below no longer works. It is kept as a record of how the generator worked. For a maintained way to script an LLM from Python, use an official SDK such as [openai-python](https://github.com/openai/openai-python).
:::

I built a script that generates blog post drafts from a YAML config using ChatGPT (`chatgpt_blog_generator`). I then made a version that talks to Bing Chat through the EdgeGPT library instead (`edgegpt_blog_generator`). The structure is the same: read the config, generate an image, write the frontmatter, then send each section prompt and append the reply.

The conclusion, from the `edgegpt_blog_generator` README: Bing's model is tuned for search, which makes it a weak replacement for ChatGPT. ChatGPT answered the prompts directly, while Bing kept asking for more information before giving a useful answer. So I kept using ChatGPT for my posts.

## Removing Bing's citation markers

Bing's answers include footnote-style citations such as `[^1^]` and `[^2^]` that point to the web sources it searched. Those are noise in a blog post, so the script removes them with a regex:

```python
import re

CITATION = re.compile(r"\[\^\d+\^\]")

text = "Python is a programming language[^1^] created by Guido van Rossum[^2^]."
print(CITATION.sub("", text))
# Python is a programming language created by Guido van Rossum.
```

The pattern matches a literal `[`, a literal `^`, one or more digits, another `^`, and a closing `]`. The original version used `\d`, which only matches single-digit citations and would leave `[^10^]` behind; `\d+` handles any number.

## Getting the reply for a prompt

EdgeGPT's `Chatbot.ask()` returned the whole conversation as a dict, with the messages under `item.messages`. The function below finds the message whose text equals the prompt, takes the message after it (the bot's reply), and strips the citations:

```python
import re

from EdgeGPT.EdgeGPT import Chatbot

CITATION = re.compile(r"\[\^\d+\^\]")


async def handle_prompt(bot: Chatbot, prompt: str) -> str:
    resp = await bot.ask(prompt=prompt)
    messages = resp.get("item", {}).get("messages", [])
    for i, message in enumerate(messages):
        if message.get("text", "") == prompt:
            if i + 1 < len(messages):
                reply = messages[i + 1].get("text", "")
                return CITATION.sub("", reply)
            break
    return ""
```

If the prompt isn't in the conversation, or there is no message after it, the function returns an empty string. (The original version could reach the `re.sub` call with `raw_message` never assigned, which raised an `UnboundLocalError`.)

## The main function

`main` is the same flow as the ChatGPT version, plus copying the finished post and image into this blog's folders. `generate_image`, `generate_frontmatter` and `generate_body` are defined elsewhere in the script.

```python
import os
import shutil

from yaml import Loader, load


async def main(args):
    with open(args.file, "r") as f:
        cfg = load(f, Loader=Loader)

    if os.path.exists(cfg["outputFile"]):
        print("file exists")
        return

    image_path = None
    if cfg.get("imageArgs"):
        image_path = generate_image(cfg)
        # the blog serves images from /imgs/2023
        cfg["frontMatter"]["imgSrc"] = f"/imgs/2023/{os.path.basename(image_path)}"

    generate_frontmatter(cfg)
    await generate_body(cfg)

    # Copy the post and image into the blog repo, if configured
    post_output = cfg.get("postOutput") or {}
    if post_output.get("folder"):
        shutil.copy(cfg["outputFile"], post_output["folder"])
    if image_path and post_output.get("imgFolder"):
        shutil.copy(image_path, post_output["imgFolder"])
```

Compared with the original: `image_path` is only used when an image was actually generated (it was previously unset when `imageArgs` was empty), and the dangling `try:` block without an `except` is gone.

## References

* https://github.com/FriendlyUser/edgegpt_blog_generator
* https://github.com/FriendlyUser/chatgpt_blog_generator
