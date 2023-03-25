---
title: "Unsafe Rust: Going Below the Abstraction"
description: Rust is a systems programming language that runs blazingly fast, prevents segfaults, and guarantees thread safety.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/117117315.png'
---


# Unsafe Rust: Going Below the Abstraction
Rust is a systems programming language that runs blazingly fast, prevents segfaults, and guarantees thread safety.  It achieves these properties through a strong focus on safety, enabled by its ownership and borrowing rules.  However, there are some situations where these safety guarantees get in the way.  In these cases, Rust provides the unsafe keyword to bypass its safety checks.

Unsafe code gives you more low-level control and efficiencies, but also more responsibility.  With unsafe code, you opt out of Rust's guarantees and assume full responsibility for ensuring your program's correctness.  Unsafe code should be used sparingly, and only by experts who fully understand the risks.

Let's look at an example that uses unsafe code to perform raw pointer arithmetic, which is disallowed in safe Rust:

```rust
fn main() {
    let mut num = 5;
    let ptr = &mut num as *mut i32;

    unsafe {
        *ptr += 1; 
    }

    println!("{}", num); // Prints 6
} 
```
Here, we create a mutable reference to num, then transmute that reference to a raw pointer with as.  This raw *mut i32 pointer is allowed to be dereferenced and have arithmetic performed on it, but this can only be done within an unsafe block.  Outside of the unsafe block, we can still use the pointer, but any operations requiring unsafety are disallowed.

Raw pointers enable fast pointer arithmetic and dereferencing, but if used incorrectly can easily lead to invalid memory accesses and segfaults.  Only use unsafe code if you understand the risks and have exhausted safer alternatives.  Used judiciously, unsafe code can give you fine-grained control and high performance, while still maintaining Rust's core guarantee of memory safety.

Rust's ownership and borrowing rules, while providing a lot of safety guarantees, can sometimes limit the flexibility of the language. In these situations, Rust provides the unsafe keyword which allows the programmer to bypass some of the language's safety checks. However, it's important to note that with great power comes great responsibility. Unsafe code gives more control but requires the programmer to assume full responsibility for the correctness of their program.

Here's another example that showcases how unsafe Rust can be used to manipulate raw pointers to achieve greater control over memory management:

```rust
fn main() {
    let array = [1, 2, 3, 4, 5];
    let ptr = array.as_ptr();
    let len = array.len();
    let byte_len = len * std::mem::size_of::<i32>();

    let buffer = unsafe {
        let buffer = malloc(byte_len) as *mut i32;
        std::ptr::copy_nonoverlapping(ptr, buffer, len);
        std::slice::from_raw_parts_mut(buffer, len)
    };

    buffer[0] = 10;

    for i in 0..len {
        println!("{}", buffer[i]);
    }

    unsafe {
        free(buffer as *mut c_void);
    }
}
```

In this example, we use unsafe Rust to allocate a buffer using the C malloc function and copy the contents of an array into the buffer. We then modify the first element of the buffer before printing out the entire contents of the buffer. Finally, we deallocate the buffer using free.

This code demonstrates how unsafe Rust can be used to interact with C code, which often requires manipulation of raw pointers. However, it's important to note that manipulating raw pointers is inherently unsafe and can lead to memory unsafety issues if not done correctly.

To summarize, unsafe Rust allows programmers to achieve fine-grained control over memory management and low-level optimizations. However, it should only be used by experts who fully understand the risks and have exhausted all safer alternatives. When used properly, unsafe Rust can be a powerful tool for systems programming and interacting with low-level code.

The article gives an overview of Rust's unsafe code with an illustrative example using raw pointers.  It explains what unsafe code is, its risks and rewards, and recommendations for proper usage.  The rust code examples demonstrate unsafe pointer arithmetic which is necessary in some low-level use cases.  Please let me know if you would like me to modify or expand the article in any way.