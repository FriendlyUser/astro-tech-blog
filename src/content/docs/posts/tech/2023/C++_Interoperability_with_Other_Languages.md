---
description: How to call C++ from C, Python and Java using extern "C" wrappers, ctypes, pybind11, JNI, JNA, SWIG and Java's Foreign Function and Memory API.
imgSrc: /imgs/2023/1098832555.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-08-14T04:21:24.000Z'
lastUpdated: 2026-11-14
tags: ["cpp", "python", "java"]
title: 'C++ interoperability with C, Python and Java: extern "C", pybind11, JNI and SWIG'
---

Almost every way of calling C++ from another language goes through one of two routes: a plain C interface that the other language already knows how to call, or a binding generator that writes the glue code for you. This post walks through both for C, Python and Java.

## C and C++

C++ grew out of C, but it is not a strict superset, and the two compilers produce different symbol names. C++ *mangles* names to encode namespaces and overloads, so a C++ compiler looking for `my_function` will not find the unmangled symbol a C compiler produced. `extern "C"` turns mangling off for the declarations inside it.

### Calling C from C++

Well-written C headers already contain the guard shown in the next section. For an old C header that doesn't, wrap the include:

```cpp
// In your C++ file
extern "C" {
#include "my_c_library.h"
}
```

### Calling C++ from C

Declare the functions with C linkage in a header that both compilers can read:

```cpp
// my_cpp_api.h
#ifdef __cplusplus
extern "C" {
#endif

int my_cpp_function(int x);

#ifdef __cplusplus
}
#endif
```

Only C-compatible types may appear in that header: no classes, references, templates, overloads or `std::string`.

### Exposing C++ objects to C

C has no classes, so the usual pattern is an *opaque pointer*: C code holds a pointer to a type it never sees the definition of, and calls functions that do the work in C++.

```cpp
// counter.h
#ifdef __cplusplus
extern "C" {
#endif

typedef struct Counter Counter;

Counter* counter_new(void);
void counter_increment(Counter* c);
int counter_value(const Counter* c);
void counter_free(Counter* c);

#ifdef __cplusplus
}
#endif
```

```cpp
// counter.cpp
#include "counter.h"

struct Counter {
    int value = 0;
};

extern "C" {

Counter* counter_new(void) { return new Counter(); }
void counter_increment(Counter* c) { ++c->value; }
int counter_value(const Counter* c) { return c->value; }
void counter_free(Counter* c) { delete c; }

}
```

Don't let C++ exceptions escape an `extern "C"` function. Catch them inside and return an error code instead.

## Python and C++

### ctypes

