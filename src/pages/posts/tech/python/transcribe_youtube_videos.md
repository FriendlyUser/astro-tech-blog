---
tags: ['python', 'whispers', 'gradio']
title: Chapter 2 Basic syntax and data types.
description: Describing how to use python to program.
pubDate: Fri, 14 October 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/492664568.png
---
Transcribing videos is important for several reasons. Firstly, it makes the content of the video more accessible to people who are deaf or hard of hearing. Secondly, it can improve search engine optimization (SEO) as the text in the transcription can be indexed by search engines. Thirdly, it can make it easier to create captions or subtitles for the video, which can again make it more accessible to a wider audience. Finally, transcribing videos can be useful for researchers or content creators who want to analyze the content of the video or repurpose it in other ways.


```python 
 import whisper
import gradio as gr
import ffmpeg
from yt_dlp import YoutubeDL
import os
import sys
from subprocess import PIPE, run

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

def get_video_metadata(video_url: str = "https://www.youtube.com/watch?v=21X5lGlDOfg&ab_channel=NASA")-> dict:
    with YoutubeDL({'outtmpl': '%(id)s.%(ext)s'}) as ydl:
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
    try:
        format_ids = [int(f.get("format_id", 0)) for f in mp4_formats]
        video_entries = sorted(set(format_ids).intersection(youtube_mp4_codes))

        is_livestream = True
        if len(video_entries) > 0:
            # use video format id over livestream id if available
            selected_id = video_entries[0]
            is_livestream = False
    except Exception as e:
        print(e)
        selected_id = mp4_formats[0].get("format_id")
        is_livestream = False


    return {
        "selected_id": selected_id,
        "is_livestream": is_livestream,
    } 
 ```

The above code is written in Python and contains functions for getting metadata for a YouTube video, parsing the metadata, and converting seconds to timecode. It also imports the necessary libraries including `whisper`, `gradio`, `ffmpeg`, `yt_dlp`, `os`, `sys`, and `subprocess`.

The `get_video_metadata` function takes a YouTube video URL as input and returns a dictionary containing metadata about the video such as the title and uploader ID. This function uses the `YoutubeDL` library to extract information about the video from YouTube.

The `parse_metadata` function takes the metadata dictionary as input and returns a dictionary containing the selected video format ID and a boolean indicating whether the video is a livestream or not. This function filters the available video formats to only include MP4 formats and then selects the video format with the highest priority (based on the priority list `youtube_mp4_codes`). If no MP4 format is available, it selects the first available format.

The `second_to_timecode` function takes a floating-point number representing a time in seconds as input and returns a string formatted as `hh:mm:ss,ms` (hours:minutes:seconds,milliseconds) where `ms` is the milliseconds portion of the time.

Note that the code also includes a list of YouTube format codes for livestreams (`youtube_livestream_codes`) and MP4 formats (`youtube_mp4_codes`).


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

def get_all_files(url: str, end: str = "00:15:00"):
    metadata = get_video_metadata(url)
    temp_dict = parse_metadata(metadata)
    selected_id = temp_dict.get("selected_id", 0)
    formats = metadata.get("formats", [])
    selected_format = [f for f in formats if f.get("format_id", "") == str(selected_id)][0]
    format_url = selected_format.get("url", "")
    filename = "temp.mp4"
    get_video(format_url, {"filename": filename, "end": end})
    return filename

