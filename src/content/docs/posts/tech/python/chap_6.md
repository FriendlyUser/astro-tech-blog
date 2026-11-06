---
tags: ['python', 'introtopython']
title: Chapter 5 Object-oriented programming.
description: Describing how to use python for object-oriented programming.
pubDate: Fri, 14 September 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2921207460.png

---
In Python, exceptions and errors are used to indicate that something unexpected or abnormal has happened during the execution of a program. Exceptions and errors can be caused by a variety of factors, such as incorrect input data, insufficient memory, or invalid syntax.

When an exception or error occurs, Python raises an exception object. This object contains information about the error, including its type, message, and traceback. The traceback provides a detailed report of the sequence of function calls that led to the exception.

Python provides a range of built-in exceptions and errors, including:

* SyntaxError: raised when there is a syntax error in the code
* NameError: raised when a variable or function name is not found
* TypeError: raised when an operation or function is applied to an object of inappropriate type
* ValueError: raised when an operation or function receives an argument of the correct type but an inappropriate value
* IndexError: raised when an index is out of range
* KeyError: raised when a dictionary key is not found
* ImportError: raised when a module cannot be imported
* IOError: raised when an input/output operation fails

By handling exceptions and errors in a program, you can make your code more robust and prevent it from crashing unexpectedly.


Python provides a way to handle exceptions using the try-except-finally block. The try block is used to enclose the code that might raise an exception. The except block is used to handle the exception if it occurs, and the finally block is used to execute code that must be run regardless of whether or not an exception occurred.

Here is the basic syntax of a try-except-finally block:


```python
try:
 # code that might raise an exception
except ExceptionType:
 # code to handle the exception
finally:
 # code that will be executed regardless of whether or not an exception occurred
```
The try block contains the code that might raise an exception. If an exception occurs, the code inside the except block is executed. The ExceptionType argument specifies the type of exception that the except block should handle. If the ExceptionType argument is omitted, the except block will handle all exceptions.

The finally block contains code that will be executed regardless of whether or not an exception occurred. This block is often used to release resources that were acquired in the try block, such as file handles or network connections.

Here is an example of using a try-except-finally block to handle a division by zero exception:


```python
try:
 x = 1 / 0
except ZeroDivisionError:
 print("Error: division by zero")
finally:
 print("This code will be executed regardless of whether or not an exception occurred.")
```
In this example, the try block attempts to divide 1 by 0, which raises a ZeroDivisionError exception. The except block catches this exception and prints an error message. The finally block prints a message indicating that it will be executed regardless of whether or not an exception occurred.

By using try-except-finally blocks, you can handle exceptions in a controlled and structured way, making your code more robust and reliable.


In addition to handling exceptions, you can also raise exceptions in Python using the raise statement or assert statement. The raise statement is used to raise a specific exception, while the assert statement is used to raise an AssertionError exception if a condition is not met.

Here's an overview of how to use these statements:

1. raise statement:

To raise an exception using the raise statement, you need to specify the type of exception to be raised and an optional error message. Here is the basic syntax of the raise statement:


```python
_raise ExceptionType("Error message")
```
Here, ExceptionType specifies the type of exception to be raised, and "Error message" is an optional error message that provides more information about the exception.

Here's an example of using the raise statement to raise a ValueError exception:


```python
age = -1
if age < 0:
 raise ValueError("Age cannot be negative")
```
In this example, if the value of the age variable is negative, a ValueError exception will be raised with the message "Age cannot be negative".

2. assert statement:

The assert statement is used to check a condition and raise an AssertionError exception if the condition is not met. The basic syntax of the assert statement is:


```python
assert condition, "Error message"
```
Here, condition is the expression that is tested, and "Error message" is an optional error message that provides more information about the assertion error.

Here's an example of using the assert statement to check that a value is positive:


```python
x = -1
assert x > 0, "Value must be positive"
```
In this example, the assert statement will raise an AssertionError with the message "Value must be positive" if the value of x is not positive.

By raising exceptions using the raise statement or assert statement, you can ensure that your code behaves correctly and reports errors in a clear and consistent way.


Python provides a range of built-in exceptions that you can use to handle errors and exceptions in your code. Here are some examples of how to use some of the most commonly used built-in exceptions:

1. ValueError:

The ValueError exception is raised when an operation or function receives an argument of the correct type but an inappropriate value. Here's an example of using the ValueError exception:


```python
x = input("Enter a number: ")
if not x.isdigit():
 raise ValueError("Input must be a number")
```
In this example, the input() function is used to read a value from the user. The isdigit() method is then used to check whether the input value is a number. If the input is not a number, a ValueError exception is raised with the message "Input must be a number".

2. IndexError:

The IndexError exception is raised when an index is out of range. Here's an example of using the IndexError exception:


```python
my_list = [1, 2, 3]
try:
 print(my_list[3])
except IndexError:
 print("Index is out of range")
```
In this example, the try-except block is used to catch an IndexError that might be raised if we try to access an index that is out of range. If an IndexError occurs, the except block will print the message "Index is out of range".

3. KeyError:

The KeyError exception is raised when a dictionary key is not found. Here's an example of using the KeyError exception:


```python
my_dict = {"name": "John", "age": 30}
try:
 print(my_dict["address"])
except KeyError:
 print("Key not found")
```
In this example, the try-except block is used to catch a KeyError that might be raised if we try to access a key that does not exist in the dictionary. If a KeyError occurs, the except block will print the message "Key not found".

By using built-in exceptions in Python, you can handle errors and exceptions in a more controlled and structured way, making your code more robust and reliable.


In Python, you can create your own custom exceptions by defining a new exception class that inherits from the built-in Exception class. Here's an example of how to create a custom exception class:


```python
class MyCustomException(Exception):
 pass
```
In this example, we define a new exception class called MyCustomException that inherits from the built-in Exception class. The pass keyword is used to indicate that we don't need to add any additional functionality to our exception class at this point.

Once you have defined your custom exception class, you can use it in your code by raising an instance of the class. Here's an example of how to raise an instance of our custom exception class:


```python
def my_function(x):
 if x < 0:
 raise MyCustomException("Input must be non-negative")
 else:
 return x ** 2

try:
 result = my_function(-1)
except MyCustomException as e:
 print(e)
```
In this example, we define a function called my\_function that raises an instance of our custom exception class if the input value is negative. We then use a try-except block to catch any instances of our custom exception class that might be raised by our function. If an instance of our custom exception class is caught, we print the exception message.

By defining your own custom exceptions, you can create more meaningful and descriptive error messages that are specific to your application or domain. This can help you to write more robust and reliable code that is easier to debug and maintain.


