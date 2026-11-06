---
title: "C and C++ Interoperability in Rust: Exploring FFI"
description: In this article, we will explore Rust's FFI and demonstrate how to call functions from C and C++ libraries in Rust, allowing you to leverage the power of these languages while enjoying the benefits of Rust.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---


# C and C++ Interoperability in Rust: Exploring FFI

Rust has gained popularity for its safety, performance, and concurrency features. However, in the real world, there are many existing C and C++ libraries that developers need to interface with. Thankfully, Rust provides an easy way to achieve interoperability between Rust and C or C++ code using its Foreign Function Interface (FFI).

In this article, we will explore Rust's FFI and demonstrate how to call functions from C and C++ libraries in Rust, allowing you to leverage the power of these languages while enjoying the benefits of Rust.

## Table of Contents

1. [Introduction to Rust's FFI](#introduction-to-rusts-ffi)
2. [Calling C Functions in Rust](#calling-c-functions-in-rust)
3. [Calling C++ Functions in Rust](#calling-c-functions-in-rust)
4. [Conclusion](#conclusion)

## Introduction to Rust's FFI

Foreign Function Interface (FFI) is a mechanism that allows code written in one language to call functions written in another language. Rust provides a simple and safe FFI, which enables developers to integrate C and C++ libraries with Rust code seamlessly.

Rust's FFI is based on the C Application Binary Interface (ABI), which means that it is compatible with C and other languages that follow the C ABI. This compatibility allows Rust to interface with a wide range of libraries and languages, including C and C++.

Here is a draft technical article on C and C++ interoperability with Rust:

C and C++ Interoperability with Rust 
Rust has excellent support for interfacing with C and C++ code through its Foreign Function Interface (FFI). The FFI allows Rust code to call into C/C++ libraries and C/C++ code to call into Rust libraries. This interoperability is important for several reasons:

1. Existing C/C++ libraries. There are countless high-quality C/C++ libraries already in existence. The Rust FFI allows you to leverage these libraries in your Rust programs. Some examples are SQLite, OpenGL, OpenCV, etc. 

2. Transitioning C/C++ codebases. If you have an existing C/C++ codebase, you can gradually introduce Rust by rewriting parts of it while still using existing C/C++ components. The Rust FFI enables this incremental transition.

3. Performance sensitive code. For the highest performance requirements, you may choose to write some components in C/C++ and interface with Rust. The ultra-low overhead of calls across the FFI boundary makes this feasible.

4. Wrapping C libraries. You can wrap a low-level C library in a safer Rust interface, providing useful abstractions and safety while still leveraging the C code under the hood. Many crates on crates.io do exactly this.

Using the FFI 
Here are the main steps to use the FFI in Rust:

1. Add extern blocks to specify C/C++ functions and types. You indicate which language the block targets with either extern "C" { } or extern "C++" { }. 

2. Use the correct calling conventions for the target language: 

- C uses the default cdecl calling convention. 
- C++ uses the C++ calling convention, which you indicate using extern "C++" 

3. Properly handle ownership and lifetimes. Rust's ownership rules do not apply across the FFI boundary. You must be explicit about how memory is handled.

4. Translate basic types between Rust and C/C++. The types int, char, float, etc. have defined sizes and alignments in C/C++ but not Rust. Use type aliases to map between them.

5. Manage error handling. C and C++ typically use error codes returned from functions, whereas Rust uses the type system. You need to properly handle and translate errors. 

6. Name mangling. C++ performs name mangling which changes the names of functions. Use extern "C++" to tell the Rust compiler to apply C++ name mangling rules.

Examples 
Here are a few examples of using the FFI:

```rust
•Calling C code from Rust: 
extern "C" { 
    fn c_add(a: i32, b: i32) -> i32; 
}

fn call_c() { 
    let sum = unsafe { c_add(5, 10) }; 
    println!("Sum in C: {}", sum); 
} 

•Calling Rust code from C++: 
extern "Rust" { 
    fn rust_add(a: i32, b: i32) -> i32; 
} 

int main() { 
    auto sum = rust_add(5, 10); 
    std::cout << "Sum from Rust: " << sum << '\n'; 
} 

•Wrapping a C library in Rust: 
extern "C" { 
    fn open(filename: *const c_char) -> i32; 
    fn read(fd: i32, buf: *mut c_char, count: isize) -> isize; 
} 

pub struct File { 
    fd: i32, 
} 

impl File { 
    pub fn open(filename: &str) -> io::Result<File> { 
        // Wrap C's open() in a safe interface 
        let fd = unsafe { open(filename.as_ptr()) }; 
        if fd < 0 { 
            return Err(io::Error::last_os_error()); 
        } 
        Ok(File { fd }) 
    }

    // Other methods... 
}
```

## Calling C Functions in Rust

To call a C function in Rust, you need to do the following:

1. Declare the C function in Rust using the `extern` keyword.
2. Link the C library to your Rust project.
3. Call the C function from Rust code.

### Example: Calling a C Function in Rust

Let's consider a simple example where we have a C function that calculates the sum of two integers:

```c
// sum.h
int sum(int a, int b);
```

```c
// sum.c
#include "sum.h"

int sum(int a, int b) {
    return a + b;
}
```

To call this function from Rust, we will perform the following steps:

1. Create a Rust project:

```
$ cargo new rust_ffi_example
$ cd rust_ffi_example
```

2. Declare the C function in Rust:

```rust
// src/lib.rs
#[no_mangle]
pub extern "C" fn sum(a: i32, b: i32) -> i32 {
    a + b
}
```

3. Build the C library and link it to the Rust project:

```
$ gcc -c sum.c -o sum.o
$ ar rcs libsum.a sum.o
$ mkdir .cargo
$ echo 'rustflags = ["-L", "path/to/libsum.a"]' > .cargo/config.toml
```

4. Call the C function from Rust code:

```rust
// src/main.rs
extern "C" {
    fn sum(a: i32, b: i32) -> i32;
}

fn main() {
    let a = 10;
    let b = 20;
    let result = unsafe { sum(a, b) };
    println!("The sum of {} and {} is {}", a, b, result);
}
```

Now, you can build and run the Rust project:

```
$ cargo build
$ cargo run
```

## Calling C++ Functions in Rust

Calling C++ functions from Rust is slightly more involved than calling C functions, mainly because of C++'s name mangling and classes. However, you can still achieve this interoperability by following these steps:

1. Create a C-compatible wrapper for the C++ functions.
2. Declare the C-compatible functions in Rust using the `extern` keyword.
3. Link the C++ library to your Rust project.
4. Call the C++ functions from Rust code using the C-compatible wrapper.

### Example: Calling a C++ Function in Rust

Let's consider a simple example where we have a C++ function that calculates the product of two integers:

```cpp
// product.h
class Product {
public:
    int multiply(int a, int b);
};
```

```cpp
// product.cpp
#include "product.h"

int Product::multiply(int a, int b) {
    return a * b;
}
```

To call this function from Rust, we will perform the following steps:

1. Create a C-compatible wrapper for the C++ function:

```cpp
// product_wrapper.h
#ifdef __cplusplus
extern "C" {
#endif

int multiply(int a, int b);

#ifdef __cplusplus
}
#endif
```

```cpp
// product_wrapper.cpp
#include "product_wrapper.h"
#include "product.h"

int multiply(int a, int b) {
    Product product;
    return product.multiply(a, b);
}
```

2. Build the C++ library and link it to our Rust project.

Assuming we have built the C++ library libproduct.a using the following command:

g++ -c product.cpp -o product.o
ar rcs libproduct.a product.o
We can link it to our Rust project by adding the following lines to our Cargo.toml file:

```rust
[dependencies]
libc = "0.2"

[build-dependencies]
gcc = "0.3"

[package]
build = "build.rs"
```

The libc crate provides Rust bindings for C standard library functions, while the gcc crate is used to compile and link our C++ code.

We also need to create a build.rs file in the root of our project with the following contents:

```rust
extern crate gcc;

fn main() {
    gcc::Build::new()
        .cpp(true)
        .file("src/product_wrapper.cpp")
        .compile("libproduct.a");
}
```

This will instruct Rust to compile our product_wrapper.cpp file and link it to our Rust project.

Finally, we can call the C++ function from Rust by using the libc crate to load the C++ library and call the multiply function:
extern crate libc;

```rust
#[link(name = "product")]
extern "C" {
    fn multiply(a: libc::c_int, b: libc::c_int) -> libc::c_int;
}

fn main() {
    let result = unsafe { multiply(3, 4) };
    println!("Result: {}", result);
}
```

This code declares the multiply function with the same signature as in the C++ code and links it to our Rust project using the #[link(name = "product")] attribute. We can then call the multiply function from Rust by using the unsafe keyword, as we are making a foreign function call.

When we run this code, we should see the following output:

Result: 12

This confirms that we have successfully called a C++ function from Rust.