---
title: A small Gradio web app to transcribe audio with OpenAI Whisper
description: A few lines of Python that wrap OpenAI's open-source Whisper model in a Gradio UI, so you can upload an audio file, such as an investor call, and get a transcript.
alt: Applying nlp to various youtube videos
pubDate: Friday, 5 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["whisper", "gradio", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-14 22.06.43 - blank book open on the coffee table.png'
imgAlt: 'rbc stock analyzer'
---

Transcribing audio turns a recording into text you can search, skim and quote. My use case is investor calls: company executives talk through results and outlook for an hour, and a transcript lets me find the part about margins or guidance without replaying the whole thing.

Whisper is OpenAI's open-source speech recognition model. It runs locally, so this needs no API key. Gradio wraps a Python function in a web UI, so you can upload a file in the browser and see the result.

## Requirements

`requirements.txt`:

```text
openai-whisper
gradio
```

The PyPI package is `openai-whisper`. (An earlier version of this post also listed `whispers`, which is an unrelated tool for finding secrets in config files.) Whisper also needs [ffmpeg](https://ffmpeg.org/) on your `PATH` to decode audio. On Hugging Face Spaces, add `ffmpeg` to `packages.txt`.

## The app

```python
import gradio as gr
import whisper

# Load once at startup, not on every request.
# Sizes: tiny, base, small, medium, large, turbo (bigger = slower but more accurate).
model = whisper.load_model("base")


def transcribe(audio_path: str) -> tuple[str, list]:
    result = model.transcribe(audio_path)
    return result["text"], result["segments"]


gr.Interface(
    fn=transcribe,
    inputs=gr.Audio(type="filepath"),
    outputs=[gr.Textbox(label="Transcript"), gr.JSON(label="Segments")],
    title="OpenAI Whisper: transcribe audio files to text",
).launch()
```

`model.transcribe()` returns a dict with the full `text`, the detected `language`, and a list of `segments`. Each segment has `start` and `end` times in seconds, which is useful for jumping back to a specific part of a call. The app shows the text in a textbox and the segments as JSON.

`gr.Audio(type="filepath")` hands the function a path to a temporary file, which is what `whisper` expects. The original version of this app used `gr.inputs.Audio`; the `gr.inputs`/`gr.outputs` namespaces were removed in Gradio 4, so use the components directly as above.

## Gotchas

- The `base` model is fast on CPU but makes mistakes on names and tickers. `small` or `turbo` are noticeably better if you have a GPU.
- An hour-long call takes a while on CPU. The free Hugging Face Spaces hardware is CPU-only, so stick to the smaller models there.
- Whisper sometimes "hallucinates" text during long silences or music, so check the transcript before quoting it.

## References

- The app is hosted on Hugging Face Spaces: https://huggingface.co/spaces/FriendlyUser/whisper_demo
- [openai/whisper on GitHub](https://github.com/openai/whisper)
- [Gradio Interface docs](https://www.gradio.app/docs/gradio/interface)
