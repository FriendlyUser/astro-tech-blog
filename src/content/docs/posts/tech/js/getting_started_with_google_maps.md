---
tags: ['js', "googlemaps"]
title: Add a Google Map with a marker to a web page using the Maps JavaScript API
description: Get an API key, load the Google Maps JavaScript API, and render a map with an advanced marker in a plain HTML page.
pubDate: Fri, 15 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/654074938.webp
---

The Maps JavaScript API lets you embed an interactive Google Map in a web page and add markers, info windows, and overlays to it. This post covers the minimum to get a map with one marker on screen: an API key, the script tag that loads the API, and a small `initMap` function.

You need a Google Cloud account with billing enabled. Google Maps Platform requires a billing account even if your usage stays inside the free tier.

## Step 1: Enable the API and create a key

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and pick or create a project.
2. Go to **APIs & Services > Library**, search for **Maps JavaScript API**, and click **Enable**.
3. Go to **APIs & Services > Credentials**, click **Create credentials > API key**, and copy the key.
4. Restrict the key before you ship anything: under the key's settings, limit it to **Websites** (HTTP referrers) for your domain and to the Maps JavaScript API. An unrestricted key embedded in a public page can be used by anyone who views the source.

## Step 2: Load the API

Google's recommended script tag uses `loading=async` and a `callback` that runs once the API is ready:

```html
<script
  async
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&loading=async&callback=initMap"
></script>
```

Replace `YOUR_API_KEY` with the key from step 1. Include this tag only once per page.

## Step 3: Render a map with a marker

`google.maps.Marker` has been deprecated since February 2024 (v3.56). New code should use `google.maps.marker.AdvancedMarkerElement`, which needs the `marker` library and a map ID. For testing, Google accepts the placeholder `DEMO_MAP_ID`; for production, create a map ID under **Google Maps Platform > Map Management**.

Here is a complete page that centres the map on San Francisco and drops a marker there:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Google Maps API example</title>
    <style>
      /* The map container needs an explicit height or it renders as 0px tall */
      #map {
        height: 400px;
      }
    </style>
  </head>
  <body>
    <h1>Google Maps API example</h1>
    <div id="map"></div>

    <script>
      async function initMap() {
        const { Map } = await google.maps.importLibrary("maps");
        const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

        const center = { lat: 37.7749, lng: -122.4194 };

        const map = new Map(document.getElementById("map"), {
          center,
          zoom: 13,
          mapId: "DEMO_MAP_ID", // required for advanced markers
        });

        new AdvancedMarkerElement({
          map,
          position: center,
          title: "San Francisco",
        });
      }
    </script>
    <script
      async
      src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&loading=async&callback=initMap"
    ></script>
  </body>
</html>
```

`initMap` is defined in a classic (non-module) script, so it is a global function the API can call. If you move it into an ES module or a bundler, assign it explicitly with `window.initMap = initMap`.

## Gotchas

- **Blank grey map or "For development purposes only" watermark**: usually billing isn't enabled on the project, or the key's referrer restriction doesn't match the page's URL. The browser console shows the exact error.
- **Map doesn't appear at all**: check that `#map` has a height.
- **Marker doesn't appear**: advanced markers need a `mapId` on the map. Check that it is set and look in the console for a warning.

## Further reading

- [Load the Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [Migrate to advanced markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/migration)
- [API key best practices](https://developers.google.com/maps/api-security-best-practices)

## References

- https://github.com/FriendlyUser/Pirates-Game/tree/master
