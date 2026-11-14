---
title: "Parsing JSON with Klaxon in Kotlin: data classes, arrays and the json DSL"
pubDate: "2023-05-03T14:16:44.964Z"
lastUpdated: 2026-11-14
description: "Use the Klaxon library to parse JSON into Kotlin data classes, parse JSON arrays into lists, and build JSON with Klaxon's json DSL."
tags: ["kotlin", "klaxon"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3185275103.webp
---
:::caution
Klaxon's last release on Maven Central is 5.6 (March 2022), and the project hasn't shipped a release since. The examples below still work, but for new projects consider [kotlinx.serialization](https://github.com/Kotlin/kotlinx.serialization) (from JetBrains), Moshi, or Jackson's Kotlin module.
:::

[Klaxon](https://github.com/cbeust/klaxon) is a small JSON library for Kotlin. It maps JSON onto ordinary Kotlin classes using reflection, so there's no annotation processor or code generation step. This post covers the three things you'll use most: parsing an object, parsing an array, and building JSON by hand.

## Adding the dependency

Gradle (Kotlin DSL):

```kotlin
dependencies {
    implementation("com.beust:klaxon:5.6")
}
```

Maven:

```xml
<dependency>
    <groupId>com.beust</groupId>
    <artifactId>klaxon</artifactId>
    <version>5.6</version>
</dependency>
```

## Parsing a JSON object into a data class

Given this JSON:

```json
{
  "name": "John Doe",
  "age": 30,
  "isDeveloper": true
}
```

Define a class whose constructor parameters match the JSON keys:

```kotlin
data class Person(
    val name: String,
    val age: Int,
    val isDeveloper: Boolean
)
```

Then call `Klaxon().parse<T>()`:

```kotlin
import com.beust.klaxon.Klaxon

data class Person(
    val name: String,
    val age: Int,
    val isDeveloper: Boolean
)

fun main() {
    val jsonString = """
        {
          "name": "John Doe",
          "age": 30,
          "isDeveloper": true
        }
    """

    val person = Klaxon().parse<Person>(jsonString)

    if (person != null) {
        println("Name: ${person.name}")
        println("Age: ${person.age}")
        println("Is Developer: ${person.isDeveloper}")
    } else {
        println("Failed to parse JSON")
    }
}
```

Output:

```text
Name: John Doe
Age: 30
Is Developer: true
```

`parse` returns `Person?`, but a null check alone isn't enough: if the JSON doesn't fit the class (for example a non-nullable field is missing), Klaxon throws a `KlaxonException`. Wrap the call in `try`/`catch` when parsing input you don't control. To make a field optional, give it a nullable type or a default value in the constructor.

## Parsing a JSON array

`parseArray<T>()` returns a `List<T>?`:

```kotlin
import com.beust.klaxon.Klaxon

fun main() {
    val jsonArrayString = """
        [
          { "name": "John Doe", "age": 30, "isDeveloper": true },
          { "name": "Jane Doe", "age": 28, "isDeveloper": false }
        ]
    """

    val persons = Klaxon().parseArray<Person>(jsonArrayString)

    if (persons != null) {
        for (person in persons) {
            println("Name: ${person.name}")
            println("Age: ${person.age}")
            println("Is Developer: ${person.isDeveloper}")
            println("---")
        }
    } else {
        println("Failed to parse JSON")
    }
}
```

This reuses the `Person` class from the previous section. Output:

```text
Name: John Doe
Age: 30
Is Developer: true
---
Name: Jane Doe
Age: 28
Is Developer: false
---
```

## Building JSON with the DSL

Klaxon's `json { }` block gives you `obj(...)` and `array(...)` builders. `obj` takes `key to value` pairs and returns a `JsonObject`, which you can turn into a string with `toJsonString()`:

```kotlin
import com.beust.klaxon.json

fun main() {
    val personJson = json {
        obj(
            "name" to "Jane Doe",
            "age" to 28,
            "isDeveloper" to false,
            "languages" to array("Kotlin", "Java")
        )
    }

    println(personJson.toJsonString())
}
```

Output:

```json
{"name":"Jane Doe","age":28,"isDeveloper":false,"languages":["Kotlin","Java"]}
```

Pass `true` to `toJsonString(true)` for pretty-printed output. To serialize an existing object instead of building one by hand, use `Klaxon().toJsonString(person)`.

## Further reading

- [Klaxon README](https://github.com/cbeust/klaxon): field renaming with `@Json`, custom converters, and the streaming `JsonReader` API
- [kotlinx.serialization guide](https://github.com/Kotlin/kotlinx.serialization/blob/master/docs/serialization-guide.md)
