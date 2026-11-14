---
title: 'Transcribing YouTube livestreams with Whisper, part 2: ffmpeg chunks and wit.ai'
description: How fdrtt splits recorded video into audio chunks with ffmpeg, transcribes them with Whisper, and parsed the streamed wit.ai responses it used before.
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["youtube", "whispers", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/dalle-2022-12-15-20-40-00-blank-transcript.webp'
imgAlt: 'rbc stock analyzer'
---

[Part 1](/posts/stonks/get_transcript_of_youtube_livestreams_part_one/) covered the driver loop in [fdrtt](https://github.com/dli-invest/fdrtt): it records a YouTube livestream in 4.5-minute MP4 chunks and hands each one to `transcribe_audio_whisper`. This post covers that function: splitting video into audio chunks with ffmpeg, running Whisper on them, and the wit.ai parser it replaced.

## Splitting a video into audio chunks

For a finished (non-live) video, `processing.py` first cuts the file into 4.5-minute MP3 chunks. That chunk size came from the wit.ai version, which needed short audio files. Here is the repo version, trimmed of logging:

```python
def split_vid_into_chunks(filename: str, is_livestream: bool = False, chunk_size: int = 4*60+30):
    if not is_livestream:
        length_in_secs = math.ceil(float(get_video_length(filename)))
        for i in range(math.ceil(length_in_secs / chunk_size)):
            start = i * chunk_size
            end = (i + 1) * chunk_size
            chunk_filename = filename.replace(".mp4", f"_{i}.mp3")
            os.system(f"ffmpeg -y -i {filename} -ss {format_seconds(start)} -t {format_seconds(end)} -vn {chunk_filename}")
            yield chunk_filename
    else:
        convert_mp4_to_mp3(filename)
        yield filename
```

It has three bugs:

- **`-t` is a duration, not an end time.** Passing `end` makes chunk `i` run for `(i + 1) * chunk_size` seconds, so the chunks overlap more and more and the transcript repeats itself. Either pass `-t chunk_size` or use `-to end`.
- **The livestream branch always fails.** The helper in the file is named `convert_to_mp4_to_mp3`, so `convert_mp4_to_mp3` raises `NameError`, which the surrounding `try` re-raises as a generic exception. The conversion isn't needed anyway: Whisper decodes MP4 directly through ffmpeg.
- **`-ss` after `-i` is slow.** Placed after the input, ffmpeg decodes and discards everything before the start time. Placed before `-i`, it seeks in the input, which is much faster for later chunks and still frame-accurate when re-encoding.

`os.system` with an unquoted filename also breaks on paths containing spaces. Passing a list to `subprocess.run` avoids that.

## Transcribing with Whisper

The Whisper side was short: load a model, call `transcribe`, join the text.

```python
def get_text_from_mp3_whisper(mp3_file: str):
    model = whisper.load_model("tiny")
    result = model.transcribe(mp3_file)
    return result
```

`load_model` runs on every call. The comment I left above it in the repo (`think I want model loaded and reused?`) was right: loading once and reusing the model saves a few seconds per chunk. `tiny` is the smallest Whisper model, which keeps transcription quick on GitHub's CPU-only runners. Larger models such as `small` or `turbo` are more accurate but far slower without a GPU.

Here is a corrected version of the whole module. It needs `pip install openai-whisper` (version 20250625 at the time of writing) and the `ffmpeg` and `ffprobe` executables on your `PATH`:

```python
import math
import subprocess
from functools import lru_cache

import whisper

CHUNK_SECS = 4 * 60 + 30


@lru_cache(maxsize=None)
def get_model(name: str = "tiny"):
    return whisper.load_model(name)


def get_video_length(path: str) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        check=True, capture_output=True, text=True,
    )
    return float(out.stdout)


def split_vid_into_chunks(filename: str, chunk_size: int = CHUNK_SECS):
    length = math.ceil(get_video_length(filename))
    for i in range(math.ceil(length / chunk_size)):
        chunk_filename = filename.replace(".mp4", f"_{i}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(i * chunk_size), "-i", filename,
             "-t", str(chunk_size), "-vn", chunk_filename],
            check=True, capture_output=True,
        )
        yield chunk_filename


def transcribe_audio_whisper(filename: str, is_livestream: bool = False) -> dict:
    model = get_model()
    if is_livestream:
        # each livestream file is already a single 4.5-minute chunk
        return {"text": model.transcribe(filename)["text"]}
    texts = [model.transcribe(chunk)["text"] for chunk in split_vid_into_chunks(filename)]
    return {"text": "".join(texts)}


if __name__ == "__main__":
    print(transcribe_audio_whisper("video.mp4")["text"])
```

Each segment of Whisper's output text starts with a space, so plain `"".join` keeps words separated across chunks.

With Whisper you don't strictly need to chunk at all. `model.transcribe(path)` reads the whole file and slides a 30-second window over it, and its result includes `segments` with `start` and `end` times. That's a better source of timestamps than counting chunks. I kept the chunks because the rest of the pipeline (Discord posts, database rows) was built around them.

## The wit.ai parser

Before Whisper, fdrtt posted each MP3 to wit.ai's dictation endpoint (`https://api.wit.ai/dictation`). The response body isn't one JSON document. It's a series of pretty-printed JSON objects as wit.ai streams partial results, and only the objects with `"is_final": true` hold finished text. When `r.json()` failed, the repo fell back to scanning lines: an object starts at a line beginning with `{` and ends at a line beginning with `}`.

That depends on wit.ai's exact formatting. `json.JSONDecoder.raw_decode` reads one object at a time from a string and returns where it stopped, so it handles the stream regardless of whitespace:

```python
import json


def parse_witai_response(body: str) -> dict:
    decoder = json.JSONDecoder()
    texts, pos = [], 0
    while (start := body.find("{", pos)) != -1:
        obj, pos = decoder.raw_decode(body, start)
        if obj.get("is_final"):
            texts.append(obj.get("text", ""))
    return {"text": " ".join(texts)}
```

Switching from wit.ai to Whisper was the biggest single improvement to the transcripts. It also removed the need for an API token and the network round trip per chunk.

## Further reading

- [openai/whisper](https://github.com/openai/whisper): model sizes, CLI and Python usage
- [ffmpeg main options](https://ffmpeg.org/ffmpeg.html#Main-options): `-ss`, `-t` and `-to`
- [dli-invest/fdrtt](https://github.com/dli-invest/fdrtt): full source, including `processing.py`
