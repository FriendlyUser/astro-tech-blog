---
description: "Set up Material Components for Android (Views) with a Material 3 theme, then use buttons, text fields, cards, app bars, navigation views, and snackbars."
imgSrc: /imgs/2023/654074938.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-29T08:24:55.000Z'
lastUpdated: 2026-11-14
tags: ["android"]
title: "Material Components for Android: themes and common widgets in XML layouts"
---

:::caution[The Views library is in maintenance mode]
Google's [README for Material Components for Android](https://github.com/material-components/material-components-android) says the Views-based library is now in maintenance mode, with no more planned feature releases, and recommends migrating to Jetpack Compose (`androidx.compose.material3`). It still works and gets fixes, so the setup below is fine for existing XML-layout apps. For a new app, start with Compose Material 3.
:::

Material Components for Android (MDC-Android, artifact `com.google.android.material:material`) is Google's implementation of Material Design for the View system: themes plus widgets such as `MaterialButton`, `TextInputLayout`, `MaterialCardView`, and `BottomNavigationView`. The examples below use version 1.14.0 and the Material 3 themes, which have been available since 1.5.0.

## Setup

Add the dependency to the module's `build.gradle.kts`, with `google()` in your repositories:

```kotlin
dependencies {
    implementation("com.google.android.material:material:1.14.0")
}
```

The library's getting-started guide calls for `compileSdk` 35 or later and `minSdk` 21 or later.

Define an app theme that extends a Material 3 theme in `res/values/themes.xml`. A `DayNight` parent gives you dark theme support, and `NoActionBar` lets you put your own toolbar in the layout:

```xml
<style name="Theme.MyApp" parent="Theme.Material3.DayNight.NoActionBar">
    <!-- Customize your theme here. -->
</style>
```