def get_text_from_mp3_whisper(inputType:str, mp3_file: str, url_path: str, taskName: str, srcLanguage: str)->str:
    # remove the file if it exists
    if os.path.exists("transcript.srt"):
        os.remove("transcript.srt")
    
    if os.path.exists("temp.mp4"):
        os.remove("temp.mp4")
    
    if os.path.exists("subtitled.mp4"):
        os.remove("subtitled.mp4")
    
    model = whisper.load_model("medium")
    # options = whisper.DecodingOptions(language="en", without_timestamps=True)
    options = dict(language=srcLanguage)
    transcribe_options = dict(task=taskName, **options)
    # return if url_path is not set, taskName is not set, srcLanguage is not set
    if inputType == "url":
        filename = get_all_files(url_path)
        print("Retrieved the file")
        result = model.transcribe(filename, **transcribe_options)
        print("transcribing the file")
    else:
        result = model.transcribe(mp3_file, **transcribe_options)
    # adjust for spacy mode
    html_text = ""
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
    # save to transcript.srt
    with open("transcript.srt", "w") as f:
        f.write(words)
    print("done transcribing")

    input_file = 'temp.mp4'
    subtitles_file = 'transcript.srt'
    output_file = 'subtitled.mp4'
    try:
        print("attempt to output file")
        (
            ffmpeg
            .input(input_file)
            .filter('subtitles', subtitles_file)
            .output(output_file)
            .run()
        )
    except Exception as e:
        print("failed to output file")
        print(e)
        output_file = "temp.mp4"
    # return temp.mp4
    
    return result.get("segments"), words, output_file 
 ```

The `get_text_from_mp3_whisper` function takes several arguments including `inputType`, `mp3_file`, `url_path`, `taskName`, and `srcLanguage`. It first removes any existing files with names `transcript.srt`, `temp.mp4`, and `subtitled.mp4`.

It then loads a pre-trained model from `whisper` using the `load_model` function. The function checks the value of `inputType` to determine whether to transcribe a local mp3 file (`mp3_file`) or a video at a remote URL (`url_path`). If `inputType` is `"url"`, it downloads the video from the remote URL using the `get_all_files` function and transcribes it. If `inputType` is `"file"`, it transcribes the local mp3 file.

The transcribed segments are then saved to a file named `transcript.srt`. The function then attempts to add subtitles to the video by overlaying the saved SRT file onto a copy of the video file. The resulting file is saved as `subtitled.mp4`. If the overlaying process fails, it saves the resulting file as `temp.mp4`.

The function then returns the segments and the contents of the SRT file as a string, as well as the name of the resulting video file.


```python 
 gr.Interface(
    title = 'Download Video From url and extract text from audio', 
    fn=get_text_from_mp3_whisper, 
    inputs=[
        gr.Dropdown(["url", "file"], value="url"),
        gr.inputs.Audio(type="filepath"),
        gr.inputs.Textbox(),
        gr.Dropdown(["translate", "transcribe"], value="translate"),
        gr.Dropdown(["Japanese", "English"], value="Japanese")
    ],
    button_text="Go!",
    button_color="#333333",
    outputs=[
        "json", "text", "file"
    ], 
 ```

It seems that the code block is not complete, as there is no closing parenthesis for the `gr.Interface` function call. However, assuming that the rest of the code is present, this function call creates a user interface using the `gradio` library.

The interface has a title, "Download Video From url and extract text from audio", and it takes in the following inputs:

1. A dropdown menu to select the input type ("url" or "file").
2. An audio input to upload an audio file.
3. A textbox to enter the URL of a video.
4. A dropdown menu to select the task ("translate" or "transcribe").
5. A dropdown menu to select the source language ("Japanese" or "English").

The interface also has a button with text "Go!" and color "#333333", and it outputs a JSON object, a string of text, and a file.


Using AI to transcribe videos has many practical benefits. Firstly, it enables the creation of accurate, searchable and accessible transcripts that can be used for a variety of purposes. Transcripts can be used to help people with hearing impairments to understand video content, as well as to provide captions and subtitles for non-native speakers of the video's language. Transcripts can also be used to provide metadata for video content, making it easier to search and categorize. Additionally, transcripts can be used to analyze the content of video content, allowing for more effective search and retrieval of relevant information.

AI-based transcription is also faster and more cost-effective than traditional human transcription methods. With the advances in AI technology, transcription can be done much faster and at a lower cost than hiring human transcribers. This allows for more content to be transcribed in a shorter amount of time, and at a lower cost. Furthermore, AI-based transcription can be easily scaled up or down depending on the size of the content that needs to be transcribed.

Overall, using AI to transcribe videos is a useful and practical application of AI technology that has the potential to significantly improve the accessibility and usability of video content.

## References
- https://huggingface.co/spaces/FriendlyUser/YoutubeDownloaderSubber
