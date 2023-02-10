---
tags: ['python', 'selenium', 'bs4']
title: How to find the status of youtube livestream with web scrapping in python
description: By leveraging a web browser we can extract the livestream status from a upcoming video from a youtube channel.
pubDate: Fri, 10 Feb 2023
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3750534419.png"
---
YouTube is a video-sharing website where users can upload, share, and view videos. It was founded in February 2005 and later acquired by Google in November 2006. It has since become one of the largest and most popular websites on the internet, offering a wide variety of content, including music videos, educational videos, movie trailers, and more. Users can also interact with each other by commenting on videos, giving "thumbs up" or "thumbs down" ratings, and subscribing to other users' channels. YouTube is available on various devices, including computers, smartphones, and smart TVs.


Transcribing Federal Reserve livestreams in real time is important for investors because the statements made by Federal Reserve officials can have a significant impact on financial markets. The Federal Reserve is the central bank of the United States, and its policies and statements on monetary policy, economic conditions, and interest rates can have a major effect on the stock market, the bond market, and the value of the US dollar.

By transcribing the livestreams in real time, investors can quickly and accurately obtain information and insights from the Federal Reserve's statements. This can help them make informed investment decisions and respond to market changes as they occur. Additionally, real-time transcription allows investors to more effectively analyze and interpret the Federal Reserve's statements, giving them a competitive advantage in a fast-paced and constantly-changing market.

In short, transcribing Federal Reserve livestreams in real time is important for investors because it allows them to stay up-to-date on the central bank's statements and respond quickly to market changes, which can have a significant impact on their investments.


```python 
 """
author: FriendlyUser
description: grab livestream data from url using selenium, (need a browser for youtube)
create database entries to track livestreams, check if livestream is live or upcoming and exclude certain channels with never ending livestreams.
"""

import bs4
import time
from selenium import webdriver
import os
import dateparser

def get_livestreams_from_html(data: str):
    """
        gets livestream from html from youtube channel and determines if it is live or upcoming.
        Returns dict:
          time: time of livestream
          channel: channel name
          status: LIVE or UPCOMING or none
    """
    # get text data from url using requests
    try:

        soup = bs4.BeautifulSoup(data, "html.parser")

        livestream_data = []
        first_section = soup.find("ytd-item-section-renderer")

        title_wrapper = first_section.find("ytd-channel-video-player-renderer")
        if title_wrapper == None:
            watch_link = first_section.find("a", {"class": "yt-simple-endpoint style-scope ytd-video-renderer"})
            watch_url = watch_link.get("href")
        else:
            channel_title = title_wrapper.find("yt-formatted-string")
            watch_link = channel_title.find("a")
            watch_url = watch_link.get("href")
        # get video_id 
        # sample <a id="thumbnail" class="yt-simple-endpoint inline-block style-scope ytd-thumbnail" aria-hidden="true" tabindex="-1" rel="null" href="/watch?v=wl1p_H6ckt4">
        # https://www.youtube.com/BloombergTV style-scope ytd-thumbnail-overlay-time-status-renderer
        ytd_thumbnail_overlay_time_status_renderer = first_section.find("ytd-thumbnail-overlay-time-status-renderer")
        # try to find ytd-video-renderer and get href

        if ytd_thumbnail_overlay_time_status_renderer is None:
            # try to grab upcoming livestream
            scheduled_text = first_section.find("ytd-video-meta-block")
            run_time = scheduled_text.get_text()
            # parse strings like August 22 at 6:00 AM
            # remove words like at
            run_str = run_time.replace("Scheduled for", "").strip()
            parsed_date =  dateparser.parse(run_str)
            livestream_data.append({"date": parsed_date, "status": "UPCOMING", "watch_url": watch_url})
        else:
            livestream_label = ytd_thumbnail_overlay_time_status_renderer.get_text()
            if livestream_label is not None:
                livestream_data.append({"date": None, "status": livestream_label.strip(), "watch_url": watch_url})
        return livestream_data
    except Exception as e:
        print(e)
        print("Error getting data from url")
        return [] 
 ```

This code uses the BeautifulSoup library and Selenium WebDriver to scrape a YouTube channel for live stream data. The function `get_livestreams_from_html` takes in an HTML string as input and returns a list of dictionaries, each representing a live stream event.

The function first creates a BeautifulSoup object from the input HTML string and then searches the HTML tree for specific elements that contain information about the live streams. It checks if the live stream is currently happening or if it's scheduled to happen in the future, and if it's live, it checks if it's never ending. If the live stream is never ending, the function does not include that event in the list of live streams.

The function uses the dateparser library to parse dates from strings, such as "August 22 at 6:00 AM". The live stream events are returned as a list of dictionaries, each containing the date and time of the event, the channel name, and the status of the event (live or upcoming).

This code can be used as a starting point for a more comprehensive script that scrapes live streams from YouTube, but it may need to be adapted to fit the specific needs of the user.


```python 
 
def get_webdriver():
    remote_url = os.environ.get("REMOTE_SELENIUM_URL")
    if remote_url is None:
        raise Exception("Missing REMOTE_SELENIUM_URL in env vars")
    return webdriver.Remote(
        command_executor=remote_url,
    )

def get_html_from_url(url: str):
    """
        gets html from url
    """
    # get text data from url using requests
    driver = get_webdriver()
    driver.get(url)
    time.sleep(10)
    # return html from page source
    return driver.page_source

if __name__ == "__main__":
    # TODO expand this to get all channels from config file, probably ini file
    # html = get_html_from_url("https://www.youtube.com/c/YahooFinance")
    html = get_html_from_url("https://www.youtube.com/c/YahooFinance")
    # html = get_html_from_url("https://www.youtube.com/BloombergTV")
    # TODO fix code so it works for upcoming livestreams that arent periodic
    livestream_data = get_livestreams_from_html(html)

    base_url = "https://www.youtube.com"
    # check if LIVE or UPCOMING
    for livestream in livestream_data:
        if livestream["status"] == "LIVE":
            print("LIVE")
            youtube_url = base_url + livestream["watch_url"]
            data = {"youtube_url": youtube_url, "iteration": -1, "table_name": "YahooFinance"}
            print(data)
        elif livestream["status"] == "UPCOMING":
            print("UPCOMING")
            exit(0)
        else:
            print("NONE")
            exit(1) 
 ```

This code is using the Selenium WebDriver to automate the web browser and retrieve the HTML content of a YouTube channel. The channel URL is hardcoded as "<https://www.youtube.com/c/YahooFinance>" in the `get_html_from_url` function, but it could be updated to read from a configuration file, as noted in the TODO comment.

After retrieving the HTML, the code uses the `get_livestreams_from_html` function to extract information about the livestreams on the channel, if any. It then checks the status of each livestream, and if the status is "LIVE", it prints the information, including the URL of the livestream on YouTube and some additional data. If the status is "UPCOMING", the code exits with status code 0. If the status is neither "LIVE" nor "UPCOMING", the code exits with status code 1.



## References
- https://github.com/dli-invest/fdrtt/blob/main/livestream_scrapper.py
- https://github.com/dli-invest/fdrtt
