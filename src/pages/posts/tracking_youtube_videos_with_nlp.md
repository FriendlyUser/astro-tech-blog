---
title: How I applied nlp to various youtube videos
description: Applying nlp
alt: Applying nlp to various youtube videos
pubDate: Tuesday, 23 August 2022 13:00:00 GMT
tags: ["youtube", "nlp", "python", "astro"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/white_fur_monster_reading_book.png'
imgAlt: 'white fur monster'
---


# Applying nlp to youtube videos

Initially I was going to extract the transcripts from youtube videos directly using assemblyai, however google is super advanced and started to provide transcripts automatically.

[assemblyai](https://assemblyai.com/) is a great tool for extracting transcripts from videos, I have used it for investor presentations from other sources.

The legacy project ([ytube_nlp](https://github.com/dli-invest/ytube_nlp)) I had before, was using jinja2 in order to generate the transcript pages, didnt have a toc or group videos by category. In addition, there is no rss feed in the ytube_nlp, so I have no way of knowing when new videos are out. 

My latest iteration, [media_nlp](https://github.com/dli-invest/media_nlp) is designed to take any sort of media (mainly youtube videos) and extract the transcript and other metadata.

Improvements include:

- rss feed with astrojs
- incremental page generation with astrojs, ability to serve the json files directly if desired
- ability to group videos by category
- improved emails

## Explaination of tech architecture

There are two main components in [media_nlp](https://github.com/dli-invest/media_nlp).

The transcript gathering python script (using [youtube_transcript_api](https://pypi.org/project/youtube-transcript-api/)) and the static site generation taken care of by [astrojs](https://astro.build/).

The python scripts in the scripts folder is heavily inspired by ytube_nlp, but generates json files to be processed by astrojs. It uses the youtube data api to fetch videos that were uploaded with 24 hours for channels of interest (hardcoded in config.yml file). 

```python
def search_videos_for_channel(channel_id, params=dict(part="snippet")):
    youtube_api = "https://www.googleapis.com/youtube/v3/search"
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    if youtube_api_key is None:
        raise SystemExit("Need Youtube API KEY")
    params["channelId"] = channel_id
    params["order"] = "date"
    current_date = datetime.now(timezone.utc)
    # hardcoded fix for now, only query for videos in august
    publishedAfter = (current_date - timedelta(days=REF_DAYS)).isoformat()
    params["publishedAfter"] = publishedAfter
    params["maxResults"] = 100
    params["key"] = youtube_api_key

    r = requests.get(youtube_api, params=params).json()
    # Check if an error object is present
    if r.get("error") is not None:
        print(r)
        print("Add Authentication Key")
    return r
```

The above function grabs the videos from the youtube api within a parameterizated timeframe (usually a day for my purposes). It is highly nlikely that users would create more than 100 videos, but possible for big news channels like cnbc.

```python
def extract_key_video_data(video_data):
    # Takes video search response and extracts the data of interest
    # videoId, title, description, channelId, publishedAt
    key_video_data = []
    if video_data is None or video_data is []:
        return
    # video id is None do nothing, it happens during livestreams
    # before publishing
    for video in video_data.get("items"):
        snippet = video.get("snippet")
        vid_id = video.get("id")

        videoId = vid_id.get("videoId", None)
        if videoId == None:
            continue
        channelId = snippet.get("channelId")
        description = snippet.get("description")
        title = snippet.get("title")
        publishedAt = snippet.get("publishedAt")
        video_data = dict(
            videoId=videoId,
            channelId=channelId,
            description=description,
            title=title,
            publishedAt=publishedAt,
        )
        key_video_data.append(video_data)
    return key_video_data
```

This creates a list of key data I am interested in, publishedDate which is useful for knowing the likelyhood of having a transcript.

Afterwards, it uses the youtube_transcript_api to extract the transcript from the video. It takes a few hours for transcripts to appear for a video. 
After getting the transcript, spacy is used to perform entity detection and then the results are written to a json file.

Now, the astro site can parse all that information and then output it to static html.

So I have created two github actions, one dependent on the other.

Cron job to scan youtube files and update the repo with new youtube transcript data.

```yml
name: Scan YTube
# Don't want to burn my private minutes at this point
on:
  push:
    branches:
      - master
      - main
    paths-ignore:
      - "website/**"
  schedule:
    # * is a special character in YAML so you have to quote this string
    - cron:  '30 13 * * *'
    

env:
  YOUTUBE_API_KEY: ${{ secrets.YOUTUBE_API_KEY  }}
  MJ_APIKEY_PUBLIC: ${{ secrets.MJ_APIKEY_PUBLIC }}
  MJ_APIKEY_PRIVATE: ${{ secrets.MJ_APIKEY_PRIVATE }}
  DISCORD_CODE_STATUS_WEBHOOK: ${{ secrets.DISCORD_CODE_STATUS_WEBHOOK }}
  DISCORD_VIDEO_WEBHOOK: ${{ secrets.DISCORD_VIDEO_WEBHOOK }}

jobs:
  make_report:
    name: Generate Report
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - name: Set up Python 3.x
        uses: actions/setup-python@v1
        with:
          python-version: '3.8' # Semantic version range syntax or exact version of a Python version
          architecture: 'x64' # Optional - x64 or x86, defaults to x64
      - name: installation of dependencies
        run: |
          if [ -f scripts/requirements.txt ]; then pip install -r scripts/requirements.txt; fi
          python -m spacy download en_core_web_sm
          python -m textblob.download_corpora
      
      - name: Generate Report
        run:  python3 scripts/main.py
      
      - name: Commit files
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add *.json
          git add data/ytube
          git commit -m "added json files"
      - name: Push changes
        uses: ad-m/github-push-action@master
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/upload-artifact@v1
        name: Upload Report folder
        with:
          name: report
          path: data/ytube/investing
```

Build the astro files when the data is succcessful gathered from the python script.

```yml
# Workflow to build and deploy to your GitHub Pages repo.

# Edit your project details here.
# Remember to add API_TOKEN_GITHUB in repo Settings > Secrets as well!
env:
  githubEmail: <YOUR GITHUB EMAIL ADDRESS>
  deployToRepo: <NAME OF REPO TO DEPLOY TO (E.G. <YOUR USERNAME>.github.io)>

name: Github Pages Astro CI

on:
  # Triggers the workflow on push and pull request events but only for the main branch
  push:
    branches: [main]
  pull_request:
    branches: [main]

  workflow_run:
    workflows: ["Scan YTube"]
    types:
      - completed

  # Allows you to run this workflow manually from the Actions tab.
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      # Checks-out your repository under $GITHUB_WORKSPACE, so your job can access it
      - uses: actions/checkout@v2

      # Install dependencies with npm
      - name: Install dependencies
        run: cd website && npm install

      # Build the project and add .nojekyll file to supress default behaviour
      - name: Build
        run: |
          cd website
          npm run build
          touch ./dist/.nojekyll
      # Push to your pages repo
      - name: Deploy 🚀
        uses: JamesIves/github-pages-deploy-action@v4.3.0
        with:
          branch: gh-pages # The branch the action should deploy to.
          folder: website/dist # The folder the action should deploy.
```

Hopefully this will be enough to understand how the general workflow works. Some of the things I have learned are:

- How to use the github actions workflow to trigger another workflow
- How to interact with the youtube data api
- Basic nlp with spacy is not all that useful for this project, but it is a good starting point.
- If I had phrase extraction, it might get fairly interesting.
