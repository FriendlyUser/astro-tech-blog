---
title: "ButterKnife on Android: binding views and click listeners, and migrating to View Binding"
pubDate: "2025-04-22T01:23:58.000Z"
lastUpdated: 2026-11-14
description: "How ButterKnife's @BindView and @OnClick annotations work, the setup gotchas on current Android Gradle Plugin versions, and the View Binding code that replaces them."
tags: ["android", "butterknife", "view binding", "java"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2617761522.png
---

:::caution[ButterKnife is deprecated]
ButterKnife's README says the tool is deprecated and asks users to switch to [View Binding](https://developer.android.com/topic/libraries/view-binding). Existing versions still work, but only critical fixes for Android Gradle Plugin integration are considered. Use View Binding for new code. The last section of this post shows the equivalent code.
:::

ButterKnife is an annotation processor by Jake Wharton that generates the `findViewById` and `setOnClickListener` calls for you. You annotate fields and methods with view IDs, call `ButterKnife.bind()`, and the generated `*_ViewBinding` class wires everything up. You'll still find it in a lot of older Java codebases, so it helps to know how it works and how to move off it.

## Setup

The last release is 10.2.3. It requires Java 8 and AndroidX.

```groovy
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'com.jakewharton:butterknife:10.2.3'
    annotationProcessor 'com.jakewharton:butterknife-compiler:10.2.3'
}
```

In Kotlin modules, use `kapt` instead of `annotationProcessor`.

**AGP 8 gotcha:** since Android Gradle Plugin 8.0, `android.nonFinalResIds` defaults to `true`, so `R.id` fields are no longer compile-time constants. Annotation arguments must be constants, so `@BindView(R.id.textView)` stops compiling. To keep ButterKnife building, add this to `gradle.properties`:

```properties
android.nonFinalResIds=false
```

This is a sign of how far ButterKnife has drifted from the current toolchain, and a good reason to migrate.

In library modules, R fields have never been final. There you have to apply ButterKnife's Gradle plugin and use the generated `R2` class (`@BindView(R2.id.textView)`) instead of `R`.

## Binding views and click listeners in an Activity

```java
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

public class MainActivity extends AppCompatActivity {

    @BindView(R.id.textView)
    TextView textView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        ButterKnife.bind(this);
    }

    @OnClick(R.id.button)
    void onButtonClick() {
        textView.setText("Button clicked!");
    }
}
```

Bound fields and `@OnClick` methods can't be `private`, because the generated `MainActivity_ViewBinding` class in the same package assigns and calls them directly. `ButterKnife.bind(this)` must come after `setContentView`.

## Unbinding in a Fragment

A fragment's view can be destroyed while the fragment instance lives on (for example on the back stack). Holding on to view references after `onDestroyView` leaks the old view hierarchy, so keep the `Unbinder` that `bind` returns and call it:

```java
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.fragment.app.Fragment;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.Unbinder;

public class MyFragment extends Fragment {

    @BindView(R.id.textView)
    TextView textView;

    private Unbinder unbinder;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_my, container, false);
        unbinder = ButterKnife.bind(this, view);
        return view;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        unbinder.unbind();
    }
}
```

## What ButterKnife does and doesn't check

- **Types are checked at runtime, not compile time.** The generated code casts the found view to the field's type. If the layout has a `Button` where the field says `TextView`, the cast fails when `bind()` runs and ButterKnife throws an `IllegalStateException` naming the field.
- **Missing views fail at runtime too.** If the ID isn't in the inflated layout (say it only exists in the landscape variant), `bind()` throws unless the field is annotated `@Nullable`.
- **There is a small runtime cost.** The binding code is generated at compile time, but `ButterKnife.bind()` uses reflection to find the generated class (cached after the first lookup), and the generated code still calls `findViewById`.

View Binding fixes the first two: the generated binding class has a field of the correct type for each view, and views that only exist in some layout configurations are marked `@Nullable`.

## The View Binding equivalent

Enable View Binding in the module's `build.gradle`. No extra dependency is needed:

```groovy
android {
    buildFeatures {
        viewBinding true
    }
}
```

In `build.gradle.kts` the line is `viewBinding = true`.

Each layout file gets a generated class named after it: `activity_main.xml` becomes `ActivityMainBinding`, with one field per view that has an ID (IDs are converted to camelCase).

The Activity above becomes:

```java
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.example.app.databinding.ActivityMainBinding;

public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.button.setOnClickListener(v -> binding.textView.setText("Button clicked!"));
    }
}
```

The `databinding` package is your app's namespace plus `.databinding`; replace `com.example.app` with your own.

The Fragment version replaces the `Unbinder` with nulling out the binding:

```java
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.fragment.app.Fragment;

import com.example.app.databinding.FragmentMyBinding;

public class MyFragment extends Fragment {

    private FragmentMyBinding binding;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        binding = FragmentMyBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
```

## Migrating

You can migrate one screen at a time, because ButterKnife and View Binding can live in the same module:

1. Turn on `viewBinding` in the module.
2. For each Activity or Fragment, replace `setContentView(R.layout.x)` or `inflater.inflate(...)` with the binding's `inflate`.
3. Replace each `@BindView` field with `binding.<id>` at its use sites, and each `@OnClick` method with a `setOnClickListener` call.
4. Remove `ButterKnife.bind` and the `Unbinder`.
5. When nothing references `butterknife` any more, drop the dependencies and the `android.nonFinalResIds=false` override.

## Further reading

- [View Binding guide](https://developer.android.com/topic/libraries/view-binding)
- [Migrate from Kotlin synthetics to View Binding](https://developer.android.com/topic/libraries/view-binding/migration) (same approach applies to ButterKnife)
- [ButterKnife on GitHub](https://github.com/JakeWharton/butterknife)
