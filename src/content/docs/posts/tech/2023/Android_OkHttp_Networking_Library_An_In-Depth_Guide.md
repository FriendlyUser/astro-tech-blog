---
title: "OkHttp on Android: making requests and adding interceptors"
pubDate: "2023-10-01T18:38:10.000Z"
lastUpdated: 2026-11-14
description: "Add OkHttp 5 to an Android app, make an asynchronous GET request without leaking responses, and write an interceptor for logging or auth headers."
tags: ["android", "java"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.webp
---

OkHttp is Square's open-source HTTP client for Android and the JVM. It's the HTTP layer underneath Retrofit and many other libraries, so even if you never call it directly, you're probably shipping it. You'd use it directly when you want plain HTTP calls without Retrofit's interface-based API, or when you need to customize the client that those libraries share.

## What it does for you

- **HTTP/2**, so requests to the same host share one socket.
- **Connection pooling**, which reuses connections when HTTP/2 isn't available.
- **Transparent GZIP**: it sends `Accept-Encoding: gzip` and decompresses responses for you. It doesn't compress request bodies.
- **Response caching**, opt-in, by giving the client a `Cache` directory.
- **Interceptors** for logging, auth headers, retries, and rewriting requests or responses.
- **Timeouts**: connect, read, and write timeouts default to 10 seconds each; the whole-call timeout is off by default.

## Add the dependency

OkHttp 5.5.1 is current. It supports Android 5.0 (API 21) and later. In the module's `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.squareup.okhttp3:okhttp:5.5.1")
}
```

OkHttp 5 is a Kotlin Multiplatform library, and Gradle picks the Android variant automatically. Your app also needs `<uses-permission android:name="android.permission.INTERNET" />` in the manifest.

## Make a GET request

Create one `OkHttpClient` and reuse it. Each client has its own connection pool and thread pools, so creating one per request throws away the main performance benefits.

```java
import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class DataSource {
    private final OkHttpClient client = new OkHttpClient();

    public void fetchData() {
        Request request = new Request.Builder()
                .url("https://api.example.com/data")
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                // Network failure, timeout, or the call was cancelled.
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                try (ResponseBody body = response.body()) {
                    if (!response.isSuccessful()) {
                        // HTTP error such as 404 or 500.
                        return;
                    }
                    String responseData = body.string();
                    // Parse responseData here.
                }
            }
        });
    }
}
```

A few things this example gets right that are easy to miss:

- `enqueue` runs the call on OkHttp's background threads. Calling `execute()` on the main thread instead throws `NetworkOnMainThreadException`.
- `onResponse` is also called on a background thread. Post back to the main thread (for example with `runOnUiThread` or a `Handler`) before touching views.
- The response body must be closed, or the connection leaks. The try-with-resources block does that. `body.string()` reads the whole body into memory, so for large downloads read from `body.byteStream()` instead.
- `onResponse` is called for any HTTP response, including 4xx and 5xx. Only network-level failures go to `onFailure`.

## Interceptors

An interceptor sees every request before it goes out and every response before it comes back. Implement `Interceptor` and call `chain.proceed(request)` to continue the chain:

```java
import android.util.Log;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

public class LoggingInterceptor implements Interceptor {
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        long start = System.nanoTime();
        Log.d("OkHttp", "--> " + request.method() + " " + request.url());

        Response response = chain.proceed(request);

        long tookMs = (System.nanoTime() - start) / 1_000_000;
        Log.d("OkHttp", "<-- " + response.code() + " " + response.request().url() + " (" + tookMs + "ms)");
        return response;
    }
}
```

Register it when you build the client:

```java
OkHttpClient client = new OkHttpClient.Builder()
        .addInterceptor(new LoggingInterceptor())
        .build();
```

The same pattern adds a header to every request, such as an auth token:

```java
Interceptor auth = chain -> chain.proceed(
        chain.request().newBuilder()
                .header("Authorization", "Bearer " + tokenProvider.getToken())
                .build());
```

`addInterceptor` registers an *application* interceptor, which runs once per call. `addNetworkInterceptor` registers a *network* interceptor, which runs for each network request, including redirects and retries, and sees the headers OkHttp adds (like `Accept-Encoding: gzip`). See the [interceptors docs](https://github.com/square/okhttp/blob/master/docs/features/interceptors.md) for the full comparison.

For logging you don't need to write your own. The `com.squareup.okhttp3:logging-interceptor` artifact provides `HttpLoggingInterceptor`. At `Level.HEADERS` or `Level.BODY` it logs headers such as `Authorization` and cookies, so either call `redactHeader("Authorization")` or only add it in debug builds.

## Gotchas

- If you need a client with different settings (say, a longer timeout for one endpoint), derive it with `client.newBuilder()`. It shares the original client's connection pool and dispatcher.
- The default `Dispatcher` allows 64 concurrent requests in total and 5 per host; extra calls wait in a queue.
- For a typed REST API, put [Retrofit](https://github.com/square/retrofit) on top of OkHttp instead of parsing JSON by hand in callbacks.

## Further reading

- [OkHttp on GitHub](https://github.com/square/okhttp)
- [Calls](https://github.com/square/okhttp/blob/master/docs/features/calls.md) and [interceptors](https://github.com/square/okhttp/blob/master/docs/features/interceptors.md) docs
- [logging-interceptor](https://github.com/square/okhttp/tree/master/okhttp-logging-interceptor)