[`ctypes`](https://docs.python.org/3/library/ctypes.html) is in the Python standard library and loads a shared library at runtime. It can only see C-linkage symbols, so export your functions with `extern "C"`:

```cpp
// my_cpp_library.cpp
// Build on Linux: g++ -shared -fPIC -o libmy_cpp_library.so my_cpp_library.cpp
// On Windows, also add __declspec(dllexport) and build a .dll.
extern "C" int my_cpp_function(int x) {
    return x * 2;
}
```

```python
import ctypes

lib = ctypes.CDLL("./libmy_cpp_library.so")
lib.my_cpp_function.argtypes = [ctypes.c_int]
lib.my_cpp_function.restype = ctypes.c_int

print(lib.my_cpp_function(21))  # 42
```

Always set `argtypes` and `restype`. Without them, ctypes guesses: it assumes an `int` return, which silently truncates pointers and doubles.

### pybind11

[pybind11](https://pybind11.readthedocs.io/) is a header-only library that generates a real Python extension module from C++ code. It handles classes, overloads, STL containers and exceptions, so you don't need a C layer.

```cpp
// my_cpp_module.cpp
#include <pybind11/pybind11.h>

int my_cpp_function(int x) {
    return x * 2;
}

PYBIND11_MODULE(my_cpp_module, m) {
    m.def("my_cpp_function", &my_cpp_function, "Double an integer");
}
```

Install it with `pip install pybind11` and build on Linux with the command from its docs:

```bash
c++ -O3 -Wall -shared -std=c++11 -fPIC $(python3 -m pybind11 --includes) \
    my_cpp_module.cpp -o my_cpp_module$(python3 -m pybind11 --extension-suffix)
```

```python
import my_cpp_module

print(my_cpp_module.my_cpp_function(21))  # 42
```

For real projects, build with CMake or `scikit-build-core` rather than a hand-written command line.

### Boost.Python

Boost.Python predates pybind11, and pybind11's syntax was modelled on it. It still ships with Boost, but you have to build and link the Boost.Python library. New projects usually choose pybind11 or [nanobind](https://nanobind.readthedocs.io/), a leaner library from pybind11's original author.

```cpp
#include <boost/python.hpp>

int my_cpp_function(int x) {
    return x * 2;
}

BOOST_PYTHON_MODULE(my_cpp_module) {
    boost::python::def("my_cpp_function", my_cpp_function);
}
```

## Java and C++

### JNI

The Java Native Interface is the JVM's built-in mechanism. You declare a `native` method in Java:

```java
public class MyClass {
    static {
        System.loadLibrary("my_cpp_library"); // libmy_cpp_library.so / my_cpp_library.dll
    }

    public native int myCppFunction(int x);

    public static void main(String[] args) {
        System.out.println(new MyClass().myCppFunction(21)); // 42
    }
}
```

Then run `javac -h . MyClass.java` to generate `MyClass.h` (the old `javah` tool was removed in JDK 10) and implement the declared function:

```cpp
#include <jni.h>
#include "MyClass.h"

JNIEXPORT jint JNICALL Java_MyClass_myCppFunction(JNIEnv* env, jobject obj, jint x) {
    return x * 2;
}
```

The function name is `Java_<class>_<method>`. Underscores in Java names are escaped as `_1`, which is why camelCase method names are less painful here. The generated header already declares the function inside `extern "C"`.

### JNA

[JNA](https://github.com/java-native-access/jna) calls functions in a shared library from Java without writing any native glue. Like ctypes, it only sees C-linkage symbols, so use the `extern "C"` library from the ctypes example:

```java
import com.sun.jna.Library;
import com.sun.jna.Native;

public class MyClass {
    public interface MyCppLibrary extends Library {
        MyCppLibrary INSTANCE = Native.load("my_cpp_library", MyCppLibrary.class);

        int my_cpp_function(int x);
    }

    public static void main(String[] args) {
        int result = MyCppLibrary.INSTANCE.my_cpp_function(21);
        System.out.println("Result: " + result); // Result: 42
    }
}
```

JNA is easier to set up than JNI, but each call has more overhead because it is dispatched dynamically through libffi.

### Foreign Function and Memory API

Since JDK 22, Java has a standard alternative to both: the Foreign Function and Memory API in `java.lang.foreign` ([JEP 454](https://openjdk.org/jeps/454)). It calls C-linkage functions directly, without JNI glue code, and the `jextract` tool can generate the Java bindings from a C header. If you are on JDK 22 or later, try it before reaching for JNA.

### SWIG

[SWIG](https://www.swig.org/) reads C/C++ headers and generates the JNI glue and Java classes (and bindings for Python, C# and other languages) for you. It can wrap C++ classes, not just C functions.

```cpp
// my_cpp_header.h
int my_cpp_function(int x);
```

```c
// my_cpp_module.i (SWIG interface file)
%module my_cpp_module

%{
#include "my_cpp_header.h"
%}

%include "my_cpp_header.h"
```

Run `swig -c++ -java my_cpp_module.i`, compile the generated `my_cpp_module_wrap.cxx` together with your C++ code into a shared library, and call the generated class:

```java
public class MyClass {
    public static void main(String[] args) {
        System.loadLibrary("my_cpp_module");

        int result = my_cpp_module.my_cpp_function(21);
        System.out.println("Result: " + result); // Result: 42
    }
}
```

## Which one to pick

- One or two functions, and you control the C++ side: an `extern "C"` API plus ctypes (Python), JNA or the FFM API (Java).
- A C++ library with classes you want to feel native in Python: pybind11 or nanobind.
- Many target languages from one set of headers: SWIG.
- Whatever you choose, keep exceptions, ownership and threading rules explicit at the boundary. Most interop bugs come from memory freed by the wrong side or an exception crossing a C frame.
