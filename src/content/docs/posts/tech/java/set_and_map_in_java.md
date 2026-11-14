---
tags: ['java']
title: "Sets and maps in Java: HashSet, HashMap and picking an implementation"
description: How to use HashSet and HashMap in Java, when to choose the LinkedHash or Tree variants, and the equals/hashCode and immutability gotchas.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2785394646.webp
---

A `Set` holds unique elements. A `Map` holds key-value pairs with unique keys. Both are interfaces in `java.util`, and `HashSet` and `HashMap` are the implementations you'll reach for by default. In fact, `HashSet` is backed by a `HashMap` internally, with the set's elements stored as the map's keys.

## HashSet and HashMap in one example

```java
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class SetsAndMaps {
    public static void main(String[] args) {
        Set<String> tags = new HashSet<>();
        tags.add("java");
        tags.add("kotlin");
        boolean added = tags.add("java");             // already present
        System.out.println(added);                    // false
        System.out.println(tags.size());              // 2
        System.out.println(tags.contains("kotlin"));  // true
        tags.remove("kotlin");

        Map<String, Integer> counts = new HashMap<>();
        for (String word : "the cat and the hat".split(" ")) {
            counts.merge(word, 1, Integer::sum);      // insert 1, or add 1 to the existing count
        }
        System.out.println(counts.get("the"));             // 2
        System.out.println(counts.get("dog"));             // null
        System.out.println(counts.getOrDefault("dog", 0)); // 0
        System.out.println(counts.containsKey("cat"));     // true

        for (Map.Entry<String, Integer> e : counts.entrySet()) {
            System.out.println(e.getKey() + " -> " + e.getValue());
        }

        // Group words by length
        Map<Integer, List<String>> byLength = new HashMap<>();
        for (String word : List.of("a", "to", "in", "cat")) {
            byLength.computeIfAbsent(word.length(), k -> new ArrayList<>()).add(word);
        }
        System.out.println(byLength.get(2)); // [to, in]
    }
}
```

A few things the example shows:

- `Set.add` returns `false` when the element was already there, so you can use it as a "seen before?" check.
- `Map.get` returns `null` for a missing key. Because `HashMap` also allows `null` values, `get` alone can't distinguish "missing" from "mapped to null"; use `containsKey` or `getOrDefault`.
- `merge` and `computeIfAbsent` replace the old "get, check for null, put" pattern for counters and multimaps.
- Iteration order of a `HashSet` or `HashMap` is unspecified and can change as the collection grows. Don't rely on it.

`add`, `remove`, `contains`, `get` and `put` take constant time on average, assuming the keys' `hashCode` values spread well. Since Java 8, a bucket with many colliding keys is converted to a balanced tree, which limits the damage from bad hashes.

## Choosing an implementation

| Need | Set | Map | Cost of lookups |
| --- | --- | --- | --- |
| No ordering | `HashSet` | `HashMap` | O(1) average |
| Insertion order | `LinkedHashSet` | `LinkedHashMap` | O(1) average |
| Sorted by key | `TreeSet` | `TreeMap` | O(log n) |
| Concurrent access | `ConcurrentHashMap.newKeySet()` | `ConcurrentHashMap` | O(1) average |

`TreeSet` and `TreeMap` are red-black trees. They need keys that are `Comparable` or a `Comparator`, and they give you range queries such as `headMap`, `tailMap`, `floorKey` and `ceilingKey`. `LinkedHashMap` can also be built in access order (`new LinkedHashMap<>(16, 0.75f, true)`), which is the usual starting point for a simple LRU cache.

None of `HashMap`, `LinkedHashMap` or `TreeMap` are thread-safe. If several threads write to a map, use `ConcurrentHashMap`, which doesn't accept `null` keys or values.

## Gotchas

**Keys need `equals` and `hashCode`.** A hash-based collection finds elements by `hashCode` and then compares them with `equals`. A plain class that doesn't override both uses object identity, so two instances with the same fields are different keys. Records generate both methods for you:

```java
record Point(int x, int y) {}

Set<Point> points = new HashSet<>();
points.add(new Point(1, 2));
System.out.println(points.contains(new Point(1, 2))); // true
```

**Don't mutate keys.** If a field used in `hashCode` changes after the object is inserted, the collection looks in the wrong bucket and the entry becomes unreachable. Use immutable keys (strings, records with immutable fields).

**Factory methods return immutable collections.** `Set.of(...)`, `Map.of(...)` and `Map.ofEntries(...)` (Java 9+) create unmodifiable collections. They throw `UnsupportedOperationException` on `add` or `put`, `NullPointerException` on `null` elements, keys or values, and `IllegalArgumentException` on duplicate elements or keys. Their iteration order is unspecified. Wrap them in `new HashSet<>(...)` or `new HashMap<>(...)` if you need a mutable copy.

**`TreeMap` and `null`.** `HashMap` allows one `null` key, but a `TreeMap` using natural ordering throws `NullPointerException` on a `null` key because it can't compare it.

## Further reading

- [`java.util.Set` Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Set.html)
- [`java.util.Map` Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Map.html)
- [`java.util.HashMap` Javadoc](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html)
