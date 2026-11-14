---
description: Working examples of Apache Commons Lang (StringUtils, NumberUtils), Commons IO (FileUtils) and Commons Collections (MultiValuedMap), with current Maven coordinates.
imgSrc: /imgs/2023/1113292628.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-21T20:28:26.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: 'Apache Commons Lang, IO and Collections: examples in Java'
---

Apache Commons is a set of small, independent Java libraries maintained by the Apache Software Foundation. Each one fills a gap in the JDK: null-safe string helpers, one-line file copies, collection types the standard library doesn't have. You add only the modules you need.

This post covers the three you're most likely to run into: Lang, IO and Collections.

## Dependencies

The versions below are current as of November 2026. Check [Maven Central](https://central.sonatype.com/) for newer releases.

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
    <version>3.22.0</version>
</dependency>
<dependency>
    <groupId>commons-io</groupId>
    <artifactId>commons-io</artifactId>
    <version>2.22.0</version>
</dependency>
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-collections4</artifactId>
    <version>4.6.0</version>
</dependency>
```

Note the package names. Commons Lang 3 lives in `org.apache.commons.lang3` and Collections 4 in `org.apache.commons.collections4`. The old `commons-lang` (2.x) and `commons-collections` (3.x) artifacts are older lines with different packages, so watch which one your IDE picks when auto-importing.

## Commons Lang

### StringUtils

`StringUtils` methods accept `null` without throwing, which is most of the reason to use them.

```java
import org.apache.commons.lang3.StringUtils;

public class StringUtilsExample {
    public static void main(String[] args) {
        String str = "  Apache Commons Lang  ";

        // Trim whitespace from both ends; returns null for null input
        String trimmed = StringUtils.trim(str);                  // "Apache Commons Lang"

        // True for null, "" or whitespace-only strings
        boolean blank = StringUtils.isBlank(str);                // false
        boolean blankNull = StringUtils.isBlank(null);           // true

        // Count non-overlapping occurrences of a substring
        int count = StringUtils.countMatches("ababa", "ab");     // 2

        // Replace every occurrence of a substring
        String replaced = StringUtils.replace("ababa", "ab", "cd"); // "cdcda"

        System.out.println(trimmed + " " + blank + " " + blankNull + " " + count + " " + replaced);
    }
}
```

Since Java 11, `String.isBlank()` and `String.strip()` cover some of this, but they throw on `null`.

### NumberUtils

`NumberUtils.toInt` parses a string and returns a default instead of throwing `NumberFormatException`.

```java
import org.apache.commons.lang3.math.NumberUtils;

public class NumberUtilsExample {
    public static void main(String[] args) {
        int value = NumberUtils.toInt("123", 0);      // 123
        int fallback = NumberUtils.toInt("NaN", 0);   // 0

        int min = NumberUtils.min(3, 5, 1, 7);        // 1
        int max = NumberUtils.max(3, 5, 1, 7);        // 7

        System.out.println(value + " " + fallback + " " + min + " " + max);
    }
}
```

## Commons IO

### FileUtils

`FileUtils` wraps common file operations in single calls. Always pass a charset explicitly when reading or writing text. The overloads without one are deprecated because they depend on the platform default.

```java
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

public class FileUtilsExample {
    public static void main(String[] args) throws IOException {
        File source = new File("source.txt");
        File destination = new File("destination.txt");

        FileUtils.writeStringToFile(source, "hello from commons-io\n", StandardCharsets.UTF_8);

        // Copy a file, creating parent directories if needed
        FileUtils.copyFile(source, destination);

        // Read a whole file into a string
        String content = FileUtils.readFileToString(destination, StandardCharsets.UTF_8);
        System.out.print(content);

        // Delete a file, or a directory and everything in it; throws if it fails
        FileUtils.forceDelete(source);
    }
}
```

On Java 11+, `java.nio.file.Files` has `readString`, `writeString` and `copy`, so for single files you may not need Commons IO. It still saves code for recursive directory copies (`FileUtils.copyDirectory`) and deletes (`FileUtils.deleteDirectory`).

## Commons Collections

### MultiValuedMap

A `MultiValuedMap` holds several values per key. Older examples use `MultiMap` and `MultiValueMap`. Both have been deprecated since Collections 4.1. Use `MultiValuedMap` and one of its implementations, such as `ArrayListValuedHashMap` (values kept in insertion order, duplicates allowed) or `HashSetValuedHashMap` (no duplicate values per key).

```java
import org.apache.commons.collections4.MultiValuedMap;
import org.apache.commons.collections4.multimap.ArrayListValuedHashMap;

public class MultiValuedMapExample {
    public static void main(String[] args) {
        MultiValuedMap<String, Integer> multiMap = new ArrayListValuedHashMap<>();

        multiMap.put("one", 1);
        multiMap.put("one", 11);
        multiMap.put("two", 2);

        System.out.println(multiMap.get("one"));   // [1, 11]
        System.out.println(multiMap.get("two"));   // [2]
        System.out.println(multiMap.get("three")); // [] (empty, never null)
    }
}
```

If you only need this in one place, a plain `Map<String, List<Integer>>` with `computeIfAbsent(key, k -> new ArrayList<>()).add(value)` does the same job without a dependency.

## Further reading

- [Apache Commons home](https://commons.apache.org/), with the full list of components
- [Commons Lang user guide](https://commons.apache.org/proper/commons-lang/userguide.html)
- [Commons IO](https://commons.apache.org/proper/commons-io/)
- [Commons Collections](https://commons.apache.org/proper/commons-collections/)
