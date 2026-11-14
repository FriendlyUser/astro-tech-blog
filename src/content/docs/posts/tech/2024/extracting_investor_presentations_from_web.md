---
title: "Downloading investor presentation audio from a webcast with ffmpeg"
description: "Find the HLS playlist behind a webcast player in your browser's DevTools, save the audio with ffmpeg, and transcribe it with Whisper."
tags: ["Investor Presentation", "Audio Download", "Conference Hosting Software", "Web Development", "ffmpeg", "Transcription", "Machine Learning", "whisper"]
pubDate: "2024-03-19T19:17:25.000Z"
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/14447351.webp"
---

Investor presentations and earnings calls are often published through webcast platforms that only let you play them in the browser. If you want to listen offline or run the audio through a transcription model, you need the underlying stream. This post walks through doing that for a Scotiabank presentation hosted on gowebcasting.com. Only download recordings you have access to, and check the hosting site's terms.

## Why the `<audio>` src doesn't help

The player's HTML looks like this:

```html
<div id="player-media">
    <div id="player-media-container">
        <audio webkit-playsinline="true" controls="true" src="blob:https://www.gowebcasting.com/9734b78d-defd-414d-b1d1-eb693a76b151"></audio>
    </div>
</div>
```

A `blob:` URL isn't a file on the server. The page's JavaScript player (typically hls.js or similar) downloads the stream in segments, feeds them to the browser through Media Source Extensions, and the browser gives that in-memory buffer a `blob:` URL. It only exists inside that tab, so you can't download it with `curl` or open it in another window. You need the URL the player is fetching from.

## Find the playlist URL in DevTools

1. Open DevTools (F12) and switch to the **Network** tab.
2. Type `m3u8` into the filter box.
3. Start playback so the player requests the stream.
4. Copy the URL of the playlist request. If there's a master playlist and several variant playlists, either works with ffmpeg. The master lets ffmpeg pick a stream.

For this presentation, the URL was:

```text
https://5b54b4fce3488.streamlock.net/vods3/_definst_/mp4:amazons3/gowebflash/scotiabank/scotiabank_240227p1.mp4/playlist.m3u8
```

`.m3u8` is an HLS playlist: a text file listing the media segments. ffmpeg reads it, downloads the segments and stitches them together.

## Download with ffmpeg

```shell
ffmpeg -i "https://5b54b4fce3488.streamlock.net/vods3/_definst_/mp4:amazons3/gowebflash/scotiabank/scotiabank_240227p1.mp4/playlist.m3u8" \
  -c copy -bsf:a aac_adtstoasc scotiabank_240227p1.mp4
```

`-c copy` remuxes the stream without re-encoding, so it's fast and lossless. `-bsf:a aac_adtstoasc` converts the AAC audio from the ADTS framing used in HLS segments into the form an MP4 container expects.

If the stream also has video and you only want the audio, drop the video with `-vn` and write an `.m4a` file:

```shell
ffmpeg -i "<playlist URL>" -vn -c:a copy -bsf:a aac_adtstoasc scotiabank_240227p1.m4a
```

Playlist URLs on some platforms include short-lived tokens. If ffmpeg gets a 403, copy a fresh URL from DevTools and run it again straight away.

## Transcribe it

[Whisper Web](https://huggingface.co/spaces/Xenova/whisper-web) is a Hugging Face Space that runs OpenAI's Whisper in the browser. Open it, load the file and it produces a transcript, with no install needed.

For long recordings, or to script it, run Whisper locally instead:

```shell
pip install -U openai-whisper
whisper scotiabank_240227p1.m4a --model small --language en --output_format txt
```

The `whisper` CLI needs `ffmpeg` on your `PATH` to decode audio. Larger models (`medium`, `large`) are more accurate on financial jargon and speaker names but are much slower without a GPU.

## Further reading

- [ffmpeg documentation](https://ffmpeg.org/ffmpeg.html)
- [openai/whisper on GitHub](https://github.com/openai/whisper)
