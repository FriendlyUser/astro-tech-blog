---
title: 'Transcribing YouTube livestreams with Whisper, part 1: the transcription loop'
description: How my fdrtt project records a YouTube livestream in 4.5-minute chunks, transcribes each with Whisper, and posts the text to Discord from GitHub Actions.
alt: Applying nlp to various youtube videos
pubDate: Friday, 13 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["youtube", "whispers", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-15 20.40.00 - blank transcript.png'
imgAlt: 'rbc stock analyzer'
---

:::caution[Updated in November 2026]
This project uses `youtube-dl`, whose last PyPI release was 2021.12.17. Use [yt-dlp](https://github.com/yt-dlp/yt-dlp), the maintained fork, instead. Its `YoutubeDL(...).extract_info(url, download=False)` call works the same way. The project also stored transcripts in PlanetScale, which dropped its free Hobby plan in April 2024.
:::

[fdrtt](https://github.com/dli-invest/fdrtt) ("free delayed real-time transcription") is a small tool I wrote to follow finance livestreams, such as Yahoo Finance's daily stream or a Fed press conference, without watching them. It records a livestream in short chunks, transcribes each chunk, stores the text in a MySQL table, and posts it to a Discord channel through a webhook. Everything runs on GitHub Actions, so it costs nothing.

The first version sent audio to Facebook's [wit.ai](https://wit.ai/) dictation API. I switched to OpenAI's [Whisper](https://github.com/openai/whisper) and the transcripts got much better.

This post covers the driver code. [Part 2](/posts/stonks/get_transcript_of_youtube_livestreams_part_two/) covers how the audio gets split and transcribed.

## Transcribing a single video

The simplest entry point, `transcribe_video.py`, takes a URL or a local path, transcribes the file, saves the result as JSON, and posts the text to Discord. This is slightly tidied from the repo:

```python
import argparse
import json

import requests

from processing import transcribe_audio_whisper  # fdrtt, see part 2
from utils import send_discord_msg               # POSTs JSON to the DISCORD_WEBHOOK URL

CHUNK_SIZE = 1900  # Discord rejects message content longer than 2000 characters


def download_file_from_url(url: str, filename: str) -> None:
    print("downloading video", url)
    with requests.get(url, stream=True, timeout=60) as response:
        response.raise_for_status()
        with open(filename, "wb") as file:
            for block in response.iter_content(chunk_size=1 << 20):
                file.write(block)


def transcribe_video(url: str) -> None:
    filename = url
    if url.startswith("http"):
        filename = "video.mp4"
        download_file_from_url(url, filename)

    data = transcribe_audio_whisper(filename, False)
    with open(filename.replace(".mp4", ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f)

    text = data.get("text", "")
    for i in range(0, len(text), CHUNK_SIZE):
        send_discord_msg({"content": text[i:i + CHUNK_SIZE]})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe a video from a URL or local path")
    parser.add_argument("--url", required=True, help="URL to download, or a local .mp4 path")
    args = parser.parse_args()
    transcribe_video(args.url)
```

The original read the whole download into memory with `requests.get(url).content` and wrapped each Discord call in `try/except`. That `try` did very little: `send_discord_msg` uses `requests.post`, which doesn't raise on HTTP error codes, so a rejected or rate-limited webhook call (HTTP 429) was dropped silently. If you care about every chunk arriving, check `r.status_code` and back off on 429.

## The livestream driver

The livestream case lives in `transcript_manager.py`, in a class called `FD_RTT`. It's configured mostly through environment variables, because it runs inside a GitHub Actions workflow:

| Variable | Purpose |
| --- | --- |
| `DISCORD_WEBHOOK` | Where transcripts are posted |
| `MAX_ITERATIONS` | Chunks to record per run (default 50; the workflow sets 60) |
| `ITERATION` | Which run in a chain this is, used to compute elapsed time |
| `TABLE_NAME` | MySQL table to write to (otherwise derived from the channel name) |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Database credentials |

```python
CHUNK_SIZE = 1900
VIDEO_CHUNK_LENGTH_IN_SECS = 4 * 60 + 30
MAX_ITERATIONS = int(os.getenv("MAX_ITERATIONS", "50"))
```

### Setup

The constructor calls `get_video_metadata(url)`, which is `youtube_dl.YoutubeDL().extract_info(url, download=False)`. That returns a dict with the title, channel, uploader and a `formats` list containing a direct media URL for each format. It then picks a table name: `TABLE_NAME` if set, otherwise the channel name (with special cases for Yahoo Finance and Bloomberg), otherwise the video ID. It creates the table if needed and records the start time.

### Choosing a format

YouTube exposes livestreams and finished videos under different format IDs. I hard-coded the ones I saw in practice: HLS livestream formats `91`–`96`, `300`, `301`, and regular MP4 formats `18`, `22`, `133`, `134`, `140`, `298`. Once a stream ends and YouTube processes it, the regular formats appear. That's how the script tells a live stream from a finished video.

```python
youtube_livestream_codes = [91, 92, 93, 94, 95, 96, 300, 301]
youtube_mp4_codes = [298, 18, 22, 140, 133, 134]

def parse_metadata(self) -> dict:
    formats = self.metadata.get("formats", [])
    format_ids = {
        int(f["format_id"])
        for f in formats
        if f.get("ext") == "mp4" and str(f.get("format_id", "")).isdigit()
    }

    video_entries = sorted(format_ids & set(youtube_mp4_codes))
    if video_entries:
        return {"selected_id": video_entries[0], "is_livestream": False}

    livestream_entries = sorted(format_ids & set(youtube_livestream_codes))
    if livestream_entries:
        return {"selected_id": livestream_entries[0], "is_livestream": True}

    raise ValueError("no known mp4 or livestream format found")
```

The repo version left `selected_id` unassigned when neither set matched, which crashed with `UnboundLocalError`. It also called `int()` on every format ID, which fails if an ID isn't a plain number (yt-dlp returns some like that). The version above handles both. Hard-coded IDs are fragile anyway, because YouTube changes which formats it serves. With yt-dlp, a format selector such as `-f "bestaudio/best"` is the sturdier choice.

### The loop

`process_video` is the main loop. For a finished video it downloads the first 15 minutes once, transcribes, and stops. For a livestream it does this repeatedly:

1. Record 4 minutes 30 seconds of the stream with ffmpeg (`ffmpeg.input(url, t="0:04:30").output(filename).run()`).
2. Start a background thread that transcribes that file, writes it to the database, and posts it to Discord.
3. Go straight back to recording the next chunk while the previous one is being transcribed.

Every fifth iteration it calls `parse_metadata()` again, and if the stream now has regular MP4 formats, it posts "LIVESTREAM IS FINISHED" with the total run time and exits.

```python
while self.stats["iterations"] < MAX_ITERATIONS:
    try:
        iterations = self.stats["iterations"]
        filename = f"{metadata['id']}_{iterations}.mp4".replace("-", "")
        get_video_from_start(format_url, {"end": "0:04:30", "filename": filename})
        Thread(
            target=self.transcribe,
            args=({"filename": filename, "is_livestream": is_livestream},),
        ).start()
    except Exception as ex:
        ic(ex)
        break
    finally:
        self.stats["iterations"] += 1
        self.stats["run_time"] = time.time() - self.stats["start_time"]
        # every 5 iterations: re-check metadata and exit if the stream ended
```

Because the timer only advances by wall-clock time, each Discord message is prefixed with the elapsed time (`**0d 0h 9m 2s**`), which is good enough to find the part of a speech you care about.

### Chaining runs

A GitHub-hosted runner kills a job after 6 hours. With `MAX_ITERATIONS=60` and 4.5-minute chunks, one run covers about 4.5 hours of stream. For longer streams, `dispatch_another_event.py` triggers the same workflow again through the GitHub API with `iteration` incremented. `ITERATION` is then used to offset the timestamps:

```python
total_secs = self.global_iteration * MAX_ITERATIONS * VIDEO_CHUNK_LENGTH_IN_SECS + self.stats["run_time"]
```

When the stream finishes, the script writes `TERMINATE_LIVESTREAM=TRUE` to `$GITHUB_ENV` so later workflow steps know not to dispatch another run.

### Entry point

```python
def main(params: dict):
    fd_rtt = FD_RTT(params, {})
    fd_rtt.process_video(params.get("url"))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Transcribe a YouTube livestream or video")
    parser.add_argument("--url", required=True, help="YouTube URL")
    parser.add_argument("--exit_for_videos", action="store_true",
                        help="exit immediately if the URL is not a live stream")
    args = parser.parse_args()
    main({"url": args.url, "exit_on_video": args.exit_for_videos})
```

The repo declares `--exit_for_videos` and `--save_to_db` with `default=False`/`default=True` and no `type`. Anything passed on the command line arrives as a non-empty string, which is always truthy, and the class checks `self.exit_on_video is True`, which a string never is. `action="store_true"` fixes that. An earlier version also exited if `WIT_AI_TOKEN` was unset, even when using Whisper. That check is now commented out in the repo.

## Known problems

Things I'd fix before relying on this again:

- **Gaps between chunks.** Each chunk starts a fresh ffmpeg process on the live URL, so audio can be lost or repeated at the boundaries while ffmpeg reconnects and picks a starting segment. Recording continuously with ffmpeg's segment muxer (`-f segment -segment_time 270`) avoids that.
- **Errors end the run.** The `except` block breaks out of the loop on the first error, despite a comment saying it retries. A transient network error stops the transcript.
- **Token timestamps.** `transcribe()` tries to add the elapsed time to `data["tokens"]`, but the elapsed time is a formatted string, so that addition would raise `TypeError`. It never runs, because Whisper's output has `segments`, not `tokens`. Shifting each segment's `start` and `end` by `total_secs` would give real timestamps.
- **Expiring URLs.** The direct media URLs from `extract_info` expire after a few hours, so a long run should re-fetch metadata before reusing `format_url`.

## Source

- [dli-invest/fdrtt](https://github.com/dli-invest/fdrtt): the transcription scripts and GitHub Actions workflows
- [dli-invest/fdrtt-stream](https://github.com/dli-invest/fdrtt-stream): a FastAPI server and Astro site for browsing the stored transcripts
- [Part 2: splitting audio with ffmpeg and transcribing with Whisper](/posts/stonks/get_transcript_of_youtube_livestreams_part_two/)
