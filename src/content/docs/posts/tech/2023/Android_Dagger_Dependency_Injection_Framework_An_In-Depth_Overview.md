---
title: "Dagger 2 on Android: components, modules, scopes and a working setup"
pubDate: "2024-07-15T03:43:38.000Z"
lastUpdated: 2026-11-14
description: "How Dagger's components, modules, @Inject constructors and scopes fit together, with a working Java example for an Android app and when to use Hilt instead."
tags: ["android", "java", "dagger"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/4067359065.png
---

:::note[Use Hilt for new Android apps]
Dagger's docs recommend [Hilt](https://dagger.dev/hilt/) for Android apps. Hilt is built on Dagger and generates the components for Activities, Fragments and ViewModels for you. The older `dagger.android` artifacts are in maintenance mode and get no new features. Plain Dagger, as shown below, is still what Hilt runs on, so the concepts carry over.
:::

Dagger is a compile-time dependency injection framework for Java, Kotlin and Android, maintained by Google. You describe how objects are built using annotations, and Dagger's annotation processor generates plain Java code that constructs them. There's no reflection at runtime, and a missing or duplicate binding is a build error rather than a crash.

## The pieces

- **`@Inject` constructor**: the simplest way to tell Dagger how to build a class you own. Dagger calls the constructor and supplies its parameters.
- **`@Module` with `@Provides` (or `@Binds`)**: for types you can't annotate, such as interfaces or classes from third-party libraries.
- **`@Component`**: an interface that ties modules together and exposes the objects (or `inject` methods) the rest of your app needs. Dagger generates an implementation called `Dagger<ComponentName>`.
- **Scopes**: unscoped bindings produce a new instance on every request. Annotating a binding and its component with the same scope (for example `@Singleton`) makes Dagger reuse one instance for the life of that component. Out of the box you get `javax.inject.Singleton` and Dagger's `@Reusable`. Scopes like `@ActivityScoped` and `@FragmentScoped` come from Hilt; with plain Dagger you define your own with `@Scope`.

## Setup

Dagger 2.60.1 is the current release. In a Java module use `annotationProcessor`. In a Kotlin module use KSP (stable since Dagger 2.60), or `kapt` on older setups.

```groovy
dependencies {
    implementation 'com.google.dagger:dagger:2.60.1'
    annotationProcessor 'com.google.dagger:dagger-compiler:2.60.1'
    // Kotlin modules: ksp 'com.google.dagger:dagger-compiler:2.60.1'
}
```

You don't need `dagger-android` or `dagger-android-support` for anything in this post.

## A working example

A repository that depends on an HTTP client. We own `UserRepository`, so it gets an `@Inject` constructor. `OkHttpClient` is a library class, so a module provides it.

```java
import javax.inject.Inject;
import javax.inject.Singleton;
import okhttp3.OkHttpClient;

@Singleton
public class UserRepository {
    private final OkHttpClient client;

    @Inject
    public UserRepository(OkHttpClient client) {
        this.client = client;
    }
}
```

```java
import dagger.Module;
import dagger.Provides;
import javax.inject.Singleton;
import okhttp3.OkHttpClient;

@Module
public final class NetworkModule {
    @Provides
    @Singleton
    static OkHttpClient provideOkHttpClient() {
        return new OkHttpClient.Builder().build();
    }
}
```

The component declares which modules it uses and what it can inject. Because it contains `@Singleton` bindings, the component must carry the same scope.

```java
import dagger.Component;
import javax.inject.Singleton;

@Singleton
@Component(modules = NetworkModule.class)
public interface AppComponent {
    void inject(MainActivity activity);
}
```

Build the project once so Dagger generates `DaggerAppComponent`. Create it in your `Application` so there is one instance for the whole process:

```java
import android.app.Application;

public class MyApplication extends Application {
    private AppComponent appComponent;

    @Override
    public void onCreate() {
        super.onCreate();
        appComponent = DaggerAppComponent.create();
    }

    public AppComponent getAppComponent() {
        return appComponent;
    }
}
```

Register `MyApplication` with `android:name=".MyApplication"` on the `<application>` element in the manifest. Android creates Activities itself, so you can't constructor-inject them. Use field injection instead, before `super.onCreate()`:

```java
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import javax.inject.Inject;

public class MainActivity extends AppCompatActivity {
    @Inject UserRepository userRepository;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ((MyApplication) getApplication()).getAppComponent().inject(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
    }
}
```

`DaggerAppComponent.create()` is available because none of the modules need constructor arguments. If a module needs state (for example a `Context`), use a `@Component.Factory` with a `@BindsInstance` parameter instead.

## Gotchas

- **Scope mismatch is a build error.** A `@Singleton` binding used by a component that isn't annotated `@Singleton` won't compile. Add the scope to the component, or remove it from the binding.
- **`@Singleton` means one per component instance,** not one per process. If you create two `AppComponent`s you get two "singletons". Keep the component in `Application`.
- **Inject fields must not be `private`.** Dagger's generated code assigns them directly.
- **Interfaces need `@Binds`.** If `UserRepository` were an interface, add an abstract module method `@Binds abstract UserRepository bind(UserRepositoryImpl impl);`.

## The same thing in Hilt

With Hilt, the `AppComponent`, the `inject` method and the cast to `MyApplication` go away. You annotate the `Application` with `@HiltAndroidApp`, the Activity with `@AndroidEntryPoint`, and install the module into `SingletonComponent`:

```java
import dagger.Module;
import dagger.Provides;
import dagger.hilt.InstallIn;
import dagger.hilt.components.SingletonComponent;
import javax.inject.Singleton;
import okhttp3.OkHttpClient;

@Module
@InstallIn(SingletonComponent.class)
public final class NetworkModule {
    @Provides
    @Singleton
    static OkHttpClient provideOkHttpClient() {
        return new OkHttpClient.Builder().build();
    }
}
```

Hilt also needs its Gradle plugin and `hilt-android` / `hilt-compiler` dependencies; see the [Hilt setup guide](https://developer.android.com/training/dependency-injection/hilt-android).

## Further reading

- [Dagger user guide](https://dagger.dev/dev-guide/)
- [Dependency injection on Android](https://developer.android.com/training/dependency-injection)
- [Dagger KSP support](https://dagger.dev/dev-guide/ksp.html)
