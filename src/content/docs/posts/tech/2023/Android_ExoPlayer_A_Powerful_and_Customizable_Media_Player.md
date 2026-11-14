---
title: 'ExoPlayer on Android: playing video and DASH streams with Media3'
pubDate: "2024-09-04T14:58:19.000Z"
lastUpdated: 2026-11-14
description: "How ExoPlayer is structured and how to play a video or DASH stream with it in an Android app, using the current AndroidX Media3 artifacts."
tags: ["android", "exoplayer", "media3"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3619698287.webp
---

ExoPlayer is Google's open-source (Apache 2.0) media player library for Android. You'd use it instead of the platform `MediaPlayer` when you need adaptive streaming (DASH, HLS, SmoothStreaming), DRM, playlists, or control over buffering and track selection. It ships as an app library, so its behaviour doesn't change with the device's Android version.

:::note[ExoPlayer 2.x is deprecated]
The standalone `com.google.android.exoplayer2` library is deprecated. Its last release was `2.19.1`, and the [google/ExoPlayer](https://github.com/google/ExoPlayer) repository stopped receiving commits in April 2024. ExoPlayer now ships as part of [AndroidX Media3](https://developer.android.com/media/media3) under the `androidx.media3` package. The examples below use Media3 1.11.1. If you have a 2.x project, follow the [migration guide](https://developer.android.com/media/media3/exoplayer/migration-guide), which includes a script that rewrites package names.
:::

## What it supports

- **Adaptive streaming:** DASH, HLS, and SmoothStreaming, each in its own module (`media3-exoplayer-dash`, `media3-exoplayer-hls`, `media3-exoplayer-smoothstreaming`). The player switches between bitrates based on measured bandwidth and device capabilities.
- **Progressive files:** containers including MP4, WebM/Matroska, MP3, Ogg, WAV, MPEG-TS, FLV, and ADTS AAC. Decoding uses the device's `MediaCodec` decoders, so codec support (for example AV1 or HEVC) still depends on the hardware.
- **DRM**, through Android's `MediaDrm` API. Widevine works on all supported Android versions ("cbcs" needs API 25+). ClearKey works with DASH. PlayReady SL2000 works on Android TV only. See the [DRM page](https://developer.android.com/media/media3/exoplayer/drm) for the per-format details.

## How it's put together

You can swap out any of these parts, but the defaults work for most apps:

- **`MediaSource`** loads and parses the media and exposes it as tracks. With Media3 you normally hand the player a `MediaItem`, and `DefaultMediaSourceFactory` creates the right source for you (`ProgressiveMediaSource`, `DashMediaSource`, `HlsMediaSource`, and so on).
- **`Renderer`** decodes and outputs one type of track: video, audio, text, metadata, or images.
- **`TrackSelector`** chooses which of the available tracks each renderer plays. The default is `DefaultTrackSelector`, which uses `AdaptiveTrackSelection` for adaptive video.
- **`LoadControl`** decides how much media to buffer and when playback can start. The default is `DefaultLoadControl`.
- **`ExoPlayer`** is the interface your app calls (`play`, `pause`, `seekTo`, and so on). It wires the other components together.

## Playing a video

Add the modules you need. All Media3 modules must use the same version:

```groovy
dependencies {
    def media3_version = "1.11.1"
    implementation "androidx.media3:media3-exoplayer:$media3_version"
    implementation "androidx.media3:media3-exoplayer-dash:$media3_version"
    implementation "androidx.media3:media3-ui:$media3_version"
}
```

If you stream over the network, your manifest also needs `<uses-permission android:name="android.permission.INTERNET" />`.

Add a `PlayerView` to the layout. In Media3 this is `androidx.media3.ui.PlayerView`, which replaces both `PlayerView` and `StyledPlayerView` from 2.x:

```xml
<androidx.media3.ui.PlayerView
    android:id="@+id/player_view"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:keepScreenOn="true" />
```

Then create the player, attach it to the view, and give it a `MediaItem`:

```java
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

public class PlayerActivity extends AppCompatActivity {
    private PlayerView playerView;
    private ExoPlayer player;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_player);
        playerView = findViewById(R.id.player_view);
    }

    @Override
    protected void onStart() {
        super.onStart();
        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        player.setMediaItem(MediaItem.fromUri("https://example.com/video.mp4"));
        player.prepare();
        player.play();
    }

    @Override
    protected void onStop() {
        super.onStop();
        playerView.setPlayer(null);
        player.release();
        player = null;
    }
}
```

Release the player when the activity is no longer visible. A player holds video decoders, which are a limited resource shared with other apps. On API 24 and higher, `onStart` and `onStop` are the right callbacks, because in multi-window mode a paused activity is still visible. If you still support API 23 or lower, create the player in `onResume` and release it in `onPause` instead. The [ExoPlayer codelab](https://developer.android.com/codelabs/exoplayer-intro) shows both, plus how to save and restore the playback position.

Once the player is prepared, `player.play()` and `player.pause()` start and stop playback. `PlayerView` also calls these for you from its built-in controls. If your UI uses Jetpack Compose, the `media3-ui-compose-material3` module provides a `Player` composable you can use instead of `PlayerView`.

## Playing a DASH stream

With the `media3-exoplayer-dash` module on the classpath, a `MediaItem` for a URI that ends in `.mpd` plays as DASH with no extra code. If the URI doesn't end in `.mpd`, set the MIME type yourself:

```java
MediaItem mediaItem = new MediaItem.Builder()
    .setUri("https://example.com/manifest")
    .setMimeType(MimeTypes.APPLICATION_MPD)
    .build();
player.setMediaItem(mediaItem);
player.prepare();
```

To configure the data source (headers, timeouts, a custom HTTP stack), build the `DashMediaSource` directly. Many of the lower-level Media3 classes are marked `@UnstableApi`, so you have to opt in to use them:

```java
import androidx.annotation.OptIn;
import androidx.media3.common.MediaItem;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.dash.DashMediaSource;
import androidx.media3.exoplayer.source.MediaSource;

@OptIn(markerClass = UnstableApi.class)
private void playDash(ExoPlayer player, String dashUri) {
    DataSource.Factory dataSourceFactory = new DefaultHttpDataSource.Factory();
    MediaSource mediaSource = new DashMediaSource.Factory(dataSourceFactory)
        .createMediaSource(MediaItem.fromUri(dashUri));
    player.setMediaSource(mediaSource);
    player.prepare();
}
```

## Choosing tracks

You usually don't need to subclass `TrackSelector`. Set constraints on `TrackSelectionParameters` and the default selector applies them to every item in the playlist, including items whose tracks aren't known yet. For example, to prefer English audio and always pick the highest bitrate the device supports:

```java
player.setTrackSelectionParameters(
    player.getTrackSelectionParameters()
        .buildUpon()
        .setPreferredAudioLanguage("en")
        .setForceHighestSupportedBitrate(true)
        .build());
```

Other options cover maximum video size (`setMaxVideoSizeSd()`), preferred subtitle language, and disabling a track type entirely (`setTrackTypeDisabled`). To pick one specific track after the player has loaded the media, read `player.getCurrentTracks()` and set a `TrackSelectionOverride`. The [track selection guide](https://developer.android.com/media/media3/exoplayer/track-selection) has examples of both.

## Migrating from ExoPlayer 2.x

If you're updating old code, including earlier versions of this post, these are the changes you'll hit most often:

| ExoPlayer 2.x | Media3 |
| --- | --- |
| `com.google.android.exoplayer2.*` | `androidx.media3.*` (split across `common`, `exoplayer`, `ui`, `datasource`, and other modules) |
| `SimpleExoPlayer` | `ExoPlayer` (`SimpleExoPlayer` was deprecated in 2.16 and later removed) |
| `DefaultDataSourceFactory` | `DefaultDataSource.Factory` |
| `factory.createMediaSource(uri)` | `factory.createMediaSource(MediaItem.fromUri(uri))`, or just `player.setMediaItem(...)` |
| `StyledPlayerView` / `PlayerView` | `androidx.media3.ui.PlayerView` |

## Further reading

- [Media3 ExoPlayer guide](https://developer.android.com/media/media3/exoplayer)
- [Media3 release notes](https://developer.android.com/jetpack/androidx/releases/media3)
- [Supported formats](https://developer.android.com/media/media3/exoplayer/supported-formats)
- [androidx/media on GitHub](https://github.com/androidx/media), including the demo app
