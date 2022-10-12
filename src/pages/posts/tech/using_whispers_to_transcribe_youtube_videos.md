---
title: How to transcribe youtube videos using whispers
description: How to insert transcripts into videos using whispers
pubDate: Saturday, 5 October 2022 13:00:00 GMT
tags: ["whispers", "openai", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-09 18.23.12 - microphone.png'
---


# Summary

In order to add transcripts to youtube videos, you can use whispers. Whispers is a new transcription tool from openai. First, we must download the youtube videos, then we can use `ffmpeg` to convert the audio to mp3. Then we can use the whispers library to transcribe the audio. Keep in mind that whispers also works with mp4 files and requires ffmpeg to be installed.

I reused some functions from my `fdrrt` project and so thats why the code is a bit messy. I will clean it up in the future.
```python
def get_video_metadata(video_url: str = "https://www.youtube.com/watch?v=21X5lGlDOfg&ab_channel=NASA")-> dict:
    with youtube_dl.YoutubeDL({'outtmpl': '%(id)s.%(ext)s'}) as ydl:
        info_dict = ydl.extract_info(video_url, download=False)
        video_title = info_dict.get('title', None)
        uploader_id = info_dict.get('uploader_id', None)
        print(f"[youtube] {video_title}: {uploader_id}")
    return info_dict


def parse_metadata(metadata) -> dict:
    """
    Parse metadata and send to discord.
    After a video is done recording, 
    it will have both the livestream format and the mp4 format.
    """
    # send metadata to discord
    formats = metadata.get("formats", [])
    # filter for ext = mp4
    mp4_formats = [f for f in formats if f.get("ext", "") == "mp4"]
    format_ids = [int(f.get("format_id", 0)) for f in mp4_formats]
    if livestream_entries := list(
        set(format_ids).intersection(youtube_livestream_codes)
    ):
        # get the first one
        livestream_entries.sort()
        selected_id = livestream_entries[0]

    video_entries = sorted(set(format_ids).intersection(youtube_mp4_codes))

    is_livestream = True
    if len(video_entries) > 0:
        # use video format id over livestream id if available
        selected_id = video_entries[0]
        is_livestream = False

    # TODO use video format if available
    return {
        "selected_id": selected_id,
        "is_livestream": is_livestream,
    }
```

I extract the metadata from the video using `youtube-dl` and then I parse the metadata to get the format id of the video. I then use that format id to download the video.
```python

def get_video(url: str, config: dict):
    """
    Get video from start time.
    """
    # result = subprocess.run()
    # could delay start time by a few seconds to just sync up and capture the full video length
    # but would need to time how long it takes to fetch the video using youtube-dl and other adjustments and start a bit before
    filename = config.get("filename", "livestream01.mp4")
    end = config.get("end", "00:00:10")
    overlay_file = ffmpeg.input(filename)
    (
        ffmpeg
        .input(url, t=end)
        .output(filename)
        .run()
    )

def get_all_files(url: str, end: str = "00:01:30"):
    metadata = get_video_metadata(url)
    temp_dict = parse_metadata(metadata)
    selected_id = temp_dict.get("selected_id", 0)
    formats = metadata.get("formats", [])
    selected_format = [f for f in formats if f.get("format_id", "") == str(selected_id)][0]
    format_url = selected_format.get("url", "")
    filename = f"{metadata.get('id', '')}.mp4"
    filename = filename.replace("-", "")
    get_video(format_url, {"filename": filename, "end": "00:01:30"})
```

`ffmpeg` is much more efficient than `youtube-dl` (outdated) for downloading videos. The library `youtube-dl` is unoptimized for the new youtube formats.

The standard `ffmpeg` command to extract the audio content in a file and save it as an mp3 is:

```bash
ffmpeg -i input.mp4 -vn output.mp3
```

To extract the audio from a youtube video, in the standard (srt) format for transcripts, you need to format the timestamps from whisper appropriately

```python
import whisper

def main():
    model = whisper.load_model("small")
    options = dict(language="Japanese")
    transcribe_options = dict(task="translate", **options)
    result = model.transcribe("a4Vi7YUp9ws.mp3", **transcribe_options)
    return result
```

The code above will load the whispers model and return the result. Then we can parse the result to get the timestamps and the text.


The code above will convert the timestamps to the srt format. The output will look like this:

```srt
0
00:00:00,000 --> 00:00:06,500
I'm a person, I wonder what troubles you?
```

Get all the text segmented, get start and end times, format the start and end times, and then write to a file.

```python
def second_to_timecode(x: float) -> str:
    hour, x = divmod(x, 3600)
    minute, x = divmod(x, 60)
    second, x = divmod(x, 1)
    millisecond = int(x * 1000.)

    return '%.2d:%.2d:%.2d,%.3d' % (hour, minute, second, millisecond)

if __name__ == "__main__":
    result = main()
    lines = []
    for count, segment in enumerate(result.get("segments")):
        # print(segment)
        start = segment.get("start")
        end = segment.get("end")
        lines.append(f"{count}")
        lines.append(f"{second_to_timecode(start)} --> {second_to_timecode(end)}")
        lines.append(segment.get("text", "").strip())
        lines.append('')
    words = '\n'.join(lines)
    with open("transcript.srt", "w") as f:
        f.write(words)
```

Finally, you can add the transcript to your video using `ffmpeg`:

```bash
ffmpeg -i <file_name>.mp4 -vf subtitles=transcript.srt mysubtitledmovie.mp4
```

For a sample video you can view the output here:

https://www.youtube.com/watch?v=WkYwji87Fj8

In the next post I will cover how to make a video using remotion.

## References

In the next article I will show to make a simple desktop app using tkinter to transcribe youtube videos, should have basic ui (file uploader).

* https://github.com/FriendlyUser/auto_youtube_caption_system
