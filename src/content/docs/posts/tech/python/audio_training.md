---
tags: ['python', 'tortoise-tts', 'ffmpeg']
title: Using python to generate audio files from youtube
description: A simple demonstrating how to use ffmpeg and ytp-dl to generate audio clips from youtube videos
pubDate: Fri, 29 November 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1693067648.png
---
Training data is crucial in machine learning as it is used to train models to make accurate predictions on new, unseen data. The quality and quantity of the training data directly affect the performance of the machine learning model.

Machine learning algorithms learn from patterns in data, and the more data they have to learn from, the better they can recognize and adapt to patterns. The training data must be representative of the real-world scenarios that the model will encounter so that the model can learn to make accurate predictions on new, unseen data.

Moreover, training data should be labeled with the correct outcomes to enable supervised learning, which is a popular type of machine learning where the algorithm learns from labeled data to make predictions. In unsupervised learning, where the algorithm learns from unlabeled data to identify patterns and relationships, the training data is still important to create an accurate model.

In summary, high-quality and representative training data is essential for creating accurate and reliable machine learning models.


```python 
 # Copied from https://huggingface.co/spaces/FriendlyUser/YoutubeDownloaderSubber/blob/main/app.py
import ffmpeg
from yt_dlp import YoutubeDL
import argparse
import json
import os
from subprocess import PIPE, run

audio_folder = "audio"
youtube_livestream_codes = [
    91,
    92,
    93,
    94,
    95,
    96,
    300,
    301,
]
youtube_mp4_codes = [
    298,
    18,
    22,
    140,
    133,
    134
]

def second_to_timecode(x: float) -> str:
    hour, x = divmod(x, 3600)
    minute, x = divmod(x, 60)
    second, x = divmod(x, 1)
    millisecond = int(x * 1000.)

    return '%.2d:%.2d:%.2d,%.3d' % (hour, minute, second, millisecond) 
 ```

This code defines a function `second_to_timecode()` that takes a floating-point number `x` as input and returns a string representing the time in the format `hh:mm:ss,mmm`. The function breaks down the input `x` into hours, minutes, seconds, and milliseconds and formats them as a timecode. The purpose of this function is likely to convert timestamps used in video/audio files into a human-readable timecode format.


```python 
 # format float in 00:00:30 format
def format_timecode(x: float) -> str:
    hour, x = divmod(x, 3600)
    minute, x = divmod(x, 60)
    second, x = divmod(x, 1)
    millisecond = int(x * 1000.)

    return '%.2d:%.2d:%.2d' % (hour, minute, second)


def get_video_metadata(video_url: str = "https://www.youtube.com/watch?v=21X5lGlDOfg&ab_channel=NASA")-> dict:
    with YoutubeDL({'outtmpl': '%(id)s.%(ext)s'}) as ydl:
        info_dict = ydl.extract_info(video_url, download=False)
        video_title = info_dict.get('title', None)
        uploader_id = info_dict.get('uploader_id', None)
        print(f"[youtube] {video_title}: {uploader_id}")
    return info_dict


def parse_metadata(metadata) -> str:
    """
    Parse metadata and send to discord.
    After a video is done recording, 
    it will have both the livestream format and the mp4 format.
    """
    # send metadata to discord
    formats = metadata.get("formats", [])
    # filter for ext = mp4
    mp4_formats = [f for f in formats if f.get("ext", "") == "mp4"]
    try:
        format_ids = [int(f.get("format_id", 0)) for f in mp4_formats]
        video_entries = sorted(set(format_ids).intersection(youtube_mp4_codes))

        if len(video_entries) > 0:
            # use video format id over livestream id if available
            selected_id = video_entries[0]
    except Exception as e:
        print(e)
        selected_id = mp4_formats[0].get("format_id")


    return selected_id 
 ```

This code defines three functions:

1. `format_timecode()` which takes a floating-point number `x` as input and returns a string representing the time in the format `hh:mm:ss`.
2. `get_video_metadata()` which takes a YouTube video URL as input and returns a dictionary containing various metadata information about the video such as the video title and uploader ID.
3. `parse_metadata()` which takes the metadata dictionary as input, filters for mp4 formats, and returns the format ID of the mp4 video format to be used. If there are multiple mp4 format options available, the function selects the one with the highest quality. The purpose of this function is likely to retrieve the necessary information from the metadata dictionary to download the desired mp4 format of the YouTube video.

