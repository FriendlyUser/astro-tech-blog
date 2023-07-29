---
title: Getting Started with WebAssembly A Beginner's Guide
pubDate: "2024-12-16T13:33:03.000Z"
description: "In this article , we'll cover the basics of WebAssembly and walk you through the process of setting up your development environment, compiling a simple program, and running it in the browser"
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/945555918.png
---
# Getting Started with WebAssembly: A Beginner's Guide

WebAssembly, or wasm for short, is a low-level binary format that is designed to be a compilation target for high-level programming languages like C, C++, and Rust. Its primary goal is to enable web developers to run code at near-native speed in web browsers, offering a fast, compact, and secure alternative to JavaScript.

In this article, we'll cover the basics of WebAssembly and walk you through the process of setting up your development environment, compiling a simple program, and running it in the browser.

## Prerequisites

To follow this guide, you should have a basic understanding of web development concepts, such as HTML, JavaScript, and the browser's DOM. Familiarity with a programming language like C or Rust is also helpful, but not strictly necessary.

## WebAssembly Basics

Before we dive into the practical aspects of working with WebAssembly, let's briefly go over some essential concepts:

- **Binary format**: WebAssembly code is distributed in a compact binary format, which makes it fast to decode, compile, and execute. This is in contrast to JavaScript, which is a text-based format and must be parsed, compiled, and optimized before it can be executed.

- **Linear memory**: WebAssembly uses a single, resizable block of memory called linear memory, which is divided into fixed-size pages. This memory can be directly manipulated from WebAssembly code and shared between WebAssembly modules and JavaScript.

- **Imports and exports**: WebAssembly modules can import and export functions, global variables, and memory segments. This allows you to call WebAssembly functions from JavaScript and vice versa, as well as share memory between the two.

## Setting Up Your Development Environment

To get started with WebAssembly, you'll need to install some tools for compiling and running your code. In this guide, we'll be using the Emscripten toolchain, which provides a complete set of tools for building and running WebAssembly code using C and C++.

1. **Install Emscripten**: Follow the [official instructions](https://emscripten.org/docs/getting_started/downloads.html) to download and install Emscripten on your computer.

2. **Activate the Emscripten environment**: After installing Emscripten, you'll need to activate its environment in your terminal or command prompt by running:

   ````
   source <path/to/emsdk>/emsdk_env.sh
   ```

   On Windows, you would run:

   ````
   <path/to/emsdk>/emsdk_env.bat
   ```

   This sets up the necessary environment variables for using the Emscripten tools.

## Creating a Simple WebAssembly Program

Now that your development environment is set up, let's create a simple C program that we'll compile to WebAssembly:

1. **Create a new directory**: Create a new directory for your WebAssembly project, and navigate to it in your terminal or command prompt.

2. **Create a C file**: Create a new file called `hello.c` in your project directory, and add the following code:

   ````c
   #include <stdio.h>

   int main() {
     printf("Hello, WebAssembly!\n");
     return 0;
   }
   ```

   This is a simple "Hello, World!" program written in C.

3. **Compile the C file to WebAssembly**: In your terminal or command prompt, run the following command to compile the C program to WebAssembly:

   ````
   emcc hello.c -o hello.html -s WASM=1
   ```

   This command tells Emscripten to compile the `hello.c` file and generate an HTML file called `hello. that includes the necessary JavaScript code to run the WebAssembly module.

4. **Run the WebAssembly program**: Open the generated `hello. file in a web browser that supports WebAssembly (e.g., Chrome, Firefox, Safari, or Edge). You should see the message "Hello, WebAssembly!" printed in the browser's console.

## Interacting with JavaScript

WebAssembly can interact with JavaScript in various ways, such as importing and exporting functions and sharing memory. Let's modify our example to demonstrate this:

1. **Update the C file**: Modify your `hello.c` file to include a new function called `add`:

   ````c
   #include <stdio.h>

   int add(int a, int b) {
     return a + b;
   }

   int main() {
     printf("Hello, WebAssembly!\n");
     printf("2 + 3 = %d\n", add(2, 3));
     return 0;
   }
   ```

2. **Expose the `add` function**: Update the `emcc` command to export the `add` function so that it can be called from JavaScript:

   ````
   emcc hello.c -o hello.html -s WASM=1 -s EXPORTED_FUNCTIONS='["_main", "_add"]'
   ```

   This tells Emscripten to export the `_main` and `_add` functions. Note that the function names are prefixed with an underscore.

3. **Modify the HTML file**: Open the generated `hello. file in a text editor, and add the following JavaScript code at the end of the `<script>` tag:

   ````javascript
   Module.onRuntimeInitialized = function () {
     const add = Module.cwrap('add', 'number', ['number', 'number']);
     const result = add(5, 7);
     console.log('5 + 7 =', result);
   };
   ```

   This code waits for the WebAssembly module to be initialized, then uses the `cwrap` function to create a JavaScript wrapper for the exported `add` function. The `cwrap` function takes three arguments: the name of the exported function, the return type, and an array of argument types. Finally, the code calls the `add` function with the arguments `5` and `7`, and logs the result in the console.

4. **Run the updated WebAssembly program**: Refresh the `hello. file in your web browser, and you should now see both the "Hello, WebAssembly!" message and the result of the `add` function printed in the console.

## Conclusion

In this guide, we've introduced the basics of WebAssembly and shown you how to set up your development environment, compile a simple program, and interact with JavaScript. WebAssembly offers a powerful way to boost the performance of web applications and provide new capabilities that were previously unavailable to web developers.

