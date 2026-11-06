---
tags: ['python', 'openbb']
title: Automating YouTube Video Summarization with Python and OpenBB
description: YouTube is home to millions of videos covering a vast range of topics, making it a valuable resource for learning and entertainment. However, watching lengthy videos can be time-consuming, especially when looking for specific information. This is where video summarization comes in handy. In this blog post, we explore how to automate YouTube video summarization using Python and OpenBB.
pubDate: Sunday, 12 March 2023
imgSrc: /imgs/2023/3870845711.png
layout: '@/templates/BasePost.astro'
---

Video summarization is important because it can save time and improve the learning experience for users who rely on videos as a source of information. Video summarization is the process of extracting key information from a lengthy video and presenting it in a condensed form. This is particularly useful when a user is looking for specific information in a video but doesn't have the time or patience to watch the entire video.

Video summarization can also help improve the accessibility of video content for users who may have difficulty watching lengthy videos due to various reasons, such as hearing or vision impairments. Additionally, video summarization can help content creators reach a wider audience by making their content more accessible to users with different learning styles and preferences.

To use the code, at least OpenBB v2.5.1 is required. OpenBB is an open source infrastructure accessible to everyone, everywhere, committed to building the future of investment research.

```python
import gradio as gr
import re
import sys
import glob
import os
from io import StringIO
from openbb_terminal.forecast.whisper_model import transcribe_and_summarize
```

This Python code imports several modules and a function:

gradio is imported with the alias gr, which is a Python library that provides an easy-to-use interface for creating web-based interfaces for machine learning models and other Python functions.

re is a built-in Python module that provides regular expression matching operations.

sys is a built-in Python module that provides access to some variables used or maintained by the interpreter and to functions that interact strongly with the interpreter.

glob is a built-in Python module that finds all the pathnames matching a specified pattern according to the rules used by the Unix shell.

os is a built-in Python module that provides a way of using operating system dependent functionality like reading or writing to the file system.

StringIO is a built-in Python module that provides a convenient way to treat text data as files.

The function transcribe_and_summarize is imported from the module whisper_model in the package openbb_terminal.forecast. 

The transcribe_and_summarize function from openbb leverages

* yt_dlp to download the YouTube video
* whisper from openai to extract the text from the video
* HuggingFace’s Transformers summarizing pipeline is a popular method to summarize large posts like blogs, novels, books and news


```python
def get_video_id(url):

    video_id = re.findall(r"v=([\w]{11})", url)[0]
    old_stdin = sys.stdin
    # mkdir /home/user/.cache/whisper
    os.makedirs(f"/home/user/.cache/whisper", exist_ok=True)
    if not sys.stdin.isatty():
        # seems I only need 3 y's to get past the prompt, but 5 is safer
        y_strings = "\n".join(["y", "y", "y", "y", "y"])
        sys.stdin = StringIO(y_strings)
        transcribe_and_summarize(video=url, output_dir=video_id)
    else:
        return "Please enter a YouTube URL"
    sys.stdin = old_stdin
    print(f"Video ID: {video_id}")
    try:
        summary_file = glob.glob(f"{video_id}/*_summary.txt")[0]
    except Exception as e:
        # get latest file with *_summary.txt
        summary_file = max(glob.glob(f"**/*_summary.txt"), key=os.path.getctime)
    # file .srt file
    subtitle_file = None
    try:
        subtitle_file = glob.glob(f"{video_id}/*.vtt")[0]
    except Exception as e:
        # get latest file with .srt or .vtt
        subtitle_file = max(glob.glob(f"**/*.vtt"), key=os.path.getctime)

    if subtitle_file is None:
        try:
            subtitle_file = glob.glob(f"{video_id}/*.srt")[0]
        except Exception as e:
            subtitle_file = max(glob.glob(f"**/*.srt"), key=os.path.getctime)

    # returns contents of summary file and subtitle file
    try:
        with open(summary_file, "r") as f:
            summary_contents = f.read()
    except Exception as e:
        summary_contents = "No summary file found"

    try:
        with open(subtitle_file, "r") as f:
            subtitle_contents = f.read()
    except Exception as e:
        subtitle_contents = "No subtitle file found"
    return summary_contents, subtitle_contents
```

This Python code defines a function get_video_id that takes a single argument url representing a YouTube video URL. The function extracts the 11-character video ID from the URL using a regular expression and stores it in a variable video_id. It then creates a directory named .cache/whisper in the user's home directory using os.makedirs().

Next, the function checks if the standard input stream is attached to a terminal or not using sys.stdin.isatty(). If it is not attached to a terminal, the function simulates user input of "y" five times using StringIO to bypass a prompt and calls the function transcribe_and_summarize() with the video and output_dir parameters set to the url and video_id respectively.

The trasncibe_and_summarize function from openbb handles the complexity of downloading the video, extracting the text from the video, and summarizing the text.

If the standard input stream is attached to a terminal, the function returns a message asking the user to enter a YouTube URL.

The function then resets the standard input stream to its original value and uses glob.glob() to search for the latest summary and subtitle files in the directory named video_id. If these files are not found in video_id, the function searches the whole file system.

Finally, the contents of the summary and subtitle files are read and returned as a tuple containing two strings: summary_contents and subtitle_contents. If no files are found, the corresponding string value is returned instead.


At the end, we can add gradio functionality to the function by adding the following code:

```python
input_text = gr.inputs.Textbox(label="Enter a YouTube URL")
output_text = [gr.outputs.Textbox(label="Summary File"), gr.outputs.Textbox(label="Subtitle File")]

gr.Interface(fn=get_video_id, inputs=input_text, outputs=output_text, title="YouTube Video Summarization").launch()
```

This Python code creates a web interface using the gradio library.

The interface contains a single input text box labeled "Enter a YouTube URL" and two output text boxes labeled "Summary File" and "Subtitle File".

The get_video_id function is used as the backend function of the interface. When the user enters a YouTube URL in the input text box and clicks the "Submit" button, the function is called with the URL as an argument. The function then extracts the video ID from the URL, transcribes and summarizes the video using the transcribe_and_summarize() function, and returns the contents of the summary and subtitle files associated with the video ID. These contents are then displayed in the output text boxes of the web interface.

The title parameter is set to "YouTube Video Summarization" and is used to set the title of the web interface.

Finally, the launch() method is called on the interface object, which launches the web interface in a new browser window or tab.

## References

- https://huggingface.co/spaces/FriendlyUser/summarizeyoutube/blob/main/app.py