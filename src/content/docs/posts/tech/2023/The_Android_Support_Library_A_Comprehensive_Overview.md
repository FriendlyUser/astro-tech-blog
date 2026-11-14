---
title: "The Android Support Library: what it did and how to move to AndroidX"
pubDate: "2024-05-21T21:09:39.000Z"
lastUpdated: 2026-11-14
description: "What the Android Support Library provided, how its artifacts map to AndroidX and Material Components, and how to migrate an old project off android.support."
tags:
  - android
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3793215953.png
---

:::caution
The Android Support Library is no longer developed. Its final release was 28.0.0 (2018), and all new work happens in [AndroidX](https://developer.android.com/jetpack/androidx), which shipped alongside Android 9 (API level 28). Use AndroidX in any project you're building or maintaining today. This post explains what the Support Library was and how its pieces map to AndroidX.
:::

The Support Library was a set of Google libraries, packaged as `android.support.*`, that let apps use newer Android APIs on older versions of the platform. It also shipped widgets that weren't in the framework at all, like `RecyclerView`. You will still see it in older projects, tutorials and Stack Overflow answers, so it's worth knowing how to translate it.

## What it provided

- **Backward-compatible versions of framework classes.** For example, the support `Fragment` worked on devices older than Android 3.0, and `ActivityCompat` wrapped the runtime-permissions API added in Android 6.0 so the same call worked everywhere.
- **Widgets and helpers not in the framework**, such as `RecyclerView`, `CardView`, `ViewPager`, `DrawerLayout` and the Palette color-extraction API.
- **Build and tooling helpers**, such as `support-annotations` for lint checks and `multidex` for apps over the 65,536-method limit.

The compatibility classes degrade gracefully: on an old device they may not provide every feature of the newest platform API, so you still need to test on the oldest API level you support.

## Package names and versions

Artifacts carried suffixes like `-v4`, `-v7` and `-v13`, which originally meant the minimum API level the library supported. From release 26.0.0 (July 2017) the minimum for most packages became API level 14, so the suffix stopped meaning anything. The library's version number (25.x, 27.x, 28.0.0) tracked the platform API it was built against, and all Support Library artifacts in a project had to use the same version. AndroidX dropped both conventions: each library has its own package under `androidx.*` and its own semantic version.

## Support Library to AndroidX mappings

These are the modules people used most. Class names stayed the same; only the package and Maven coordinates changed.

| Support Library artifact | AndroidX artifact |
|---|---|
| `com.android.support:appcompat-v7` | `androidx.appcompat:appcompat` |
| `com.android.support:design` | `com.google.android.material:material` |
| `com.android.support:recyclerview-v7` | `androidx.recyclerview:recyclerview` |
| `com.android.support:cardview-v7` | `androidx.cardview:cardview` |
| `com.android.support:palette-v7` | `androidx.palette:palette` |
| `com.android.support:support-compat` | `androidx.core:core` |
| `com.android.support:support-fragment` | `androidx.fragment:fragment` |
| `com.android.support.constraint:constraint-layout` | `androidx.constraintlayout:constraintlayout` |

The `design` library is the odd one out: it became Material Components for Android, which is where `FloatingActionButton`, `TextInputLayout` and `Snackbar` live now. Google publishes the [full artifact mapping](https://developer.android.com/jetpack/androidx/migrate/artifact-mappings) and [class mapping](https://developer.android.com/jetpack/androidx/migrate/class-mappings) tables.

A support-era dependency block such as:

```groovy
implementation 'com.android.support:appcompat-v7:28.0.0'
implementation 'com.android.support:design:28.0.0'
```

becomes, in a current `build.gradle.kts`:

```kotlin
dependencies {
    implementation("androidx.appcompat:appcompat:1.8.0")
    implementation("com.google.android.material:material:1.14.0")
}
```

Those were the latest stable releases when this post was updated; check the [AndroidX versions page](https://developer.android.com/jetpack/androidx/versions) for newer ones.

## Migrating an old project

1. **Update to Support Library 28.0.0 first.** AndroidX 1.0.0 artifacts are binary-equivalent to 28.0.0, so this isolates API changes from the package rename.
2. **Work on a separate branch** and avoid unrelated refactoring during the migration.
3. **Run Refactor > Migrate to AndroidX** in Android Studio. It rewrites imports, XML layouts and Gradle dependencies, and sets the AndroidX flags in `gradle.properties`.
4. **Check whether you need Jetifier.** `android.enableJetifier=true` rewrites third-party libraries that still reference `android.support.*` classes at build time. By late 2021 most libraries supported AndroidX natively, and Jetifier slows builds, so Google advises leaving it off unless a dependency needs it. Android Studio's Build Analyzer has a check that tells you whether a project still does.

```properties
# gradle.properties
android.useAndroidX=true
# Only if a dependency still uses android.support.*
# android.enableJetifier=true
```

## Beyond the old Support Library

Once you're on AndroidX, the libraries that grew out of the Support Library (Fragment, RecyclerView, AppCompat) are updated independently. For new UI, Google's recommended toolkit is now Jetpack Compose rather than View-based widgets, though AppCompat and Material Components remain the standard for View-based apps.

## Further reading

- [Support Library overview](https://developer.android.com/topic/libraries/support-library)
- [Migrating to AndroidX](https://developer.android.com/jetpack/androidx/migrate)
- [AndroidX overview](https://developer.android.com/jetpack/androidx)
