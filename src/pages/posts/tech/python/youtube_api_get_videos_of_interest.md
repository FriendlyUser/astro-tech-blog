---
tags: ['python', 'youtube']
title: Getting youtube videos of interest in python
description: In this post I will show you how to use the youtube api to get videos of interest in python.
pubDate: Fri, 2 May 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1113292628.png
---

The YouTube API (Application Programming Interface) is a set of tools and services provided by Google that allows developers to interact with YouTube videos, channels, playlists, and other related features programmatically. The API provides a way for developers to create applications that can access and manipulate YouTube content.

With the YouTube API, developers can retrieve video information, upload and manage videos, search for videos and channels, and customize the YouTube experience for users. It provides a wide range of endpoints, allowing developers to perform various operations on YouTube content. Additionally, the API provides access to real-time analytics, enabling developers to gather data about video performance and engagement.

The YouTube API is available for use by developers for free, with some limitations on the number of requests that can be made per day. Access to certain features may require authentication and authorization through the use of API keys and OAuth 2.0. The API is available for use with a variety of programming languages, including Python, Java, JavaScript, and PHP.


```python 
 import sys
import argparse as ap
import pathlib
import glob
import shutil
import json

from datetime import date, datetime, timedelta
from lib.util import get_config
from lib.youtube.get_videos import get_video_data_for_channel
from lib.youtube.yt_nlp import YTNLP
from lib.email import send_mailjet_email
from jinja2 import Template
from lib.util.send_discord import send_data_to_discord
from icecream import ic

def path_to_url(url: str) -> str:
    if url == "":
        return None
    base_url = "http://dli-invest.github.io/ytube_nlp"
    return f"{base_url}/{url}"


def main(args):
    end_date = str(date.today())
    raw_file = "data/ytube/investing/yt_data.json"
    new_entries = []
    with open(raw_file, "r") as file:
        yt_df = json.load(file)
    # TODO convert to object since this is so complicated
    # With an object I think it would be easier to parallelize
    for report_cfg_file in glob.glob("scripts/lib/cfg/*.yml"):
        report_cfg = get_config(report_cfg_file)
        report_name = report_cfg["name"]
        output_folder = f"{args.output}/{report_name}"
        pathlib.Path(output_folder).mkdir(parents=True, exist_ok=True)

        # video stats object per channel 
        # send to new discord channel for stats

        # per channel stats
        # missed videos
        # hit videos
        # total videos per channel
        # global stats
        email_channel_data = []
        # Make channel videos
        # This loop isn't extremely expensive as
        # we are just fetching text from an api
        for channel in report_cfg["channels"]:
            channel_id = channel.get("id")
            channel_label = channel.get("label")
            if channel_id != None:
                video_data = get_video_data_for_channel(channel_id)
                # loop through videos
                for video_info in video_data:
                    video_id = video_info.get("videoId")
                    # skip if video found already
                    if video_id in yt_df:
                        continue
                    title = video_info.get("title")
                    description = video_info.get("description")
                    publishedAt = video_info.get("publishedAt")

                    with YTNLP(
                        video_id=video_id, html_template="lib/ytube.jinja2"
                    ) as yt_nlp:
                        # this is adjusted with a date for the gh pages step
                        file_folder = f"{output_folder}/{end_date}/{video_id}"
                        pathlib.Path(file_folder).mkdir(parents=True, exist_ok=True)
                        file_path = f"{file_folder}/{video_id}.json"
                        is_generated = yt_nlp.gen_report_for_id(
                            video_id, report_path=file_path, video_data=video_data
                        )

                        # temp array of objects
                        matches_per_vid = []
                        if title is not None:
                            temp_matches, _ = yt_nlp.get_text_matches(title)
                            matches_per_vid = [*matches_per_vid, *temp_matches]
                        if description is not None:
                            temp_matches, _ = yt_nlp.get_text_matches(description)
                            matches_per_vid = [*matches_per_vid, *temp_matches]
                        match_object = video_info
                        match_object["phrases"] = matches_per_vid
                        match_object["source"] = channel_label
                        if is_generated is False:
                            match_object["has_report"] = False
                        else:
                            match_object["has_report"] = True

                            # append object to pandas dataframe
                            new_file = {
                                "date": publishedAt,
                                "title": title,
                                "source": channel_label,
                                "channel_id": channel_id,
                                "video_id": video_id,
                                "url": f"https://www.youtube.com/watch?v={video_id}",
                                "keywords": [],
                                "description": description,
                                # path to access file from website, need to control and replace all files again.
                                "transcript_path": f"{file_path}",
                                # need to get url to build file somehow
                            }
                            current_year = date.today().year
                            match_object["video_path"] = f"/ytube/{channel_label}/{current_year}/{video_id}"
                            # df.loc[video_id] = new_file
                            if video_id in yt_df:
                                print(f"Video {video_id} exists - not setting vid_id")
                            else:
                                if is_generated:
                                    ic(f"adding video for channel {channel_id} and video {video_id}")
                                    # add row to df
                                    new_entries.append(new_file)
                                    yt_df.append(new_file)
                                else:
                                    print("Updating is_generate flag")

                    if channel.get("only_on_nlp_match") is True:
                        # check for nlp matches
                        if len(match_object["phrases"]) > 0:
                            email_channel_data.append(match_object)
                    else:
                        email_channel_data.append(match_object)
            else:
                ic("Channel not found for")
                ic(channel) 
 ```

