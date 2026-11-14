---
title: "Loading images on Android with Glide: setup, placeholders, transformations and caching"
pubDate: "2024-03-09T12:54:39.000Z"
lastUpdated: 2026-11-14
description: "How to add Glide to an Android project, load images into an ImageView with placeholders, apply built-in and custom transformations, and control caching."
tags: ["android", "java", "glide"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/803232156.png
---

Glide is an open-source image loading library for Android, maintained by the Bumptech team on GitHub. You give it a URL, file, URI or resource ID and an `ImageView`; it downloads the image off the main thread, decodes it at the size the view needs, caches it in memory and on disk, and cancels the request if the screen goes away. It also plays animated GIFs. If you're displaying images in a `RecyclerView`, Glide saves you from writing that plumbing yourself.

## Setup

The current release is Glide 5.0.9, which requires `minSdk` 23. The core API is the same as Glide 4, so most 4.x code and tutorials still apply.

```groovy
dependencies {
    implementation 'com.github.bumptech.glide:glide:5.0.9'
}
```

That's all you need for basic loading. You only need Glide's annotation processor (`annotationProcessor 'com.github.bumptech.glide:compiler:5.0.9'`, or `ksp 'com.github.bumptech.glide:ksp:5.0.9'` in Kotlin) if you define an `AppGlideModule` to change global configuration or register integration libraries such as the OkHttp loader.

Loading from the network needs the `INTERNET` permission in your manifest.

## Basic loading

```java
Glide.with(this)
    .load("https://example.com/photo.jpg")
    .placeholder(R.drawable.placeholder)
    .error(R.drawable.error)
    .into(imageView);
```

- `placeholder` is shown while the request is running.
- `error` is shown if the load fails. If the model is `null`, Glide shows the `fallback` drawable if you set one, otherwise the error drawable.

The argument to `with()` matters. Pass the `Fragment` or `Activity` that owns the view (or the `View` itself), not the application `Context`. Glide ties the request to that component's lifecycle: it pauses when the screen stops and clears the request when it's destroyed. With the application context, requests outlive the screen.

In a `RecyclerView` adapter, call Glide in `onBindViewHolder` every time, including when there's no image (call `Glide.with(view).clear(imageView)` or load a placeholder). Otherwise a recycled view can show the previous row's image.

## Transformations

Glide ships common transformations such as `CenterCrop`, `FitCenter`, `CircleCrop` and `RoundedCorners`. Pass several to `transform()` and they're applied in order:

```java
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;

Glide.with(this)
    .load(url)
    .transform(new CenterCrop(), new RoundedCorners(16))
    .into(imageView);
```

`RoundedCorners` takes a radius in pixels, not dp, so convert it for the device density if you want consistent corners.

### A custom transformation

For a custom effect, extend `BitmapTransformation`. You must also implement `equals()`, `hashCode()` and `updateDiskCacheKey()`; Glide uses them to build cache keys, and getting them wrong means stale or mismatched images from the cache. This one converts the image to greyscale:

```java
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import androidx.annotation.NonNull;
import com.bumptech.glide.load.engine.bitmap_recycle.BitmapPool;
import com.bumptech.glide.load.resource.bitmap.BitmapTransformation;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class GrayscaleTransformation extends BitmapTransformation {
    private static final String ID = "com.example.GrayscaleTransformation";
    private static final byte[] ID_BYTES = ID.getBytes(StandardCharsets.UTF_8);

    @Override
    protected Bitmap transform(@NonNull BitmapPool pool, @NonNull Bitmap toTransform,
                               int outWidth, int outHeight) {
        Bitmap result = pool.get(toTransform.getWidth(), toTransform.getHeight(),
                Bitmap.Config.ARGB_8888);

        ColorMatrix matrix = new ColorMatrix();
        matrix.setSaturation(0f);
        Paint paint = new Paint(Paint.FILTER_BITMAP_FLAG);
        paint.setColorFilter(new ColorMatrixColorFilter(matrix));

        new Canvas(result).drawBitmap(toTransform, 0f, 0f, paint);
        return result;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof GrayscaleTransformation;
    }

    @Override
    public int hashCode() {
        return ID.hashCode();
    }

    @Override
    public void updateDiskCacheKey(@NonNull MessageDigest messageDigest) {
        messageDigest.update(ID_BYTES);
    }
}
```

Combine it with the built-ins:

```java
Glide.with(this)
    .load(url)
    .transform(new CenterCrop(), new GrayscaleTransformation())
    .into(imageView);
```

If your transformation takes parameters (a blur radius, say), include them in all three methods so two different radii don't share a cache entry.

## Reusing options

`RequestOptions` bundles settings you want on many requests:

```java
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.bumptech.glide.request.RequestOptions;

RequestOptions avatarOptions = new RequestOptions()
    .placeholder(R.drawable.avatar_placeholder)
    .error(R.drawable.avatar_error)
    .circleCrop()
    .diskCacheStrategy(DiskCacheStrategy.ALL);

Glide.with(this)
    .load(user.getAvatarUrl())
    .apply(avatarOptions)
    .into(avatarView);
```

To apply defaults to every request in the app, set them in an `AppGlideModule` with `builder.setDefaultRequestOptions(...)` instead.

## Caching

Glide checks four places in order: active resources (images currently on screen), the memory cache, the disk cache of transformed images, and the disk cache of original data. The default `DiskCacheStrategy.AUTOMATIC` caches the original for remote images and the transformed result for local ones. `ALL` caches both, which uses more disk but avoids re-decoding the original when you show it at several sizes.

Glide's cache key is the model (the URL string) plus the size and transformations. If the image at a URL can change while the URL stays the same, the cache will keep serving the old one. Either put a version in the URL or add a `.signature(new ObjectKey(lastModified))` to the request.

## Further reading

- [Glide documentation](https://bumptech.github.io/glide/) (the site still shows 4.x version numbers, but the APIs are the same)
- [Transformations](https://bumptech.github.io/glide/doc/transformations.html)
- [Caching](https://bumptech.github.io/glide/doc/caching.html)
- [Release notes on GitHub](https://github.com/bumptech/glide/releases)
