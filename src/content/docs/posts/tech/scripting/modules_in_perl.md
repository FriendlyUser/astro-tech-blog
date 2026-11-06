---
title: Modules in Perl
description: How to create modules in perl
alt: git commits with golang
tags: ["perl","git"]
layout: '@/templates/BasePost.astro'
pubDate: Wednesday, 23 March 2022 13:00:00 GMT
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-17 09.09.41 - rainy day with puddle containing a open book in the middle facing the sky.png'
---


In Perl, modules are packages that contain functions, variables, and other definitions that can be used in other Perl programs. Modules allow us to organize our code into reusable, self-contained units, making it easier to develop, test, and maintain our programs.

A module is typically stored in a file with the extension `.pm`. The file must have the same name as the package it contains. For example, a module called `MyModule` would be stored in a file called `MyModule.pm`.

To use a module in a Perl program, we first need to import it using the `use` keyword:


```perl
use MyModule;
```
This makes all the functions and variables defined in the `MyModule` module available in our program. We can then call these functions and use these variables just like any other functions or variables in our program.

Modules can also export specific functions or variables, which makes them available in our program without having to specify the module name:


```perl
use MyModule qw(some_function some_variable);
```
This imports only the `some_function` and `some_variable` from the `MyModule` module, making them available in our program without having to use the `MyModule` prefix.

Perl comes with a large number of built-in modules that provide a wide range of functionality, such as file I/O, regular expressions, networking, and database access. Additionally, there are thousands of third-party modules available on the Comprehensive Perl Archive Network (CPAN), which provide even more functionality.

In summary, modules are self-contained packages of code in Perl that allow us to organize our code into reusable units. Modules can be imported into other Perl programs using the `use` keyword, and they can export specific functions and variables to make them available without having to use the module prefix.


In Perl, there are many built-in modules that provide a wide range of functionality, such as file I/O, regular expressions, networking, and database access. Additionally, there are thousands of third-party modules available on the Comprehensive Perl Archive Network (CPAN), which provide even more functionality.

To use a built-in module, we can simply use the `use` keyword followed by the name of the module:


```perl
use strict;
use warnings;
use File::Path;
```
In this example, we are using three built-in modules: `strict`, `warnings`, and `File::Path`. The `strict` and `warnings` modules help us write safer and more consistent code by enforcing certain programming practices and issuing warnings for common mistakes. The `File::Path` module provides functions for creating and removing directory trees.

To use an external module from CPAN, we first need to install it on our system using a package manager, such as `cpanm` or `cpan`. Once the module is installed, we can use it in our Perl program just like any built-in module:


```perl
use DateTime;
use Text::CSV;
```
In this example, we are using two external modules: `DateTime` and `Text::CSV`. The `DateTime` module provides functions for working with dates and times, while the `Text::CSV` module provides functions for reading and writing CSV files.

When using external modules, it's important to check their documentation to learn how to use them correctly. External modules may have different function names and parameters than built-in modules, and they may require additional setup or configuration.

In summary, Perl provides many built-in modules for common tasks, as well as thousands of external modules available on CPAN. To use a module, we simply use the `use` keyword followed by the name of the module. When using external modules, we need to install them on our system first and check their documentation to learn how to use them correctly.


Creating and using custom modules is a powerful technique for organizing and reusing code in Perl. A custom module is a Perl package that contains functions, variables, and other definitions that can be used in other Perl programs.

To create a custom module, we simply create a new file with a `.pm` extension, and define our package and its contents:


```perl
# MyModule.pm
package MyModule;

sub some_function {
 # ...
}

our $some_variable = 42;

1;
```
In this example, we define a package called `MyModule` that contains a function called `some_function` and a variable called `$some_variable`.

To use our custom module in another Perl program, we simply use the `use` keyword followed by the name of our module:


```perl
use MyModule;

print MyModule::some_function(); # prints the result of some_function
print $MyModule::some_variable; # prints the value of $some_variable
```
In this example, we import our `MyModule` package and call the `some_function` function and access the `$some_variable` variable using the package name.

Alternatively, we can use the `Exporter` module to export specific functions and variables from our custom module:


```perl
# MyModule.pm
package MyModule;

use Exporter qw(import);

sub some_function {
 # ...
}

our $some_variable = 42;

our @EXPORT_OK = qw(some_function $some_variable);

1;
```
In this example, we use the `Exporter` module to export the `some_function` function and `$some_variable` variable when requested. We can then use these exported functions and variables in another Perl program without having to use the package name:


```perl
use MyModule qw(some_function $some_variable);

print some_function(); # prints the result of some_function
print $some_variable; # prints the value of $some_variable
```
In summary, creating custom modules is a powerful technique for organizing and reusing code in Perl. To create a custom module, we simply define a package and its contents in a `.pm` file. To use a custom module, we import it using the `use` keyword, and we can optionally use the `Exporter` module to export specific functions and variables.


Using modules is an essential part of modern Perl programming. Modules provide a way to reuse code, reduce complexity, and promote best practices. Here are some best practices for using modules in Perl:

1. Always use `use strict;` and `use warnings;` at the beginning of your code. These pragmas enforce good programming practices and help catch common errors.
2. Always use the most recent version of a module. When possible, use a module that is part of Perl's core distribution. If you need to use an external module, use a package manager like `cpanm` to download and install it.
3. Always check the documentation for a module before using it. Make sure you understand how to use the module and its functions correctly. Many modules have detailed examples that can help you get started quickly.
4. Avoid using too many modules in a single program. Use only the modules you need, and make sure they are being used efficiently. Loading unnecessary modules can slow down your program and waste memory.
5. Use the `Exporter` module to export only the functions and variables you need. This will make your code more readable and maintainable.
6. Always test your code thoroughly. Use Perl's built-in `Test::More` module or a testing framework like `Test::Simple` to automate your tests. This will help you catch bugs early and ensure your code is working correctly.
7. Write clear and concise code. Use meaningful variable and function names, and comment your code as necessary. This will make it easier for other developers to understand and maintain your code.

By following these best practices, you can write more efficient, reliable, and maintainable Perl code using modules.