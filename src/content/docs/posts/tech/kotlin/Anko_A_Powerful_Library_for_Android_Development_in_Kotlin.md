---
title: "Anko for Android: Kotlin layout DSL, intents and dialogs (deprecated)"
pubDate: "2023-05-03T14:16:44.888Z"
lastUpdated: 2026-11-14
description: "How JetBrains' Anko built Android layouts, intents and dialogs in Kotlin code, why it's deprecated, and the Jetpack Compose equivalent."
tags: ["kotlin", "android"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/318527103.png
---

:::caution[Anko is deprecated]
JetBrains deprecated Anko, and the [GitHub repository](https://github.com/Kotlin/anko) was archived in July 2020. Its artifacts were published to JCenter, which now redirects to Maven Central, and Maven Central doesn't host Anko. The dependencies below won't resolve in a new project. The project's [goodbye note](https://github.com/Kotlin/anko/blob/master/GOODBYE.md) recommends Jetpack Compose for layouts, Android KTX for the Commons helpers, and Room or SQLDelight for SQLite. A Compose version of the example is at the end of this post.
:::

Anko was a JetBrains library for writing Android apps in Kotlin. It had two main parts. Anko Layouts was a Kotlin DSL that built view hierarchies in code instead of XML. Anko Commons was a set of helpers for intents, dialogs, toasts and logging. It's worth knowing if you maintain an older codebase that still uses it.

## Dependencies

The last release was 0.10.8:

```groovy
dependencies {
    implementation 'org.jetbrains.anko:anko-commons:0.10.8'
    implementation 'org.jetbrains.anko:anko-sdk27:0.10.8'
    implementation 'org.jetbrains.anko:anko-appcompat-v7:0.10.8'
    implementation 'org.jetbrains.anko:anko-design:0.10.8'
}
```

`anko-commons` has the helpers and `anko-sdk27` has the layout DSL for the platform views. The `appcompat-v7` and `design` artifacts target the old Android Support Library, not AndroidX, so an AndroidX project also needs Jetifier enabled.

## Layouts in code

With Anko Layouts you subclass `AnkoComponent` and build the view tree in `createView`:

```kotlin
class MainActivityUI : AnkoComponent<MainActivity> {
    override fun createView(ui: AnkoContext<MainActivity>): View = with(ui) {
        verticalLayout {
            val name = editText {
                hint = "Enter your name"
            }
            button("Say Hello") {
                onClick { ctx.toast("Hello, ${name.text}!") }
            }
            button("Open Details Activity") {
                onClick { ctx.startActivity<DetailsActivity>("key" to "value") }
            }
            button("Show Dialog") {
                onClick {
                    alert("This is an Anko dialog", "Anko Dialog") {
                        yesButton { toast("You clicked Yes!") }
                        noButton { toast("You clicked No!") }
                    }.show()
                }
            }
        }
    }
}
```

The activity then sets the component as its content view:

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MainActivityUI().setContentView(this)
    }
}
```

Because `editText` returns the created `EditText`, you can hold a reference to it in a local `val` and use it in a click handler without calling `findViewById`. `verticalLayout`, `editText` and `button` are only available inside a layout DSL block like this one, not directly in an activity's `onCreate`.

## Commons helpers

These helpers come from Anko Commons and are used in the layout above:

- `startActivity<DetailsActivity>("key" to "value")` builds an `Intent` for `DetailsActivity`, puts each `Pair` in as an extra, and starts it.
- `alert(message, title) { yesButton { ... }; noButton { ... } }.show()` wraps `AlertDialog.Builder`.
- `toast("...")` is short for `Toast.makeText(...).show()`.

## The same screen in Jetpack Compose

Compose replaces both the XML layouts and the Anko DSL:

```kotlin
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            var name by remember { mutableStateOf("") }
            val context = LocalContext.current
            Column {
                TextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = { Text("Enter your name") },
                )
                Button(onClick = {
                    Toast.makeText(context, "Hello, $name!", Toast.LENGTH_SHORT).show()
                }) {
                    Text("Say Hello")
                }
            }
        }
    }
}
```

For dialogs, use Compose's `AlertDialog`. For starting activities, use a plain `Intent` or `context.startActivity(Intent(context, DetailsActivity::class.java))`. Android KTX's `bundleOf("key" to "value")` replaces Anko's pair-based extras.

## Further reading

- [Anko's goodbye note](https://github.com/Kotlin/anko/blob/master/GOODBYE.md)
- [Jetpack Compose documentation](https://developer.android.com/develop/ui/compose)
- [Android KTX](https://developer.android.com/kotlin/ktx)
