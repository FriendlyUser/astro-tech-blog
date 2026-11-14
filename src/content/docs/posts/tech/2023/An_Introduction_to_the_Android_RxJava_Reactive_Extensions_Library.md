---
title: 'RxJava 3 on Android: observables, operators and threading'
pubDate: "2024-08-16T07:45:21.000Z"
lastUpdated: 2026-11-14
description: "How RxJava 3 models async work on Android: Observable, Single and friends, common operators, schedulers, Retrofit integration, and disposing subscriptions."
tags: ["android", "java"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1836890630.webp
---

RxJava is the Java implementation of ReactiveX (Reactive Extensions). It represents asynchronous work, such as a network call, a database query or a stream of click events, as an observable stream that you transform with operators like `map`, `filter` and `flatMap`. On Android it was the standard way to chain background work and hop back to the main thread before Kotlin coroutines took over that role.

:::note[Status in November 2026]
RxJava 3 (current release 3.1.12) is still maintained. RxJava 4 is in development under the new group ID `io.reactivex.rxjava4`, and the project says 3.x will keep receiving support for a year after 4.0 ships. RxJava 1 and 2 are end-of-life. For new Kotlin code, Google's Android guidance recommends coroutines and `Flow` instead, but RxJava remains common in existing Java codebases.
:::

## Adding RxJava to an Android project

You need two libraries: RxJava itself, and RxAndroid, which provides `AndroidSchedulers.mainThread()`. If you use Retrofit, add its RxJava 3 call adapter too. In `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation("io.reactivex.rxjava3:rxjava:3.1.12")
    implementation("io.reactivex.rxjava3:rxandroid:3.0.2")

    // Optional: return RxJava types from Retrofit interfaces
    implementation("com.squareup.retrofit2:retrofit:3.0.0")
    implementation("com.squareup.retrofit2:converter-gson:3.0.0")
    implementation("com.squareup.retrofit2:adapter-rxjava3:3.0.0")
}
```

RxAndroid 3.0.2 (2022) is still the latest release. It depends on an older RxJava 3.x, so declare RxJava explicitly as above to get the newer version with its bug fixes.

## The reactive types

RxJava 3 has five source types. Picking the right one documents what the stream can emit:

| Type | Emits | Typical use |
| --- | --- | --- |
| `Observable<T>` | 0 to N items, then complete or error | UI events, polling |
| `Flowable<T>` | 0 to N items, with backpressure | Large or fast streams, such as database change feeds |
| `Single<T>` | exactly one item or an error | A network request |
| `Maybe<T>` | one item, nothing, or an error | A cache lookup |
| `Completable` | no items, just complete or error | A write or delete |

A consumer of an `Observable` implements `Observer`, which has four callbacks:

- `onSubscribe(Disposable d)`: called first, with a handle you can use to cancel.
- `onNext(T item)`: called for each item.
- `onError(Throwable e)`: called once if the stream fails. No more items follow.
- `onComplete()`: called once if the stream finishes normally.

In practice you rarely implement `Observer` by hand. `subscribe(onNext, onError)` takes lambdas and returns a `Disposable`. (RxJava 1 called this handle a `Subscription`; in RxJava 2 and 3 it's `Disposable`.)

## Operators

Operators return a new stream, so you chain them:

```java
Observable.just(1, 2, 3, 4, 5)
        .filter(n -> n % 2 == 1)
        .map(n -> n * 10)
        .subscribe(n -> System.out.println(n)); // 10, 30, 50
```

A few you'll use constantly:

- `map`: transform each item.
- `filter`: drop items that don't match a predicate.
- `flatMap`: turn each item into another stream and merge the results, for example "for each user ID, fetch the user". Use `concatMap` if order matters, or `switchMap` to cancel the previous inner stream when a new item arrives (the classic search-as-you-type case).
- `Observable.merge(a, b)`: interleave items from several streams as they arrive.
- `Single.zip(a, b, combiner)`: wait for both, then combine their results.
- `debounce`: only emit an item after a quiet period, useful for text input.

## Threading with schedulers

By default, a stream runs on the thread that subscribes to it. Two operators change that:

- `subscribeOn(Schedulers.io())` sets the thread the source runs on. Only the first `subscribeOn` in a chain has an effect.
- `observeOn(AndroidSchedulers.mainThread())` moves everything downstream of it to another thread. You can use it several times in one chain.

`Schedulers.io()` is for blocking I/O such as network and disk. `Schedulers.computation()` is sized to the number of CPU cores and is for CPU-bound work.

## Example: loading posts with Retrofit

Declare the endpoint with a `Single` return type:

```java
import java.util.List;

import io.reactivex.rxjava3.core.Single;
import retrofit2.http.GET;

public interface ApiService {
    @GET("posts")
    Single<List<Post>> getPosts();
}
```

Register the RxJava 3 call adapter when building Retrofit:

```java
import retrofit2.Retrofit;
import retrofit2.adapter.rxjava3.RxJava3CallAdapterFactory;
import retrofit2.converter.gson.GsonConverterFactory;

ApiService api = new Retrofit.Builder()
        .baseUrl("https://jsonplaceholder.typicode.com/")
        .addConverterFactory(GsonConverterFactory.create())
        .addCallAdapterFactory(RxJava3CallAdapterFactory.create())
        .build()
        .create(ApiService.class);
```

`RxJava3CallAdapterFactory.create()` makes the request asynchronously on OkHttp's own threads, so a `subscribeOn` isn't strictly needed. It doesn't hurt, and it keeps the chain correct if you later swap in a source that blocks.

Subscribe in the activity, and keep the `Disposable` so you can cancel it:

```java
import android.os.Bundle;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers;
import io.reactivex.rxjava3.disposables.CompositeDisposable;
import io.reactivex.rxjava3.schedulers.Schedulers;

public class PostsActivity extends AppCompatActivity {
    private static final String TAG = "PostsActivity";

    private final CompositeDisposable disposables = new CompositeDisposable();
    private ApiService api;      // built as shown above
    private PostAdapter adapter; // your RecyclerView ListAdapter

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // setContentView, RecyclerView and api setup omitted

        disposables.add(
                api.getPosts()
                        .subscribeOn(Schedulers.io())
                        .observeOn(AndroidSchedulers.mainThread())
                        .subscribe(
                                posts -> adapter.submitList(posts),
                                error -> Log.e(TAG, "Failed to load posts", error)
                        )
        );
    }

    @Override
    protected void onDestroy() {
        disposables.clear();
        super.onDestroy();
    }
}
```

`CompositeDisposable.clear()` cancels every subscription it holds. Without it, a request that finishes after the user leaves the screen still runs its callback, which holds a reference to the destroyed activity until then.

## Gotchas

- **Always handle errors.** If you call `subscribe` without an `onError` callback and the stream fails, RxJava routes an `OnErrorNotImplementedException` to `RxJavaPlugins.onError`, which crashes the app by default.
- **Streams are lazy.** Nothing happens until you subscribe. A Retrofit `Single` that nobody subscribes to never sends a request.
- **`null` is not allowed.** RxJava 2 and 3 throw a `NullPointerException` if a source emits `null`. Use `Maybe` or `Optional` for "no value".
- **Put the disposal in the right place.** In a `ViewModel`, keep the `CompositeDisposable` there and clear it in `onCleared()`, so requests survive configuration changes such as rotation.

## Further reading

- [RxJava on GitHub](https://github.com/ReactiveX/RxJava), including the wiki and the 3.x/4.x status
- [RxAndroid](https://github.com/ReactiveX/RxAndroid)
- [ReactiveX operator reference](https://reactivex.io/documentation/operators.html), with marble diagrams
- [Kotlin flows on Android](https://developer.android.com/kotlin/flow), if you're starting a new Kotlin project
