---
title: Intermittent build failures on react native android due to jcenter
description: How I migrate from jcenter to mavenCentral using patch files.
alt: Bintray Removed
layout: '@/templates/BasePost.astro'
pubDate: Wed, 15 Nov 2022 13:00:00 GMT
tags: ["dev ops", "react-native", "bintray"]
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-11-25 19.14.06 - A plush toy pikachu sitting next to a wall.png'
imgAlt: 'Image post 6'
---

The first article at [bintray removed](https://friendlyuser.github.io/posts/bintray_removed_approaches/) is a good starting point for migrating from jcenter to mavenCentral.


Following instructions from patch-package I am able to commit changes that replace references to jcenter in react-native node_modules with mavenCentral.

After updating the file, and hitting save, run patch command to create a patch file:


For example to update `@react-native-community/geolocation` you would run the following command:

```bash
npx patch-package @react-native-community/geolocation
```
```git

diff --git a/node_modules/lottie-react-native/build.gradle b/node_modules/lottie-react-native/build.gradle
index 184fdbf..2599f31 100644
--- a/node_modules/lottie-react-native/build.gradle
+++ b/node_modules/lottie-react-native/build.gradle
@@ -3,7 +3,7 @@
 buildscript {
   repositories {
     google()
-    jcenter()
+    mavenCentral()
   }
   dependencies {
     classpath 'com.android.tools.build:gradle:7.0.0'
@@ -14,7 +14,7 @@ allprojects {
   repositories {
     mavenLocal()
     google()
-    jcenter()
+    mavenCentral()
     maven {
       // All of React Native (JS, Obj-C sources, Android binaries) is installed from npm
       url("$rootDir/node_modules/react-native/android")
```

Overall going through the process of migrating from jcenter to mavenCentral is not too bad, but it is a bit tedious.

A simple approach is to search for files in node_modules that reference jcenter and replace them with mavenCentral. You can ignore dependencies of dependencies, since they will be updated when you update the dependency.

At first I thought I could ignore patch package as a dependency and set as a dev dependency but it needs to be installed it order to apply the patches.

With the increasing unreliablility of jcenter, you may see more and more react-native projects using patch-package to migrate from jcenter to mavenCentral for android.

You can never know when it will go down for good or if there will be an outage, for more reliable service you should migrate to mavenCentral as soon as possible.

Thats why I believe all ci jobs should happen automatically from month to month just to ensure nothing breaks.

### References

- https://jfrog.com/into-the-sunset-bintray-jcenter-gocenter-and-chartcenter/
- https://blog.gradle.org/jcenter-shutdown
- https://www.reddit.com/r/reactnative/comments/s5ctrc/is_jcenter_again_down/
- https://www.reddit.com/r/androiddev/comments/lbssfn/now_that_bintray_and_jcenter_are_shutting_down/
- https://www.reddit.com/r/java/comments/shfuz2/friendly_reminder_get_ride_of_any_jcenter/
