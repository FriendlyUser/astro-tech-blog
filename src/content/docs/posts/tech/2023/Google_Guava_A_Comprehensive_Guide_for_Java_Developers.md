---
description: "What Google Guava still adds to modern Java: immutable collections, Multimap, BiMap, Table, LoadingCache, ListenableFuture and Service, with runnable examples."
imgSrc: /imgs/2023/3582974242.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-24T12:49:13.000Z'
lastUpdated: 2026-11-14
tags:
  - java
title: 'Google Guava for Java developers: collections, caching and concurrency'
---

[Guava](https://github.com/google/guava) is Google's open-source core library for Java (Apache 2.0). Some of what it introduced, such as `Optional`, functional interfaces and `Preconditions.checkNotNull`, now has a JDK equivalent (`java.util.Optional`, `java.util.function`, `Objects.requireNonNull`). The pieces covered here are the ones that are still worth adding the dependency for.

## Adding the dependency

```xml
<dependency>
  <groupId>com.google.guava</groupId>
  <artifactId>guava</artifactId>
  <version>33.8.0-jre</version>
</dependency>
```

Gradle: `implementation("com.google.guava:guava:33.8.0-jre")`. Use the `-jre` flavour for server and desktop Java (8+); the `-android` flavour targets Android.

## Immutable collections

```java
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;

ImmutableList<String> names = ImmutableList.of("Alice", "Bob", "Charlie");
ImmutableMap<String, Integer> ages = ImmutableMap.of("Alice", 31, "Bob", 27);

names.add("Dave"); // throws UnsupportedOperationException
```

Unlike `Collections.unmodifiableList`, which is only a read-only view of a list someone else can still change, an `ImmutableList` owns a copy of its contents and can never change. That makes it safe to share between threads and to return from getters without defensive copies. Guava's immutable collections reject `null` elements, preserve insertion order, and the type in the signature tells callers it can't be modified.

Java 9+ has `List.of` and `Map.of`, which cover the simple cases. Guava's versions are still useful for the builders (`ImmutableList.builder()`), `ImmutableSortedSet`/`ImmutableSortedMap`, and the immutable `Multimap` and `Table` types.

## Multimap, BiMap and Table

These are the collection types the JDK doesn't have.

### Multimap

A `Multimap` maps a key to several values without you managing a `Map<K, List<V>>`:

```java
import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.ListMultimap;
import java.util.List;

ListMultimap<String, String> food = ArrayListMultimap.create();
food.put("fruit", "apple");
food.put("fruit", "banana");
food.put("vegetable", "carrot");

List<String> fruit = food.get("fruit"); // [apple, banana]
List<String> nuts = food.get("nuts");   // [] (never null)
int size = food.size();                 // 3, counts key-value pairs
```

Use `HashMultimap`/`LinkedHashMultimap` if you want set semantics for the values.

### BiMap

A `BiMap` keeps keys and values both unique, so you can look up in either direction:

```java
import com.google.common.collect.BiMap;
import com.google.common.collect.HashBiMap;

BiMap<String, Integer> numbers = HashBiMap.create();
numbers.put("one", 1);
numbers.put("two", 2);

String key = numbers.inverse().get(2); // "two"
numbers.put("uno", 1); // throws IllegalArgumentException: value already present
```

Use `forcePut` if you want to replace the existing mapping instead.

### Table

A `Table` is a map keyed by a (row, column) pair:

```java
import com.google.common.collect.HashBasedTable;
import com.google.common.collect.Table;

Table<String, String, Integer> grades = HashBasedTable.create();
grades.put("Alice", "Math", 90);
grades.put("Alice", "Science", 85);
grades.put("Bob", "Math", 80);

grades.get("Alice", "Math"); // 90
grades.row("Alice");         // {Math=90, Science=85}
grades.column("Math");       // {Alice=90, Bob=80}
```

## Caching

`CacheBuilder` builds an in-memory cache with size limits, expiry, and automatic loading:

```java
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import java.time.Duration;

LoadingCache<String, String> cache = CacheBuilder.newBuilder()
    .maximumSize(100)
    .expireAfterAccess(Duration.ofMinutes(5))
    .build(CacheLoader.from(key -> fetchData(key)));

String value = cache.getUnchecked("user:42"); // loads on first call, cached afterwards
```

`fetchData` stands in for your own slow lookup. Use `get` instead of `getUnchecked` if the loader can throw checked exceptions; `get` wraps them in `ExecutionException`.

For new code, Guava's own `CacheBuilder` Javadoc recommends [Caffeine](https://github.com/ben-manes/caffeine), its successor. Caffeine has an almost identical builder API, better eviction, and async loading.

## Functional utilities: use streams instead

Guava's `Function`, `Predicate`, `Collections2.transform` and `FluentIterable` predate Java 8. The Guava team's own [functional idioms page](https://github.com/google/guava/wiki/FunctionalExplained) says the JDK's `java.util.function` and `java.util.stream` packages supersede them, and warns that overusing them leads to verbose, hard-to-read code. In Java 8+:

```java
List<String> upper = names.stream()
    .filter(n -> n.startsWith("A"))
    .map(String::toUpperCase)
    .collect(ImmutableList.toImmutableList());
```

`ImmutableList.toImmutableList()` is a Guava collector, so the two still work well together.

## Concurrency

### ListenableFuture

A `ListenableFuture` is a `Future` you can attach callbacks to:

```java
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.common.util.concurrent.ListeningExecutorService;
import com.google.common.util.concurrent.MoreExecutors;
import java.util.concurrent.Executors;

ListeningExecutorService executor =
    MoreExecutors.listeningDecorator(Executors.newSingleThreadExecutor());
try {
    ListenableFuture<String> future = executor.submit(() -> fetchData("report"));

    Futures.addCallback(future, new FutureCallback<String>() {
        @Override
        public void onSuccess(String result) {
            System.out.println("Fetched: " + result);
        }

        @Override
        public void onFailure(Throwable t) {
            System.err.println("Failed: " + t);
        }
    }, MoreExecutors.directExecutor());

    future.get();
} finally {
    executor.shutdown(); // otherwise the non-daemon thread keeps the JVM alive
}
```

The executor argument to `addCallback` is required. `directExecutor()` runs the callback on whichever thread completes the future, which is fine for quick work like logging. Pass a real executor for anything slow. If you are starting fresh on Java 8+, `CompletableFuture` covers much of the same ground. `ListenableFuture` is still common in libraries such as gRPC-Java.

### Service

`Service` gives a background component a defined lifecycle (`NEW → STARTING → RUNNING → STOPPING → TERMINATED`, or `FAILED`). The simplest base class is `AbstractExecutionThreadService`, which runs `run()` on its own thread:

```java
import com.google.common.util.concurrent.AbstractExecutionThreadService;
import java.util.concurrent.TimeUnit;

class Heartbeat extends AbstractExecutionThreadService {
    @Override
    protected void run() throws InterruptedException {
        while (isRunning()) {
            System.out.println("tick");
            Thread.sleep(1_000);
        }
    }
}

Heartbeat service = new Heartbeat();
service.startAsync().awaitRunning();
// ... later
service.stopAsync().awaitTerminated(5, TimeUnit.SECONDS);
```

If `run()` throws, the service moves to `FAILED`, and `awaitTerminated` throws an `IllegalStateException` with the original exception as its cause. `ServiceManager` starts and stops a group of services together.

## When not to bother

Guava is a large dependency, and it is a common source of version conflicts because so many libraries depend on it. If you only need `List.of`, `Optional` or `Objects.requireNonNull`, the JDK already has them. Add Guava when you want the collection types, the immutable builders, or the concurrency utilities above.

## Further reading

- [Guava user guide](https://github.com/google/guava/wiki)
- [Guava Javadoc](https://guava.dev/releases/snapshot-jre/api/docs/)
- [Caffeine](https://github.com/ben-manes/caffeine)
