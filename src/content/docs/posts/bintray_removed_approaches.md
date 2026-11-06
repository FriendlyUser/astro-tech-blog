---
title: Suggestions on how to deal with the depreciation of jcenter/bintray
description: My Thoughts on what todo with jcenter/bintray going down.
alt: Bintray Removed
layout: '@/templates/BasePost.astro'
pubDate: Wed, 15 Dec 2021 13:00:00 GMT
tags: ["dev ops", "bintray"]
imgSrc: '/assets/images/image-post.jpeg'
imgAlt: 'Image post 6'
---

## Summary

With the shutdown of bintray, it is pretty common to have legacy android apps fail to build since the dependencies can no longer be downloaded.

The suggested approach is to move from jcenter to mavenCentral, most of the time this involves updating your build.gradle file.

Here I highlight some of the available options to migrate.

### You have the app building locally

If you have the app running locally, you can simply continue to the build the app from your computer.

If you are debugging build pipelines, one option is to move the dependencies from your computer to your repo and move it to mavenLocal().

This is typically located at ~$HOME/m2.

For example

```bash
mkdir -p ~$HOME/m2
mv $REPO_LIBS $HOME/m2/repository
```

Depending on where the files are located.

One more thing to keep in mind, is to clear the build cache, that can interfere with build quality.

### Using React Native and patch files

Sometimes owners of packages are too lazy or busy to update their packages, perhaps they have retired from programming and/or do not have the time to update their work.

One option is to create patch packages that will automatically make changes to our people's work.

[https://www.npmjs.com/package/patch-package][patch-package]

### Migrate dependencies

If you have no choice, you may have to upgrade your entire app and switch things out to something that works. This solution is not ideal, but you may have no other choice.

Ideally, you would be able to at least build it locally as the required dependencies exist on your computer.

## Alternative to jcenter

The react native team expected jitpack to replace jcenter.

jitpack is a website that can build gradle projects from github repositories.