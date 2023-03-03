---
tags: ['python', 'introtopython']
title: Chapter 5 Object-oriented programming.
description: Describing how to use python for object-oriented programming.
pubDate: Fri, 14 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3563897667.png
---
Object-oriented programming (OOP) is a programming paradigm that is based on the concept of "objects", which can contain data (referred to as "attributes" or "properties") and methods (referred to as "behaviors" or "functions") that operate on that data.

The main idea behind OOP is to model real-world entities as objects in the program. For example, in a car racing game, we might create an object for each car that contains attributes such as its speed, position, and direction, as well as methods for accelerating, braking, and turning. We might also create objects for the race track, the obstacles on the track, and the other drivers in the race.

By modeling real-world entities as objects in the program, we can create a more intuitive and natural representation of the problem domain. We can also encapsulate data and behavior within objects, which helps to reduce complexity and make the code more modular and reusable.

In OOP, objects are usually defined using classes, which are templates or blueprints for creating objects of a certain type. For example, we might define a `Car` class that contains the attributes and methods for a car object. We can then create multiple car objects from this class, each with its own set of attribute values.

Here's an example of what a `Car` class might look like in Python:


```python
class Car:
 def __init__(self, speed, position):
 self.speed = speed
 self.position = position
 
 def accelerate(self, amount):
 self.speed += amount
 
 def brake(self, amount):
 self.speed -= amount
 
 def turn(self, direction):
 # logic for turning the car
 pass
```
In this example, the `Car` class defines a constructor method (`__init__`) that initializes the `speed` and `position` attributes of a car object. It also defines three methods for accelerating, braking, and turning the car.

To create a car object from this class, we would use code like this:


```python
my_car = Car(speed=0, position=0)
```
This creates a new car object with an initial speed of 0 and an initial position of 0. We can then call the methods of the car object to make it accelerate, brake, and turn.

Overall, object-oriented programming provides a powerful and flexible way to model complex systems and solve problems in a more intuitive and natural way. By representing real-world entities as objects in the program, we can create more modular, reusable, and maintainable code.


In Python, an object is an instance of a class, which is a template or blueprint that defines the data (attributes) and behavior (methods) of a certain type of object. An object can be thought of as a self-contained entity that contains both data and the operations that can be performed on that data.

Objects in Python are used to represent real-world entities by mapping their attributes and behaviors to the attributes and methods of a class. For example, a car object might have attributes such as its make, model, and color, as well as methods for accelerating, braking, and turning. Similarly, a user object in a social media application might have attributes such as their name, age, and email address, as well as methods for posting messages, commenting on posts, and following other users.

Here's an example of how we might create a `Car` object in Python:


```python
class Car:
 def __init__(self, make, model, color):
 self.make = make
 self.model = model
 self.color = color
 self.speed = 0
 
 def accelerate(self, amount):
 self.speed += amount
 
 def brake(self, amount):
 self.speed -= amount
 
 def turn(self, direction):
 # logic for turning the car
 pass

my_car = Car(make="Toyota", model="Corolla", color="red")
```
In this example, the `Car` class defines a constructor method (`__init__`) that initializes the `make`, `model`, and `color` attributes of a car object. It also defines methods for accelerating, braking, and turning the car. We then create a `Car` object called `my_car` with the `make` "Toyota", `model` "Corolla", and `color` "red".

Once we have created a `Car` object, we can access its attributes and call its methods using dot notation. For example, we can print the `make` of `my_car` by writing `print(my_car.make)`.

Overall, objects in Python provide a powerful way to represent real-world entities with their attributes and behaviors. By encapsulating data and methods within an object, we can create more modular, reusable, and maintainable code.


In Python, a class is a blueprint or template for creating objects. A class defines a set of attributes (data) and methods (behavior) that all objects created from that class will have.

