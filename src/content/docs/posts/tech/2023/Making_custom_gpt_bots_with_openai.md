---
description: How I used OpenAI's custom GPTs to build one ChatGPT bot for small coding chores like type conversions, string tricks, Base64 and Mermaid diagrams.
imgSrc: /imgs/2023/progress.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-09T15:20:34.000Z'
lastUpdated: 2026-11-14
tags: ['ChatGPT', 'AI Chatbots', 'Programming', 'Automation', 'Mermaid Diagrams', 'openai']
title: "Building a custom GPT for everyday coding chores"
---

OpenAI announced custom GPTs at its first developer conference (DevDay) in San Francisco in November 2023. A GPT is a version of ChatGPT with your own instructions, optional uploaded files, and optional tools such as web browsing and DALL-E image generation. You configure it by chatting with a builder or filling in a form, with no code required.

I used one to replace a handful of single-purpose websites I kept visiting for small coding chores. Instead of opening a Base64 decoder in one tab and a diagram tool in another, I ask the same bot.

## What my bot does

You can try it here: [Custom ChatGPT Bot](https://chat.openai.com/share/02cf4cbd-0574-4aee-8e24-1ad6d02d234d).

It's set up for:

- **Type conversions** between strings, integers, floats, booleans and so on.
- **Diagrams**: UML and Mermaid charts for visualising code and workflows.
- **String manipulation**: reversing, concatenating and parsing strings.
- **Encoding**: Base64 encoding and decoding.

The Mermaid output is the part I use most. The bot writes the diagram source, and I paste it into a Mermaid viewer to render it. For example:

https://www.mermaidchart.com/raw/b78e5405-cb5f-481d-ad22-14c09bab86f9?theme=light&version=v0.1&format=svg

## Caveats

- **Check deterministic work.** A language model can get Base64 or type conversions wrong, especially on long inputs. For anything that matters, verify the result with a real tool, such as `base64` on the command line or Python's `base64` module.
- **Instructions shape the output.** Most of the work in making a useful GPT is writing clear instructions about what it should and shouldn't do. You can also tell it what response style to use, such as "return only the code block".

## The GPT Store

At DevDay, OpenAI also announced a GPT Store where people could publish and find GPTs, and said builders would be paid based on how much their GPTs were used. The store opened in January 2024, initially for paid ChatGPT plans (Plus, Team and Enterprise), with GPTs checked by a mix of human and automated review.

## Further reading

- [Introducing GPTs (OpenAI)](https://openai.com/index/introducing-gpts/)
- [Introducing the GPT Store (OpenAI)](https://openai.com/index/introducing-the-gpt-store/)
