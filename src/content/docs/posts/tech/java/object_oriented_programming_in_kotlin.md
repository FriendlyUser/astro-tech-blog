---
tags: ['kotlin']
title: Object-Oriented Programming in Kotlin
description: Explain classes, objects, companion objects, properties, and fields in Kotlin
pubDate: Fri, 14 December 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3431403716.png
---


Classes and objects are fundamental concepts in object-oriented programming (OOP) and are essential in Kotlin as well.

In Kotlin, a class is a blueprint for creating objects, which are instances of that class. A class can contain properties (variables) and methods (functions) that define the behavior and data of the objects created from it.

Here is an example of a simple class definition in Kotlin:


```kotlin
class Person(val name: String, var age: Int) {
 fun speak() {
 println("$name is speaking")
 }
}
```
In this example, we define a `Person` class that has two properties: `name`, which is a `String`, and `age`, which is an `Int`. We also define a `speak` method that simply prints a message to the console.

To create an object of this class, we can use the `Person` constructor like this:


```kotlin
java`val person = Person("Alice", 30)
```
In this case, we create a new `Person` object with the name `"Alice"` and age `30`.

We can access the properties of the `Person` object using the dot notation like this:


```kotlin
println(person.name) // prints "Alice"
println(person.age) // prints 30
```
We can also call the `speak` method on the `Person` object:


```kotlin
person.speak() // prints "Alice is speaking"
```
Kotlin also provides the concept of companion objects, which are objects that are tied to a class rather than an instance of the class. Companion objects can be used to define static methods or properties, which are associated with the class rather than an instance of the class.

Here is an example of a companion object:


```kotlin
class MyClass {
 companion object {
 fun sayHello() {
 println("Hello from companion object!")
 }
 }
}
```
In this example, we define a companion object for the `MyClass` class, which contains a `sayHello` method. We can call this method using the class name like this:


```kotlin
MyClass.sayHello() // prints "Hello from companion object!"
```
Note that we do not need to create an instance of the `MyClass` class to call the `sayHello` method.


In Kotlin, properties and fields are closely related concepts.

A property is a member variable of a class that can be accessed using the dot notation like this:


```kotlin
class Person(val name: String, var age: Int)
val person = Person("Alice", 30)
println(person.name) // prints "Alice"
```
In this example, `name` is a property of the `Person` class, and we can access it using the `.` operator on a `Person` object.

A field, on the other hand, is the storage location for a property. When we define a property, Kotlin automatically generates a field to hold its value. We can access the field directly using the backing field syntax, which is `field`.

Here is an example of a property with a custom getter and setter that uses the backing field:


```kotlin
class Counter {
 var count = 0
 get() = field
 set(value) {
 if (value >= 0) field = value
 }
}
```
In this example, we define a `Counter` class with a `count` property. We also define a custom getter and setter for the `count` property. The getter simply returns the value of the backing field using the `field` keyword. The setter checks whether the new value is greater than or equal to zero, and sets the backing field to the new value using the `field` keyword.

We can create a `Counter` object and set its `count` property like this:


```kotlin
val counter = Counter()
counter.count = 10
```
In this case, the setter checks that the new value of `count` is greater than or equal to zero and sets the backing field to `10`.

It is important to note that properties in Kotlin are not the same as fields in Java. In Java, properties and fields are distinct concepts, and fields are typically accessed directly using the dot notation. In Kotlin, however, properties and fields are tightly integrated, and Kotlin automatically generates the fields for properties.


In Kotlin, methods are functions defined within a class, and constructors are special methods used to create new objects of a class.

Here is an example of a class with a constructor and a method:


```kotlin
class Person(val name: String, var age: Int) {
 fun greet() {
 println("Hello, my name is $name and I am $age years old.")
 }
}
```
In this example, we define a `Person` class with a constructor that takes two parameters, `name` and `age`. The constructor initializes the `name` and `age` properties of the class.

We also define a `greet` method that prints a greeting message with the person's name and age.

We can create a new `Person` object and call the `greet` method like this:


```kotlin
val person = Person("Alice", 30)
person.greet() // prints "Hello, my name is Alice and I am 30 years old."
```
In this case, we create a new `Person` object with the name "Alice" and age 30 using the constructor, and then we call the `greet` method on the object.

Constructors in Kotlin can be defined in two ways: primary constructors and secondary constructors. The primary constructor is defined in the class header and initializes the class properties. Secondary constructors are defined using the `constructor` keyword and can be used to provide additional ways to create objects of the class.

Here is an example of a class with a primary constructor and a secondary constructor:


```kotlin
class Person(val name: String, var age: Int) {
 constructor(name: String) : this(name, 0)
 fun greet() {
 println("Hello, my name is $name and I am $age years old.")
 }
}
```
In this example, we define a `Person` class with a primary constructor that takes two parameters, `name` and `age`. We also define a secondary constructor that takes only a `name` parameter and sets the `age` property to 0. The `greet` method is the same as in the previous example.

We can create a new `Person` object using the primary constructor like before:


```kotlin
val person1 = Person("Alice", 30)
person1.greet() // prints "Hello, my name is Alice and I am 30 years old."
```
We can also create a new `Person` object using the secondary constructor like this:


```kotlin
val person2 = Person("Bob")
person2.greet() // prints "Hello, my name is Bob and I am 0 years old."
```
In this case, the `age` property is initialized to 0 because we used the secondary constructor that sets the `age` property to 0.


Inheritance is a mechanism in object-oriented programming that allows one class to inherit properties and methods from another class. In Kotlin, inheritance is achieved using the `:` symbol followed by the name of the parent class. Here is an example:


```kotlin
open class Animal(val name: String) {
 fun speak() {
 println("$name makes a sound.")
 }
}

