---
title: "Mockito for Android unit tests: mocks, stubbing, and verification"
pubDate: "2024-07-27T15:56:56.000Z"
lastUpdated: 2026-11-14
description: "Use Mockito 5 in Android unit tests: create mocks, stub return values, verify calls, use argument matchers and answers, and mock final classes."
tags: ["android", "java", "testing"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3185275103.webp
---

Mockito is an open-source mocking library for Java (and, with some help, Kotlin). A mock stands in for a dependency of the class you're testing, such as a repository, an API client, or an analytics tracker, so the test exercises only that class. You decide what the mock returns, then check how your code called it.

In Android projects, Mockito is most useful in local unit tests (`src/test`) for ViewModels, presenters, repositories, and other classes that you can construct without Android framework objects.

## Dependencies

```kotlin
dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.24.0")

    // Only if you also use Mockito in instrumented tests (src/androidTest)
    androidTestImplementation("org.mockito:mockito-android:5.24.0")
}
```

Mockito 5 requires Java 11 or later to run the tests, which any recent Android Gradle Plugin setup already uses.

## Create a mock

```java
import static org.mockito.Mockito.mock;

MyRepository repository = mock(MyRepository.class);
```

Until you stub them, a mock's methods do nothing and return defaults: `null` for objects, `0` and `false` for primitives, and empty collections for collection return types.

## Stub a method

`when(...).thenReturn(...)` sets the return value for a specific call:

```java
when(repository.fetchMessage()).thenReturn("Hello, World!");
```

There's also a `doReturn(...).when(mock).method()` form. Use `when(...)` by default. The `do...` family (`doReturn`, `doThrow`, `doAnswer`, `doNothing`) is for the cases `when(...)` can't handle:

- **Void methods**, which can't go inside `when(...)`: `doThrow(new IOException()).when(cache).clear();`
- **Spies**, where `when(spy.get(0))` would call the real method while stubbing.
- **Re-stubbing** a method that's already stubbed to throw.

## Verify a call

`verify` checks that a method was called on the mock. By default it means "exactly once" with those arguments:

```java
verify(analytics).track("message_shown");
verify(analytics, never()).track("error");
verify(repository, times(2)).fetchMessage();
```

Verify interactions your code is supposed to cause, typically calls to void methods like logging or saving. If a stubbed method's return value already shows up in what you assert, verifying that call as well is usually redundant.

## A complete test

A class that depends on a repository and an analytics tracker:

```java
public interface MyRepository {
    String fetchMessage();
}

public interface Analytics {
    void track(String event);
}

public class MessageViewModel {
    private final MyRepository repository;
    private final Analytics analytics;

    public MessageViewModel(MyRepository repository, Analytics analytics) {
        this.repository = repository;
        this.analytics = analytics;
    }

    public String getMessage() {
        String message = repository.fetchMessage();
        analytics.track("message_shown");
        return message;
    }
}
```

The test in `src/test/java/...`:

```java
import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.Before;
import org.junit.Test;

public class MessageViewModelTest {
    private MyRepository repository;
    private Analytics analytics;
    private MessageViewModel viewModel;

    @Before
    public void setUp() {
        repository = mock(MyRepository.class);
        analytics = mock(Analytics.class);
        viewModel = new MessageViewModel(repository, analytics);
    }

    @Test
    public void getMessage_returnsRepositoryMessageAndTracksIt() {
        when(repository.fetchMessage()).thenReturn("Hello, World!");

        String message = viewModel.getMessage();

        assertEquals("Hello, World!", message);
        verify(analytics).track("message_shown");
    }
}
```

Instead of calling `mock()` in `@Before`, you can annotate fields with `@Mock` and run the class with `@RunWith(MockitoJUnitRunner.class)`. The runner also fails the test when you stub something the test never uses, which catches stale setup code.

## Argument matchers

When you don't care about the exact argument, use a matcher from `org.mockito.ArgumentMatchers`:

```java
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

when(greeter.greet(anyString())).thenReturn("Hello!");
when(api.getUser(eq("abc"), any(Options.class))).thenReturn(user);
```

Two rules trip people up:

- `any(String.class)` and `anyString()` don't match `null`. Use `any()` or `isNull()` if a null argument should match.
- If one argument uses a matcher, all of them must. That's why the second example wraps `"abc"` in `eq(...)`; mixing a raw value with a matcher throws `InvalidUseOfMatchersException`.

## Computed answers

`thenAnswer` runs your code on each call, with access to the arguments:

```java
when(greeter.greet(anyString()))
        .thenAnswer(invocation -> "Hello, " + invocation.getArgument(0) + "!");
```

`invocation.getArgument(0)` is generic, so you don't need to cast.

## Final classes and methods

Since Mockito 5, `mockito-core` uses the inline mock maker by default, so it can mock final classes and methods (which includes Kotlin classes, since they're final unless marked `open`), as well as static methods with `mockStatic`. You no longer need the separate `mockito-inline` artifact or a `mock-maker-inline` file in `src/test/resources/mockito-extensions`.

On JDK 21 and later, the inline mock maker attaches a Java agent at runtime, and the JVM prints a warning about dynamically loaded agents. A future JDK is expected to block this by default. The [Mockito documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html) describes how to add Mockito as a `-javaagent` on the test JVM instead.

## Notes for Kotlin

- `when` is a reserved word in Kotlin, so you'd write ``Mockito.`when`(...)``. The [mockito-kotlin](https://github.com/mockito/mockito-kotlin) library adds `whenever`, `mock<T>()`, and `any()` helpers that work with Kotlin's null safety.
- Many Kotlin-first projects use [MockK](https://mockk.io/) instead, which supports coroutines (`coEvery`, `coVerify`) directly.

## When not to mock

- Don't mock types you own that are simple data holders; construct real ones.
- Don't mock Android framework classes like `Context` to make a test pass. Move the logic out of the framework class, or use Robolectric or an instrumented test.
- A hand-written fake (for example, an in-memory repository) is often clearer than a mock with many stubs.

## Further reading

- [Mockito Javadoc](https://javadoc.io/doc/org.mockito/mockito-core/latest/org.mockito/org/mockito/Mockito.html)
- [Build local unit tests (Android Developers)](https://developer.android.com/training/testing/local-tests)
- [mockito-kotlin](https://github.com/mockito/mockito-kotlin)
