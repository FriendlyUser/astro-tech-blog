---
title: "Sharing business logic between Android and iOS with Kotlin Multiplatform"
description: "Set up a Kotlin Multiplatform shared module with commonMain, androidMain and iosMain, expect/actual, Ktor and kotlinx.serialization, and call it from Swift."
tags: ["Kotlin", "Kotlin Multiplatform", "Android", "iOS", "Ktor", "Swift"]
pubDate: "2026-12-03T16:00:00.000Z"
imgSrc: "/imgs/2026/kotlin_multiplatform_shared_logic.webp"
imgAlt: "A commonMain box branching into androidMain and iosMain source sets, which feed an Android app and an iOS framework"
---

Kotlin Multiplatform (KMP) lets you write code once in Kotlin and compile it for several platforms: to JVM bytecode for Android, and to a native framework that Swift can call for iOS. Unlike cross-platform UI toolkits, it doesn't require sharing the UI. A common setup keeps each app's UI native (Jetpack Compose on Android, SwiftUI on iOS) and shares the layer underneath: API clients, data models, validation and business rules.

This post builds a small shared module that fetches data with Ktor, parses it with kotlinx.serialization, uses `expect`/`actual` for a platform detail, and is called from both apps. It was written against Kotlin 2.2.20, Ktor 3.3, kotlinx.serialization 1.9, kotlinx.coroutines 1.10 and Android Gradle Plugin 8.11. The Swift side assumes Xcode 16 or later, with Swift concurrency.

## Project layout

The KMP wizard (kmp.jetbrains.com, or the Kotlin Multiplatform plugin in Android Studio and IntelliJ IDEA) generates a project like this:

```text
.
├── androidApp/            Android app (Compose), depends on :shared
├── iosApp/                Xcode project (SwiftUI), links the Shared framework
├── shared/
│   ├── build.gradle.kts
│   └── src/
│       ├── commonMain/kotlin/    code for every platform
│       ├── commonTest/kotlin/    tests that run on every platform
│       ├── androidMain/kotlin/   Android-only code (can use Android APIs)
│       └── iosMain/kotlin/       iOS-only code (can use Apple frameworks)
└── gradle/libs.versions.toml
```

`commonMain` can only use Kotlin's standard library and other multiplatform libraries. It can't import `java.*`, `android.*` or `platform.UIKit.*`. The platform source sets can use their platform's APIs, and they can see everything in `commonMain`.

## The shared module's build file

The version catalog, `gradle/libs.versions.toml`:

```toml
[versions]
kotlin = "2.2.20"
agp = "8.11.1"
ktor = "3.3.0"
coroutines = "1.10.2"

[libraries]
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-content-negotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinx-json = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-darwin = { module = "io.ktor:ktor-client-darwin", version.ref = "ktor" }
ktor-client-mock = { module = "io.ktor:ktor-client-mock", version.ref = "ktor" }
kotlinx-coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "coroutines" }
kotlinx-coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "coroutines" }

[plugins]
kotlinMultiplatform = { id = "org.jetbrains.kotlin.multiplatform", version.ref = "kotlin" }
kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
androidLibrary = { id = "com.android.library", version.ref = "agp" }
```

And `shared/build.gradle.kts`:

```kotlin
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.androidLibrary)
}

kotlin {
    androidTarget {
        compilerOptions {
            jvmTarget.set(JvmTarget.JVM_17)
        }
    }

    // Device and Apple-silicon simulator. Add iosX64() for an Intel Mac simulator.
    listOf(iosArm64(), iosSimulatorArm64()).forEach { target ->
        target.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }

    sourceSets {
        commonMain.dependencies {
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.content.negotiation)
            implementation(libs.ktor.serialization.kotlinx.json)
            implementation(libs.kotlinx.coroutines.core)
        }
        androidMain.dependencies {
            implementation(libs.ktor.client.okhttp)
        }
        iosMain.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
            implementation(libs.ktor.client.mock)
            implementation(libs.kotlinx.coroutines.test)
        }
    }
}

android {
    namespace = "com.example.shared"
    compileSdk = 35
    defaultConfig {
        minSdk = 24
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
```

The interesting part is the dependencies. `commonMain` gets Ktor's core client and its JSON support. Each platform adds an *engine*: OkHttp on Android, Darwin (built on `NSURLSession`) on iOS. Shared code never names an engine, and Ktor uses whichever one is on the platform's classpath.

