---
description: Set up Retrofit in an Android app, define an API interface, make an async
  call with enqueue, and share one OkHttpClient for caching, auth headers and pooling.
imgSrc: /imgs/2023/pokemon_types_by_gen.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-07-19T00:14:29.000Z'
lastUpdated: 2026-11-14
tags:
  - android
  - java
title: "Retrofit on Android: calling a REST API from Java"
---

Retrofit is Square's HTTP client for Android and the JVM. You describe an API as a Java (or Kotlin) interface with annotations such as `@GET` and `@Path`, and Retrofit generates the implementation at runtime. It sends requests through OkHttp and uses a converter (Gson, Moshi, Jackson, kotlinx.serialization and others) to turn JSON into your model classes.

## Dependencies

In your app module's `build.gradle`:

```groovy
implementation 'com.squareup.retrofit2:retrofit:3.0.0'
implementation 'com.squareup.retrofit2:converter-gson:3.0.0'
```

3.0.0 was the latest release on Maven Central when this post was updated. It moved the underlying OkHttp dependency from 3.14 to 4.12 but kept the same package names and API as 2.x, so the code below also works with 2.9.0, which the original post used.

Your app also needs network access in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Defining the API

Say the service returns users at `GET /users/{id}`. Model the response and the endpoint:

```java
public class User {
    public int id;
    public String name;
}
```

```java
import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;

public interface UserService {
    @GET("users/{id}")
    Call<User> getUser(@Path("id") int id);
}
```

`{id}` in the path is replaced by the argument annotated with `@Path("id")`. Gson maps JSON fields to fields of the same name on `User`.

## Building the client

```java
import okhttp3.OkHttpClient;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public final class ApiClient {
    private static final String BASE_URL = "https://api.example.com/";
    private static Retrofit retrofit;

    private ApiClient() {}

    public static synchronized Retrofit getClient() {
        if (retrofit == null) {
            OkHttpClient okHttp = new OkHttpClient.Builder().build();
            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .client(okHttp)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
        }
        return retrofit;
    }
}
```

The base URL must end with `/`, or `baseUrl(...)` throws an `IllegalArgumentException`. Relative paths in the interface (like `users/{id}`) are resolved against it.

## Making a request

```java
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

UserService userService = ApiClient.getClient().create(UserService.class);

userService.getUser(1).enqueue(new Callback<User>() {
    @Override
    public void onResponse(Call<User> call, Response<User> response) {
        if (response.isSuccessful()) {
            User user = response.body();
            // Update the UI with user
        } else {
            // HTTP error such as 404 or 500: inspect response.code()
        }
    }

    @Override
    public void onFailure(Call<User> call, Throwable t) {
        // No response: network error, timeout, or JSON that failed to parse
    }
});
```

`enqueue` runs the request on a background thread, and on Android the callbacks are delivered on the main thread, so you can touch views directly in them. `execute()` is the synchronous version; calling it on the main thread throws `NetworkOnMainThreadException`.

Note the split: a 404 or 500 still lands in `onResponse` with `isSuccessful()` false. `onFailure` is only for requests that produced no usable response.

In Kotlin you can declare the method as `suspend fun getUser(@Path("id") id: Int): User` (supported since Retrofit 2.6.0) and call it from a coroutine instead of using callbacks.

## Practical tips

- **Share one `OkHttpClient`.** Each `OkHttpClient` has its own connection pool and thread pool. Create one for the app and reuse it (or derive variants with `okHttp.newBuilder()`, which shares the pools).
- **Add auth headers with an interceptor.** An OkHttp `Interceptor` can add an `Authorization` header to every request instead of repeating `@Header` on each method.
- **Enable caching in OkHttp.** Retrofit doesn't cache; pass an `okhttp3.Cache` to `OkHttpClient.Builder.cache(...)` and OkHttp will honour the server's cache headers.
- **Log while debugging.** `HttpLoggingInterceptor` from `com.squareup.okhttp3:logging-interceptor` prints requests and responses. Turn it off in release builds, since it can log tokens.

## Further reading

- [Retrofit documentation](https://square.github.io/retrofit/)
- [Retrofit changelog](https://github.com/square/retrofit/blob/trunk/CHANGELOG.md)
- [OkHttp interceptors](https://square.github.io/okhttp/features/interceptors/)
