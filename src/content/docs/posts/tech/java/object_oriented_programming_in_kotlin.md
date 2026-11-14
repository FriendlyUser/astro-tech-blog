---
tags: ['kotlin']
title: "Kotlin OOP basics: classes, properties, constructors, inheritance and polymorphism"
description: Kotlin classes and objects, companion objects, properties and backing fields, primary and secondary constructors, inheritance with open, and polymorphism.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3431403716.webp
---

This post walks through the object-oriented parts of Kotlin with small examples you can paste into a `main` function or the [Kotlin Playground](https://play.kotlinlang.org/).

## Classes and objects

A class bundles data (properties) and behaviour (functions). Properties declared with `val` or `var` in the class header become part of the primary constructor:

```kotlin
class Person(val name: String, var age: Int) {
    fun speak() {
        println("$name is speaking")
    }
}

fun main() {
    val person = Person("Alice", 30)   // no `new` keyword in Kotlin
    println(person.name)   // Alice
    println(person.age)    // 30
    person.speak()         // Alice is speaking
}
```

`val` makes a read-only property; `var` makes a mutable one.

## Companion objects

Kotlin has no `static` keyword. Members that belong to the class rather than to an instance go in a `companion object`:

```kotlin
class MyClass {
    companion object {
        fun sayHello() {
            println("Hello from companion object!")
        }
    }
}

fun main() {
    MyClass.sayHello()   // no instance needed
}
```

On the JVM the companion is a real singleton object. If Java code needs to call `MyClass.sayHello()` as a true static method, annotate it with `@JvmStatic`; otherwise Java has to call `MyClass.Companion.sayHello()`.

## Properties and backing fields

A Kotlin property is a getter (plus a setter for `var`) and, when needed, a backing field that stores the value. Inside a custom accessor you refer to that storage with the `field` identifier:

```kotlin
class Counter {
    var count = 0
        set(value) {
            if (value >= 0) field = value   // ignore negative values
        }
}

fun main() {
    val counter = Counter()
    counter.count = 10
    counter.count = -5
    println(counter.count)   // 10
}
```

The compiler only generates a backing field when a property uses a default accessor or references `field`. A property computed entirely in its getter has no field at all:

```kotlin
class Rectangle(val width: Int, val height: Int) {
    val area: Int
        get() = width * height   // computed on each access, nothing stored
}
```

This is the main difference from Java, where you write a private field and a getter/setter pair yourself. In Kotlin, `person.name` always goes through the getter, so you can add validation or computation later without changing callers.

## Constructors and methods

The primary constructor lives in the class header. Secondary constructors use the `constructor` keyword and must delegate to the primary one with `this(...)`:

```kotlin
class Person(val name: String, var age: Int) {
    constructor(name: String) : this(name, 0)

    fun greet() {
        println("Hello, my name is $name and I am $age years old.")
    }
}

fun main() {
    Person("Alice", 30).greet()  // Hello, my name is Alice and I am 30 years old.
    Person("Bob").greet()        // Hello, my name is Bob and I am 0 years old.
}
```

In practice a default parameter value does the same job with less code, and is the more common choice:

```kotlin
class Person(val name: String, var age: Int = 0)
```

Use an `init { ... }` block when the primary constructor needs to run validation or setup code.

## Inheritance

Kotlin classes and their members are **final by default**. To allow subclassing you mark the class `open`, and to allow overriding you mark each member `open` too. The subclass calls the parent constructor after `:`.

```kotlin
open class Animal(val name: String) {
    open fun speak() {
        println("$name makes a sound.")
    }
}

class Cat(name: String, val breed: String) : Animal(name) {
    override fun speak() {
        println("$name meows.")
    }
}

class Dog(name: String, val breed: String) : Animal(name) {
    override fun speak() {
        println("$name barks.")
    }
}

fun main() {
    Cat("Whiskers", "Siamese").speak()  // Whiskers meows.
    Dog("Fido", "Beagle").speak()       // Fido barks.
}
```

Leave out `open` on `Animal.speak()` and the `override` lines fail to compile with an error saying the function is final and cannot be overridden. `Cat` and `Dog` also add their own `breed` property on top of what they inherit.

## Polymorphism

Because `Cat` and `Dog` are subtypes of `Animal`, you can hold them in an `Animal` variable or collection. Calling an `open` method dispatches to the runtime type's implementation:

```kotlin
open class Animal {
    open fun speak() = println("Animal makes a sound.")
}

class Cat : Animal() {
    override fun speak() = println("Cat meows.")
}

class Dog : Animal() {
    override fun speak() = println("Dog barks.")
}

fun main() {
    val animals: List<Animal> = listOf(Animal(), Cat(), Dog())
    for (animal in animals) {
        animal.speak()
    }
}
```

Output:

```text
Animal makes a sound.
Cat meows.
Dog barks.
```

The loop only knows it has `Animal`s; which `speak` runs is decided at runtime from each object's actual class.

## Further reading

- [Kotlin docs: Classes](https://kotlinlang.org/docs/classes.html)
- [Kotlin docs: Properties](https://kotlinlang.org/docs/properties.html)
- [Kotlin docs: Inheritance](https://kotlinlang.org/docs/inheritance.html)
- [Kotlin docs: Object declarations and expressions](https://kotlinlang.org/docs/object-declarations.html)
