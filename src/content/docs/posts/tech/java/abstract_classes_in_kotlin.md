---
tags: ['kotlin']
title: Abstract Classes in Kotlin
description: Explain Abstract Classes in Kotlin
pubDate: Fri, 14 December 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/954954072.png
---


In Kotlin, an interface is a collection of abstract methods that define a contract for a class. Any class that implements an interface is required to implement all of its methods. This allows us to define a common set of methods that can be implemented by multiple classes, even if those classes have different implementations.

To declare an interface in Kotlin, we use the `interface` keyword followed by the name of the interface and its method signatures. For example:


```kotlin
interface Shape {
 fun area(): Double
 fun perimeter(): Double
}
```
This interface defines two methods, `area` and `perimeter`, which should be implemented by any class that implements the `Shape` interface.

To implement an interface in a class, we use the `implements` keyword followed by the name of the interface. We then provide implementations of all the methods defined in the interface. For example:


```kotlin
class Circle(val radius: Double) : Shape {
 override fun area() = Math.PI * radius * radius
 override fun perimeter() = 2 * Math.PI * radius
}
```
This class implements the `Shape` interface and provides its own implementation of the `area` and `perimeter` methods.

It's also worth noting that a class can implement multiple interfaces by separating them with commas. For example:


```kotlin
class Rectangle(val width: Double, val height: Double) : Shape, Comparable<Rectangle> {
 override fun area() = width * height
 override fun perimeter() = 2 * (width + height)
 override fun compareTo(other: Rectangle) = (area() - other.area()).toInt()
}
```
This class implements both the `Shape` interface and the `Comparable` interface, which allows us to compare two `Rectangle` objects based on their area.

By using interfaces, we can write code that is more modular and flexible. By defining a common set of methods that can be implemented by multiple classes, we can write code that works with objects of different classes, as long as they implement the required interfaces. This can make our code easier to read, write, and maintain over time.


In Kotlin, an abstract class is a class that cannot be instantiated directly, but is intended to be subclassed. It may contain abstract methods, which have no implementation in the abstract class, but must be implemented by any concrete subclass. Abstract classes are useful when we want to define a common set of methods and properties that should be available to all of its subclasses.

To declare an abstract class in Kotlin, we use the `abstract` keyword followed by the class definition. For example:


```kotlin
abstract class Animal(val name: String) {
 abstract fun makeSound()
 open fun eat() { println("$name is eating.") }
}
```
This abstract class defines two methods, `makeSound` and `eat`. `makeSound` is declared abstract, which means that any subclass of `Animal` must implement this method. `eat` is marked as `open`, which means that it can be overridden by a subclass if desired.

To create a subclass of an abstract class, we use the `:` operator followed by the name of the abstract class. We then provide implementations of any abstract methods defined in the superclass, and optionally override any methods that are marked as `open`. For example:


```kotlin
class Dog(name: String) : Animal(name) {
 override fun makeSound() { println("Woof!") }
 override fun eat() { println("$name is eating dog food.") }
}
```
This class extends the `Animal` abstract class and provides its own implementation of the `makeSound` method. It also overrides the `eat` method to provide a more specific implementation for dogs.

Abstract classes are useful when we want to define a common set of methods and properties that should be available to all of its subclasses, but we don't want to instantiate the abstract class directly. Instead, we create concrete subclasses that provide specific implementations of the abstract methods. This allows us to write more modular and flexible code, as we can define a common set of methods and properties that can be used by multiple classes.


In Kotlin, a class can implement multiple interfaces, which provides a form of multiple inheritance. An interface is a collection of abstract methods and properties, without any implementation. A class can implement multiple interfaces, which means that it provides concrete implementations of all the methods and properties defined in each interface it implements.

To declare an interface in Kotlin, we use the `interface` keyword followed by the name of the interface. For example:


```kotlin
interface Flyable {
 fun fly()
}

interface Swimmable {
 fun swim()
}
```
This interface defines two methods, `fly` and `swim`, which have no implementation.

To create a class that implements these interfaces, we use the `:` operator followed by the names of the interfaces. We then provide implementations of all the methods defined in each interface. For example:


```kotlin
class Duck : Flyable, Swimmable {
 override fun fly() { println("The duck is flying.") }
 override fun swim() { println("The duck is swimming.") }
}
```
This class implements both the `Flyable` and `Swimmable` interfaces, and provides its own implementation of the `fly` and `swim` methods.

Multiple inheritance through interfaces allows us to create classes that can inherit behavior from multiple sources. This is particularly useful when we want to create a class that can perform multiple actions, or that has multiple roles to play in our code. By separating these behaviors into separate interfaces, we can compose our classes from multiple sources of behavior, without the problems of multiple inheritance of implementation that can arise with traditional inheritance.


In Kotlin, when a class implements an interface or extends a superclass, it can override the methods defined in the interface or superclass. This allows the class to provide its own implementation of the method, which can be different from the implementation in the interface or superclass.

To override a method in Kotlin, we use the `override` keyword. For example, if we have an interface with a method `doSomething`, we can override it in a class like this:


```kotlin
interface MyInterface {
 fun doSomething()
}

class MyClass : MyInterface {
 override fun doSomething() {
 // Implementation of doSomething in MyClass
 }
}
```
In this example, `MyClass` implements `MyInterface` and overrides its `doSomething` method. The implementation of `doSomething` in `MyClass` can be different from the implementation in `MyInterface`.

We can also use the `override` keyword to override a method defined in a superclass. For example, if we have a superclass with a method `doSomething`, we can override it in a subclass like this:


```kotlin
open class MySuperclass {
 open fun doSomething() {
 // Implementation of doSomething in MySuperclass
 }
}

class MyClass : MySuperclass() {
 override fun doSomething() {
 // Implementation of doSomething in MyClass
 }
}
```
In this example, `MyClass` extends `MySuperclass` and overrides its `doSomething` method. The implementation of `doSomething` in `MyClass` can be different from the implementation in `MySuperclass`.

Note that if a superclass or interface method is marked as `open`, we can override it in a subclass or implementing class. If it is not marked as `open`, we cannot override it. Additionally, if we want to call the superclass or interface method from the subclass or implementing class, we can use the `super` keyword followed by the name of the method, like this:


```kotlin
open class MySuperclass {
 open fun doSomething() {
 // Implementation of doSomething in MySuperclass
 }
}

class MyClass : MySuperclass() {
 override fun doSomething() {
 super.doSomething() // Call the implementation of doSomething in MySuperclass
 // Additional implementation of doSomething in MyClass
 }
}
```
In this example, `MyClass` calls the implementation of `doSomething` in `MySuperclass` using `super.doSomething()`. This allows us to reuse the implementation in `MySuperclass` and add additional behavior in `MyClass`.