---
title: Combining a Cantonese dub with an English-subtitled video using Python and ffmpeg
description: How I grabbed a Cantonese dub with Selenium and yt-dlp, checked it against an English-subbed copy with ffprobe, and merged the two with ffmpeg.
alt: git commits with golang
tags: ["python", "ffmpeg"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 14 July 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/dictionary.png'
---

:::caution
The original version of this post used `youtube-dl`. Its last PyPI release was 2021.12.17; the actively maintained fork is [yt-dlp](https://github.com/yt-dlp/yt-dlp), which takes the same basic command-line arguments. The examples below use `yt-dlp`.
:::

I wanted to watch a show with the Cantonese dub but English subtitles, and no single release had both. The fix was to take the video track from an English-subtitled copy (hard-coded subs) and the audio track from the Cantonese dub, then line them up with ffmpeg.

## My approach

1. Get the Cantonese version from https://ktkkt.top.
2. Get the English-subtitled version from goanime.
3. Use ffmpeg to put the Cantonese audio on the English-subtitled video.

## Finding the Cantonese stream with Selenium

The video on ktkkt is played from an HLS playlist (`.m3u8`) inside an iframe named `cciframe`. I open the page in a remote browser on BrowserStack, switch into that iframe, and save the page source. The `.m3u8` URL can then be pulled out of `source.html`.

```python
import os
import subprocess
import time

from selenium import webdriver

# BrowserStack credentials from environment variables
REMOTE_SELENIUM_USERNAME = os.environ["REMOTE_SELENIUM_USERNAME"]
REMOTE_SELENIUM_KEY = os.environ["REMOTE_SELENIUM_KEY"]


def make_webdriver(build_name: str = "anime_sub_switcher") -> webdriver.Remote:
    options = webdriver.ChromeOptions()
    options.set_capability("bstack:options", {
        "buildName": build_name,
        "userName": REMOTE_SELENIUM_USERNAME,
        "accessKey": REMOTE_SELENIUM_KEY,
    })
    return webdriver.Remote(
        command_executor="https://hub-cloud.browserstack.com/wd/hub",
        options=options,
    )


def extract_url(video_url: str) -> str:
    """Return the HLS playlist URL, adding /index.m3u8 if it's missing."""
    if video_url.endswith(".m3u8"):
        return video_url
    return video_url.rstrip("/") + "/index.m3u8"


def download(url: str) -> None:
    subprocess.run(["yt-dlp", url], check=True)


def get_ktkkt_video_url(ktkkt_url: str) -> None:
    driver = make_webdriver()
    try:
        driver.get(ktkkt_url)
        driver.switch_to.frame("cciframe")
        time.sleep(3)  # give the player time to load
        with open("source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
    finally:
        driver.quit()


if __name__ == "__main__":
    get_ktkkt_video_url("https://ktkkt.top/movie/index14100.html")
```

`source.html` contains the `.m3u8` link, which yt-dlp can download (it uses ffmpeg to join the HLS segments):

```bash
yt-dlp https://v5.szjal.cn/20210624/UYxj8q0t/index.m3u8
```

That specific URL was the one I used in 2023; links like it expire, so expect to find a fresh one. By default yt-dlp names the file after the video title and id; use `-o` to pick a different name.

## Comparing the two versions with ffprobe

Before merging, I checked how the two files differ in length. If the ratio isn't close to 1, one version is sped up (a common frame-rate conversion artefact) or has extra intro/outro footage, and a simple offset won't line them up.

```python
import argparse
import subprocess


def get_video_length(video_file: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", video_file],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("video1")
    parser.add_argument("video2")
    args = parser.parse_args()

    length1 = get_video_length(args.video1)
    length2 = get_video_length(args.video2)

    ratio = length1 / length2
    print(f"Length ratio: {ratio:.4f}")
    if ratio > 1:
        print(f"{args.video1} is {ratio:.4f}x as long as {args.video2}")
    else:
        print(f"{args.video2} is {1 / ratio:.4f}x as long as {args.video1}")
    print(f"Length difference: {length1 - length2:.2f} seconds")
```

Run it with `python compare.py video1.mp4 video2.mp4`.

## Merging with ffmpeg

```bash
ffmpeg -i inu_canton.mp4 -vn -b:a 192k audio.mp3
ffmpeg -i video.mp4 -i audio.mp3 -map 0:v:0 -map 1:a:0 -c copy -shortest new.mp4
ffmpeg -i new.mp4 -itsoffset 12.69 -i new.mp4 -map 0:v:0 -map 1:a:0 -c copy inu_final_done.mp4
```

1. Extract the Cantonese audio as a 192 kbps MP3. `-vn` drops the video; the output format comes from the `.mp3` extension.
2. Take the video stream from `video.mp4` (the English-subtitled copy) and the audio stream from `audio.mp3`, copy both without re-encoding, and stop at the end of the shorter input.
3. Fix the sync. `-itsoffset 12.69` applies to the *second* input, so its audio timestamps are shifted 12.69 seconds later while the video from the first input is unchanged. In other words, the Cantonese audio starts 12.69 seconds after the video. I found the 12.69 by trial and error; use a negative value if the audio needs to start earlier instead.

Because everything uses `-c copy`, each step takes seconds rather than re-encoding the whole episode.

## Further reading

- [ffmpeg documentation](https://ffmpeg.org/ffmpeg.html) (`-itsoffset`, `-map`, `-shortest`)
- [yt-dlp README](https://github.com/yt-dlp/yt-dlp#readme)
