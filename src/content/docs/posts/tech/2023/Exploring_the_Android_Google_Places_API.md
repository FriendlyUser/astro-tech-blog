---
title: "Places SDK for Android: nearby search, place details, autocomplete, and photos"
pubDate: "2024-06-28T04:18:21.000Z"
lastUpdated: 2026-11-14
description: "Set up the Places SDK for Android with Places API (New), then run a nearby search, fetch place details, show autocomplete predictions, and load place photos in Java."
tags: ["android", "java"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3582974242.webp
---

:::caution
The original version of this post used `com.google.android.gms:play-services-places`. That Google Play services library was deprecated in January 2019 and turned off on July 29, 2019. Use the standalone `com.google.android.libraries.places:places` artifact shown below. Several APIs from older versions of that artifact (`Place.Field.NAME`, `getName()`, `fetchPhoto()`) have also been removed, so the examples here use their replacements.
:::

The Places SDK for Android gives your app access to Google's place data: search for places near a location, look up details for a place ID, show autocomplete predictions as the user types, and load photos. All examples below are in Java and assume SDK version 6.0.2, the latest on the [release notes](https://developers.google.com/maps/documentation/places/android-sdk/release-notes) at the time of writing.

## Setup

In the [Google Cloud Console](https://console.cloud.google.com/):

1. Create or select a project and attach a billing account (Google Maps Platform requires one).
2. Under **APIs & Services > Library**, enable **Places API (New)**.
3. Under **APIs & Services > Credentials**, create an API key and restrict it to your app's package name and signing certificate, and to the Places API (New).

Add the dependency to your module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.google.android.libraries.places:places:6.0.2")
}
```

Don't hard-code the key in source. Google recommends the [Secrets Gradle Plugin](https://github.com/google/secrets-gradle-plugin): put `PLACES_API_KEY=...` in a `secrets.properties` file that's excluded from version control, enable `buildConfig = true` under `buildFeatures`, and read the key from `BuildConfig`.

Initialize the SDK once (for example in `Application.onCreate()` or your activity) and create a client:

```java
Places.initializeWithNewPlacesApiEnabled(getApplicationContext(), BuildConfig.PLACES_API_KEY);
PlacesClient placesClient = Places.createClient(this);
```

`initializeWithNewPlacesApiEnabled` routes requests to Places API (New). The older `Places.initialize` method targeted Places API (Legacy), which can no longer be enabled for new Cloud projects, and it was removed in SDK 6.0.2.

## Nearby search

To find places of a given type within a radius, build a `SearchNearbyRequest` with a `CircularBounds` restriction and the fields you want back:

```java
List<Place.Field> placeFields = Arrays.asList(Place.Field.ID, Place.Field.DISPLAY_NAME);

LatLng center = new LatLng(37.4219999, -122.0840575);
CircularBounds circle = CircularBounds.newInstance(center, /* radius in meters */ 1000);

SearchNearbyRequest request = SearchNearbyRequest.builder(circle, placeFields)
        .setIncludedTypes(Arrays.asList("restaurant"))
        .setMaxResultCount(10)
        .build();

placesClient.searchNearby(request)
        .addOnSuccessListener(response -> {
            for (Place place : response.getPlaces()) {
                Log.i(TAG, place.getId() + ": " + place.getDisplayName());
            }
        })
        .addOnFailureListener(exception ->
                Log.e(TAG, "Nearby search failed", exception));
```

The list of fields controls both what comes back and what you're billed for, so request only what you display. For a free-text query such as "pizza in Mountain View", use `SearchByTextRequest` and `placesClient.searchByText()` instead.

## Place details

Given a place ID (from a search or autocomplete result), `fetchPlace()` returns the fields you ask for:

```java
String placeId = "ChIJN1t_tDeuEmsRUsoyG83frY4";
List<Place.Field> placeFields = Arrays.asList(
        Place.Field.ID,
        Place.Field.DISPLAY_NAME,
        Place.Field.FORMATTED_ADDRESS,
        Place.Field.LOCATION);

FetchPlaceRequest request = FetchPlaceRequest.newInstance(placeId, placeFields);

placesClient.fetchPlace(request)
        .addOnSuccessListener(response -> {
            Place place = response.getPlace();
            Log.i(TAG, "Place found: " + place.getDisplayName());
            Log.i(TAG, "Address: " + place.getFormattedAddress());
        })
        .addOnFailureListener(exception ->
                Log.e(TAG, "Error fetching place details", exception));
```

`DISPLAY_NAME`, `FORMATTED_ADDRESS`, and `LOCATION` replace the older `NAME`, `ADDRESS`, and `LAT_LNG` fields; the old fields and their getters (`getName()`, `getAddress()`, `getLatLng()`) were removed in SDK 5.0.0.

Place IDs can change over time. It's fine to cache them, but if a stored ID stops resolving, look the place up again.

## Autocomplete

`findAutocompletePredictions()` returns predictions for partial input. Use a session token so the keystrokes and the final details lookup are grouped into one session, and bias results toward the user's area:

```java
AutocompleteSessionToken token = AutocompleteSessionToken.newInstance();
CircularBounds bias = CircularBounds.newInstance(new LatLng(37.7749, -122.4194), 5000.0);

FindAutocompletePredictionsRequest request = FindAutocompletePredictionsRequest.builder()
        .setQuery("san franc")
        .setLocationBias(bias)
        .setSessionToken(token)
        .build();

placesClient.findAutocompletePredictions(request)
        .addOnSuccessListener(response -> {
            for (AutocompletePrediction prediction : response.getAutocompletePredictions()) {
                Log.i(TAG, prediction.getPlaceId());
                Log.i(TAG, prediction.getPrimaryText(null).toString());
                Log.i(TAG, prediction.getFullText(null).toString());
            }
        })
        .addOnFailureListener(exception ->
                Log.e(TAG, "Error getting autocomplete predictions", exception));
```

When the user picks a prediction, pass the same token to `FetchPlaceRequest.builder(placeId, fields).setSessionToken(token)`, then create a new token for the next search. Set either a location bias or a location restriction, not both.

## Place photos

Request `PHOTO_METADATAS` for a place, then resolve a photo to a URI with `fetchResolvedPhotoUri()`. (`fetchPhoto()`, which returned a `Bitmap`, was deprecated in 5.0.0 and has since been removed.)

```java
FetchPlaceRequest placeRequest = FetchPlaceRequest.newInstance(
        "ChIJN1t_tDeuEmsRUsoyG83frY4",
        Collections.singletonList(Place.Field.PHOTO_METADATAS));

placesClient.fetchPlace(placeRequest)
        .addOnSuccessListener(response -> {
            List<PhotoMetadata> metadata = response.getPlace().getPhotoMetadatas();
            if (metadata == null || metadata.isEmpty()) {
                return;
            }

            FetchResolvedPhotoUriRequest photoRequest =
                    FetchResolvedPhotoUriRequest.builder(metadata.get(0))
                            .setMaxWidth(500)
                            .setMaxHeight(500)
                            .build();

            placesClient.fetchResolvedPhotoUri(photoRequest)
                    .addOnSuccessListener(photoResponse -> {
                        Uri uri = photoResponse.getUri();
                        // Load the URI with your image library (Coil, Glide, etc.)
                    })
                    .addOnFailureListener(exception ->
                            Log.e(TAG, "Error fetching photo", exception));
        })
        .addOnFailureListener(exception ->
                Log.e(TAG, "Error fetching place details", exception));
```

If the `PhotoMetadata` has attributions (`getAuthorAttributions()`), you're required to display them alongside the image.

## Gotchas

- Every request is billed per field tier, so a broad field list on a search that runs on each keystroke gets expensive. Use session tokens for autocomplete.
- Restrict your API key. A key shipped in an APK can be extracted, so the restriction to your package and certificate is what protects it.
- The legacy autocomplete UI classes (`Autocomplete`, `AutocompleteSupportFragment`) were removed in 6.0.2. Either build your own UI on `findAutocompletePredictions()` as above, or use the Place Autocomplete widget for Autocomplete (New).

## Further reading

- [Places SDK for Android overview](https://developers.google.com/maps/documentation/places/android-sdk/overview)
- [Nearby Search (New)](https://developers.google.com/maps/documentation/places/android-sdk/nearby-search)
- [Autocomplete (New)](https://developers.google.com/maps/documentation/places/android-sdk/place-autocomplete)
- [Place Photos](https://developers.google.com/maps/documentation/places/android-sdk/place-photos)
