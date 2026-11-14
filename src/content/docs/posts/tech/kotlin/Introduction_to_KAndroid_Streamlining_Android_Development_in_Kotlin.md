---
title: KAndroid Kotlin extensions for Android, and what replaces them today
pubDate: "2023-05-03T14:16:44.908Z"
lastUpdated: 2026-11-14
description: "What the KAndroid library offers (text watchers, toasts, intents, threading and logging helpers), how to add it with JitPack, and the AndroidX equivalents."
tags: ["kotlin", "android"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3131299487.webp
---

:::caution[KAndroid is unmaintained]
KAndroid's last release, 0.8.8, came out in August 2018. It's built against the old Android Support Library rather than AndroidX, so an AndroidX app needs Jetifier enabled to use it. Its own `find()` helper is marked deprecated in favour of `findViewById()`. For new code, use [Android KTX](https://developer.android.com/kotlin/ktx), [View Binding](https://developer.android.com/topic/libraries/view-binding) and Kotlin coroutines instead. The equivalents are listed at the end.
:::

[KAndroid](https://github.com/pawegio/KAndroid) is a small Apache-2.0 library by Paweł Gajda. It adds Kotlin extension functions for repetitive Android code: text watchers, toasts, intents, threading and logging. It doesn't add new features. Each helper is a thin wrapper over the platform API it replaces.

## Setup

KAndroid is served from JitPack. Add the repository, then the dependency:

```groovy
// settings.gradle (or the allprojects block in an older root build.gradle)
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven { url "https://jitpack.io" }
    }
}
```

```groovy
// app/build.gradle
dependencies {
    implementation 'com.github.pawegio:KAndroid:0.8.8@aar'
}
```

```properties
# gradle.properties: needed because KAndroid uses the Support Library
android.enableJetifier=true
```

All the functions live in the `com.pawegio.kandroid` package.

## Examples

All of these examples come from the project's README.

### Finding views

```kotlin
val textView = find<TextView>(R.id.textView)
```

This is just `findViewById` with a reified type. Since API 26 the platform's `findViewById<TextView>(R.id.textView)` does the same thing, which is why KAndroid deprecated it.

### Listeners

KAndroid has no click-listener helper; Kotlin's SAM conversion already makes `button.setOnClickListener { ... }` short. It does wrap the listener interfaces that have several callbacks:

```kotlin
editText.textWatcher {
    afterTextChanged { text -> preview.text = text }
}

searchView.onQueryChange { query -> update(query) }

seekBar.onProgressChanged { progress, fromUser ->
    if (fromUser) mediaPlayer.seekTo(progress)
}
```

### Toasts and intents

```kotlin
toast("Hi, I'm a short toast")
longToast(R.string.my_string)

startActivity<SampleActivity>()
startActivityForResult<SampleActivity>(REQUEST_CODE)
```

### Threading

`runAsync` starts a new `Thread`, and `runOnUiThread` posts to the main looper:

```kotlin
fun fetchDataAndUpdateTextView(textView: TextView, url: String) {
    runAsync {
        val data = URL(url).readText()
        runOnUiThread { textView.text = data }
    }
}
```

That's one raw thread per call, with no cancellation. If the activity is destroyed while the request is in flight, the callback still touches the old view.

### Logging

The log functions are extensions on `Any` and use the caller's class name as the tag:

```kotlin
w("Warn log message")
e("Error log message")
d { "Debug log message" }
v("CustomTag", "Verbose log message with custom tag")
```

The lambda forms (`d { }`, `v { }`, `i { }`) only build the message if `Log.isLoggable(tag, level)` returns true. By default only INFO and above pass that check, so `d { }` prints nothing unless you raise the level with `adb shell setprop log.tag.<ClassName> DEBUG`. The string overloads always log.

## Modern replacements

| KAndroid | Replacement |
| --- | --- |
| `find<T>(id)` | View Binding, or `findViewById<T>(id)` |
| `textWatcher { afterTextChanged { } }` | `doAfterTextChanged { }` from `androidx.core:core-ktx` |
| `runAsync` / `runOnUiThread` | `lifecycleScope.launch { withContext(Dispatchers.IO) { ... } }` |
| `startActivity<T>()` | `startActivity(Intent(this, T::class.java))` |
| `startActivityForResult<T>(code)` | `registerForActivityResult(...)` (Activity Result API) |
| `d { }` / `w()` | `android.util.Log`, or Timber |
