---
tags: ['python', 'youtube']
title: Finding new YouTube videos of interest with the YouTube Data API in Python
description: How my media_nlp script polls YouTube channels for new uploads, flags videos whose titles match keywords, and emails a summary table with Jinja and Mailjet.
pubDate: Fri, 2 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1113292628.png
---

This is a walkthrough of the YouTube part of my [media_nlp](https://github.com/dli-invest/media_nlp)
project. It checks a list of investing channels once a day, picks out new videos, runs keyword
matching over the title and description, and emails me a table of what it found.

You need a YouTube Data API v3 key from the Google Cloud console, exposed to the script as
`YOUTUBE_API_KEY`. Reading public video data only needs an API key; OAuth 2.0 is only required
for acting on a user's account (uploading, managing playlists, and so on).

## Fetching recent videos for a channel

The project calls the `search` endpoint, filtered to one channel and to videos published in the
last day. This is a cleaned-up version of the project's `get_videos.py`:

```python
import os
from datetime import datetime, timedelta, timezone

import requests

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def get_video_data_for_channel(channel_id: str, days: int = 1) -> list[dict]:
    published_after = datetime.now(timezone.utc) - timedelta(days=days)
    params = {
        "key": os.environ["YOUTUBE_API_KEY"],
        "part": "snippet",
        "channelId": channel_id,
        "type": "video",
        "order": "date",
        "publishedAfter": published_after.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "maxResults": 50,  # the API maximum per page
    }
    response = requests.get(SEARCH_URL, params=params, timeout=30)
    response.raise_for_status()

    videos = []
    for item in response.json().get("items", []):
        video_id = item["id"].get("videoId")
        if video_id is None:
            continue
        snippet = item["snippet"]
        videos.append(
            {
                "videoId": video_id,
                "channelId": snippet["channelId"],
                "title": snippet["title"],
                "description": snippet["description"],
                "publishedAt": snippet["publishedAt"],
            }
        )
    return videos
```

`search.list` is the expensive call to lean on. The quota docs give projects a default of 10,000
units a day for most endpoints, but ration `search.list` separately (100 calls a day by default at
the time of writing), and the search docs warn that `order=date` results can be delayed or
incomplete. For "latest uploads from channel X", Google recommends reading the channel's uploads
playlist instead: get its ID from `channels.list` (`part=contentDetails`,
`contentDetails.relatedPlaylists.uploads`), then page through `playlistItems.list`.

## The main loop

Channels are grouped into reports by YAML config files. For each new video, `YTNLP` (a class in
the project) generates a transcript report and matches the title and description against a list of
phrases. This is a trimmed excerpt of `scripts/main.py`; `get_config` and `YTNLP` live in the
project's `lib` package.

```python
import glob
import json
import pathlib
from datetime import date

from icecream import ic

from lib.util import get_config
from lib.youtube.get_videos import get_video_data_for_channel
from lib.youtube.yt_nlp import YTNLP


def main(args):
    end_date = str(date.today())
    raw_file = "data/ytube/investing/yt_data.json"
    with open(raw_file, "r") as file:
        yt_df = json.load(file)  # a list of video records
    seen_ids = {entry["video_id"] for entry in yt_df}
    new_entries = []

    for report_cfg_file in glob.glob("scripts/lib/cfg/*.yml"):
        report_cfg = get_config(report_cfg_file)
        output_folder = f"{args.output}/{report_cfg['name']}"
        email_channel_data = []

        for channel in report_cfg["channels"]:
            channel_id = channel.get("id")
            channel_label = channel.get("label")
            if channel_id is None:
                ic("Channel has no id", channel)
                continue

            video_data = get_video_data_for_channel(channel_id)
            for video_info in video_data:
                video_id = video_info["videoId"]
                if video_id in seen_ids:
                    continue
                title = video_info.get("title")
                description = video_info.get("description")

                with YTNLP(video_id=video_id, html_template="lib/ytube.jinja2") as yt_nlp:
                    file_folder = f"{output_folder}/{end_date}/{video_id}"
                    pathlib.Path(file_folder).mkdir(parents=True, exist_ok=True)
                    file_path = f"{file_folder}/{video_id}.json"
                    is_generated = yt_nlp.gen_report_for_id(
                        video_id, report_path=file_path, video_data=video_data
                    )

                    phrases = []
                    for text in (title, description):
                        if text is not None:
                            matches, _ = yt_nlp.get_text_matches(text)
                            phrases.extend(matches)

                match_object = {
                    **video_info,
                    "phrases": phrases,
                    "source": channel_label,
                    "has_report": bool(is_generated),
                }

                if is_generated:
                    match_object["video_path"] = (
                        f"/ytube/{channel_label}/{date.today().year}/{video_id}"
                    )
                    new_file = {
                        "date": video_info.get("publishedAt"),
                        "title": title,
                        "source": channel_label,
                        "channel_id": channel_id,
                        "video_id": video_id,
                        "url": f"https://www.youtube.com/watch?v={video_id}",
                        "keywords": [],
                        "description": description,
                        "transcript_path": file_path,
                    }
                    new_entries.append(new_file)
                    yt_df.append(new_file)
                    seen_ids.add(video_id)

                # Some channels only make the email when a phrase matched
                if not channel.get("only_on_nlp_match") or phrases:
                    email_channel_data.append(match_object)
```

The excerpt stops before the reporting step, where `email_channel_data` is rendered and sent.

An earlier version checked `if video_id in yt_df`, which never matches: `yt_df` is a list of
dicts, not a list of IDs, so already-processed videos were reprocessed. Building `seen_ids` once
fixes that. The remaining weak spot is the JSON file as a database; it grows every day and is
rewritten in full, so SQLite would be a better fit.

## Emailing the results with Jinja and Mailjet

Install the two packages:

```bash
pip install jinja2 mailjet-rest
```

The email template is a plain HTML table, one row per video. Email clients ignore most CSS, so
inline styles and table layout are the safe choice:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0; padding:0; background-color:#F2F2F2;">
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
      <td><a href="https://dli-invest.github.io/media_nlp{{ full_video_data.get('video_path') }}">{{ full_video_data.get('videoId') }}</a></td>
      <td>{{ full_video_data.get('channelId') }}</td>
      <td>{{ full_video_data.get('description') }}</td>
      <td><a href="https://www.youtube.com/watch?v={{ full_video_data.get('videoId') }}">{{ full_video_data.get('title') }}</a></td>
      <td>{{ full_video_data.get('phrases') }}</td>
      <td>{{ full_video_data.get('has_report') }}</td>
    </tr>
    {% endfor %}
  </table>
</body>
</html>
```

Render it with the list built in the main loop (here the template is saved as
`lib/email_template.html`), then send it through Mailjet's Send API v3.1.
Note that v3.1 expects the message inside a `Messages` list:

```python
import os
from datetime import date

from jinja2 import Environment, FileSystemLoader, select_autoescape
from mailjet_rest import Client

env = Environment(
    loader=FileSystemLoader("lib"),
    autoescape=select_autoescape(["html"]),
)
template = env.get_template("email_template.html")
html = template.render(EMAIL_DATA=email_channel_data)

mailjet = Client(
    auth=(os.environ["MJ_APIKEY_PUBLIC"], os.environ["MJ_APIKEY_PRIVATE"]),
    version="v3.1",
)
data = {
    "Messages": [
        {
            "From": {"Email": "sender@example.com", "Name": "media_nlp"},
            "To": [{"Email": "recipient@example.com", "Name": "Me"}],
            "Subject": f"New YouTube videos for {date.today()}",
            "HTMLPart": html,
        }
    ]
}
result = mailjet.send.create(data=data)
print(result.status_code, result.json())
```

Turn on autoescaping: video titles and descriptions are third-party text going straight into
HTML. The sender address must be one you've verified in Mailjet, or the send is rejected.

## References

- https://github.com/dli-invest/media_nlp
- [YouTube Data API: search.list](https://developers.google.com/youtube/v3/docs/search/list)
- [YouTube Data API: quota and getting started](https://developers.google.com/youtube/v3/getting-started)
- [mailjet-rest Python client](https://github.com/mailjet/mailjet-apiv3-python)
