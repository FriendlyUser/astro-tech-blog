---
tags: ['python', 'whispers', 'gradio']
title: Transcribing and subtitling YouTube videos with Whisper, yt-dlp and Gradio
description: A Gradio app that downloads a YouTube video with yt-dlp, transcribes or translates it with OpenAI Whisper, writes an SRT file, and burns the subtitles in with ffmpeg.
pubDate: Fri, 14 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/492664568.webp
---

This is the code behind my [YoutubeDownloaderSubber](https://huggingface.co/spaces/FriendlyUser/YoutubeDownloaderSubber) Hugging Face Space. Give it a YouTube URL (or upload an audio file) and it:

1. grabs the first 15 minutes of the video with yt-dlp and ffmpeg,
2. transcribes it with Whisper, or translates it to English,
3. writes the result as an `.srt` subtitle file,
4. burns the subtitles into a copy of the video.

The defaults are Japanese as the source language and translation to English.

## Install

```bash
pip install openai-whisper yt-dlp ffmpeg-python gradio
```

You also need the `ffmpeg` binary on your `PATH`; both Whisper and `ffmpeg-python` shell out to it. Note that the PyPI package for Whisper is `openai-whisper`, not `whisper` (that's an unrelated package).

:::caution
`ffmpeg-python` hasn't had a release since 0.2.0 in 2019. It still works because it only builds an `ffmpeg` command line, but if it breaks for you, calling `ffmpeg` with `subprocess.run` does the same job.
:::

## Getting the video

The original version of this code hard-coded lists of YouTube format IDs for livestreams and regular uploads and picked one by hand. That's fragile: YouTube adds and removes format IDs, and the code raised an `UnboundLocalError` when none of them matched. yt-dlp's format selector does the same job: `best[ext=mp4]/best` picks the best single file that already contains both audio and video, preferring MP4. With `download=False`, `extract_info` returns the selected format's direct URL in `info["url"]`.

```python
import os

import ffmpeg
import gradio as gr
import whisper
from yt_dlp import YoutubeDL

model = whisper.load_model("medium")  # load once at startup, not on every request


def second_to_timecode(x: float) -> str:
    """Format seconds as an SRT timestamp, e.g. 00:01:02,500."""
    hour, x = divmod(x, 3600)
    minute, x = divmod(x, 60)
    second, x = divmod(x, 1)
    millisecond = int(x * 1000)
    return "%02d:%02d:%02d,%03d" % (hour, minute, second, millisecond)


def get_stream_url(video_url: str) -> str:
    with YoutubeDL({"format": "best[ext=mp4]/best", "quiet": True}) as ydl:
        info = ydl.extract_info(video_url, download=False)
    print(f"[youtube] {info.get('title')}: {info.get('uploader_id')}")
    return info["url"]


def get_video(stream_url: str, filename: str = "temp.mp4", end: str = "00:15:00") -> str:
    # t=end on the input stops reading after that duration
    ffmpeg.input(stream_url, t=end).output(filename).run(overwrite_output=True)
    return filename
```

Because ffmpeg reads the stream URL directly, this also works on a livestream that's still running: it records `end` worth of the stream and stops.

## Transcribing and writing subtitles

```python
def transcribe(input_type: str, audio_file: str, url: str, task: str, language: str):
    for f in ("transcript.srt", "temp.mp4", "subtitled.mp4"):
        if os.path.exists(f):
            os.remove(f)

    if input_type == "url":
        source = get_video(get_stream_url(url))
    else:
        source = audio_file

    result = model.transcribe(source, task=task, language=language)

    lines = []
    for i, segment in enumerate(result["segments"], start=1):  # SRT cues start at 1
        lines.append(str(i))
        lines.append(f"{second_to_timecode(segment['start'])} --> {second_to_timecode(segment['end'])}")
        lines.append(segment["text"].strip())
        lines.append("")
    srt = "\n".join(lines)
    with open("transcript.srt", "w", encoding="utf-8") as f:
        f.write(srt)

    output_file = None  # an uploaded audio file has no video to subtitle
    if input_type == "url":
        try:
            inp = ffmpeg.input("temp.mp4")
            video = inp.video.filter("subtitles", "transcript.srt")
            ffmpeg.output(video, inp.audio, "subtitled.mp4").run(overwrite_output=True)
            output_file = "subtitled.mp4"
        except ffmpeg.Error as e:
            print("failed to burn subtitles:", e)
            output_file = "temp.mp4"

    return result["segments"], srt, output_file
```

A few details that matter here:

- `task="translate"` makes Whisper output English regardless of the source language; `task="transcribe"` keeps the original language. Whisper accepts language names such as `"Japanese"` as well as codes such as `"ja"`.
- The `subtitles` filter only applies to the video stream. Applying it to the whole input and writing that out drops the audio, so the audio stream is passed to `ffmpeg.output` separately.
- The `medium` model is slow on CPU. On a free Hugging Face Space, `small` or `base` is a more realistic choice.

## The Gradio interface

```python
demo = gr.Interface(
    fn=transcribe,
    title="Download video from URL and extract text from audio",
    inputs=[
        gr.Dropdown(["url", "file"], value="url", label="Input type"),
        gr.Audio(type="filepath", label="Audio file"),
        gr.Textbox(label="YouTube URL"),
        gr.Dropdown(["translate", "transcribe"], value="translate", label="Task"),
        gr.Dropdown(["Japanese", "English"], value="Japanese", label="Source language"),
    ],
    outputs=[gr.JSON(label="Segments"), gr.Textbox(label="SRT"), gr.File(label="Video")],
)

if __name__ == "__main__":
    demo.launch()
```

The original version used `gr.inputs.Audio` and `gr.inputs.Textbox` and passed `button_text`/`button_color` to `gr.Interface`. The `gr.inputs` namespace was deprecated in Gradio 3 and no longer exists in current releases, and `button_text`/`button_color` aren't `Interface` parameters; use the components directly from `gr` as above.

## Gotchas

- YouTube changes frequently and yt-dlp keeps up with it. If downloads start failing, upgrade yt-dlp first (`pip install -U yt-dlp`).
- Everything writes to fixed filenames in the working directory, so two users hitting the app at once will overwrite each other's files. For anything beyond personal use, write to a `tempfile.TemporaryDirectory()` per request.
- Whisper can hallucinate repeated lines during long silences or music. Check the SRT before publishing it.

## References

- [YoutubeDownloaderSubber on Hugging Face](https://huggingface.co/spaces/FriendlyUser/YoutubeDownloaderSubber)
- [OpenAI Whisper](https://github.com/openai/whisper)
- [yt-dlp format selection](https://github.com/yt-dlp/yt-dlp#format-selection)
- [Gradio Interface docs](https://www.gradio.app/docs/gradio/interface)
