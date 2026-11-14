---
tags: ['kotlin']
title: Abstract classes vs interfaces in Kotlin
description: How abstract classes and interfaces work in Kotlin, when to use each, and how open, override and super fit together.
pubDate: Fri, 14 December 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/954954072.png
---

Kotlin gives you two ways to describe behaviour that several classes share: interfaces and abstract classes. Both can declare abstract members and both can contain implemented methods. The difference is state and inheritance: an abstract class can hold state and take constructor parameters, but a class can extend only one; an interface can't store state, but a class can implement as many as it likes.

## Interfaces

An interface declares members that implementing classes must provide. Unlike older Java interfaces, a Kotlin interface can also contain method bodies (default implementations) and properties, as long as the properties don't need a backing field.

```kotlin
interface Shape {
    val name: String            // abstract property
    fun area(): Double
    fun perimeter(): Double
    fun describe() = "$name with area ${"%.2f".format(area())}"  // default implementation
}
```

A class implements an interface with `:` (Kotlin has no `implements` keyword) and marks each implemented member with `override`:

```kotlin
import kotlin.math.PI

class Circle(val radius: Double) : Shape {
    override val name = "circle"
    override fun area() = PI * radius * radius
    override fun perimeter() = 2 * PI * radius
}
```

A class can implement several interfaces, separated by commas:

```kotlin
class Rectangle(val width: Double, val height: Double) : Shape, Comparable<Rectangle> {
    override val name = "rectangle"
    override fun area() = width * height
    override fun perimeter() = 2 * (width + height)
    override fun compareTo(other: Rectangle) = area().compareTo(other.area())
}
```

Use `Double.compareTo` here rather than `(area() - other.area()).toInt()`. Converting the difference to `Int` truncates it, so two rectangles whose areas differ by less than 1 would compare as equal.

Interfaces are how Kotlin does multiple inheritance of behaviour:

```kotlin
interface Flyable {
    fun fly()
}

interface Swimmable {
    fun swim()
}

class Duck : Flyable, Swimmable {
    override fun fly() = println("The duck is flying.")
    override fun swim() = println("The duck is swimming.")
}
```

## Abstract classes

An abstract class can't be instantiated directly; you subclass it. It can have a constructor, stored properties, abstract members (no body) and normal members.

```kotlin
abstract class Animal(val name: String) {
    abstract fun makeSound()
    open fun eat() = println("$name is eating.")
}

class Dog(name: String) : Animal(name) {
    override fun makeSound() = println("Woof!")
    override fun eat() = println("$name is eating dog food.")
}

fun main() {
    val dog: Animal = Dog("Rex")
    dog.makeSound()  // Woof!
    dog.eat()        // Rex is eating dog food.
}
```

Abstract members are implicitly open, so `Dog` must override `makeSound`. `eat` has a body, so it is only overridable because it is marked `open`; without `open` it would be final.

## open, override and super

The rules differ slightly between classes and interfaces:

- Class members are **final by default**. You need `open` (or `abstract`) on a class member before a subclass can override it. The class itself must also be `open` or `abstract` to be subclassed.
- Interface members are **open by default**, so no `open` is needed.
- A member marked `override` is itself open. Write `final override` to stop further overriding.

Call the parent implementation with `super`:

```kotlin
open class Base {
    open fun doSomething() = println("Base")
}

class Derived : Base() {
    override fun doSomething() {
        super.doSomething()   // prints "Base"
        println("Derived")
    }
}
```

If a class inherits the same member from more than one supertype, Kotlin makes you override it and pick which parent to call with `super<Type>`:

```kotlin
interface A {
    fun hello() = println("Hello from A")
}

interface B {
    fun hello() = println("Hello from B")
}

class C : A, B {
    override fun hello() {
        super<A>.hello()
        super<B>.hello()
    }
}
```

## Which one to use

- Reach for an **interface** when you're describing a capability (`Comparable`, `Flyable`) that unrelated classes might share, or when a class needs several of them.
- Reach for an **abstract class** when subclasses share state or constructor logic, and a single inheritance chain is fine.
- If the set of subclasses is fixed and you want exhaustive `when` checks, look at `sealed` classes or interfaces instead.

## Further reading

- [Kotlin docs: Interfaces](https://kotlinlang.org/docs/interfaces.html)
- [Kotlin docs: Inheritance](https://kotlinlang.org/docs/inheritance.html)
- [Kotlin docs: Sealed classes and interfaces](https://kotlinlang.org/docs/sealed-classes.html)
