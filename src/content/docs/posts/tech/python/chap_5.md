---
tags: ['python', 'introtopython']
title: "Chapter 5: Classes and objects in Python"
description: How to define a Python class, create objects from it, use self and __init__, access attributes and methods, and give objects a readable __str__.
pubDate: Fri, 14 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3563897667.webp
---
Object-oriented programming (OOP) groups data (attributes) and the functions that operate on it (methods) into objects. A class is the blueprint; each object created from it is an instance with its own attribute values. In a racing game, for example, a `Car` class might hold each car's speed and position and provide methods to accelerate and brake, and every car on the track would be a separate `Car` object.

## Defining a class

Use the `class` keyword, then define methods inside it with `def`:

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
        self.speed = max(0, self.speed - amount)
```

`__init__` is the initializer. Python calls it right after creating a new object, and it sets the object's starting state. Here every car starts with a `speed` of 0, while `make`, `model` and `color` come from the caller. `brake` uses `max` so the speed can't go negative.

## Creating objects

Call the class like a function, passing the arguments `__init__` expects (everything except `self`):

```python
my_car = Car(make="Toyota", model="Corolla", color="red")
other_car = Car("Honda", "Civic", "blue")

my_car.accelerate(50)
print(my_car.speed)     # 50
print(other_car.speed)  # 0
```

Each object has its own attributes, so accelerating `my_car` doesn't affect `other_car`.

## What self is

When you call `my_car.accelerate(50)`, Python turns it into `Car.accelerate(my_car, 50)`: the object is passed automatically as the first argument. By convention that parameter is named `self`. Inside a method, `self.speed` means "the `speed` attribute of this particular object".

This `Person` class reads and changes its own attributes through `self`:

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def say_hello(self):
        print(f"Hello, my name is {self.name} and I am {self.age} years old.")

    def celebrate_birthday(self):
        self.age += 1
        print(f"Happy birthday! You are now {self.age} years old.")


person = Person(name="Alice", age=25)
person.say_hello()           # Hello, my name is Alice and I am 25 years old.
person.celebrate_birthday()  # Happy birthday! You are now 26 years old.
```

If you forget `self` in a method definition, calling it on an object raises `TypeError: ... takes 0 positional arguments but 1 was given`, because Python still passes the object.

## Accessing attributes and methods

Both use dot notation. Attributes are read (or assigned) by name; methods are called with parentheses:

```python
print(person.name)  # Alice
person.name = "Alicia"
person.say_hello()  # Hello, my name is Alicia and I am 26 years old.
```

Writing `person.say_hello` without parentheses gives you the method object itself rather than calling it.

## Readable output with __str__

By default, printing an object shows something like `<__main__.Person object at 0x7f...>`. Define `__str__` to control what `print()` and `str()` return:

```python
class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def __str__(self):
        return f"{self.name} ({self.age})"


person = Person(name="Alice", age=25)
print(person)       # Alice (25)
print(str(person))  # Alice (25)
```

There is a related method, `__repr__`, meant for an unambiguous developer-facing representation. It's what you see when the object is inside a list or echoed in the REPL. If you only define `__repr__`, `print()` falls back to it.

## Further reading

- [The Python Tutorial: Classes](https://docs.python.org/3/tutorial/classes.html)
- [Data model: `__str__` and `__repr__`](https://docs.python.org/3/reference/datamodel.html#object.__str__)
