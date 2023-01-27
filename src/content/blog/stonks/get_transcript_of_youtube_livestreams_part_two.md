---
title: Get Transcript of youtube livestreams Part II
description: transcript for youtube livestreams
alt: Applying nlp to various youtube videos
pubDate: Friday, 20 March 2023 13:00:00 GMT
tags: ["youtube", "whispers", "python"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-15 20.40.00 - blank transcript.png'
imgAlt: 'rbc stock analyzer'
---

In the original post we covered how to iterate across files and pull data from youtube.

See https://friendlyuser.github.io/posts/stonks/get_transcript_of_youtube_livestreams_part_one/

In this piece, we will delve into the process of utilizing ffmpeg to divide a live streaming video into smaller segments that can be processed by the whispers library to transcribe the audio into text.

```python


def transcribe_audio_whisper(filename: str, is_livestream: bool = False):
    final_object = {
        "speech": {
            "tokens": []
        },
        "text": "",
    }
    text_bodies = []
    for count, chunk_name in enumerate(split_vid_into_chunks(filename, is_livestream)):
        mp3_file = chunk_name.replace(".mp4", ".mp3")
        # load audio and pad/trim it to fit 30 seconds
        t2_start = time.perf_counter()
        # try:
        # iterate through files with _{d} format
        final_object = {
            "speech": {
                "tokens": []
            },
            "text": "",
        }
        # get text from mp3
        partial_object = get_text_from_mp3_whisper(chunk_name)
        text_bodies.append({
            "text": partial_object.get("text", ""),
            "count": count,
            "id": chunk_name,
        })
        # except Exception as e:
        #     ic(f"Error getting text from mp3 for {filename}")
        #     ic(e)
        #     return None
    # make final_object, group by number in _{d} format
    final_object = {
        "text": "",
    }
    # sort text_bodies by id number in _{d} format
    text_bodies = sorted(text_bodies, key=lambda k: k['count'])
    for text_body in text_bodies:
        final_object["text"] += text_body.get("text", "")
    # print the recognized text
    return final_object
```

This function appears to split a video file into smaller chunks of a fixed length, and then yields the filename of each chunk. It does this by using the ffmpeg command-line tool to extract a portion of the original video for each chunk. The extracted portion starts at a certain time and has a fixed duration specified by the chunk_size parameter. The function also handles the case where the input is a live stream, in which case it simply converts the stream to an MP3 file and yields the filename.

The function has some additional code for timing and error handling, as well as some calls to other functions (get_video_length, convert_mp4_to_mp3, and format_seconds) that are not shown.


```python
def transcribe_audio_whisper(filename: str, is_livestream: bool = False):
    final_object = {
        "speech": {
            "tokens": []
        },
        "text": "",
    }
    text_bodies = []
    for count, chunk_name in enumerate(split_vid_into_chunks(filename, is_livestream)):
        mp3_file = chunk_name.replace(".mp4", ".mp3")
        # load audio and pad/trim it to fit 30 seconds
        t2_start = time.perf_counter()
        # try:
        # iterate through files with _{d} format
        final_object = {
            "speech": {
                "tokens": []
            },
            "text": "",
        }
        # get text from mp3
        partial_object = get_text_from_mp3_whisper(chunk_name)
        text_bodies.append({
            "text": partial_object.get("text", ""),
            "count": count,
            "id": chunk_name,
        })
    final_object = {
        "text": "",
    }
    # sort text_bodies by id number in _{d} format
    text_bodies = sorted(text_bodies, key=lambda k: k['count'])
    for text_body in text_bodies:
        final_object["text"] += text_body.get("text", "")
    # print the recognized text
    return final_object
```

This function appears to be a wrapper function that transcribes an audio file by splitting it into smaller chunks, transcribing each chunk, and then concatenating the transcriptions. It does this by calling the split_vid_into_chunks function, which yields the filenames of the chunks, and then calling the get_text_from_mp3_whisper function on each chunk. The function then combines the transcriptions into a single string and returns an object with this string as the value of the "text" field. The function also has some additional code for error handling, but this code is currently commented out.

```python
def format_seconds(seconds: int):
    """
    format seconds to hh:mm:ss
    """
    hours = math.floor(seconds / 3600)
    minutes = math.floor((seconds % 3600) / 60)
    seconds %= 60
    return f"{hours}:{minutes}:{seconds}"

# think I want model loaded and reused?
def get_text_from_mp3_whisper(mp3_file: str):
    model = whisper.load_model("tiny")
    # options = whisper.DecodingOptions(language="en", without_timestamps=True)
    result = model.transcribe(mp3_file)
    return result
```

The format_seconds function takes an integer representing a number of seconds and returns a string in the format "hh:mm:ss" representing the same duration.

The get_text_from_mp3_whisper function appears to use the whisper library to transcribe an MP3 audio file. It first loads a model using the load_model function, and then transcribes the audio file by calling the transcribe method on this model and passing in the filename of the audio file. Finally, it returns the result of the transcription.

For the original wit ai implementation

```python
def parse_witai_response(data: str):
    """
    Parse wit.ai response
    """
    # scan for export interface and export type

    type_start_line = None
    type_end_line = None
    matches = []
    lines = data.split("\n")
    for i, value in enumerate(lines):
        line = lines[i]
        # make sure this isnt a comment 
        # match { at start of line
        if line.startswith("{") and type_start_line is None:
            type_start_line = i

        if type_start_line is not None and line.startswith("}"):
            type_end_line = i
            # append entry to matches
            # get all rows from type_start_line to type_end_line
            matches.append({
                "type_start": type_start_line,
                "type_end": type_end_line,
                "data": lines[type_start_line:type_end_line+1]
            })
            type_start_line = None
            type_end_line = None
    # combine all data results and remove duplicates and merge text
    final_object = {
        "speech": {
            "tokens": []
        },
        "text": "",
    }
    for match in matches:
        matchstr = "".join(match.get("data"))
        transcript_data = json.loads(matchstr)
        # only append entries that has is final
        if transcript_data.get("is_final"):
            # final_object["speech"]["tokens"].append(data)
            final_object["text"] += transcript_data.get("text", "") + " "
            # final_object["text"] += data.get("text", "")
        # else:
        #     final_status = transcript_data.get("is_final")
        #     print("not final", final_status)
    return final_object
```

The parse_witai_response function appears to parse a string containing a response from the Wit.ai natural language processing service. It does this by first splitting the string into lines, and then scanning through the lines looking for lines that start with a curly brace ('{') and end with a curly brace ('}'). When it finds such lines, it adds them to a list of "matches" along with their start and end positions in the input string. Finally, the function combines the data from the matches into a single object, removes duplicates, and merges the "text" fields. The resulting object is returned by the function.