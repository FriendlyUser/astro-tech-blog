---
title: Updating videos using the youtube api
description: How to upload videos using the youtube api
pubDate: Saturday, 15 October 2022 13:00:00 GMT
tags: ["whispers", "openai", "python", "youtube"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-15 11.08.57 - video.png'
---

# Summary

In order to upload youtube videos to my channel, I needed to use the youtube api. I found the documentation to be a bit confusing, so I thought I would write a quick post on how to do it.

Leverage the script from the internet from makes it pretty simple.

```javscript
// YouTube API video uploader using JavaScript/Node.js
// You can find the full visual guide at: https://www.youtube.com/watch?v=gncPwSEzq1s
// You can find the brief written guide at: https://quanticdev.com/articles/automating-my-youtube-uploads-using-nodejs
//
// Upload code is adapted from: https://developers.google.com/youtube/v3/quickstart/nodejs
```
First create an oauth client for google, you will need gcp credentials for this. You can find the instructions [here](https://developers.google.com/youtube/registering_an_application). Once you have the credentials, you can download them as a json file. Afterwards, when you run the script you will be prompted to login, make sure the login corresponds to the account you want to upload the video to.

Afterwards you can just upload your video, I like the existing settings for the script as it allows for easy upload and then editing of the video.


For a sample video you can view https://www.youtube.com/watch?v=N2UPkTKd15g

## References

* https://github.com/FriendlyUser/auto_youtube_caption_system
