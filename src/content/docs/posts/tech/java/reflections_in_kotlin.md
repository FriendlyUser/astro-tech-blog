---
tags: ['kotlin']
title: "Reflection and annotations in Kotlin: reading properties and custom annotations"
description: How to inspect a class at runtime with Java reflection and kotlin-reflect, and how to declare, apply and read your own annotations in Kotlin.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2766162233.webp
---

Reflection lets a program inspect its own classes, properties and functions at runtime. Annotations attach metadata to declarations. Used together, they let a library read your code's structure and behave differently based on it. This is how serializers, dependency-injection frameworks and test runners work.

On the JVM, Kotlin gives you two reflection APIs: the Java one (`java.lang.reflect`), which is always available, and Kotlin's own (`kotlin.reflect`), which understands Kotlin concepts such as properties, nullability and default arguments.

## Java reflection from Kotlin

`javaClass` returns the `java.lang.Class` of any object, so the standard Java reflection API works without extra dependencies:

```kotlin
data class Person(val name: String, val age: Int)

fun main() {
    val person = Person("Alice", 29)
    for (field in person.javaClass.declaredFields) {
        field.trySetAccessible()
        println("${field.name} = ${field.get(person)}")
    }
}
```

A Kotlin `val` compiles to a private backing field plus a public getter, so the fields have to be made accessible before you read them. `trySetAccessible()` (Java 9+) does that and returns `false` instead of throwing if it isn't allowed. Note that the JVM doesn't guarantee the order of `declaredFields`.

This API sees what the compiler produced (fields, getters, synthetic methods), not the Kotlin declarations you wrote.

## Kotlin reflection

The full `kotlin.reflect` API lives in a separate library, `kotlin-reflect`, so it doesn't bloat apps that don't need it. With Gradle's Kotlin DSL, add:

```kotlin
dependencies {
    implementation(kotlin("reflect"))
}
```

Then you can work with properties directly:

```kotlin
import kotlin.reflect.full.memberProperties

data class Person(val name: String, val age: Int)

fun main() {
    val person = Person("Alice", 29)
    for (prop in Person::class.memberProperties) {
        println("${prop.name} = ${prop.get(person)}")
    }
}
```

`Person::class` is a `KClass<Person>`, and `memberProperties` returns `KProperty1<Person, *>` objects that you can call `get` on. Public properties don't need any accessibility changes. Some things work without `kotlin-reflect`, such as `Person::class.simpleName` and passing function references like `list.filter(::isValid)`. Calls into `kotlin.reflect.full` fail at runtime with `KotlinReflectionNotSupportedError` if the library is missing.

## Built-in annotations

Kotlin ships annotations such as `@Deprecated`, `@JvmName`, `@JvmStatic` and `@Suppress`. `@Deprecated` is the one you'll use most:

```kotlin
@Deprecated(
    message = "Use greet() instead",
    replaceWith = ReplaceWith("greet(name)"),
)
fun hello(name: String) {
    println("Hello, $name!")
}

fun greet(name: String) {
    println("Hi, $name!")
}

fun main() {
    hello("Alice") // compiler warning: 'hello' is deprecated
    greet("Bob")
}
```

Calling `hello` produces a compiler warning, and `ReplaceWith` lets IntelliJ rewrite the call for you. Pass `level = DeprecationLevel.ERROR` to make calls fail to compile, or `DeprecationLevel.HIDDEN` to hide the function from callers entirely.

## Custom annotations, read with reflection

This example combines both features: a `@Sensitive` annotation marks properties whose values should be masked when an object is logged.

```kotlin
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.memberProperties

@Target(AnnotationTarget.PROPERTY)
@Retention(AnnotationRetention.RUNTIME)
annotation class Sensitive

data class User(val email: String, @Sensitive val password: String)

fun describe(obj: Any): String =
    obj::class.memberProperties.joinToString(prefix = "${obj::class.simpleName}(", postfix = ")") { prop ->
        val value = if (prop.findAnnotation<Sensitive>() != null) "***" else prop.getter.call(obj)
        "${prop.name}=$value"
    }

fun main() {
    val user = User("alice@example.com", "hunter2")
    println(user)           // data class toString() prints the password
    println(describe(user)) // password is masked
}
```

Things to note:

- `@Retention(AnnotationRetention.RUNTIME)` keeps the annotation in the bytecode so reflection can see it. `RUNTIME` is Kotlin's default, but stating it makes the intent clear. `SOURCE` annotations are discarded by the compiler.
- `@Target` controls where the annotation can go. On a constructor `val` parameter, one annotation could apply to the parameter, the property, or the backing field. Restricting the target to `PROPERTY` removes the ambiguity. You can also be explicit at the use site with `@property:Sensitive`.
- `obj::class` has type `KClass<out Any>`, so `prop.get(obj)` doesn't type-check. `prop.getter.call(obj)` works around that.

## When not to use reflection

Reflection is slower than direct calls, skips compile-time checks, and can break with code shrinkers such as R8/ProGuard, which rename or strip members they think are unused. If you know the types at compile time, prefer plain code, `when` over a sealed hierarchy, or a compiler plugin or KSP processor that generates code ahead of time. kotlinx.serialization takes the compiler-plugin approach for this reason.

## Further reading

- [Kotlin docs: Reflection](https://kotlinlang.org/docs/reflection.html)
- [Kotlin docs: Annotations](https://kotlinlang.org/docs/annotations.html)
