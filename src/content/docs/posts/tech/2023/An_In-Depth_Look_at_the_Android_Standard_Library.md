---
description: A map of the Android framework's core android.* packages and the four app components (activities, services, content providers, broadcast receivers), with current caveats.
imgSrc: /imgs/2023/1575571770.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-02-03T22:08:52.000Z'
lastUpdated: 2026-11-14
tags: ["android", "kotlin"]
title: "The Android framework APIs: core packages and app components"
---

What people sometimes call the "Android standard library" is officially the **Android framework API**: the `android.*` packages your app compiles against (`android.jar` in the SDK) and that each device provides at runtime. Its public surface is Java, callable from Java or Kotlin; much of the implementation underneath is native C/C++. Because the version on a device depends on its OS release, Google ships most newer APIs separately as **AndroidX (Jetpack)** libraries that you bundle with your app.

This post maps the main packages and then covers the four app components the framework is built around.

## Main packages

| Package | What's in it | Example classes |
| --- | --- | --- |
| `android.app` | App-level components and system services | `Activity`, `Service`, `Application`, `NotificationManager`, `AlarmManager` |
| `android.content` | Inter-component plumbing and data access | `Context`, `Intent`, `ContentProvider`, `ContentResolver`, `BroadcastReceiver`, `SharedPreferences` |
| `android.content.pm` | Information about installed packages | `PackageManager`, `PackageInfo` |
| `android.os` | Threads, messaging, system info | `Looper`, `Handler`, `Bundle`, `Build`, `PowerManager`, `Vibrator` |
| `android.graphics` | 2D drawing | `Canvas`, `Paint`, `Bitmap`, `Path` |
| `android.hardware` | Sensors and other hardware | `SensorManager`, `Sensor`; cameras via `android.hardware.camera2` |
| `android.location` | Location | `LocationManager`, `Location` |
| `android.view` | The base UI system and input | `View`, `ViewGroup`, `LayoutInflater`, `MotionEvent` |
| `android.widget` | Built-in View-based UI components | `TextView`, `Button`, `EditText`, `ImageView`, `LinearLayout` |

A few things that are commonly assumed to be in the framework but aren't, or are no longer recommended:

- `DrawerLayout`, `RecyclerView`, `ViewPager2` and `AppCompatActivity` are AndroidX libraries, not `android.widget` or `android.app`.
- `android.hardware.Camera` was deprecated in API 21 in favour of `camera2`; most apps now use the Jetpack CameraX library.
- `ListView` and `GridView` still exist, but new View-based code uses `RecyclerView`, and new UI is increasingly written in Jetpack Compose, which doesn't use `android.widget` at all.

## The four app components

Android starts your app through components declared in `AndroidManifest.xml`. There are four kinds.

### Activities

An `Activity` is a single screen. The system drives its lifecycle (`onCreate`, `onStart`, `onResume`, `onPause`, `onStop`, `onDestroy`) as the user navigates and as the app moves between foreground and background. In practice you extend `AppCompatActivity` or `ComponentActivity` from AndroidX rather than the framework `Activity` directly, so newer features work on older OS versions.

### Intents

An `Intent` is a message asking the system to start a component. An **explicit** intent names the target class; an **implicit** intent describes an action (such as `Intent.ACTION_VIEW` with a URL) and lets the system find an app that can handle it. Extra data travels with the intent as key/value pairs in a `Bundle`.

Here is an activity that opens another one with an explicit intent and passes an ID:

```kotlin
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<Button>(R.id.open_details).setOnClickListener {
            val intent = Intent(this, DetailActivity::class.java)
                .putExtra(DetailActivity.EXTRA_ITEM_ID, 42L)
            startActivity(intent)
        }
    }
}

class DetailActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_detail)

        val itemId = intent.getLongExtra(EXTRA_ITEM_ID, -1L)
        findViewById<TextView>(R.id.item_label).text = "Item $itemId"
    }

    companion object {
        const val EXTRA_ITEM_ID = "item_id"
    }
}
```

Both activities must be declared in the manifest with `<activity>` elements, or `startActivity` throws `ActivityNotFoundException`.

### Services

A `Service` runs work without a UI. Since Android 8.0 (API 26), apps in the background can't freely start services, and long-running work has to be a **foreground service** that shows a notification; Android 14 additionally requires each foreground service to declare a type (such as `mediaPlayback` or `dataSync`). `IntentService` was deprecated in API 30. For deferrable background work (syncing, uploads), use Jetpack **WorkManager** instead of a service.

### Content providers

A `ContentProvider` exposes structured data to other apps (or other processes) through `content://` URIs. You implement `query`, `insert`, `update`, `delete` and `getType`; clients call the same methods through a `ContentResolver`. The system's contacts, calendar and media store are all providers. If the data is only used inside your own app, you don't need one; a Room database or DataStore is simpler.

### Broadcast receivers

A `BroadcastReceiver` responds to system or app events in `onReceive`. Since Android 8.0, most implicit system broadcasts can no longer be received by receivers declared in the manifest; register those at runtime with `Context.registerReceiver` while your app is running. Keep `onReceive` short: it runs on the main thread and the system may kill the process soon after it returns.

## Further reading

- [Android API reference](https://developer.android.com/reference/packages)
- [Application fundamentals](https://developer.android.com/guide/components/fundamentals)
- [Background work overview](https://developer.android.com/develop/background-work/background-tasks)
- [Implicit broadcast exceptions](https://developer.android.com/develop/background-work/background-tasks/broadcasts/broadcast-exceptions)
