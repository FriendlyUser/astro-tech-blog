---
description: Convert Java objects to and from JSON with Jackson's ObjectMapper, covering
  records, field renaming, generic lists, the tree model and Jackson 2 vs 3 differences.
imgSrc: /imgs/2023/pokemon_by_first_letter.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-06T06:00:24.000Z'
lastUpdated: 2026-11-14
tags:
  - java
title: "Jackson basics: reading and writing JSON in Java"
---

Jackson is one of the most widely used JSON libraries for Java and the default JSON library in Spring Boot. Its `ObjectMapper` converts between JSON and Java objects (data binding), and it also offers a tree model and a low-level streaming parser for cases where you don't have a class to bind to.

Jackson 3.0 was released in October 2025 with a new Maven group ID and package names. The main example below uses Jackson 3; the differences for code still on Jackson 2.x are listed after it.

## Modules

Jackson is split into a few artifacts:

- **jackson-core**: the streaming parser and generator (`JsonParser`, `JsonGenerator`).
- **jackson-annotations**: annotations such as `@JsonProperty` and `@JsonIgnore`.
- **jackson-databind**: `ObjectMapper`, data binding and the tree model. It depends on the other two.

Extra modules add support for other formats (YAML, CSV, XML, Smile, CBOR) and third-party types such as Guava collections.

## Dependency

For most projects, `jackson-databind` is the only dependency you need to declare; Maven pulls in core and annotations:

```xml
<dependency>
  <groupId>tools.jackson.core</groupId>
  <artifactId>jackson-databind</artifactId>
  <version>3.3.0</version>
</dependency>
```

3.3.0 was the latest 3.x release on Maven Central when this post was updated. Jackson 3 requires Java 17.

## Serializing and deserializing

```java
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public class JacksonExample {

    public record Person(String name, int age,
                         @JsonProperty("email_address") String email) {}

    public static void main(String[] args) {
        ObjectMapper mapper = JsonMapper.builder().build();

        // Java object -> JSON
        Person person = new Person("John Doe", 30, "john@example.com");
        String json = mapper.writeValueAsString(person);
        System.out.println(json);

        // JSON -> Java object
        Person parsed = mapper.readValue(json, Person.class);
        System.out.println(parsed);

        // JSON -> tree, when you don't have a class for it
        JsonNode node = mapper.readTree("{\"name\":\"Jane\",\"tags\":[\"a\",\"b\"]}");
        System.out.println(node.get("tags").get(1).asString());
    }
}
```

Output:

```text
{"name":"John Doe","age":30,"email_address":"john@example.com"}
Person[name=John Doe, age=30, email=john@example.com]
b
```

A few things to notice:

- Records work without extra annotations. For a regular class, Jackson needs either a no-argument constructor plus setters (or public fields), or a constructor annotated with `@JsonCreator`. The most common deserialization error is a class with only an all-arguments constructor.
- `@JsonProperty("email_address")` renames a field in the JSON without renaming it in Java.
- `ObjectMapper` is thread-safe once configured. Create one and reuse it rather than building a new one per call.

### Generic types

Because of type erasure, `mapper.readValue(json, List.class)` gives you a list of `LinkedHashMap`s, not `Person` objects. Use a `TypeReference` to keep the element type:

```java
import java.util.List;
import tools.jackson.core.type.TypeReference;

List<Person> people = mapper.readValue(
        "[{\"name\":\"A\",\"age\":1}]",
        new TypeReference<List<Person>>() {});
```

## Jackson 2.x

Jackson 2.x is still maintained and still very common. If you're on it:

- The group ID is `com.fasterxml.jackson.core` (latest at the time of writing: `jackson-databind` 2.23.0) and packages are `com.fasterxml.jackson.*`. Jackson 3 keeps `jackson-annotations` under the old group ID, so `com.fasterxml.jackson.annotation` imports don't change.
- `readValue` and `writeValueAsString` throw the checked `JsonProcessingException`, so you need a `try`/`catch` or `throws`. In Jackson 3 the base `JacksonException` is unchecked.
- You typically write `new ObjectMapper()` and configure it with `mapper.configure(...)`. In Jackson 3, mappers are immutable and configured through `JsonMapper.builder()`.
- Unknown JSON properties fail deserialization by default with `UnrecognizedPropertyException`. Jackson 3 ignores them by default. In 2.x, set `DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES` to `false` or annotate the class with `@JsonIgnoreProperties(ignoreUnknown = true)` if you want that behaviour.
- `JsonNode.asText()` is the 2.x name for what Jackson 3 calls `asString()`.
- Java records are supported from Jackson 2.12.

The same example on 2.x:

```java
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class JacksonExample {

    public record Person(String name, int age,
                         @JsonProperty("email_address") String email) {}

    public static void main(String[] args) throws JsonProcessingException {
        ObjectMapper mapper = new ObjectMapper();

        String json = mapper.writeValueAsString(new Person("John Doe", 30, "john@example.com"));
        System.out.println(json);

        Person parsed = mapper.readValue(json, Person.class);
        System.out.println(parsed);
    }
}
```

## Further reading

- [Jackson project home](https://github.com/FasterXML/jackson)
- [Jackson 3.0 release notes](https://github.com/FasterXML/jackson/wiki/Jackson-Release-3.0)
- [jackson-databind README](https://github.com/FasterXML/jackson-databind)
