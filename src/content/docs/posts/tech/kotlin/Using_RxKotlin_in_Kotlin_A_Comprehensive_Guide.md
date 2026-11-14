---
title: "RxKotlin basics: creating, transforming and combining Observables"
pubDate: "2023-05-03T14:16:44.927Z"
lastUpdated: 2026-11-14
description: "Set up RxKotlin 3 with RxJava 3, create Observables, use map, filter, merge and zip, handle errors, and move work between threads with schedulers."
tags: ["kotlin"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3200675184.webp
---
:::caution
The original version of this post used RxJava 2 (`io.reactivex.rxjava2`), which reached end-of-life on February 28, 2021. The examples below use RxJava 3 and RxKotlin 3. RxKotlin itself hasn't had a release since 3.0.1 (September 2020). For new Kotlin and Android code, [Kotlin coroutines and Flow](https://kotlinlang.org/docs/flow.html) are the more common choice; Rx is still worth knowing if you maintain a codebase that uses it.
:::

[RxKotlin](https://github.com/ReactiveX/RxKotlin) is a thin layer of Kotlin extension functions on top of [RxJava](https://github.com/ReactiveX/RxJava). RxJava does the real work: it models asynchronous events as `Observable` streams that you transform with operators. RxKotlin adds Kotlin conveniences such as `subscribeBy` (named callbacks) and `toObservable()` on collections.

## Setup

```kotlin
dependencies {
    implementation("io.reactivex.rxjava3:rxjava:3.1.12")
    implementation("io.reactivex.rxjava3:rxkotlin:3.0.1")

    // Android only: provides AndroidSchedulers.mainThread()
    implementation("io.reactivex.rxjava3:rxandroid:3.0.2")
}
```

RxKotlin 3.0.1 depends on RxJava 3.0.6, so declaring `rxjava` explicitly pulls in the current 3.1 release with its bug fixes. Every class lives under `io.reactivex.rxjava3`, so RxJava 2 and 3 can sit side by side during a migration.

## The pieces

- **Observable**: a source that emits zero or more items, then either completes or errors.
- **Observer**: receives `onNext`, `onError` and `onComplete` calls. In Kotlin you usually pass lambdas to `subscribe` or `subscribeBy` instead of implementing the interface.
- **Operators**: methods like `map`, `filter` and `zip` that return a new `Observable`.

Nothing runs until something subscribes. Here's a complete program:

```kotlin
import io.reactivex.rxjava3.core.Observable
import io.reactivex.rxjava3.kotlin.subscribeBy

fun main() {
    Observable.just("Hello", "RxKotlin")
        .map { it.uppercase() }
        .subscribeBy(
            onNext = { println(it) },
            onError = { it.printStackTrace() },
            onComplete = { println("Done") }
        )
}
```

```text
HELLO
RXKOTLIN
Done
```

## Creating Observables

`just` emits the values you pass it (one to ten items), then completes:

```kotlin
val greeting = Observable.just("Hello, RxKotlin!")
```

`fromIterable`, or RxKotlin's `toObservable()` extension, emits each element of a collection:

```kotlin
import io.reactivex.rxjava3.kotlin.toObservable

val numbers = listOf(1, 2, 3, 4, 5).toObservable()
// same as Observable.fromIterable(listOf(1, 2, 3, 4, 5))
```

`create` gives you an emitter so you can wrap callback-based APIs:

```kotlin
val words = Observable.create<String> { emitter ->
    emitter.onNext("Hello")
    emitter.onNext("RxKotlin")
    emitter.onComplete()
}
```

## Transforming and filtering

```kotlin
val numbers = Observable.fromIterable(listOf(1, 2, 3, 4, 5))

val squares = numbers.map { it * it }              // 1, 4, 9, 16, 25
val evenNumbers = numbers.filter { it % 2 == 0 }   // 2, 4
```

Each operator returns a new `Observable`; `numbers` is unchanged and can be subscribed to again.

## Combining Observables

`merge` interleaves items from several sources as they arrive. With synchronous sources like these, the output is simply 1 through 6:

```kotlin
val first = Observable.just(1, 2, 3)
val second = Observable.just(4, 5, 6)
val merged = Observable.merge(first, second)
```

`zip` pairs items by position and stops when the shorter source completes. Since Kotlin 1.4, a plain lambda works where RxJava expects a `BiFunction`, so you no longer need the explicit `BiFunction<String, Int, String> { ... }` wrapper (RxKotlin's README marks its old SAM helpers as obsolete):

```kotlin
val names = Observable.just("Alice", "Bob", "Charlie")
val ages = Observable.just(30, 25, 35)

val described = Observable.zip(names, ages) { name, age -> "$name is $age years old" }
// Alice is 30 years old, Bob is 25 years old, Charlie is 35 years old
```

## Error handling

An error terminates the stream: after `onError`, nothing else is delivered. `onErrorReturn` swaps the error for a final fallback value:

```kotlin
val numbers = Observable.create<Int> { emitter ->
    emitter.onNext(1)
    emitter.onNext(2)
    emitter.onError(RuntimeException("Something went wrong!"))
}

numbers
    .onErrorReturn { -1 }
    .subscribe { println(it) }   // 1, 2, -1
```

`retry(n)` resubscribes to the source up to `n` times when it errors. Because resubscribing runs the `create` block again, the source below prints "Hello" four times (the first attempt plus three retries) before the error reaches the subscriber:

```kotlin
val flaky = Observable.create<String> { emitter ->
    emitter.onNext("Hello")
    emitter.onError(RuntimeException("Something went wrong!"))
}

flaky
    .retry(3)
    .subscribeBy(
        onNext = { println(it) },
        onError = { println("Gave up: ${it.message}") }
    )
```

Always provide an error callback. If an error reaches a `subscribe` call without one, RxJava wraps it in an `OnErrorNotImplementedException` and sends it to `RxJavaPlugins.onError`, which by default hands it to the thread's uncaught exception handler. On Android, that crashes the app.

## Schedulers

By default an `Observable` does its work on the thread that subscribes; there is no implicit background thread. (A few time-based operators such as `interval` and `delay` default to `Schedulers.computation()`.) You move work with two operators:

- `subscribeOn` picks the scheduler the source runs on. Only the first one in a chain has an effect.
- `observeOn` switches the thread for every operator and observer below it.

On Android, a typical chain does I/O in the background and delivers results on the main thread:

```kotlin
import io.reactivex.rxjava3.android.schedulers.AndroidSchedulers
import io.reactivex.rxjava3.core.Observable
import io.reactivex.rxjava3.kotlin.subscribeBy
import io.reactivex.rxjava3.schedulers.Schedulers

val disposable = Observable.fromCallable { loadFromNetwork() }
    .subscribeOn(Schedulers.io())
    .observeOn(AndroidSchedulers.mainThread())
    .subscribeBy(
        onNext = { result -> showResult(result) },
        onError = { error -> showError(error) }
    )
```

`loadFromNetwork`, `showResult` and `showError` stand in for your own functions. Keep the returned `Disposable` (or add it to a `CompositeDisposable`) and dispose it when the screen goes away, otherwise the subscription can outlive the view and leak it.

## Further reading

- [RxKotlin README](https://github.com/ReactiveX/RxKotlin) for the full list of Kotlin extensions
- [RxJava wiki: What's different in 3.0](https://github.com/ReactiveX/RxJava/wiki/What's-different-in-3.0) if you're migrating from RxJava 2
- [ReactiveX operator reference](https://reactivex.io/documentation/operators.html), with marble diagrams for each operator
