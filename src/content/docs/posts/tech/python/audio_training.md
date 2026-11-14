---
tags: ['python', 'tortoise-tts', 'ffmpeg', 'youtube']
title: Cutting voice clips from YouTube videos with yt-dlp and ffmpeg
description: A Python script that downloads a YouTube video's audio with yt-dlp and cuts it into short WAV clips with ffmpeg, for use as Tortoise TTS voice samples.
pubDate: Fri, 29 November 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1693067648.webp
---
Voice-cloning models like [Tortoise TTS](https://github.com/neonbjb/tortoise-tts) need a few short, clean recordings of the target voice. Its [voice customization guide](https://github.com/neonbjb/tortoise-tts/blob/main/voice_customization_guide.md) asks for at least three clips of about 10 seconds each, saved as floating-point WAV at 22,050 Hz. This script builds those clips from a YouTube video: it downloads the audio with yt-dlp, then cuts the time ranges listed in a JSON config with ffmpeg.

The original version (adapted from the [YoutubeDownloaderSubber](https://huggingface.co/spaces/FriendlyUser/YoutubeDownloaderSubber/blob/main/app.py) Space) picked a video format by hard-coded YouTube format IDs, streamed it through the `ffmpeg-python` wrapper, then cut clips. It had a few bugs:

- `parse_metadata()` could hit `UnboundLocalError` when no format matched, and it picked the *lowest* matching format ID rather than the best quality.
- Hard-coded format IDs break whenever YouTube changes the formats it serves.
- Clips were cut with `-t end`, but `-t` is a *duration*, so a clip from 30 s to 40 s came out 40 seconds long.
- The cleanup loop at the end had an empty `if` body, which is a syntax error.

The version below asks yt-dlp for the best audio stream and converts it to WAV in one step, then calls the `ffmpeg` CLI directly with `subprocess`.

## Setup

You need ffmpeg on your `PATH` and a recent yt-dlp. Since yt-dlp 2025.11.12, YouTube downloads also expect an external JavaScript runtime; [Deno](https://deno.com/) is the one yt-dlp enables by default. The `default` extra installs the `yt-dlp-ejs` component that talks to the runtime:

```bash
pip install -U "yt-dlp[default]"
```

## Config

Each clip has a start and end time in seconds:

```json
{
  "url": "https://www.youtube.com/watch?v=21X5lGlDOfg",
  "name": "speaker",
  "clips": [
    { "start": 30, "end": 40, "name": "speaker" },
    { "start": 95, "end": 105, "name": "speaker" },
    { "start": 210, "end": 220, "name": "speaker" }
  ]
}
```

## Script

```python
import argparse
import json
import subprocess
from pathlib import Path

from yt_dlp import YoutubeDL


def download_audio(url: str, name: str, workdir: Path) -> Path:
    """Download the best audio stream and convert it to WAV."""
    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / f"{name}.%(ext)s"),
        "postprocessors": [
            {"key": "FFmpegExtractAudio", "preferredcodec": "wav"},
        ],
    }
    with YoutubeDL(opts) as ydl:
        ydl.download([url])
    return workdir / f"{name}.wav"


def cut_clip(source: Path, start: float, end: float, out: Path) -> None:
    """Cut [start, end) seconds into a mono, 22.05 kHz, 32-bit float WAV."""
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-i", str(source),
            "-ss", str(start),
            "-to", str(end),
            "-ac", "1",
            "-ar", "22050",
            "-c:a", "pcm_f32le",
            str(out),
        ],
        check=True,
    )


def main(cfg: dict) -> None:
    out_dir = Path("audio")
    out_dir.mkdir(exist_ok=True)

    source = download_audio(cfg["url"], cfg.get("name", "source"), Path("."))
    try:
        for index, clip in enumerate(cfg.get("clips", [])):
            out = out_dir / f"{clip.get('name', 'clip')}_{index}.wav"
            cut_clip(source, clip["start"], clip["end"], out)
    finally:
        source.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Cut WAV clips from a YouTube video")
    parser.add_argument("--cfg", default="cfg/clips.json", help="Path to the JSON config")
    args = parser.parse_args()

    with open(args.cfg, "r", encoding="utf-8") as f:
        main(json.load(f))
```

Run it with `python make_clips.py --cfg cfg/clips.json`. The clips end up in `audio/` as `speaker_0.wav`, `speaker_1.wav`, and so on.

## Notes

- `-ss` and `-to` are placed after `-i`, so ffmpeg decodes from the start and cuts exactly at the requested times. For a long video, moving both `-ss` and `-to` before `-i` seeks faster.
- Pick ranges where only the target speaker is talking, with no music or crowd noise.
- Check that you're allowed to download the video under YouTube's terms and that you have the speaker's consent to clone their voice.

## References

- https://github.com/FriendlyUser/Pirates-Game/tree/master
- https://github.com/yt-dlp/yt-dlp
- https://github.com/neonbjb/tortoise-tts/blob/main/voice_customization_guide.md