This is a Python script that utilizes the YouTube API to fetch video data for specific channels and apply natural language processing (NLP) to the videos' metadata, including titles and descriptions. The script also generates reports for each video and adds new videos to a JSON file.

Here is a breakdown of the main components of the script:

### Importing Libraries


```python
import sys
import argparse as ap
import pathlib
import glob
import shutil
import json

from datetime import date, datetime, timedelta
from lib.util import get_config
from lib.youtube.get_videos import get_video_data_for_channel
from lib.youtube.yt_nlp import YTNLP
from lib.email import send_mailjet_email
from jinja2 import Template
from lib.util.send_discord import send_data_to_discord
from icecream import ic`
```
The script imports several libraries that are used throughout the code. These include argparse, pathlib, glob, and json for file handling; datetime and timedelta for working with dates; and several custom libraries for working with the YouTube API and sending email and Discord messages.

### Main Function

The main function reads a JSON file containing existing YouTube video data, reads YAML configuration files from a specified folder, and fetches new data for each YouTube channel specified in the configuration file. It then generates reports using an external template library (Jinja2) and saves the reports as JSON files. It also extracts text matches for each video's title and description, and appends the video data to a Pandas dataframe if it's new. If the "only_on_nlp_match" flag is set to True for a channel, it adds the video data to an email channel data list only if there are text matches found.

The code could be improved by separating the different functionalities into different functions or classes, adding error handling, and improving code readability and maintainability. It could also benefit from more comments and documentation to make it easier to understand the purpose and behavior of the code. Additionally, it may be worth considering using a database instead of a JSON file for storing the video data.

To send reports to email using Jinja and Mailjet, you can follow these steps:

1. Install the `jinja2` and `mailjet_rest` Python packages. You can install them using pip:


```python
pip install jinja2 mailjet_rest
```
2. Set up a Mailjet account and get your API key and API secret key.
3. Create a Jinja template for your report. This template should include placeholders for the data that will be inserted into the report. For example:


```html
css`<h1>Report for {{ date }}</h1>
<p>Number of new subscribers: {{ new_subscribers }}</p>
<p>Total revenue: {{ revenue }}</p>
```
4. In your Python script, load the Jinja template and render it with the data for your report. For example:


```python
from jinja2 import Environment, FileSystemLoader
import os

# Load the Jinja template from a file
file_loader = FileSystemLoader(os.path.dirname(__file__))
env = Environment(loader=file_loader)
template = env.get_template('report\_template.html')

# Render the template with the data for the report
report_data = {
 'date': '2022-02-15',
 'new\_subscribers': 100,
 'revenue': 1000.00
}
report = template.render(report_data)
```
5. Use the Mailjet API to send the report via email. For example:


```python
from mailjet_rest import Client

# Set up the Mailjet API client
api_key = 'your\_api\_key'
api_secret = 'your\_api\_secret'
mailjet = Client(auth=(api_key, api_secret), version='v3.1')

# Define the email message
message = {
 'From': {
 'Email': 'sender@example.com',
 'Name': 'Sender Name'
 },
 'To': [
 {
 'Email': 'recipient@example.com',
 'Name': 'Recipient Name'
 }
 ],
 'Subject': 'Report for 2022-02-15',
 'HTMLPart': report
}

# Send the email
result = mailjet.send.create(data=message)
```

This code will send the report as an HTML email to the specified recipient. You can customize the email message by modifying the `message` dictionary.


```html 
 <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">

<html lang="en">

<head>

  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1">

  <meta http-equiv="X-UA-Compatible" content="IE=edge">



  <title></title>



  <style type="text/css">

  </style>    

</head>

<body style="margin:0; padding:0; background-color:#F2F2F2;">

  <center>

    <table width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#F2F2F2">

      <thead>

        <tr>

            <th>videoId</th>

            <th>channelId</th>

            <th>description</th>

            <th>title</th>

            <th>phrases</th>

            <th>has report</th>

        </tr>

      </thead>

      {% for full_video_data in EMAIL_DATA %}

        <tr>

          <td><a href="https://dli-invest.github.io/media_nlp{{full_video_data.get('video_path')}}">{{full_video_data.get('videoId')}}</a></td>

          <td>{{full_video_data.get('channelId')}}</td>

          <td>{{full_video_data.get('description')}}</td>

          <td><a href="https://www.youtube.com/watch?v={{full_video_data.get('videoId')}}">{{full_video_data.get('title')}}</a></td>

          <td>{{full_video_data.get('phrases')}}</td>

          <td>{{full_video_data.get('has_report')}}</td>

        </tr>

      {% endfor %}

    </table>

  </center>

</body>

</html> 
 ```

This looks like an HTML template that can be used to render a table in an email. The template contains a table with six columns: videoId, channelId, description, title, phrases, and has report. The table header is contained in a thead tag, and the table body is generated dynamically from the EMAIL\_DATA variable using a for loop. Each row in the table displays the relevant data for a single video, including a link to the video and a link to the YouTube page. This template can be used with a templating engine like Jinja to generate an email that displays a summary of video data.



## References
- https://github.com/dli-invest/media_nlp
