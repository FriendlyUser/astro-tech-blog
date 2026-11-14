---
description: "A tour of the core Java standard library packages (java.lang, java.util, java.time, java.io, java.nio.file, java.net) and what each one is for, with a runnable example."
imgSrc: /imgs/2023/1924742632.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-08T15:20:34.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: "Java standard library overview: the core packages and what they're for"
---

The Java standard library (the Java Class Library, or "the JDK APIs") is the set of classes that ships with every JDK. Before reaching for a third-party dependency, it's worth knowing what's already there: collections, dates and times, file I/O, networking, an HTTP client and concurrency utilities are all built in.

Since Java 9 the library is split into modules. The packages below all live in the `java.base` module, except `java.net.http`, which is in `java.net.http`. Both are available by default in a normal JDK.

## `java.lang`

Imported automatically into every source file. The classes you use without thinking about it:

- `Object`: the root of the class hierarchy (`equals`, `hashCode`, `toString`).
- `String`: an immutable sequence of characters.
- `StringBuilder`: a mutable buffer for building strings in a loop. `StringBuffer` does the same but synchronizes every method, so prefer `StringBuilder` unless several threads share one buffer.
- `Math`: static methods such as `Math.max`, `Math.sqrt` and `Math.floorMod`.
- `System`: standard streams (`System.out`, `System.err`, `System.in`), environment variables and `System.nanoTime()` for timing.
- Wrapper types (`Integer`, `Long`, `Double`, ...) and `Thread`.

## `java.util`

Collections and general utilities:

- Lists, sets and maps: `ArrayList`, `LinkedList`, `HashSet`, `TreeSet`, `HashMap`, `TreeMap`. The `Tree*` variants keep their elements sorted.
- `Collections` and `Arrays`: static helpers for sorting, searching and wrapping collections.
- `Optional`, `Random`, `Objects`, `Scanner`.
- `java.util.stream`: the Streams API (`map`, `filter`, `collect`).
- `java.util.concurrent`: thread pools (`ExecutorService`), `ConcurrentHashMap`, `CompletableFuture`.

`java.util.Date`, `Calendar` and `TimeZone` are still here, but they are legacy. For new code use `java.time`.

## `java.time`

Added in Java 8 to replace `Date` and `Calendar`. The types are immutable and say what they mean: `LocalDate` (a date with no time zone), `LocalDateTime`, `ZonedDateTime`, `Instant` (a point on the UTC timeline), `Duration` and `Period`. `DateTimeFormatter` handles parsing and formatting.

## `java.io`

The original stream-based I/O API:

- `InputStream` / `OutputStream` for bytes and `Reader` / `Writer` for characters.
- `BufferedReader`, `BufferedWriter`, `FileReader`, `FileWriter` and friends that wrap them.
- `File`: a file or directory path. It still works, but `java.nio.file.Path` is the better choice for new code.

Sockets in `java.net` also expose their data as `java.io` streams.

## `java.nio` and `java.nio.file`

NIO stands for "New I/O". The `java.nio` package itself holds the buffer classes (`ByteBuffer`, `CharBuffer`, `IntBuffer` and so on). Related packages:

- `java.nio.channels`: channels, which read and write buffers, plus `Selector` for non-blocking socket I/O.
- `java.nio.file`: `Path`, `Paths` and `Files`. This is the modern file API, with one-liners like `Files.readString`, `Files.lines` and `Files.walk`, and exceptions that say why an operation failed (`File.delete()` only returns `false`).

## `java.net` and `java.net.http`

`java.net` has `URI`, `URL`, `Socket`, `ServerSocket` and `DatagramSocket` for TCP and UDP. For HTTP, use `java.net.http.HttpClient` (Java 11+) rather than the older `HttpURLConnection`. It supports HTTP/2 and has both synchronous `send` and asynchronous `sendAsync`.

## A small example

You import individual classes (or a whole package with `*`), not the library as a whole. This program counts the words in a text file using `java.nio.file`, `java.util` and `java.time`:

```java
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

public class WordCount {
    public static void main(String[] args) throws IOException {
        Path file = Path.of(args.length > 0 ? args[0] : "notes.txt");
        List<String> lines = Files.readAllLines(file);

        Map<String, Integer> counts = new TreeMap<>();
        for (String line : lines) {
            for (String word : line.toLowerCase().split("\\W+")) {
                if (!word.isEmpty()) {
                    counts.merge(word, 1, Integer::sum);
                }
            }
        }

        System.out.println("Word counts for " + file + " on " + LocalDate.now());
        counts.forEach((word, n) -> System.out.println(word + ": " + n));
    }
}
```

On Java 11 or later you can run a single source file directly, without compiling it first:

```sh
java WordCount.java notes.txt
```

`TreeMap` keeps the words in alphabetical order. Swap it for `HashMap` if order doesn't matter.

## Further reading

- [Java SE API documentation](https://docs.oracle.com/en/java/javase/21/docs/api/index.html), organized by module
- [The `java.time` package](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/time/package-summary.html)
- [`java.net.http.HttpClient`](https://docs.oracle.com/en/java/javase/21/docs/api/java.net.http/java/net/http/HttpClient.html)