To define a class in Python, we use the `class` keyword followed by the name of the class. Here's an example of a simple class definition:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print("Hello, my name is", self.name)
```
In this example, we define a `Person` class with two attributes (`name` and `age`) and one method (`say_hello`). The `__init__` method is a special method that gets called when an object is created from the class. It initializes the `name` and `age` attributes of the object.

To create an object from a class, we call the class like a function, passing in any required arguments. This creates a new instance of the class, which we can then manipulate and interact with using its attributes and methods. Here's an example of creating an object from the `Person` class and calling its `say_hello` method:


```python
person = Person(name="Alice", age=25)
person.say_hello() # prints "Hello, my name is Alice"
```
In this example, we create a new `Person` object called `person` with the `name` "Alice" and `age` 25. We then call its `say_hello` method, which prints out a message containing the object's `name` attribute.

Overall, classes in Python provide a powerful way to define the blueprint for creating objects with shared attributes and behavior. By encapsulating data and methods within a class, we can create more modular, reusable, and maintainable code.


To create a class in Python, we use the `class` keyword followed by the name of the class. Here's an example of a simple class definition:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print("Hello, my name is", self.name)
```
In this example, we define a `Person` class with two attributes (`name` and `age`) and one method (`say_hello`). The `__init__` method is a special method that gets called when an object is created from the class. It initializes the `name` and `age` attributes of the object.

The `self` parameter in the `__init__` and other method definitions refers to the object itself, and allows us to access and modify the object's attributes and call its methods.

To create an object from a class, we call the class like a function, passing in any required arguments. This creates a new instance of the class, which we can then manipulate and interact with using its attributes and methods. Here's an example of creating an object from the `Person` class and calling its `say_hello` method:


```python
person = Person(name="Alice", age=25)
person.say_hello() # prints "Hello, my name is Alice"
```
In this example, we create a new `Person` object called `person` with the `name` "Alice" and `age` 25. We then call its `say_hello` method, which prints out a message containing the object's `name` attribute.

Overall, classes in Python provide a powerful way to define the blueprint for creating objects with shared attributes and behavior. By encapsulating data and methods within a class, we can create more modular, reusable, and maintainable code.


In Python, the `self` keyword is used to refer to the current object within a class method. When a method is called on an object, the object itself is automatically passed as the first argument to the method, which is typically named `self` by convention.

Here's an example of a class method that uses `self` to access and modify the object's attributes:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print("Hello, my name is", self.name)

 def celebrate_birthday(self):
 self.age += 1
 print("Happy birthday! You are now", self.age, "years old.")
```
In this example, we define a `Person` class with an `__init__` method that initializes the object's `name` and `age` attributes, a `say_hello` method that prints a message containing the object's `name` attribute, and a `celebrate_birthday` method that increments the object's `age` attribute and prints a birthday message.

To call a method on a `Person` object and access its attributes, we create an object of the `Person` class and call its methods using the `.` operator, passing `self` implicitly:


```python
person = Person(name="Alice", age=25)
person.say_hello() # prints "Hello, my name is Alice"
person.celebrate_birthday() # prints "Happy birthday! You are now 26 years old."
```
In this example, we create a `Person` object called `person` with the `name` "Alice" and `age` 25. We then call its `say_hello` method and `celebrate_birthday` method, which access and modify the object's `name` and `age` attributes using the `self` keyword.


In Python, the `__str__` method is a special method that allows us to define a string representation of an object. When an object is printed or converted to a string using the `str` function, Python calls the object's `__str__` method to obtain a string representation of the object.

Here's an example of a class with a `__str__` method:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print("Hello, my name is", self.name)

 def celebrate_birthday(self):
 self.age += 1
 print("Happy birthday! You are now", self.age, "years old.")

 def __str__(self):
 return f"{self.name} ({self.age})"
```
In this example, we define a `Person` class with an `__init__` method, a `say_hello` method, a `celebrate_birthday` method, and a `__str__` method. The `__str__` method returns a string representation of the `Person` object in the format "name (age)".

To print a `Person` object using its `__str__` method, we can simply use the `print` function or convert the object to a string using the `str` function:


