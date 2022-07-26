---
title: Flutter Remove background from image web app Part III
description: Automatical update app using fastlane
alt: my first blog post
tags: ["flutter"]
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'  
pubDate: Sunday, 23 July 2022 13:00:00 GMT
---

In this article I will cover how to use fastlane with github actions to automatically deploy your app.

Following the instructions at fastlane and github actions is far better as they will be updated.

Keep in mind in order to deploy using fastlane you must manually upload at least once to google play developer.

```yaml
name: Flutter Android/ Windows
on:
  push:
    branches:
      - main
      - feature/*
  
jobs:
  android: 
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-java@v2
      with:
        distribution: 'zulu'
        java-version: '11'
    - uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.0.3'
    - run: flutter pub get
    - run: flutter build apk
    - run: flutter build appbundle

    - uses: actions/upload-artifact@v3
      with:
        name: apk
        path: build/app/outputs/apk/release/*.apk # or path/to/artifact

    - uses: actions/upload-artifact@v3
      with:
        name: aab
        path: build/app/outputs/bundle/release/*.aab # or path/to/artifact
```

This will generate an apk and aab when you push to the main branch or a specific feature branch.

Afterwards we can only trigger fastlane events for certain branches.

```yaml

      - run: flutter build appbundle
      - run: echo $GPLAY_KEY_B64 | base64 --decode > android/pc-api-7819418006086265513-297-141698a71862.json
        name: decode json file to upload to google play
      - run: echo $KEY_PROPERTIES_B64 | base64 --decode > android/key.properties
        name: Decoding Key Properties
      - run: echo $JKS_FILE_B64 | base64 --decode > android/keystore.jks
        name: Decode jks file


      - uses: actions/setup-ruby@v1
        with:
          ruby-version: '2.7.2'
      - uses: maierj/fastlane-action@v2.0.1
        if: endsWith(github.ref, '/develop')
        with:
          lane: beta
          subdirectory: 'android'
```

First we decode all the keys we need to use fastlane, then we check what branch we are on, if we are on the develop branch we will trigger the beta lane.

For master we can trigger the deploy lane (go straight to google play).

For another one of my projects, [trump quotes](https://github.com/FriendlyUser/trump_quotes/blob/master/android/fastlane/Fastfile) I used a flutter plugin to automatically write change logs based on commit messages. It was helpful, but a pain to install.


In order to do a release build, you must update the android/app/build.gradle file to
contain

```
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
         ...
   }
```
## Helpful commands

My personal preference is to use 

```
base64 -w 0 keystore.jks > sample.jks
```

in order to make b64 version of keyfiles and put those into github actions and base64 decode them.


For my personal projects my passwords used are pathetic, please do not judge me.

## References

* https://docs.fastlane.tools/getting-started/cross-platform/flutter/
* https://docs.flutter.dev/deployment/cd
* https://github.com/flutter/gallery/tree/main/.github/workflows