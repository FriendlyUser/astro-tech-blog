---
title: "Jetpack Navigation for fragments: nav graphs, Safe Args, and deep links"
pubDate: "2024-04-12T15:48:04.000Z"
lastUpdated: 2026-11-14
description: "Set up the Jetpack Navigation component in a fragment-based Android app: a navigation graph, a NavHostFragment, type-safe arguments with Safe Args, and deep links."
tags: ["android", "kotlin"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/banana-spaceship.webp"
---

The Jetpack Navigation component (`androidx.navigation`) handles moving between screens in an Android app. You describe your screens and the paths between them in a navigation graph, and a `NavController` performs the fragment transactions, manages the back stack, wires up the Up button, and resolves deep links for you.

This post covers the XML-graph, fragment-based setup with Navigation 2.10.2. If you're building with Jetpack Compose, use `navigation-compose` with type-safe `@Serializable` routes (stable since 2.8.0), or look at [Navigation 3](https://developer.android.com/guide/navigation/navigation-3), a separate Compose-only library (`androidx.navigation3`).

## The pieces

- **Navigation graph**: an XML resource in `res/navigation/` listing destinations and the actions between them.
- **Destination**: a screen you can navigate to, usually a fragment.
- **Action**: a named, reusable path from one destination to another.
- **NavHost**: the container that swaps destinations in and out. For fragments this is a `NavHostFragment` inside a `FragmentContainerView`.
- **NavController**: the object you call `navigate()` on. Each `NavHost` has one.

## Add the dependencies

In the module's `build.gradle.kts`:

```kotlin
dependencies {
    val navVersion = "2.10.2"
    implementation("androidx.navigation:navigation-fragment:$navVersion")
    implementation("androidx.navigation:navigation-ui:$navVersion")
}
```

Older guides use `navigation-fragment-ktx` and `navigation-ui-ktx`. Those artifacts still get published, but they're empty: the Kotlin extensions (`findNavController()`, `navArgs()`, and so on) now live in the main artifacts.

## Create the graph

Create `res/navigation/nav_graph.xml` (in Android Studio: **New > Android Resource File**, resource type **Navigation**). A minimal graph with two fragments and one action:

```xml
<?xml version="1.0" encoding="utf-8"?>
<navigation xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:id="@+id/nav_graph"
    app:startDestination="@id/firstFragment">

    <fragment
        android:id="@+id/firstFragment"
        android:name="com.example.app.FirstFragment"
        tools:layout="@layout/fragment_first">
        <action
            android:id="@+id/action_firstFragment_to_secondFragment"
            app:destination="@id/secondFragment" />
    </fragment>

    <fragment
        android:id="@+id/secondFragment"
        android:name="com.example.app.SecondFragment"
        tools:layout="@layout/fragment_second" />
</navigation>
```

## Add the NavHost

Put a `FragmentContainerView` hosting a `NavHostFragment` in the activity layout:

```xml
<androidx.fragment.app.FragmentContainerView
    android:id="@+id/nav_host_fragment"
    android:name="androidx.navigation.fragment.NavHostFragment"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    app:defaultNavHost="true"
    app:navGraph="@navigation/nav_graph" />
```

`app:defaultNavHost="true"` makes this host intercept the system Back button.

## Navigate

From inside a fragment, navigate by action ID:

```kotlin
import androidx.navigation.fragment.findNavController

binding.nextButton.setOnClickListener {
    findNavController().navigate(R.id.action_firstFragment_to_secondFragment)
}
```

## Pass arguments with Safe Args

Safe Args is a Gradle plugin that generates a `Directions` class per source destination and an `Args` class per destination with arguments, so argument names and types are checked at compile time.

1. Add the plugin to the top-level `build.gradle.kts`:

   ```kotlin
   buildscript {
       repositories {
           google()
       }
       dependencies {
           classpath("androidx.navigation:navigation-safe-args-gradle-plugin:2.10.2")
       }
   }
   ```

2. Apply it in the app module. Use `androidx.navigation.safeargs.kotlin` for Kotlin-only modules and `androidx.navigation.safeargs` for Java or mixed modules:

   ```kotlin
   plugins {
       id("androidx.navigation.safeargs.kotlin")
   }
   ```

3. Declare the argument on the destination:

   ```xml
   <fragment
       android:id="@+id/secondFragment"
       android:name="com.example.app.SecondFragment"
       tools:layout="@layout/fragment_second">
       <argument
           android:name="exampleArg"
           app:argType="string" />
   </fragment>
   ```

4. Navigate with the generated `Directions` class. Because `exampleArg` has no default, it becomes a required parameter:

   ```kotlin
   val action = FirstFragmentDirections.actionFirstFragmentToSecondFragment(exampleArg = "Hello, World!")
   findNavController().navigate(action)
   ```

5. Read it in the destination with the `navArgs()` delegate:

   ```kotlin
   import androidx.navigation.fragment.navArgs

   class SecondFragment : Fragment(R.layout.fragment_second) {
       private val args: SecondFragmentArgs by navArgs()

       override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
           super.onViewCreated(view, savedInstanceState)
           val exampleArg = args.exampleArg
       }
   }
   ```

## Deep links

An *implicit* deep link lets a URI open a destination directly. Add a `<deepLink>` to the destination; placeholders in `{braces}` are matched to the destination's declared arguments:

```xml
<fragment
    android:id="@+id/secondFragment"
    android:name="com.example.app.SecondFragment"
    tools:layout="@layout/fragment_second">
    <argument
        android:name="exampleArg"
        app:argType="string" />
    <deepLink app:uri="example://second?exampleArg={exampleArg}" />
</fragment>
```

Then point the activity that hosts the graph at it in `AndroidManifest.xml`. At build time, Navigation replaces `<nav-graph>` with the matching `<intent-filter>` elements:

```xml
<activity android:name=".MainActivity" android:exported="true">
    <nav-graph android:value="@navigation/nav_graph" />
</activity>
```

Leave the activity on the default `standard` launch mode. With `singleTop`, Navigation doesn't handle the deep link automatically when the activity is reused, so you'd have to call `navController.handleDeepLink(intent)` yourself in `onNewIntent()`.

For an *explicit* deep link, for example from a notification, build a `PendingIntent` with `NavDeepLinkBuilder`:

```kotlin
val pendingIntent = NavDeepLinkBuilder(context)
    .setGraph(R.navigation.nav_graph)
    .setDestination(R.id.secondFragment)
    .setArguments(bundleOf("exampleArg" to "from-notification"))
    .createPendingIntent()
```

## Gotchas

- Calling `navigate()` twice quickly (a double tap) can throw `IllegalArgumentException` because the second call runs from a destination that no longer has that action. Debounce the click, or check `findNavController().currentDestination?.id` first.
- Safe Args only generates code for XML graphs. If you build the graph in Kotlin (the Kotlin DSL or Compose), use `@Serializable` route classes instead.
- To connect a `Toolbar`, `BottomNavigationView`, or `NavigationView` to the graph, use the helpers in `navigation-ui` (`setupWithNavController`).

## Further reading

- [Navigation overview](https://developer.android.com/guide/navigation)
- [Pass data between destinations](https://developer.android.com/guide/navigation/use-graph/pass-data)
- [Create a deep link for a destination](https://developer.android.com/guide/navigation/design/deep-link)
- [Navigation release notes](https://developer.android.com/jetpack/androidx/releases/navigation)