```python
person = Person(name="Alice", age=25)
print(person) # prints "Alice (25)"
print(str(person)) # converts the object to a string and prints "Alice (25)"
```
In this example, we create a `Person` object called `person` with the `name` "Alice" and `age` 25. We then print the `person` object using the `print` function and the `str` function, which call the `person` object's `__str__` method to obtain a string representation of the object.


In Python, we create objects from classes by instantiating them. When we instantiate an object, we create a new instance of the class with its own set of attributes and methods.

To instantiate an object from a class in Python, we call the class's constructor method, which is called `__init__`. The `__init__` method is a special method that is called when a new instance of the class is created, and it is used to set the initial state of the object by assigning values to its attributes.

Here's an example of a class with an `__init__` method:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print("Hello, my name is", self.name)

 def celebrate_birthday(self):
 self.age += 1
 print("Happy birthday! You are now", self.age, "years old.")
```
In this example, we define a `Person` class with an `__init__` method, a `say_hello` method, and a `celebrate_birthday` method. The `__init__` method takes two arguments, `name` and `age`, and assigns them to the object's `name` and `age` attributes, respectively.

To instantiate a `Person` object, we simply call the `Person` constructor with the desired values for `name` and `age`:


```python
person = Person(name="Alice", age=25)
```
In this example, we create a new `Person` object called `person` with the `name` "Alice" and `age` 25. The `Person` constructor assigns these values to the `person` object's `name` and `age` attributes. We can now call the `say_hello` and `celebrate_birthday` methods on the `person` object:


```python
person.say_hello() # prints "Hello, my name is Alice"
person.celebrate_birthday() # prints "Happy birthday! You are now 26 years old."
```
In this example, we call the `say_hello` method on the `person` object, which prints "Hello, my name is Alice". We then call the `celebrate_birthday` method on the `person` object, which increments the `person` object's `age` attribute by 1 and prints "Happy birthday! You are now 26 years old."


In Python, we access the attributes and methods of an object using dot notation and parentheses, respectively.

To access an object's attribute using dot notation, we simply write the object's name followed by a dot (`.`) and the name of the attribute. For example, if we have a `Person` object with a `name` attribute, we can access the `name` attribute using dot notation as follows:


```python
person = Person(name="Alice", age=25)
print(person.name) # prints "Alice"
```
In this example, we create a `Person` object called `person` with a `name` attribute set to "Alice". We then use dot notation to access the `person` object's `name` attribute and print its value, which is "Alice".

To call an object's method using parentheses, we write the object's name followed by a dot (`.`) and the name of the method, followed by an open parenthesis (`(`) and any arguments to the method (if applicable), followed by a close parenthesis (`)`). For example, if we have a `Person` object with a `say_hello` method, we can call the `say_hello` method using parentheses as follows:


```python
person = Person(name="Alice", age=25)
person.say_hello() # prints "Hello, my name is Alice"
```
In this example, we create a `Person` object called `person` with a `say_hello` method. We then call the `person` object's `say_hello` method using parentheses, which prints "Hello, my name is Alice".


Here's an example of a `Person` class that models a real-world entity:


```python
class Person:
 def __init__(self, name, age):
 self.name = name
 self.age = age

 def say_hello(self):
 print(f"Hello, my name is {self.name} and I am {self.age} years old.")
```
In this example, we define a `Person` class with a constructor method (`__init__`) that takes `name` and `age` parameters and initializes corresponding instance variables (`self.name` and `self.age`). The `say_hello` method prints a greeting that includes the person's name and age.

To create an instance of the `Person` class and call its `say_hello` method, we could do the following:


```python
person = Person(name="Alice", age=25)
person.say_hello() # prints "Hello, my name is Alice and I am 25 years old."
```
In this example, we create a `Person` object called `person` with a `name` attribute set to "Alice" and an `age` attribute set to 25. We then call the `person` object's `say_hello` method, which prints "Hello, my name is Alice and I am 25 years old."