Then apply your theme (not the library's) in `AndroidManifest.xml`:

```xml
<application
    android:theme="@style/Theme.MyApp"
    ... >
```

Older apps inherit from `Theme.MaterialComponents.*` (Material 2) themes. Those are still supported; the widget styles below have `Widget.MaterialComponents.*` equivalents.

## Buttons

With a Material 3 theme, a plain `<Button>` in XML is inflated as a `MaterialButton`. The default style is a filled button; other variants are separate styles:

```xml
<!-- Filled (default) -->
<Button
    android:id="@+id/filled_button"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Filled" />

<!-- Outlined -->
<Button
    android:id="@+id/outlined_button"
    style="@style/Widget.Material3.Button.OutlinedButton"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Outlined" />

<!-- Text -->
<Button
    android:id="@+id/text_button"
    style="@style/Widget.Material3.Button.TextButton"
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="Text" />
```

`Widget.Material3.Button.TonalButton` and `Widget.Material3.Button.ElevatedButton` give you the tonal and elevated variants.

## Text fields

A `TextInputLayout` wraps a `TextInputEditText` and handles the floating label, helper and error text, and the box style. Put the hint on the layout, not the inner edit text:

```xml
<!-- Filled -->
<com.google.android.material.textfield.TextInputLayout
    android:id="@+id/filled_text_field"
    style="@style/Widget.Material3.TextInputLayout.FilledBox"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:hint="Name">

    <com.google.android.material.textfield.TextInputEditText
        android:layout_width="match_parent"
        android:layout_height="wrap_content" />
</com.google.android.material.textfield.TextInputLayout>

<!-- Outlined -->
<com.google.android.material.textfield.TextInputLayout
    android:id="@+id/outlined_text_field"
    style="@style/Widget.Material3.TextInputLayout.OutlinedBox"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:hint="Email">

    <com.google.android.material.textfield.TextInputEditText
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:inputType="textEmailAddress" />
</com.google.android.material.textfield.TextInputLayout>
```

Show a validation error from code with `textInputLayout.error = "Required"` and clear it by setting it to `null`.

## Cards

`MaterialCardView` extends AndroidX `CardView` and adds strokes, checkable state, and theming. Material 3 has elevated, filled, and outlined card styles (`Widget.Material3.CardView.Elevated`, `.Filled`, `.Outlined`):

```xml
<com.google.android.material.card.MaterialCardView
    android:id="@+id/material_card"
    style="@style/Widget.Material3.CardView.Outlined"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:cardCornerRadius="12dp">

    <!-- Card content goes here -->
</com.google.android.material.card.MaterialCardView>
```

## App bars

Use `MaterialToolbar` (the Material subclass of the AndroidX `Toolbar`) inside an `AppBarLayout`, and set it as the action bar from your activity with `setSupportActionBar(toolbar)` if you want menu callbacks:

```xml
<com.google.android.material.appbar.AppBarLayout
    android:layout_width="match_parent"
    android:layout_height="wrap_content">

    <com.google.android.material.appbar.MaterialToolbar
        android:id="@+id/toolbar"
        android:layout_width="match_parent"
        android:layout_height="?attr/actionBarSize"
        app:title="App Title" />

</com.google.android.material.appbar.AppBarLayout>
```

## Navigation

**Bottom navigation** switches between three to five top-level destinations. The items come from a menu resource:

```xml
<com.google.android.material.bottomnavigation.BottomNavigationView
    android:id="@+id/bottom_navigation"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    app:menu="@menu/bottom_navigation_menu" />
```

**Navigation drawer**: a `NavigationView` inside an AndroidX `DrawerLayout`. `layout_gravity="start"` makes it slide in from the start edge (left in left-to-right locales):

```xml
<androidx.drawerlayout.widget.DrawerLayout
    android:id="@+id/drawer_layout"
    android:layout_width="match_parent"
    android:layout_height="match_parent">

    <!-- Main content goes here -->

    <com.google.android.material.navigation.NavigationView
        android:id="@+id/navigation_view"
        android:layout_width="wrap_content"
        android:layout_height="match_parent"
        android:layout_gravity="start"
        app:menu="@menu/navigation_drawer_menu" />

</androidx.drawerlayout.widget.DrawerLayout>
```

**Tabs**: `TabLayout` with static `TabItem` children. Tabs are fixed-width by default; set `app:tabMode="scrollable"` when you have more than fit on screen. To drive tabs from a `ViewPager2`, use `TabLayoutMediator` instead of declaring `TabItem`s.

```xml
<com.google.android.material.tabs.TabLayout
    android:id="@+id/tab_layout"
    android:layout_width="match_parent"
    android:layout_height="wrap_content">

    <com.google.android.material.tabs.TabItem
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tab 1" />

    <com.google.android.material.tabs.TabItem
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Tab 2" />

</com.google.android.material.tabs.TabLayout>
```

If you use the Jetpack Navigation component, `navigation-ui` can connect a `BottomNavigationView` or `NavigationView` to your nav graph with `setupWithNavController`.

## Snackbars

A `Snackbar` shows a short message at the bottom of the screen, optionally with one action:

```kotlin
Snackbar.make(view, "Message archived", Snackbar.LENGTH_LONG)
    .setAction("Undo") { restoreMessage() }
    .show()
```

Pass a view inside a `CoordinatorLayout` if you want swipe-to-dismiss and for a `FloatingActionButton` to move out of the way.

## Theming

Material 3 themes are driven by color roles such as `colorPrimary`, `colorOnPrimary`, `colorPrimaryContainer`, `colorSecondary`, and `colorSurface`. The AppCompat-era `colorPrimaryDark` and `colorAccent` attributes aren't part of the Material 3 color roles. Override the roles in your app theme, and set a default style for a widget type through its theme attribute (`materialButtonStyle` for buttons):

```xml
<style name="Theme.MyApp" parent="Theme.Material3.DayNight.NoActionBar">
    <item name="colorPrimary">@color/brand_primary</item>
    <item name="colorOnPrimary">@color/brand_on_primary</item>
    <item name="colorSecondary">@color/brand_secondary</item>
    <item name="materialButtonStyle">@style/Widget.MyApp.Button</item>
</style>

<style name="Widget.MyApp.Button" parent="Widget.Material3.Button">
    <item name="backgroundTint">@color/button_background</item>
    <item name="android:textColor">@color/button_text</item>
</style>
```

Put dark-theme color values in `res/values-night/` so `DayNight` can switch them. Rather than picking every role by hand, you can generate a full light and dark scheme from a seed color with the [Material Theme Builder](https://material-foundation.github.io/material-theme-builder/), which exports Android XML.

## Gotchas

- Material widgets check that the app theme defines the attributes they need. Using them under a plain AppCompat theme, or a Material 3 style under a `MaterialComponents` theme, can crash at inflation or render with wrong colors. Keep the theme and widget styles on the same generation.
- The `<Button>` to `MaterialButton` swap only happens when your theme is a Material theme. With a plain AppCompat theme you get an `AppCompatButton`.

## Further reading

- [Getting started with Material Components for Android](https://github.com/material-components/material-components-android/blob/master/docs/getting-started.md)
- [Buttons documentation](https://github.com/material-components/material-components-android/blob/master/docs/components/Button.md)
- [Color theming](https://github.com/material-components/material-components-android/blob/master/docs/theming/Color.md)
- [Material 3 design guidelines](https://m3.material.io/)
