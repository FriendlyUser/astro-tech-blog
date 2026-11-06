---
title: Get Transcript of youtube livestreams Part I
description: Transcript of youtube livestreams main overview using whispers
alt: Applying nlp to various youtube videos
pubDate: Friday, 13 March 2023 13:00:00 GMT
tags: ["youtube", "whispers", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-15 20.40.00 - blank transcript.png'
imgAlt: 'rbc stock analyzer'
---


 YouTube live stream is a video that is broadcast in real-time over the internet. Users can watch the video as it is being recorded, and they can also interact with the person who is streaming the video by leaving comments and questions.


Below is a simple script to transcribe a video from a url 
```python

import os
import requests
import json
import argparse
from utils import send_discord_msg
from processing import transcribe_audio_whisper

def download_file_from_url(url, filename):
    # open in binary mode
    if os.path.exists(filename):
        os.remove(filename)

    print("downloading video", url)
    with open(filename, "wb") as file:
        # get request
        response = requests.get(url)
        # write to file
        file.write(response.content)


def transcribe_video(url: str):
    # check if url is a local path or a url
    filename = url
    if url.startswith("http"):
        # get video id
        download_file_from_url(url, "video.mp4")
        filename = "video.mp4"

    data = transcribe_audio_whisper(filename, False)
    partial_output = filename.replace(".mp4", ".json")

    with open(partial_output, "w", encoding="utf-8", errors="ignore") as f:
        f.write(json.dumps(data, indent=0))

    ds_data = {
        "content": data.get("text", "")
    }
    CHUNK_SIZE = 1900
    chunks = [ds_data['content'][i:i+CHUNK_SIZE] for i in range(0, len(ds_data['content']), CHUNK_SIZE)]
    for chunk in chunks:
        try:
            send_discord_msg({
                "content": chunk,
            })
        except Exception as e:
            return
    pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process video from url')
    parser.add_argument("--url", help="url where you can download video", default="https://www.dropbox.com/s/jvajeen28clpicy/archive.mp4?dl=1")

    args = parser.parse_args()

    # todo add logging
    transcribe_video(args.url)
```

This is a script that allows you to transcribe the audio from a video. It does this by first downloading the video from the specified URL (if the URL is a link) or using a local file (if the URL is a file path). Then, it transcribes the audio from the video using the transcribe_audio_whisper function. The transcription is stored in a JSON file and is also sent in chunks to a Discord channel using the send_discord_msg function.

The script takes one argument, --url, which specifies the URL or file path of the video to be transcribed. If no value is provided for --url, the default value is set to a specific Dropbox link.

To use the script, you will need to have the necessary dependencies installed, including the requests and argparse libraries. You will also need to define the transcribe_audio_whisper and send_discord_msg functions in the appropriate files.


Discord can only handle messages up to 2000 characters, so we need to split the message into chunks of 1900 characters. We can do this by using the following code:

```python
CHUNK_SIZE = 1900
chunks = [ds_data['content'][i:i+CHUNK_SIZE] for i in range(0, len(ds_data['content']), CHUNK_SIZE)]
for chunk in chunks:
    try:
        send_discord_msg({
            "content": chunk,
        })
    except Exception as e:
        return
```

This code is responsible for sending the transcribed audio from the video to a Discord channel. The CHUNK_SIZE variable is set to 1900, which determines the size of each chunk of text that will be sent to Discord.

The chunks variable is a list comprehension that splits the transcription into chunks of size CHUNK_SIZE. It does this by iterating through the transcription text, starting at index 0 and ending at the length of the text, with a step size of CHUNK_SIZE. This creates a list of strings, each of which is a chunk of the transcription text.

The for loop iterates over each chunk in the chunks list and sends it to the Discord channel using the send_discord_msg function. If an exception occurs while sending the message, the loop is exited by returning from the function.

For the fdrtt class, originally the implementation was using facebook's wit ai, but I switched it over to whispers from open ai and got vastly improved performance.


```python
import os
import argparse
from threading import Thread
import time
import json
from operator import itemgetter
from processing import get_video_from_start, transcribe_audio_wit, transcribe_audio_whisper
from utils import get_video_id_from_ytube_url, ic, send_discord_msg, format_time, append_to_github_actions
from yt_utils import get_video_metadata, youtube_livestream_codes, youtube_mp4_codes
from database import DB_MANAGER

try:
    MAX_ITERATIONS = os.getenv("MAX_ITERATIONS", "50")
    MAX_ITERATIONS = int(MAX_ITERATIONS)
except Exception as e:
    print(e)
CHUNK_SIZE = 1900
VIDEO_CHUNK_LENGTH_IN_SECS = 4 * 60 + 30
```



This code appears to be part of a class that processes a video and performs transcription on it. The transcribe method takes a dictionary of data as an argument and uses it to transcribe the audio from the video. It does this by calling either the transcribe_audio_whisper or transcribe_audio_wit function, depending on the value of the transcribe_tool attribute.

```python
class FD_RTT:
    def __init__(self, input_args, config):
        self._config = config
        self.video_url = input_args.get("url")
        # times in seconds, iterations should not be greater than max time
        self.stats = {
            "run_time": 0,
            "start_time": time.time(),
            "iterations": 0,
            "transcriptions": [],
        }
        self.exit_on_video = input_args.get("exit_on_video", True)
        self.metadata = get_video_metadata(self.video_url)
        self.curr_errors = 0
        table_name = os.getenv("TABLE_NAME")
        if table_name is None:
            table_name = input_args.get("table_name")
        if table_name is None:
            table_name = self.get_channel_from_name().replace(" ", "_")
        # fallback to video_id
        if table_name == "" or table_name is None:
            try:
                ic("Grabbing table name from video_id")
                video_id = get_video_id_from_ytube_url(self.video_url)
                self.video_id = video_id
            except Exception as e:
                ic(e)
                ic("Error getting video id")
                self.video_id = ""
        else:
            ic(f"setting table_name from TABLE_NAME as: {table_name}")
            self.video_id = table_name

        self.db_manager = DB_MANAGER()
        try:
            print("Creating table for named: ", self.video_id)
            # create table if it doesn't exist
            self.db_manager.create_tables(self.video_id)
        except Exception as e:
            print(e)
            ic("Failed to make table")
            exit(1)

        global_iteration = os.getenv("ITERATION", "0")
        try:
            global_iteration = int(global_iteration)
        except Exception as e:
            print(e)
            global_iteration = 0

        self.global_iteration = global_iteration

        self.save_to_db = input_args.get("save_to_db", True)

        self.transcribe_tool = input_args.get("transcribe_tool", "whisper")

        # add in video format here
    def get_channel_from_name(self):
        metadata = self.metadata
        channel = metadata.get("channel", "")
        uploader_id = metadata.get("uploader_id", "")
        uploader = metadata.get("uploader", "")
        if uploader == "Yahoo Finance":
            return "YahooFinance"
        if uploader_id == "Bloomberg":
            return "Bloomberg"
        return channel

    def transcribe(self, data: dict):
        """
            takes video file and transcribes it
        """
        filename = data.get("filename", "")
        is_livestream = data.get("is_livestream", False)
        ic(f"Transcribing... {filename}")

        # read config, see if we want to upload to db
        if self.transcribe_tool == "whisper":
            data = transcribe_audio_whisper(filename, is_livestream)
        else:
            data = transcribe_audio_wit(filename, is_livestream)
        if data is not None:
            # save to json file, replace .mp3 with .json
            partial_output = filename.replace(".mp4", ".json")
            # adjust all run times here based on runtime
            curr_run_time = format_time(self.stats['run_time'])
            if self.global_iteration > 0:
                curr_total_time = self.global_iteration * MAX_ITERATIONS * VIDEO_CHUNK_LENGTH_IN_SECS + self.stats["run_time"]
                curr_run_time = format_time(curr_total_time)
            # adjust times in tokens under data
            # TODO fix this for the speech section
            for token in data.get("tokens", []):
                token["start"] = token["start"] + curr_run_time
                token["end"] = token["end"] + curr_run_time

            with open(partial_output, "w", encoding="utf-8", errors="ignore") as f:
                f.write(json.dumps(data, indent=0))
            # append to transcription
            self.stats["transcriptions"].append(data)
            # send_discord_file(filename=partial_output, file=open(partial_output, "rb"))
            text = data.get("text", "")
            curr_iteration = self.global_iteration * MAX_ITERATIONS + self.stats["iterations"]
            self.db_manager.insert_into_db(self.video_id, text, self.video_url, curr_iteration)
            # make function to convert seconds to human readable time
            data = {}
            # adjust runtime based on iteration if available
            data['content'] = f"**{curr_run_time}**\n{text}"
            # split data content into chunks of 1900 characters
            chunks = [data['content'][i:i+CHUNK_SIZE] for i in range(0, len(data['content']), CHUNK_SIZE)]
            for chunk in chunks:
                data['content'] = chunk
                send_discord_msg(data)


    def send_metadata_embed(self, metadata: dict, other_data: dict):
        """
        Send metadata embed to discord
        """
        url = other_data.get("url", "")
        iteration = os.getenv("ITERATION", "0")
        embed = {
            "title": f"{metadata.get('title', '')} - {iteration}",
            "description": metadata.get("description", "")[:500],
            "url": url,
            "thumbnail": {"url": metadata.get("thumbnail", "")},
            "fields": [
                {
                    "name": "Livestream",
                    "value": other_data.get("is_livestream", ""),
                    "inline": True,
                }
            ],
        }

        data = {"embeds": [embed]}
        ic("Sending metadata embed")
        send_discord_msg(data)

    def parse_metadata(self) -> dict:
        """
        Parse metadata and send to discord.
        After a video is done recording, 
        it will have both the livestream format and the mp4 format.
        """
        # send metadata to discord
        formats = self.metadata.get("formats", [])
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

This is the code for a class called FD_RTT (short for "Free-Delayed Real-Time Transcription"). The class has several attributes and methods that are used to process a video and perform transcription on it.

The __init__ method is the constructor for the class, which is called when an instance of the class is created. It takes two arguments, input_args and config, and uses them to initialize the class's attributes. Some of the attributes include the video_url, stats, metadata, and transcribe_tool.

The get_channel_from_name method is used to determine the name of the channel that uploaded the video. It does this by checking the uploader and uploader_id fields in the metadata attribute. If either of these fields match specific values, the corresponding channel name is returned.

The transcribe method is used to transcribe the audio from the video. It takes a dictionary of data as an argument and uses it to determine the file to be transcribed and whether the video is a live stream. It then calls either the transcribe_audio_whisper or transcribe_audio_wit function to transcribe the audio, depending on the value of the transcribe_tool attribute. The transcription is then saved to a JSON file and appended to a list of transcriptions stored in the stats attribute.

The send_metadata_embed method is used to send metadata about the video to a Discord channel in the form of an embed. It takes two arguments, metadata and other_data, and uses them to create an embed object with the specified fields. It then calls the send_discord_msg function to send the embed to Discord.


```python
class FD_RTT:

    ... # code omitted for brevity
    def process_video(self, ytube_url: str = "https://www.youtube.com/watch?v=86YLFOog4GM&ab_channel=SpaceVideos"):
        """
        Main function.
        """
        metadata = self.metadata
        # grab raw data from url with mp3 versions
        formats = metadata.get("formats", [])
        selected_id, is_livestream = itemgetter('selected_id', 'is_livestream')(self.parse_metadata())
        if self.exit_on_video is True and is_livestream is False:
            ic("Exiting on video as it is not a livestream")
            append_to_github_actions("TERMINATE_LIVESTREAM=TRUE")
            exit(0)
        # TODO fix this code so that it can handle non livestreams

        self.send_metadata_embed(metadata, {"format_id": selected_id, "url": ytube_url, "is_livestream": is_livestream})
        # to prevent link for expiring regrab when possible
        # loop through data and get first number

        while self.stats.get("iterations", 0) < MAX_ITERATIONS:
            try:
                # grab format from formats using format_id
                selected_format = [f for f in formats if f.get("format_id", "") == str(selected_id)][0]
                format_url = selected_format.get("url", "")
                if not is_livestream:
                    filename = f"{metadata.get('id', '')}.mp4"
                    filename = filename.replace("-", "")
                    # get video from start
                    if not os.path.isfile(filename):
                           get_video_from_start(format_url, {
                                "end": "0:15:00",
                                "filename": filename
                            })

                    # transcribe audio
                    self.transcribe({"filename": filename, "is_livestream": is_livestream})
                    print("ARE YOU EVEN WORKING HERE")
                    self.stats["iterations"] = MAX_ITERATIONS
                    break
                
                ic(f'Iteration: {self.stats.get("iterations", 0)}')
                ic(format_url)
                iterations = self.stats.get("iterations", 0)
                filename = f"{metadata.get('id', '')}_{iterations}.mp4"
                filename = filename.replace("-", "")

                get_video_from_start(format_url, {
                    "end": "0:04:30",
                    "filename": filename,
                })
                background_thread = Thread(target=self.transcribe, args=({"filename": filename, "is_livestream": is_livestream},))
                background_thread.start()
            except Exception as ex:
                # any error, just goes into endless loop
                ic(ex)
                self.curr_errors += 1
                if self.curr_errors > 10:
                    ic("Too many errors, exiting")
                    break
                break
            finally:
                self.stats["iterations"] += 1
                start_time = self.stats["start_time"]
                self.stats["run_time"] = (time.time() - start_time)
                ic(self.stats)
                # every 5 iterations check if we should close
                if self.stats.get("iterations", 0) % 5 == 0 and is_livestream:
                    _, still_is_livestream = itemgetter('selected_id', 'is_livestream')(self.parse_metadata())
                    if still_is_livestream is False:
                        ic("Exiting since livestream is finished")
                        print("LIVESTREAM IS FINISHED")
                        # send message to discord
                        fmtted_run_time = format_time(self.global_iteration * MAX_ITERATIONS * VIDEO_CHUNK_LENGTH_IN_SECS + self.stats['run_time'])
                        data = {"content": f"LIVESTREAM IS FINISHED \n Run time: {fmtted_run_time}"}
                        send_discord_msg(data)
                        append_to_github_actions("TERMINATE_LIVESTREAM=TRUE")
                        exit(0)
                    else:
                        ic("Livestream is still running")

        if self.global_iteration > 0:
            fmtted_run_time = format_time(self.global_iteration * MAX_ITERATIONS * VIDEO_CHUNK_LENGTH_IN_SECS + self.stats['run_time'])
            total_data = {
                "content": f"**Total Run Time** {fmtted_run_time}",
            }
            send_discord_msg(total_data)
        return None
```


The process_video function seems to be the main function of the FD_RTT class. It starts by fetching metadata about the video using the parse_metadata method and then sends this metadata to the send_metadata_embed method.

Then, it enters a loop that will run for a maximum of MAX_ITERATIONS iterations. Within the loop, it attempts to download a chunk of the video, transcribe it, and update the stats dictionary. If the video is not a live stream, the loop will only run once and the transcription will be performed on the entire video. If the video is a live stream, the loop will run continuously until the live stream ends or until MAX_ITERATIONS iterations have been reached.

Every 5 iterations, the process_video function checks if the live stream has ended using the parse_metadata method. If the live stream has ended, the function sends a message to Discord and exits.

The transcribe method is called with a dictionary containing the filename of the video chunk and a boolean indicating whether the video is a live stream or not. The transcribe method will then transcribe the audio of the video chunk using either the transcribe_audio_whisper or transcribe_audio_wit method, depending on the value of the transcribe_tool attribute.


```python
def main(params: dict):
    ic("Trying to initialize")
    fd_rtt = FD_RTT(params, {})
    ic("Attempting to run video")
    fd_rtt.process_video(params.get("url"))

if __name__ == "__main__":
    # argparser with one arugment url for youtube videos
    parser = argparse.ArgumentParser(description='Process livestream or audio for youtube video')
    # parser.add_argument('--url', '-id', help='video id', default='https://www.youtube.com/watch?v=dp8PhLsUcFE&ab_channel=BloombergQuicktake%3AOriginals')
    parser.add_argument('--url', '-id', help='video id', default='https://www.youtube.com/watch?v=21X5lGlDOfg&ab_channel=NASA')
    parser.add_argument('--exit_for_videos', '-efv', help='exit for videos, or non livestreams', default=False)
    # save_to_db
    parser.add_argument('--save_to_db', '-stdb', help='save to db', default=True)
    
    args = parser.parse_args()
    # ensure WIT_AI_TOKEN is set
    ic("Running main")
    if os.environ.get("WIT_AI_TOKEN") is None:
        print("WIT_AI_TOKEN is not set")
        exit(1)
    dict_args = {
        "url": args.url,
        "exit_on_video": args.exit_for_videos,
        "save_to_db": args.save_to_db,
    }
    main(dict_args)
```

This is the main function of the FD_RTT class. It appears to take an input argument "params" which is a dictionary containing a key "url" with a default value of a YouTube video URL. It creates an instance of the FD_RTT class using the input argument "params" and an empty dictionary as arguments for the class constructor. It then calls the process_video() method of the FD_RTT instance, passing in the "url" value from the "params" dictionary as an argument.

The main function also includes an "if" statement that checks if the environment variable "WIT_AI_TOKEN" is set. If it is not set, the script exits with a status code of 1.

If the script is run as a standalone script, it will use the argparse module to define command line arguments. It defines a single argument "--url" or "-id" with a default value of a YouTube video URL. It also defines an optional argument "--exit_for_videos" or "-efv" with a default value of False and an optional argument "--save_to_db" or "-stdb" with a default value of True. It then creates a dictionary "dict_args" using the values of these command line arguments and passes it to the main() function as an argument.


In the next article we will cover the internal workings of the transcribe_audio_whisper method and the approach I took.
## References 

* https://github.com/dli-invest/fdrtt
* https://github.com/dli-invest/fdrtt-stream
