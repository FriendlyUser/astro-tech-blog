---
title: "Espresso UI tests on Android: setup, matchers, idling resources and intents"
pubDate: "2024-09-23T18:33:29.000Z"
lastUpdated: 2026-11-14
description: "How to set up Espresso with AndroidX Test, write a UI test with ActivityScenarioRule, handle background work with idling resources, and verify intents."
tags: ["android", "testing", "java", "espresso"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3558128873.png
---

Espresso is Google's framework for UI tests that run on an Android device or emulator, inside your app's process. A test finds a view, does something to it, and checks the result. Espresso waits for the main thread to go idle between steps, so you don't sprinkle `Thread.sleep()` through your tests. It ships as part of [AndroidX Test](https://developer.android.com/training/testing/espresso), which replaced the old Android Testing Support Library.

## Setup

In the app module's `build.gradle`, set the instrumentation runner and add the test dependencies (versions current as of this update):

```groovy
android {
    defaultConfig {
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    testOptions {
        animationsDisabled = true
    }
}

dependencies {
    androidTestImplementation 'androidx.test.ext:junit:1.3.0'
    androidTestImplementation 'androidx.test:runner:1.7.0'
    androidTestImplementation 'androidx.test.espresso:espresso-core:3.7.0'
    androidTestImplementation 'androidx.test.espresso:espresso-intents:3.7.0'
}
```

`animationsDisabled` turns off system animations when tests run from Gradle. Espresso does not wait for animations, so leaving them on is a common source of flaky tests. If you run tests from a device directly, turn off the three animation scales in Developer options.

Tests go in `src/androidTest/java/`.

## Matchers, actions and assertions

Every Espresso statement has the same shape:

```java
onView(ViewMatcher)        // find exactly one view
    .perform(ViewAction)   // optional: click, type, scroll...
    .check(ViewAssertion); // optional: assert on its state
```

- `ViewMatchers` (`withId`, `withText`, `isDisplayed`, ...) are Hamcrest matchers. If more than one view matches, Espresso throws `AmbiguousViewMatcherException`, so combine them with `allOf(...)` when needed.
- `ViewActions` (`click()`, `typeText()`, `replaceText()`, `closeSoftKeyboard()`, `scrollTo()`) interact with the view.
- `ViewAssertions` (`matches(...)`, `doesNotExist()`) check the result.

## A complete test

This test types a name, taps a button and checks the greeting. It assumes `MainActivity` has an `EditText` (`name_input`), a `Button` (`greet_button`) and a `TextView` (`result_text`).

```java
import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.closeSoftKeyboard;
import static androidx.test.espresso.action.ViewActions.typeText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public class GreetingTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityRule =
            new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void typingNameAndTappingGreet_showsGreeting() {
        onView(withId(R.id.name_input)).perform(typeText("Ada"), closeSoftKeyboard());
        onView(withId(R.id.greet_button)).perform(click());
        onView(withId(R.id.result_text)).check(matches(withText("Hello, Ada!")));
    }
}
```

`ActivityScenarioRule` launches the Activity before each test and closes it afterwards, so each test starts from a fresh screen. Run it with **Run** in Android Studio or `./gradlew connectedAndroidTest`.

## Background work: idling resources

Espresso's automatic synchronisation only covers the main thread's message queue (and the legacy `AsyncTask` executor). It knows nothing about your coroutines, RxJava schedulers, OkHttp calls or custom thread pools. If a test checks the screen before a network response arrives, it fails intermittently.

An `IdlingResource` tells Espresso when your app is busy. The simplest is `CountingIdlingResource` from the `androidx.test.espresso:espresso-idling-resource:3.7.0` artifact (add it as a regular `implementation` dependency, since app code calls it):

```java
import androidx.test.espresso.idling.CountingIdlingResource;

public final class NetworkIdling {
    public static final CountingIdlingResource RESOURCE =
            new CountingIdlingResource("network");
}

// In app code, around the async call:
NetworkIdling.RESOURCE.increment();
api.loadUser(id, result -> {
    showUser(result);
    NetworkIdling.RESOURCE.decrement();
});
```

Register it in the test:

```java
import androidx.test.espresso.IdlingRegistry;
import org.junit.After;
import org.junit.Before;

@Before
public void registerIdling() {
    IdlingRegistry.getInstance().register(NetworkIdling.RESOURCE);
}

@After
public void unregisterIdling() {
    IdlingRegistry.getInstance().unregister(NetworkIdling.RESOURCE);
}
```

Espresso now waits until the counter is back to zero before each action and assertion. Make sure every `increment()` has a matching `decrement()`, including on error paths, or the test hangs until it times out.

## Custom matchers

When the built-in matchers aren't enough, write a Hamcrest `TypeSafeMatcher`. This one matches a view whose background is a solid colour:

```java
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.view.View;
import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeMatcher;

public static Matcher<View> withBackgroundColor(final int color) {
    return new TypeSafeMatcher<View>() {
        @Override
        protected boolean matchesSafely(View view) {
            Drawable background = view.getBackground();
            return background instanceof ColorDrawable
                    && ((ColorDrawable) background).getColor() == color;
        }

        @Override
        public void describeTo(Description description) {
            description.appendText("with background color: " + Integer.toHexString(color));
        }
    };
}
```

```java
onView(withId(R.id.status_banner)).check(matches(withBackgroundColor(Color.RED)));
```

The `color` argument is an ARGB int, not a resource ID. For a colour resource, resolve it first with `ContextCompat.getColor(context, R.color.error)`. Backgrounds defined as shape drawables or Material backgrounds are not `ColorDrawable`s, so this matcher won't match them.

## Verifying intents

`espresso-intents` records the intents your app sends so you can assert on them, and can stub responses so the test never leaves your app:

```java
import static androidx.test.espresso.intent.Intents.intended;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasComponent;

import androidx.test.espresso.intent.Intents;

@Before
public void setUpIntents() {
    Intents.init();
}

@After
public void tearDownIntents() {
    Intents.release();
}

@Test
public void tappingDetails_opensDetailActivity() {
    onView(withId(R.id.details_button)).perform(click());
    intended(hasComponent(DetailActivity.class.getName()));
}
```

Use `intending(...).respondWith(...)` to stub an intent, for example to fake the result of a camera or contacts picker.

## Gotchas

- Parameterised tests come from JUnit 4 (`@RunWith(Parameterized.class)`), not Espresso. They work with Espresso but replace the `AndroidJUnit4` runner on that class.
- Espresso can only touch your app's process. To tap system dialogs, notifications or another app, use [UI Automator](https://developer.android.com/training/testing/other-components/ui-automator).
- For Jetpack Compose UI, use the Compose testing APIs (`createComposeRule`, `onNodeWithText`) instead of `onView`.

## Further reading

- [Espresso basics](https://developer.android.com/training/testing/espresso/basics)
- [Espresso idling resources](https://developer.android.com/training/testing/espresso/idling-resource)
- [Espresso-Intents](https://developer.android.com/training/testing/espresso/intents)