```python 
 def get_video(url: str, config: dict):
    """
    Get video from start time.
    """
    # result = subprocess.run()
    # could delay start time by a few seconds to just sync up and capture the full video length
    # but would need to time how long it takes to fetch the video using youtube-dl and other adjustments and start a bit before
    filename = config.get("filename", "livestream01.mp4")
    end = config.get("end", "00:15:00")
    overlay_file = ffmpeg.input(filename)
    (
        ffmpeg
        .input(url, t=end)
        .output(filename)
        .run()
    )

def get_file_from_yurl(data: dict):
    for f in os.listdir():
        if f.endswith(".mp4"):
            os.remove(f)
    url = data.get("url", "https://www.youtube.com/watch?v=f0UB06v7yLY&ab_channel=CNN")
    metadata = get_video_metadata(url)
    print(metadata)
    selected_id = parse_metadata(metadata)
    formats = metadata.get("formats", [])
    selected_format = [f for f in formats if f.get("format_id", "") == str(selected_id)][0]
    format_url = selected_format.get("url", "")
    filename = data.get("name", "trump") + ".mp4"
    get_video(format_url, {"filename": f"{filename}"})
    return filename

# make clips from videos
 
 ```

This code defines two functions:

1. `get_video()` which takes a YouTube video URL and a dictionary containing configuration information as input. The function uses `ffmpeg` to download the video starting from the beginning and ending at the specified time in the configuration dictionary. The resulting video is saved under the filename specified in the configuration dictionary.
2. `get_file_from_yurl()` which takes a dictionary containing information about a YouTube video as input. The function retrieves the necessary metadata information about the video using `get_video_metadata()` and selects the appropriate mp4 format using `parse_metadata()`. The function then downloads the video using `get_video()` and returns the filename of the resulting video file.

The purpose of these functions is likely to retrieve specific clips from YouTube videos based on user input and save them as mp4 files.


```python 
 def main(args):
    filename = get_file_from_yurl(args)
    # perform clipping with ffmpeg
    # ffmpeg -i input.mp4 -ss 00:00:30 -to 00:00:40 -c copy output.mp4
    # remove all .mp4 in root directory
    # iterate across clips
    clips = args.get("clips", [])
    for index, clip in enumerate(clips):
        start = clip.get("start", 0)
        end = clip.get("end", 10)
        name = clip.get("name", "clip")
        #  ffmpeg -i input.mp4 -ss 00:05:20 -t 00:10:00 -c:v copy -c:a copy output1.mp4
        trim_result = run(["ffmpeg", "-i", filename, "-ss", format_timecode(start), "-t", format_timecode(end), "-c:v", "copy", "-c:a", "copy", f"{name}_{index}.mp4"])
        # convert to mp3
        # use subprocess to run ffmpeg
        # ffmpeg -i video.mp4 -b:a 192K -vn music.mp3
        result = run(["ffmpeg", "-i", f"{name}_{index}.mp4", "-ac", "2", "-f", "wav", f"{name}_{index}.wav"])

if __name__ == "__main__":
    # argparser to get url
    parser = argparse.ArgumentParser()
    parser.add_argument("--cfg", type=str, help="Youtube URL", default="cfg/trump.json")
    args = parser.parse_args()
    # read file from args.cfg
    with open (args.cfg, "r") as f:
        cfg = json.load(f)
    main(cfg)

    for f in os.listdir():
        if f.endswith(".mp4"):
            os.remove(f)
        if f.endswith(".wav"):
            # move to audio 
 ```

It looks like the code is defining the `main()` function, which is responsible for downloading and processing a YouTube video, splitting it into clips, and converting them to WAV format.

The `main()` function takes a single argument `args`, which is a dictionary containing various configuration options such as the URL of the YouTube video to download and clip information.

The `get_file_from_yurl()` function is called to download the video from the URL specified in the configuration file. The `parse_metadata()` function is used to select the best video format for downloading, and `get_video()` function is called to download the video. The downloaded video is then used to generate the clips using `ffmpeg`.

After generating the clips, each clip is converted to WAV format using `ffmpeg`. The resulting WAV files are saved to the current working directory.

Finally, all the temporary `.mp4` and `.wav` files generated during the process are deleted.



## References
- https://github.com/FriendlyUser/Pirates-Game/tree/master
