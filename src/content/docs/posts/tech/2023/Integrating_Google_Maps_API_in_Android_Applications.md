---
title: Adding a Google Map with a marker to an Android app
pubDate: "2025-03-28T06:45:55.000Z"
lastUpdated: 2026-11-14
description: "Set up a Maps SDK for Android API key, add the play-services-maps dependency, and show a map with a marker using SupportMapFragment in Java."
tags: ["android", "java", "googlemaps"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/other
---

The Maps SDK for Android renders interactive Google Maps inside your app: map types (normal, satellite, terrain, hybrid), markers and info windows, polylines and polygons, camera control, and a "my location" layer. This post walks through getting an API key, adding the SDK, and showing a map with a marker.

## Prerequisites

- A Google Cloud project with billing enabled. Google Maps Platform requires a billing account even for usage that stays within free limits.
- Android Studio, and an emulator or device with Google Play services (use a "Google APIs" or "Google Play" system image).
- The SDK's current requirements are `minSdk` 23 or higher and `compileSdk` 34 or higher.

## Getting an API key

1. In the [Google Cloud console](https://console.cloud.google.com/), select or create a project.
2. Go to **APIs & Services > Library**, search for **Maps SDK for Android**, and click **Enable**.
3. Go to **APIs & Services > Credentials**, click **Create credentials > API key**, and copy the key.
4. Restrict the key: under **Application restrictions** choose Android apps and add your package name and signing-certificate SHA-1, and under **API restrictions** allow only the Maps SDK for Android. The key ships inside your APK, so anyone can extract it; restrictions are what stop someone else using it.

## Adding the SDK

In the app module's `build.gradle`:

```groovy
dependencies {
    implementation 'com.google.android.gms:play-services-maps:20.1.0'
}
```

Or in `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.google.android.gms:play-services-maps:20.1.0")
}
```

20.1.0 was the latest version on Google's Maven repository when this post was updated.

## Adding the key to the manifest

Add the key as `meta-data` inside `<application>`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application>
        <!-- ... -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="${MAPS_API_KEY}" />
    </application>
</manifest>
```

`${MAPS_API_KEY}` is a manifest placeholder. Google recommends the Secrets Gradle Plugin for Android, which reads `MAPS_API_KEY` from a `secrets.properties` file you keep out of version control and fills in the placeholder at build time; the [setup guide](https://developers.google.com/maps/documentation/android-sdk/config) has the plugin configuration. Pasting the key directly into `android:value` also works, but then it ends up in git.

A basic map needs no location permissions. Add `ACCESS_FINE_LOCATION` or `ACCESS_COARSE_LOCATION` only when you show the user's location, and request them at runtime as well.

## Adding the map to a layout

`res/layout/activity_main.xml`:

```xml
<fragment xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/map"
    android:name="com.google.android.gms.maps.SupportMapFragment"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    tools:context=".MainActivity" />
```

## Showing a marker

The activity finds the `SupportMapFragment` and calls `getMapAsync()`. The map is not usable until `onMapReady()` runs, so do all map setup there:

```java
package com.example.mapsdemo;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;

public class MainActivity extends AppCompatActivity implements OnMapReadyCallback {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        SupportMapFragment mapFragment = (SupportMapFragment) getSupportFragmentManager()
                .findFragmentById(R.id.map);
        if (mapFragment != null) {
            mapFragment.getMapAsync(this);
        }
    }

    @Override
    public void onMapReady(GoogleMap googleMap) {
        LatLng sydney = new LatLng(-33.852, 151.211);
        googleMap.addMarker(new MarkerOptions().position(sydney).title("Sydney"));
        googleMap.moveCamera(CameraUpdateFactory.newLatLngZoom(sydney, 10f));
    }
}
```

This adds a marker at latitude -33.852, longitude 151.211 (Sydney) and moves the camera there at zoom level 10. Tapping the marker shows its title in an info window. From `onMapReady()` you can also call `setMapType(GoogleMap.MAP_TYPE_SATELLITE)`, add shapes with `addPolyline()`/`addPolygon()`, or listen for taps with `setOnMapClickListener()`.

## Troubleshooting and related APIs

- **Grey map with a Google logo** usually means the key is wrong, the Maps SDK for Android isn't enabled on the project, billing isn't set up, or the key's Android restriction doesn't match your package name and SHA-1. Logcat shows an "Authorization failure" message with the details. Debug and release builds are signed with different certificates, so add both SHA-1 fingerprints.
- **Geocoding** (address to coordinates) is not part of the Maps SDK. Use Android's `android.location.Geocoder` or the separate Geocoding API.
- **Tracking the user's location** comes from the Fused Location Provider in `play-services-location`. The Maps SDK's `setMyLocationEnabled(true)` only draws the blue dot, and needs the location permission granted first.
- **Jetpack Compose** apps can use the [Maps Compose library](https://developers.google.com/maps/documentation/android-sdk/maps-compose) instead of a fragment.

## Further reading

- [Maps SDK for Android documentation](https://developers.google.com/maps/documentation/android-sdk/overview)
- [Add a map with a marker](https://developers.google.com/maps/documentation/android-sdk/map-with-marker)
