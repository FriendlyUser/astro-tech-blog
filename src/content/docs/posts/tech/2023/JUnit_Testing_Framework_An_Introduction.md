---
description: Write and run JUnit Jupiter tests in Java, covering the Maven dependency,
  lifecycle annotations, assertions, parameterized tests and what changed in JUnit 6.
imgSrc: /imgs/2023/3053072516.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-10-10T12:54:08.000Z'
lastUpdated: 2026-11-14
tags:
  - java
  - testing
title: "JUnit basics: writing and running unit tests in Java"
---

JUnit is the standard unit testing framework for Java. You write test methods annotated with `@Test`, use assertions to check results, and a build tool or IDE runs them and reports failures. It was started by Kent Beck and Erich Gamma in 1997 and is now maintained by the JUnit team.

## JUnit 4, 5 and 6

- **JUnit 4** used a single jar and annotations in `org.junit` (`@Before`, `@After`).
- **JUnit 5** split JUnit into the *JUnit Platform* (which launches tests), *JUnit Jupiter* (the API you write tests against, in `org.junit.jupiter.api`) and *JUnit Vintage* (runs old JUnit 4 tests on the Platform).
- **JUnit 6**, released in September 2025, keeps the Jupiter API but requires Java 17, uses one version number for Platform, Jupiter and Vintage, and deprecates Vintage. Most JUnit 5 test code runs unchanged.

The examples below use the Jupiter API, which is the same in JUnit 5 and 6.

## Setup

With Maven, add the `junit-jupiter` aggregate artifact, which includes the API, the engine and parameterized test support:

```xml
<dependency>
  <groupId>org.junit.jupiter</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>6.1.3</version>
  <scope>test</scope>
</dependency>
```

6.1.3 was the latest release on Maven Central when this post was updated. Maven Surefire 3.x detects the JUnit Platform automatically, so `mvn test` runs the tests. If you're on Java 8 or 11, use the latest JUnit 5.x instead.

With Gradle (Kotlin DSL):

```kotlin
dependencies {
    testImplementation(platform("org.junit:junit-bom:6.1.3"))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.test {
    useJUnitPlatform()
}
```

## A first test

Code under test, in `src/main/java`:

```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int divide(int a, int b) {
        return a / b;
    }
}
```

Tests, in `src/test/java`:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class CalculatorTest {

    private Calculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new Calculator();
    }

    @Test
    void addsTwoNumbers() {
        assertEquals(5, calculator.add(2, 3));
    }

    @Test
    void divideByZeroThrows() {
        assertThrows(ArithmeticException.class, () -> calculator.divide(1, 0));
    }

    @ParameterizedTest
    @CsvSource({"1, 1, 2", "2, 3, 5", "-1, 1, 0"})
    void addsPairs(int a, int b, int expected) {
        assertEquals(expected, calculator.add(a, b));
    }
}
```

Test classes and methods don't need to be `public` in Jupiter. Note the argument order in `assertEquals(expected, actual)`; swapping them produces confusing failure messages.

## Lifecycle annotations

- `@BeforeEach` / `@AfterEach`: run before and after every test method.
- `@BeforeAll` / `@AfterAll`: run once per class. They must be `static` unless the class is annotated with `@TestInstance(Lifecycle.PER_CLASS)`.
- `@Disabled`: skip a test, ideally with a reason string.
- `@DisplayName`: a readable name for reports.

JUnit creates a new instance of the test class for every test method by default, so instance fields are not shared between tests.

## Assertions

`org.junit.jupiter.api.Assertions` has the usual `assertEquals`, `assertNotEquals`, `assertTrue`, `assertFalse`, `assertNull` and `assertNotNull`, plus two worth knowing:

- `assertThrows` returns the thrown exception so you can check its message.
- `assertAll` runs several assertions and reports every failure, instead of stopping at the first.

Many teams use AssertJ alongside JUnit for more readable fluent assertions.

## Running tests

Most people run tests through Maven, Gradle or the IDE (IntelliJ IDEA, Eclipse and VS Code all support the JUnit Platform). There is also a standalone Console Launcher for running tests from the command line without a build tool. To group test classes into a suite, add `junit-platform-suite` and use `@Suite` with `@SelectPackages` or `@SelectClasses`.

## Habits that keep tests useful

- Test one behaviour per method and name the method after it (`divideByZeroThrows`, not `test2`).
- Keep tests independent. JUnit doesn't guarantee method order, and a test that depends on another breaks when run alone.
- Keep tests fast and free of network or database calls; put those in separate integration tests.

## Further reading

- [JUnit user guide](https://docs.junit.org/current/user-guide/)
- [JUnit release notes](https://docs.junit.org/current/release-notes/)
