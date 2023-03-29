---
tags: ['c', 'go']
title:  How to Call C and C++ Code from Go (Golang)
description: Go, also known as Golang, is a powerful and efficient programming language designed for concurrent systems
pubDate: Fri, 17 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.png"
---

# How to Call C and C++ Code from Go (Golang)

Go, also known as Golang, is a powerful and efficient programming language designed for concurrent systems. However, there might be situations where you need to leverage existing C or C++ libraries, or you want to optimize a critical section of your code using C/C++ for better performance. In this article, we will discuss two common methods for calling C and C++ code from Go: using CGO and SWIG.

## Method 1: Using CGO

CGO is a foreign function interface for Go that allows you to call C code directly from your Go program. CGO provides a way to write C functions that are callable from Go code and vice versa. To use CGO, you need to follow these steps:

### 1. Include C code in your Go files

To include C code in your Go file, you need to use the `import "C"` statement at the beginning of your Go file. Then, you can add your C code within a `import "C"` comment block:

```go
package main

// #include <stdio.h>
// #include <stdlib.h>
// void myCFunction() {
//   printf("Hello from C code!\n");
// }
import "C"

func main() {
    C.myCFunction()
}
```

### 2. Build and run your Go program with CGO

To build and run your program with CGO, you need to set the `CGO_ENABLED` environment variable to `1` and use the `go build` command with the `-x` flag:

```sh
$ export CGO_ENABLED=1
$ go build -x main.go
$ ./main
```

You should see the "Hello from C code!" message printed on your console.

## Method 2: Using SWIG

SWIG (Simplified Wrapper and Interface Generator) is a powerful tool for creating wrappers around C and C++ code to make it accessible from multiple programming languages, including Go. To use SWIG with Go, you need to follow these steps:

### 1. Install SWIG

First, you need to install SWIG. You can download it from the official website (http://www.swig.org/) or use a package manager like `apt-get` or `brew`:

```sh
$ sudo apt-get install swig    # For Ubuntu/Debian systems
$ brew install swig             # For macOS systems
```

### 2. Write your C/C++ code and create an interface file

Let's say you have a simple C++ class `Math` that you want to use in your Go program:

```cpp
// math.h
class Math {
public:
    int add(int a, int b);
};

// math.cpp
#include "math.h"

int Math::add(int a, int b) {
    return a + b;
}
```

To use this class in Go, you need to create an interface file (`.i`) for SWIG:

```swig
// math.i
%module math

%{
#include "math.h"
%}

%include "math.h"
```

### 3. Generate Go bindings using SWIG

Now, you can generate Go bindings for your C++ code using the following command:

```sh
$ swig -c++ -go -intgosize 64 -gccgo math.i
```

This will generate two files: `math.go` and `math_wrap.cxx`. The `math.go` file contains the Go bindings for your C++ code, and `math_wrap.cxx` is the wrapper code that SWIG generates to bridge the gap between Go and C++.

### 4. Compile your C++ code and the SWIG-generated wrapper code

Next, compile your C++ code and the SWIG-generated wrapper code into a shared library:

```sh
$ g++ -c -fpic math.cpp math_wrap.cxx -I/usr/local/go/include
$ g++ -shared math.o math_wrap.o -o libmath.so
```

### 5. Use the generated bindings in your Go program

Now you can use the generated Go bindings in your Go program:

```go
package main

// #cgo CXXFLAGS: -std=c++11
// #cgo LDFLAGS: -L. -lmath
// #include "math_wrap.h"
import "C"
import "fmt"

func main() {
    m := C.NewMath()
    defer C.DeleteMath(m)

    result := C.Math_add(m, 3, 4)
    fmt.Printf("3 + 4 = %d\n", int(result))
}
```

### 6. Build and run the Go program

Finally, build and run your Go program using the following commands:

```sh
$ export CGO_ENABLED=1
$ export LD_LIBRARY_PATH=.
$ go build main.go
$ ./main
```

You will see the following output:

```sh
3 + 4 = 7
```