---
title: How to use Rust's Foreign Function Interface
description: Rust's Foreign Function Interface (FFI) allows Rust code to interact with code written in other programming languages, such as C. In this article, we will explore Rust's FFI capabilities by building a program that interfaces with a C library using Rust's FFI. Specifically, we will use Rust to call a C library function that computes the sum of two integers.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---


Rust's Foreign Function Interface (FFI) allows Rust code to interact with code written in other programming languages, such as C. In this article, we will explore Rust's FFI capabilities by building a program that interfaces with a C library using Rust's FFI. Specifically, we will use Rust to call a C library function that computes the sum of two integers.

Let's start by creating a new Rust project using the cargo tool. Open a terminal window and run the following command:

```rust
cargo new ffi
```

This will create a new Rust project called ffi in a directory with the same name. Next, we will create a C source file called sum.c that defines a function that computes the sum of two integers. Here's what sum.c should look like:

```rust
#include <stdio.h>

int sum(int x, int y) {
    return x + y;
}
```

This code defines a simple function called sum that takes two integer arguments and returns their sum. We will use Rust to call this function using FFI.

Next, we need to create a Rust source file that will use FFI to call the sum function. Create a new file called src/main.rs and add the following code:

```rust
use std::os::raw::c_int;
use std::ffi::CString;

#[link(name = "sum")]
extern "C" {
    fn sum(x: c_int, y: c_int) -> c_int;
}

fn main() {
    let x = 1;
    let y = 2;

    let result = unsafe { sum(x, y) };

    println!("The sum of {} and {} is {}.", x, y, result);
}
```
Let's go over this code and explain how Rust's FFI capabilities work.

The use statements at the beginning of the file import the c_int type from the std::os::raw module and the CString type from the std::ffi module. The c_int type is used to represent C int types in Rust, and the CString type is used to create null-terminated C-style strings from Rust strings.

Next, we use the #[link] attribute to link to the sum C library. The name argument specifies the name of the library, which is sum in this case. The extern "C" block declares the sum function as an external C function that takes two c_int arguments and returns a c_int result.

Inside the main function, we define two variables x and y that represent the integers to be added. We then call the sum function using the unsafe keyword, which is required when calling external functions using FFI. The result of the function call is stored in the result variable.

Finally, we use the println! macro to print the result of the computation.

To compile and run the program, we need to first compile the sum.c file into a shared library that can be linked to by Rust. Open a terminal window and run the following commands:

```bash
gcc -c -fPIC sum.c
gcc -shared -o libsum.so sum.o
```

The first command compiles sum.c into an object file (sum.o) with position-independent code (-fPIC). The second command links the object file into a shared library (libsum.so) that can be used by Rust.

Next, we can build and run the Rust program using the cargo tool. Open a terminal window and run the following commands:

```rust
cargo build
cargo run
```

The output of the program should be:


```bash
The sum of 1 and 2 is 3.
```

This demonstrates how Rust can use FFI to call a C library function.

Now let's examine the code in more detail.

The #[link] attribute is used to link to a C library. In this case, we link to the sum library, which is defined in the sum.c file. The extern "C" block declares the sum function as an external C function that takes two c_int arguments and returns a c_int result. The c_int type is defined in the std::os::raw module and represents a C int type.

The main function defines two integer variables x and y. The unsafe keyword is used to call the sum function, which is an external C function. The result of the function call is stored in the result variable.

It's important to note that the unsafe keyword is used because FFI involves calling code that is outside the control of the Rust compiler. This means that the Rust compiler cannot ensure the safety of the code at compile time, so it requires the programmer to explicitly mark FFI calls as unsafe.

The CString type is used to create a null-terminated C-style string from a Rust string. This is necessary because C functions often expect null-terminated strings as arguments.

Overall, Rust's FFI capabilities provide a powerful way to interface with C and other programming languages. By using FFI, Rust programs can leverage existing C libraries and take advantage of the performance benefits of low-level languages. While FFI requires the use of unsafe code, Rust's strong type system and memory safety guarantees help to minimize the risk of bugs and security vulnerabilities.
