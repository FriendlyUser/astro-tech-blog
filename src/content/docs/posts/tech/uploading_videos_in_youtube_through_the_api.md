---
title: Updating videos using the youtube api
description: How to upload videos using the youtube api
pubDate: Saturday, 15 October 2022 13:00:00 GMT
tags: ["whispers", "openai", "python", "youtube"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-15 11.08.57 - video.png'
---

## Summary

In order to upload youtube videos to my channel, I needed to use the youtube api. I found the documentation to be a bit confusing, so I thought I would write a quick post on how to do it.

Leverage the script from the internet from makes it pretty simple.

```javascript
// YouTube API video uploader using JavaScript/Node.js
// You can find the full visual guide at: https://www.youtube.com/watch?v=gncPwSEzq1s
// You can find the brief written guide at: https://quanticdev.com/articles/automating-my-youtube-uploads-using-nodejs
//
// Upload code is adapted from: https://developers.google.com/youtube/v3/quickstart/nodejs

const fs = require('fs');
const readline = require('readline');
const assert = require('assert')
const {google} = require('googleapis');
const OAuth2 = google.auth.OAuth2;

// video category IDs for YouTube:
const categoryIds = {
  Entertainment: 24,
  Education: 27,
  ScienceTechnology: 28,
  anime: 31,
  music: 10,
}

// If modifying these scopes, delete your previously saved credentials in client_oauth_token.json
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const TOKEN_PATH = 'client_oauth_token_new.json';


const videoFilePath = '../../remotion_video/out/video.mp4'
const thumbFilePath = '../../remotion_video/public/kageno3.png'


exports.uploadVideo = (title, description, tags) => {
  assert(fs.existsSync(videoFilePath))
  assert(fs.existsSync(thumbFilePath))

  // Load client secrets from a local file.
  fs.readFile('client_oauth_token.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the YouTube API.
    authorize(JSON.parse(content), (auth) => uploadVideo(auth, title, description, tags));
  });
}

/**
 * Upload the video file.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function uploadVideo(auth, title, description, tags) {
    console.log(auth);
  const service = google.youtube('v3')

  service.videos.insert({
    auth: auth,
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: categoryIds.music,
        defaultLanguage: 'en',
        defaultAudioLanguage: 'en'
      },
      status: {
        privacyStatus: "private"
      },
    },
    media: {
      body: fs.createReadStream(videoFilePath),
    },
  }, function(err, response) {
    if (err) {
      console.log(response)
      console.log('The API returned an error: ' + err);
      return;
    }
    console.log(response.data)

    // console.log('Video uploaded. Uploading the thumbnail now.')
    // service.thumbnails.set({
    //   auth: auth,
    //   videoId: response.data.id,
    //   media: {
    //     body: fs.createReadStream(thumbFilePath)
    //   },
    // }, function(err, response) {
    //   if (err) {
    //     console.log('The API returned an error: ' + err);
    //     return;
    //   }
    //   console.log(response.data)
    // })
  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);
  console.log("CALLBACK DO SOMETHING HERE")
  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
        // oauth2Client.setCredentials(
        // {
        //     access_token: accessToken
        // }
        // );
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log("WHAT IS THE URL")
  console.log('Authorize this app by visiting this url: ', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
    if (err) throw err;
    console.log('Token stored to ' + TOKEN_PATH);
  });
}
```
First create an oauth client for google, you will need gcp credentials for this. You can find the instructions [here](https://developers.google.com/youtube/registering_an_application). Once you have the credentials, you can download them as a json file. Afterwards, when you run the script you will be prompted to login, make sure the login corresponds to the account you want to upload the video to.

Afterwards you can just upload your video, I like the existing settings for the script as it allows for easy upload and then editing of the video.


For a sample video you can view https://www.youtube.com/watch?v=N2UPkTKd15g

## References

* https://github.com/FriendlyUser/auto_youtube_caption_system
