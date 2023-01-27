---
title: Creating custom subtitles using python and ffmpeg
description: How to create custom subtitles using python and ffmpeg
alt: git commits with golang
tags: ["python", "ffmpeg"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 14 July 2023 13:00:00 GMT
imgSrc: '/imgs/2023/dictionary.png'
---

Finding Cantonese dub videos and replacing the subtitles with English subtitles:

1. Search for Cantonese dubbed videos on video streaming platforms such as YouTube or Vimeo. You can use keywords like "Cantonese dub" or "Cantonese version" to find videos that are available with Cantonese audio.

2. Use a video downloader tool to download the Cantonese dub video from the streaming platform. There are many tools available that can download videos from various websites, such as youtube-dl, ClipGrab, and 4K Video Downloader.

3. Use a video editing software to add English subtitles to the video. There are many software options available, both paid and free, such as Adobe Premiere Pro, Final Cut Pro, and Avidemux. You can either create the subtitles yourself or find a pre-existing English subtitle file for the video.

If you want to automate the process of finding and downloading Cantonese dub videos, you can use a tool like Selenium to programmatically search for and download videos from a streaming platform. You can then use a video editing software to add the English subtitles to the downloaded video.

## My approach

The approach I take is going to https://ktkkt.top to get a cantonese videos, then going to goanime to download the english sub version.

Using ffmpeg I can then create a video with english sub and cantonese dub.

 Then it uses the youtube_dl package to download the video using the video URL.

The make_webdriver function is used to create a webdriver object which is used to open a web page and interact with it. In this case, the webdriver is being created using the Remote method from the webdriver module, which allows you to create a webdriver that can run on a remote server. The get_ktkkt_video_url function uses the webdriver to open a webpage and then switches to an iframe (a nested HTML document) and writes the page source to a file.

The extract_url function appears to check if the given URL ends with .m3u8 and, if it doesn't, adds '/index.m3u8' to the end of the URL. The download function then uses the youtube_dl package to download the video from the URL.

Finally, the get_ktkkt_video_url function is called with a specific URL as an argument. This URL is opened using the webdriver, and the page source is written to a file. The webdriver is then closed.

```python
import os
import time
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
from selenium import webdriver


def download(url):
    cmd = 'youtube_dl ' + url
    os.system(cmd)

# extracts m3u8 link from the video url
# 
def extract_url(video_url):
    if video_url.endswith('.m3u8'):
        return video_url
    else:
        return video_url + '/index.m3u8'

# read REMOTE_SELENIUM_KEY and REMOTE_SELENIUM_URL from environment variables

REMOTE_SELENIUM_KEY = os.environ.get('REMOTE_SELENIUM_KEY')
REMOTE_SELENIUM_USERNAME = os.environ.get('REMOTE_SELENIUM_USERNAME')

def make_webdriver(build_name="anime_sub_switcher"):
    # make a webdriver
    url = f"https://{REMOTE_SELENIUM_USERNAME}:{REMOTE_SELENIUM_KEY}@hub-cloud.browserstack.com/wd/hub"
    desired_cap = {
        "build": build_name,  # CI/CD job or build name
    }
    driver = webdriver.Remote(
        command_executor=url
    )
    return driver
# selenium browser

def get_ktkkt_video_url(ktkkt_url: str):
    driver = make_webdriver()
    # 
    time.sleep(5)

    # wait for the page to load
    driver.get(ktkkt_url)
    # switch to cciframe
    driver.switch_to.frame('cciframe')
    # wait for the video to load
    time.sleep(3)
    # save source to file
    with open('source.html', 'w') as f:
        f.write(driver.page_source)

    driver.quit()

get_ktkkt_video_url("https://ktkkt.top/movie/index14100.html")
```

Then source.html will have a m3u8 file that can be downloaded with youtube-dl.

```python
youtube_dl https://v5.szjal.cn/20210624/UYxj8q0t/index.m3u8
```

youtube_dl is a command-line program to download videos from YouTube and a few other sites. When you run youtube_dl with a URL as an argument, it will download the video from that URL.

For example, if you run youtube_dl https://v5.szjal.cn/20210624/UYxj8q0t/index.m3u8, it will download the video from the URL https://v5.szjal.cn/20210624/UYxj8q0t/index.m3u8.

By default, youtube_dl will save the downloaded video to the current working directory with the filename [video-id].ext, where [video-id] is the unique identifier for the video and .ext is the appropriate file extension for the video format.

You can also use various options with youtube_dl to customize the download, such as specifying a different output directory or filename, or choosing a specific video format to download. You can see the full list of available options by running youtube_dl --help.


```python
import argparse

def get_video_length(video_file):
    import subprocess
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', video_file], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    return float(result.stdout.decode('utf-8'))

# compare lengths

def compare_lengths(video1, video2):
    length1 = get_video_length(video1)
    length2 = get_video_length(video2)
    return length1 / length2

def diff_lengths(video1, video2):
    length1 = get_video_length(video1)
    length2 = get_video_length(video2)
    return length1 - length2
if __name__ == '__main__':
    # take two video inputs
    parser = argparse.ArgumentParser()
    parser.add_argument('video1', type=str)
    parser.add_argument('video2', type=str)
    args = parser.parse_args()
    video1 = args.video1
    video2 = args.video2
    number = compare_lengths(video1, video2)
    print(number)
    if number > 1:
        print(f'{video1} is {number} times faster than {video2}')
    else:
        print(f'{video2} is {1/number} times faster than {video1}')

    video_len_diff = diff_lengths(video1, video2)
    print(f'Length difference: {video_len_diff} seconds')
```

This script compares the lengths of two video files and prints the result. It has a command-line interface, which means that you can run it from the terminal and pass in the file paths of the two videos as arguments.

The get_video_length function uses the ffprobe command-line tool to extract the duration of a video file. It passes the file path as an argument to ffprobe and retrieves the duration from the output.

The compare_lengths function calls get_video_length to get the duration of each video file and then returns the ratio of the lengths of the two videos.

The diff_lengths function also calls get_video_length to get the duration of each video file and then returns the difference between the lengths of the two videos.

Finally, the script has a main block that uses the argparse module to parse the command-line arguments and pass them to the compare_lengths and diff_lengths functions. It prints the result of the comparison and the difference in lengths.

You can run this script from the terminal by entering python script.py video1.mp4 video2.mp4, where video1.mp4 and video2.mp4 are the file paths of the two videos you want to compare.

```bash
ffmpeg -i inu_canton.mp4 -f mp3 -ab 192000 -vn audio.mp3
ffmpeg -i video.mp4 -i audio.mp3 -c copy -map 0:v:0 -map 1:a:0 -shortest new.mp4
ffmpeg -i new.mp4 -itsoffset 12.69 -i new.mp4 -map 0:v:0 -map 1:a:0 -c copy  inu_final_done.mp4
```

The first command you provided is using ffmpeg to convert an input video file called "inu_canton.mp4" to an audio file called "audio.mp3". The options used here include:

-i inu_canton.mp4: input file name
-f mp3: output format is mp3
-ab 192000: audio bitrate of 192 kbps
-vn: disable video recording

The second command is using ffmpeg to merge a video file called "video.mp4" with an audio file called "audio.mp3" into a new file called "new.mp4". The options used here include:

-i video.mp4: input video file
-i audio.mp3: input audio file
-c copy: copy the input streams as is to the output file
-map 0:v:0: map the first input file's video stream to the output file
-map 1:a:0: map the second input file's audio stream to the output file
-shortest: finish when the shortest input file ends

The third command is using ffmpeg to create a new video file called "inu_final_done.mp4" from an input file called "new.mp4". This command uses the -itsoffset option to set a time offset for the input file, so that the output file will begin at 12.69 seconds into the input file. The options used here include:

-i new.mp4: input file
-itsoffset 12.69: set a time offset of 12.69 seconds
-map 0:v:0: map the first input file's video stream to the output file
-map 1:a:0: map the second input file's audio stream to the output file
-c copy: copy the input streams as is to the output file