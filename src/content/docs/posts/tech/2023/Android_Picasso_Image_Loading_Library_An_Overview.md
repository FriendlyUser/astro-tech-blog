---
description: "Load images into Android ImageViews with Square's Picasso: placeholders, resizing, and custom transformations, plus the Coil equivalent now that Picasso is deprecated."
imgSrc: /imgs/2023/148139817.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-14T01:18:17.000Z'
lastUpdated: 2026-11-14
tags: ["android", "java"]
title: "Picasso on Android: loading, resizing, and transforming images"
---

:::caution[Picasso is deprecated]
The [Picasso README](https://github.com/square/picasso) now says the library is deprecated and recommends alternatives such as [Coil](https://coil-kt.github.io/coil/) for future projects, with no more public releases planned for Maven Central. The last release is 2.8. The examples below still work for maintaining an existing app; the end of the post shows the Coil equivalent.
:::

Picasso is Square's image loading library for Android. One chained call fetches an image from a URL, file, or resource, decodes it off the main thread, caches it, and puts it in an `ImageView`. It takes care of the parts that are tedious to get right by hand: memory and disk caching, downsampling large images, and cancelling the old request when a `RecyclerView` recycles an `ImageView`.

## Setup

```kotlin
dependencies {
    implementation("com.squareup.picasso:picasso:2.8")
}
```

Add `<uses-permission android:name="android.permission.INTERNET" />` to your manifest to load network images.

## Load an image

```java
Picasso.get()
    .load("https://example.com/image.jpg")
    .into(imageView);
```

`Picasso.get()` returns a lazily created singleton. `load` also accepts a `File`, a `Uri`, or a drawable resource ID.

The same call works inside a `RecyclerView.Adapter`'s `onBindViewHolder`. When a view is recycled and bound to a new URL, Picasso cancels the earlier request for that `ImageView`, so you don't get the wrong image flashing into a row.

## Placeholders and error images

```java
Picasso.get()
    .load("https://example.com/image.jpg")
    .placeholder(R.drawable.placeholder)
    .error(R.drawable.error)
    .into(imageView);
```

The placeholder shows while the request is in flight. The error drawable replaces it if the load fails.

## Resize and crop

Resizing to the size you display avoids decoding a full-resolution photo into memory:

```java
Picasso.get()
    .load("https://example.com/image.jpg")
    .resize(100, 100)
    .centerCrop()
    .into(imageView);
```

`resize` takes pixels. `centerCrop()` and `centerInside()` both require a `resize` call first, or Picasso throws. Alternatively, use `.fit()` to size the image to the `ImageView`'s measured dimensions.

## Custom transformations

Implement `Transformation` to do your own bitmap processing. This one converts the image to grayscale:

```java
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;

import com.squareup.picasso.Transformation;

public class GrayscaleTransformation implements Transformation {
    @Override
    public Bitmap transform(Bitmap source) {
        Bitmap result = Bitmap.createBitmap(source.getWidth(), source.getHeight(), Bitmap.Config.ARGB_8888);

        ColorMatrix matrix = new ColorMatrix();
        matrix.setSaturation(0f);
        Paint paint = new Paint();
        paint.setColorFilter(new ColorMatrixColorFilter(matrix));

        new Canvas(result).drawBitmap(source, 0f, 0f, paint);
        source.recycle();
        return result;
    }

    @Override
    public String key() {
        return "grayscale";
    }
}
```

Two rules from Picasso's `Transformation` contract: if you return a new bitmap, recycle the source; if you return the source unchanged, don't. And `key()` must be unique per transformation and its parameters, because Picasso uses it as part of the memory-cache key.

Apply it with `transform`:

```java
Picasso.get()
    .load("https://example.com/image.jpg")
    .transform(new GrayscaleTransformation())
    .into(imageView);
```

## The same thing in Coil

[Coil](https://coil-kt.github.io/coil/) is a Kotlin-first image loader built on coroutines. With Coil 3 (3.6.3 at the time of writing), network loading is a separate artifact:

```kotlin
dependencies {
    implementation("io.coil-kt.coil3:coil:3.6.3")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.6.3")
}
```

The `ImageView.load` extension replaces the Picasso chain:

```kotlin
import coil3.load
import coil3.request.error
import coil3.request.placeholder
import coil3.request.transformations
import coil3.transform.CircleCropTransformation

imageView.load("https://example.com/image.jpg") {
    placeholder(R.drawable.placeholder)
    error(R.drawable.error)
    transformations(CircleCropTransformation())
}
```

Coil also has first-class Jetpack Compose support (`AsyncImage` in `coil-compose`), which Picasso never had. [Glide](https://github.com/bumptech/glide) is the other widely used option if you're on Java.

## Further reading

- [Picasso on GitHub](https://github.com/square/picasso)
- [Coil documentation](https://coil-kt.github.io/coil/)
