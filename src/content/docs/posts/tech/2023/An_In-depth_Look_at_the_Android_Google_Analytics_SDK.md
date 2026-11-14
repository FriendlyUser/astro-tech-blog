---
title: "Google Analytics on Android: the legacy v4 SDK and moving to Firebase"
pubDate: "2024-08-07T00:06:04.000Z"
lastUpdated: 2026-11-14
description: "What Google Analytics v4 SDK code for Android looks like, why it no longer works, and how to replace trackers and hits with Google Analytics for Firebase."
tags: ["android", "kotlin"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/118660664.webp
---

:::caution
The Google Analytics Services SDK for Android (`com.google.android.gms:play-services-analytics`, the "v4" SDK with `Tracker` and `HitBuilders`) is shut down. Google stopped processing data for app-only properties that used it on October 31, 2019, and standard Universal Analytics properties stopped processing new hits on July 1, 2023 (Analytics 360 properties followed in 2024). To measure an Android app with Google Analytics today, use **Google Analytics for Firebase**, which reports into a GA4 property.
:::

You may still find the old SDK in long-lived codebases. This post shows what that code looks like so you can recognise it, then shows the Firebase equivalent and how the concepts map across.

## What the legacy v4 code looks like

A v4 integration had three parts: a tracker config file, a getter on the `Application` subclass, and calls that sent "hits".

`res/xml/global_tracker.xml` held the Universal Analytics tracking ID:

```xml
<resources>
    <string name="ga_trackingId">UA-XXXXXXXX-Y</string>
</resources>
```

The `Application` subclass (registered with `android:name=".MyApplication"` in the manifest) created the tracker lazily:

```java
import android.app.Application;

import com.google.android.gms.analytics.GoogleAnalytics;
import com.google.android.gms.analytics.Tracker;

public class MyApplication extends Application {
    private Tracker tracker;

    public synchronized Tracker getDefaultTracker() {
        if (tracker == null) {
            GoogleAnalytics analytics = GoogleAnalytics.getInstance(this);
            tracker = analytics.newTracker(R.xml.global_tracker);
        }
        return tracker;
    }
}
```

Screens and events were sent with `HitBuilders`:

```java
Tracker tracker = ((MyApplication) getApplication()).getDefaultTracker();

tracker.setScreenName("Main Screen");
tracker.send(new HitBuilders.ScreenViewBuilder().build());

tracker.send(new HitBuilders.EventBuilder()
        .setCategory("User Interaction")
        .setAction("Button Click")
        .setLabel("Submit")
        .build());
```

If you see `UA-` tracking IDs, `HitBuilders` or `play-services-analytics` in a project, that analytics code has been sending data nowhere for years and can be removed.

## Setting up Google Analytics for Firebase

1. In the [Firebase console](https://console.firebase.google.com/), create or open a project, enable Google Analytics for it (this creates or links a GA4 property), and add your Android app by its package name.
2. Download `google-services.json` into your app module directory.
3. Apply the Google services Gradle plugin, as described in the [Firebase Android setup guide](https://firebase.google.com/docs/android/setup), and add the dependency. The example below uses Firebase BoM 35.2.0; the BoM picks compatible versions of each Firebase library.

```kotlin
// app/build.gradle.kts
plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
}

dependencies {
    implementation(platform("com.google.firebase:firebase-bom:35.2.0"))
    implementation("com.google.firebase:firebase-analytics")
}
```

With just this, Firebase already logs a set of automatic events, including `first_open`, `session_start` and `screen_view` for each activity the user visits. There is no tracker to create.

## Logging events and screens

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.Firebase
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.analytics
import com.google.firebase.analytics.logEvent

class MainActivity : AppCompatActivity() {
    private lateinit var firebaseAnalytics: FirebaseAnalytics

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        firebaseAnalytics = Firebase.analytics
    }

    // Manual screen view, useful for fragments or Compose destinations
    // that automatic tracking doesn't see.
    private fun logScreen(name: String) {
        firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW) {
            param(FirebaseAnalytics.Param.SCREEN_NAME, name)
            param(FirebaseAnalytics.Param.SCREEN_CLASS, "MainActivity")
        }
    }

    // Equivalent of the old "User Interaction / Button Click / Submit" event.
    private fun logSubmitClicked() {
        firebaseAnalytics.logEvent("submit_clicked") {
            param("form_name", "signup")
        }
    }
}
```

## Mapping v4 concepts to Firebase

| v4 SDK | Google Analytics for Firebase |
| --- | --- |
| `Tracker` with a `UA-` ID | No tracker; configured by `google-services.json` |
| `setScreenName` + `ScreenViewBuilder` | Automatic `screen_view`, or log `SCREEN_VIEW` manually |
| `EventBuilder` category / action / label / value | One event name plus up to 25 named parameters |
| Custom dimensions | Event parameters, or `setUserProperty` for user-level attributes |
| Enhanced ecommerce hits | Recommended ecommerce events such as `purchase` and `add_to_cart` |
| `ExceptionBuilder` crash reports | Firebase Crashlytics |

Event names follow GA4 rules: up to 40 characters, letters, numbers and underscores, starting with a letter, and some prefixes (`firebase_`, `google_`, `ga_`) are reserved. Don't try to rebuild the old category/action/label hierarchy one-to-one; pick event names that describe the action and put details in parameters.

## Checking that it works

Events are batched and uploaded roughly once an hour, so don't expect them in standard reports right away. Turn on debug mode for a device to see events within seconds in the **DebugView** report:

```bash
adb shell setprop debug.firebase.analytics.app com.example.myapp
```

## Further reading

- [Get started with Google Analytics for Firebase on Android](https://firebase.google.com/docs/analytics/android/get-started)
- [Automatically collected events](https://support.google.com/analytics/answer/9234069)
- [Measure screenviews](https://firebase.google.com/docs/analytics/screenviews)
- [Sunsetting the Google Analytics Services SDKs](https://support.google.com/firebase/answer/9167112)