class Cat(name: String) : Animal(name) {
 override fun speak() {
 println("$name meows.")
 }
}

class Dog(name: String) : Animal(name) {
 override fun speak() {
 println("$name barks.")
 }
}
```
In this example, we define an `Animal` class with a `name` property and a `speak` method that prints a generic message.

We also define two subclasses, `Cat` and `Dog`, that inherit from the `Animal` class. The subclasses override the `speak` method with their own implementation.

We can create `Cat` and `Dog` objects and call their `speak` methods like this:


```kotlin
val cat = Cat("Whiskers")
cat.speak() // prints "Whiskers meows."

val dog = Dog("Fido")
dog.speak() // prints "Fido barks."
```
In this case, when we call the `speak` method on the `Cat` and `Dog` objects, their respective overridden implementations are called.

In addition to inheriting properties and methods, subclasses can also add their own properties and methods. For example, we can add a `breed` property to the `Cat` and `Dog` classes like this:


```kotlin
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
```
In this case, the `Cat` and `Dog` classes now have an additional `breed` property that is specific to them.


Polymorphism is a fundamental concept in object-oriented programming that allows objects of different classes to be treated as if they were of the same type. In other words, polymorphism allows us to write code that can work with objects of multiple classes without knowing the specific class of each object at compile time.

In Kotlin, polymorphism is achieved through inheritance and method overriding. When a subclass inherits from a parent class, it can override the methods of the parent class with its own implementation. When an object of the subclass is created and a method is called on it, the overridden method of the subclass is called instead of the method of the parent class.

Here's an example to illustrate polymorphism in Kotlin:


```kotlin
open class Animal {
 open fun speak() {
 println("Animal makes a sound.")
 }
}

class Cat : Animal() {
 override fun speak() {
 println("Cat meows.")
 }
}

class Dog : Animal() {
 override fun speak() {
 println("Dog barks.")
 }
}
```
In this example, we define an `Animal` class with a `speak` method that prints a generic message. We also define two subclasses, `Cat` and `Dog`, that inherit from the `Animal` class and override the `speak` method with their own implementation.

Now, we can create an array of `Animal` objects that contains objects of the `Animal`, `Cat`, and `Dog` classes, and call the `speak` method on each object:


```kotlin
val animals = arrayOf(Animal(), Cat(), Dog())

for (animal in animals) {
 animal.speak()
}
```
When we run this code, we get the following output:


```kotlin
Animal makes a sound.
Cat meows.
Dog barks.
```
As you can see, the `speak` method of each object is called, but the implementation that is actually called depends on the specific type of the object at runtime.

Polymorphism is a powerful concept that allows us to write more flexible and reusable code. By designing classes and methods in a way that takes advantage of polymorphism, we can write code that can work with a variety of different objects, even ones that haven't been created yet.