:::note
This uses the `com.android.library` plugin with `androidTarget()`, the setup that pairs with AGP 8. With AGP 9, the recommended setup for a KMP library module is the `com.android.kotlin.multiplatform.library` plugin, which configures the Android target with its own DSL. The source sets and shared code below are the same either way; check the [KMP documentation](https://kotlinlang.org/docs/multiplatform.html) for the current build setup.
:::

## Shared code: models and an API client

Everything in this section lives in `shared/src/commonMain/kotlin/`. The example fetches a GitHub user's public repositories and returns the five with the most stars.

The model is a normal `@Serializable` data class. The serialization compiler plugin generates the parser at compile time, so it works the same on Android and iOS, with no reflection:

```kotlin
package com.example.shared

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Repo(
    val id: Long,
    @SerialName("full_name") val fullName: String,
    @SerialName("stargazers_count") val stars: Int,
    val description: String? = null,
)
```

The HTTP client and the API wrapper:

```kotlin
package com.example.shared

import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.call.body
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.UserAgent
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

fun createHttpClient(engine: HttpClientEngine? = null): HttpClient {
    val config: HttpClientConfig<*>.() -> Unit = {
        expectSuccess = true // throw on non-2xx responses
        install(UserAgent) { agent = "kmp-sample/${platformName()}" }
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }
    return if (engine != null) HttpClient(engine, config) else HttpClient(config)
}

class GitHubApi(private val client: HttpClient) {
    suspend fun topRepos(owner: String): List<Repo> =
        client.get("https://api.github.com/users/$owner/repos") {
            parameter("sort", "updated")
            parameter("per_page", 50)
        }.body<List<Repo>>()
            .sortedByDescending { it.stars }
            .take(5)
}
```

`ignoreUnknownKeys = true` matters: the GitHub response has dozens of fields, and without it parsing fails on the first one that `Repo` doesn't declare. `expectSuccess = true` makes Ktor throw for 4xx and 5xx responses instead of trying to parse an error body as a list. The engine parameter exists for tests; the apps call `createHttpClient()` with no arguments.

Finally, the class the apps will use:

```kotlin
package com.example.shared

class RepoRepository(private val api: GitHubApi) {
    constructor() : this(GitHubApi(createHttpClient()))

    @Throws(Exception::class)
    suspend fun topRepos(owner: String): List<Repo> = api.topRepos(owner)
}
```

The no-argument secondary constructor and the `@Throws` annotation are both there for Swift, as explained below.

## expect and actual

When shared code needs something only the platform can provide, declare it with `expect` in `commonMain` and implement it with `actual` in each platform source set. The compiler checks that every target has an implementation.

```kotlin
// commonMain/kotlin/com/example/shared/Platform.kt
package com.example.shared

expect fun platformName(): String
```

```kotlin
// androidMain/kotlin/com/example/shared/Platform.android.kt
package com.example.shared

import android.os.Build

actual fun platformName(): String = "Android ${Build.VERSION.SDK_INT}"
```

```kotlin
// iosMain/kotlin/com/example/shared/Platform.ios.kt
package com.example.shared

import platform.UIKit.UIDevice

actual fun platformName(): String =
    UIDevice.currentDevice.systemName() + " " + UIDevice.currentDevice.systemVersion
```

Use `expect`/`actual` sparingly. Functions and properties are fine. In Kotlin 2.2, `expect`/`actual` *classes* are in Beta and produce a compiler warning unless you opt in. For anything bigger than a function, I'd declare an ordinary interface in `commonMain`, implement it in each app or platform source set, and pass the implementation in through a constructor. That is easier to fake in tests too.

## Testing shared code

Tests in `commonTest` run on every target: on the JVM for Android, and on the iOS simulator. Ktor's `MockEngine` replaces the network:

```kotlin
package com.example.shared

import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals

class GitHubApiTest {
    @Test
    fun returnsReposSortedByStars() = runTest {
        val engine = MockEngine { request ->
            assertEquals("/users/octocat/repos", request.url.encodedPath)
            respond(
                content = """
                    [
                      {"id": 1, "full_name": "octocat/small", "stargazers_count": 3, "fork": false},
                      {"id": 2, "full_name": "octocat/big", "stargazers_count": 300, "description": "popular"}
                    ]
                """.trimIndent(),
                status = HttpStatusCode.OK,
                headers = headersOf(HttpHeaders.ContentType, "application/json"),
            )
        }
        val api = GitHubApi(createHttpClient(engine))

        val repos = api.topRepos("octocat")

        assertEquals(listOf("octocat/big", "octocat/small"), repos.map { it.fullName })
        assertEquals("popular", repos.first().description)
    }
}
```

`./gradlew :shared:allTests` runs the tests for every target the current machine supports. The iOS simulator tests need a Mac with Xcode.

## Using it from Android

The Android app depends on the module like any other Gradle module (`implementation(project(":shared"))`) and sees ordinary Kotlin classes, so a ViewModel can call it directly:

```kotlin
class ReposViewModel(
    private val repository: RepoRepository = RepoRepository(),
) : ViewModel() {
    private val _repos = MutableStateFlow<List<Repo>>(emptyList())
    val repos: StateFlow<List<Repo>> = _repos.asStateFlow()

    fun load(owner: String) {
        viewModelScope.launch {
            _repos.value = runCatching { repository.topRepos(owner) }.getOrDefault(emptyList())
        }
    }
}
```

(In real code, model the error case in the UI state rather than turning it into an empty list.)

## Calling it from Swift

On iOS the module is compiled into a framework called `Shared`. The wizard's Xcode project has a build phase that runs `./gradlew :shared:embedAndSignAppleFrameworkForXcode`, which builds the framework for whichever device or simulator Xcode is targeting.

Kotlin's Objective-C export decides what Swift sees, and a few rules shape the Kotlin API:

- **Suspend functions become `async` functions in Swift** (they are exported with a completion handler, and Swift imports those as `async`).
- **Exceptions need `@Throws`.** Without it, an exception thrown from a suspend function crashes the app, except for `CancellationException`. With `@Throws(Exception::class)` it arrives in Swift as an `Error`, so the Swift call is `try await`.
- **Default arguments aren't visible from Swift,** which is why `RepoRepository` has an explicit no-argument constructor.
- **Types are mapped.** Kotlin `List<Repo>` becomes `[Repo]`, `String` becomes `String`, and `Int` becomes `Int32`.

A SwiftUI view model using the shared repository:

```swift
import SwiftUI
import Shared

@MainActor
final class ReposModel: ObservableObject {
    @Published var repos: [Repo] = []
    @Published var errorMessage: String?

    private let repository = RepoRepository()

    func load(owner: String) async {
        do {
            repos = try await repository.topRepos(owner: owner)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct ReposView: View {
    @StateObject private var model = ReposModel()

    var body: some View {
        List(model.repos, id: \.id) { repo in
            VStack(alignment: .leading) {
                Text(repo.fullName).font(.headline)
                Text("\(repo.stars) stars").font(.caption)
            }
        }
        .task { await model.load(owner: "octocat") }
    }
}
```

`Flow` doesn't map to anything natural in Swift through the Objective-C export. If your shared code exposes flows, look at [SKIE](https://skie.touchlab.co/) or [KMP-NativeCoroutines](https://github.com/rickclephas/KMP-NativeCoroutines), which generate Swift-friendly wrappers (`AsyncSequence` and similar). Or expose suspend functions and callbacks at the boundary and keep flows inside the shared module.

## What to share, and what not to

Good candidates for `commonMain`:

- API clients, request and response models, and their parsing.
- Validation rules and business logic that must agree on both platforms (pricing, eligibility, formatting of domain values).
- Caching and offline storage, using multiplatform libraries such as SQLDelight, or Room, which has supported KMP since version 2.7.
- The tests for all of the above, written once.

Things I'd keep platform-specific:

- **UI**, unless you've chosen Compose Multiplatform deliberately. Shared business logic with native UI is the lowest-risk way to adopt KMP.
- **Platform integrations**: permissions, push notifications, background work, widgets, in-app purchases. Their lifecycles differ too much between platforms for a shared abstraction to save work.
- **Security-sensitive storage.** Use the Android Keystore and the iOS Keychain directly, or a library that wraps them, rather than writing your own `expect`/`actual` layer.
- **Code that only one app needs.** Sharing has a cost (a slower iOS build, an API constrained by Objective-C export), so share code because both apps need it, not because it can be shared.

## Gotchas

- **Kotlin/Native builds are slow** compared to JVM builds. Keep the shared module small and focused, and build iOS frameworks only for the architectures you need during development.
- **Exceptions without `@Throws` crash iOS.** Put `@Throws` on every suspend function Swift calls, or catch everything at the boundary and return a result type.
- **Swift sees Objective-C names.** Overloaded functions, generic types and sealed classes lose some of their shape in the export. Design the boundary API for Swift callers, with simple concrete types.
- **One framework per app.** If an iOS app links two separately built KMP frameworks, each carries its own copy of the Kotlin runtime and the types can't be shared between them. Combine shared code into one umbrella module that produces a single framework.

## Further reading

- [Kotlin Multiplatform documentation](https://kotlinlang.org/docs/multiplatform.html)
- [Expected and actual declarations](https://kotlinlang.org/docs/multiplatform-expect-actual.html)
- [Interoperability with Swift/Objective-C](https://kotlinlang.org/docs/native-objc-interop.html)
- [Ktor client: engines](https://ktor.io/docs/client-engines.html)
- [kotlinx.serialization guide](https://github.com/Kotlin/kotlinx.serialization/blob/master/docs/serialization-guide.md)
