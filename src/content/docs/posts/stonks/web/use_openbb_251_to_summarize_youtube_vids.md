---
tags: ['python', 'openbb', 'gradio', 'whisper']
title: Summarizing YouTube videos with OpenBB 2.5's Whisper pipeline and Gradio
description: How I wrapped OpenBB Terminal 2.5.1's transcribe_and_summarize function in a Gradio app that returns a summary and subtitles for a YouTube link.
pubDate: Sunday, 12 March 2023
lastUpdated: 2026-11-14
imgSrc: /imgs/2023/3870845711.png
layout: '@/templates/BasePost.astro'
---

:::caution
This post depends on the old OpenBB Terminal (`openbb_terminal`), which OpenBB sunset in March 2024 in favour of the OpenBB Platform (v4) and its CLI. `transcribe_and_summarize` does not exist in current OpenBB releases. To run the code below you must pin `openbb[forecast]==2.5.1`, which requires Python 3.8 to 3.10. For new projects, call the same building blocks directly: [yt-dlp](https://github.com/yt-dlp/yt-dlp), [openai-whisper](https://github.com/openai/whisper) and a summarization model or LLM.
:::

A lot of finance content is long YouTube videos: earnings recaps, interviews, conference talks. I wanted a quick way to get a summary and a transcript of a video without watching it. OpenBB Terminal 2.5.1 shipped a `transcribe_and_summarize` function in its forecast menu that does the whole pipeline, so I wrapped it in a small Gradio app and hosted it on Hugging Face Spaces.

## What transcribe_and_summarize does

Given a YouTube URL, the OpenBB function:

1. downloads the audio with `yt-dlp`,
2. transcribes it with OpenAI's Whisper (the `base` model by default) and writes a subtitle file (`.vtt` by default),
3. splits the transcript into 1,024-character chunks, summarizes each with Hugging Face Transformers (`facebook/bart-large-cnn`), concatenates the results, scores their sentiment, and writes a `*_summary.txt` file.

Before downloading the models it asks for confirmation with `input()`, three prompts in total. That's fine in a terminal but blocks in a web app, which is why the code below feeds it a fake stdin.

## The app

```bash
pip install "openbb[forecast]==2.5.1" gradio
```

```python
import glob
import os
import re
import sys
from io import StringIO

import gradio as gr
from openbb_terminal.forecast.whisper_model import transcribe_and_summarize


def newest(pattern):
    """Most recently created file matching pattern, or None."""
    matches = glob.glob(pattern, recursive=True)
    return max(matches, key=os.path.getctime) if matches else None


def read_or(path, fallback):
    if path is None:
        return fallback
    with open(path, encoding="utf-8") as f:
        return f.read()


def summarize_video(url):
    match = re.search(r"v=([\w-]{11})", url)
    if not match:
        return "Please enter a YouTube URL", ""
    video_id = match.group(1)

    # Whisper caches its models here; the directory has to exist
    os.makedirs(os.path.expanduser("~/.cache/whisper"), exist_ok=True)

    # transcribe_and_summarize asks "y/n" before downloading each model.
    # It needs 3 answers; 5 is safer.
    old_stdin = sys.stdin
    sys.stdin = StringIO("\n".join(["y"] * 5))
    try:
        transcribe_and_summarize(video=url, output_dir=video_id)
    finally:
        sys.stdin = old_stdin

    # Prefer files in the video's own folder, fall back to the newest anywhere below cwd
    summary_file = newest(f"{video_id}/*_summary.txt") or newest("**/*_summary.txt")
    subtitle_file = (
        newest(f"{video_id}/*.vtt")
        or newest(f"{video_id}/*.srt")
        or newest("**/*.vtt")
        or newest("**/*.srt")
    )
    return (
        read_or(summary_file, "No summary file found"),
        read_or(subtitle_file, "No subtitle file found"),
    )


gr.Interface(
    fn=summarize_video,
    inputs=gr.Textbox(label="Enter a YouTube URL"),
    outputs=[gr.Textbox(label="Summary"), gr.Textbox(label="Subtitles")],
    title="YouTube Video Summarization",
).launch()
```

Changes from the version first published here:

- The video ID regex now allows `-`, which appears in many YouTube IDs. It still only handles `watch?v=` links, not `youtu.be/` short links.
- The stdin swap is restored in a `finally` block, so an exception can't leave `sys.stdin` replaced.
- The original returned a single string from one branch while the interface expects two outputs, and its `glob("**/...")` calls lacked `recursive=True`, so they only searched one directory level deep. `max()` on an empty list also raised instead of falling back.
- `gr.inputs.Textbox` and `gr.outputs.Textbox` were removed in Gradio 4. `gr.Textbox` works in both Gradio 3 and current versions.

## Gotchas

- Because each chunk is summarized on its own, the output for a long video reads like a list of chunk summaries rather than one coherent summary.
- Free Hugging Face Spaces run on CPU, so transcribing a long video with Whisper takes minutes, not seconds.
- If you rebuild this without OpenBB, sending the Whisper transcript to an LLM is the simpler route for the summary step: it accepts much longer inputs than BART and you can ask for specific things, like the numbers management gave for next quarter.

## References

- [The app's source on Hugging Face Spaces](https://huggingface.co/spaces/FriendlyUser/summarizeyoutube/blob/main/app.py)
- [OpenBB: Sunsetting the OpenBB Terminal](https://openbb.co/blog/sunsetting-openbb-terminal-why-how-and-what-now/)
