---
tags: ['c', 'go', 'cpp']
title: "Calling C and C++ code from Go with cgo and SWIG"
description: "Call C functions from Go with cgo, wrap C++ behind an extern \"C\" shim, and let the go tool run SWIG for you to bind a C++ class."
pubDate: Fri, 17 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.png"
---

Sometimes the library you need only exists in C or C++, or you already have a C++ codebase
and want a Go service to use it. Go gives you two routes: **cgo**, which is built into the Go
toolchain and calls C directly, and **SWIG**, which generates Go bindings for C and C++ code.
cgo only understands C, so for C++ you either put a small C interface in front of it or let
SWIG generate one.

Both need a C/C++ compiler (gcc or clang) on your `PATH`.

## cgo: calling C directly

Put C code in a comment immediately above `import "C"` (no blank line in between). That
comment is the *preamble*: cgo compiles it and makes its functions, types and macros
available as `C.name`.

```go
package main

/*
#include <stdio.h>
#include <stdlib.h>

static int add(int a, int b) {
    return a + b;
}

static void greet(const char *name) {
    printf("Hello from C, %s!\n", name);
    fflush(stdout);
}
*/
import "C"

import (
	"fmt"
	"unsafe"
)

func main() {
	sum := C.add(3, 4)
	fmt.Println("3 + 4 =", int(sum))

	name := C.CString("gopher") // allocated with malloc, so it must be freed
	defer C.free(unsafe.Pointer(name))
	C.greet(name)
}
```

Build and run it like any other Go program:

```bash
go run .
```

```text
3 + 4 = 7
Hello from C, gopher!
```

A few things to know:

- `CGO_ENABLED` defaults to `1` for native builds when a C compiler is found. Since Go 1.20 it
  defaults to `0` if no C toolchain is on the `PATH`, and you'll need to set it to `1`
  explicitly when cross-compiling with a cross C compiler.
- C types appear as `C.int`, `C.char`, `C.double` and so on. Convert explicitly
  (`int(sum)`, `C.int(x)`).
- `C.CString` copies a Go string into C memory that Go's garbage collector doesn't manage.
  Free it with `C.free`, which needs `stdlib.h` in the preamble.
- C's `stdout` is buffered separately from Go's, so output from `printf` can go missing
  when it's piped and the program exits. The `fflush` call avoids that.
- Each call across the boundary costs far more than a normal Go function call, so cgo pays
  off for chunky work (decode an image, run a query), not for calling a tiny C function in a
  tight loop.

## cgo with C++: an `extern "C"` shim

cgo can't call C++ methods or understand C++ headers, but it will compile `.cpp` files that
sit in the package directory and link them with the C++ compiler. The usual trick is to
expose the C++ code through plain C functions.

```cpp
// calc.h — a header both C and C++ can read
#ifdef __cplusplus
extern "C" {
#endif

int calc_add(int a, int b);

#ifdef __cplusplus
}
#endif
```

```cpp
// calc.cpp
#include "calc.h"

class Math {
public:
    int add(int a, int b) const { return a + b; }
};

extern "C" int calc_add(int a, int b) {
    Math m;
    return m.add(a, b);
}
```

```go
// main.go
package main

// #cgo CXXFLAGS: -std=c++17
// #include "calc.h"
import "C"

import "fmt"

func main() {
	fmt.Println("3 + 4 =", int(C.calc_add(3, 4)))
}
```

Build the package rather than a single file, so the go tool picks up `calc.cpp`:

```bash
go build .   # not "go build main.go"
```

For classes you need to keep alive between calls, the shim usually hands out an opaque
pointer (`void *calc_new()`, `void calc_free(void *)`) and the Go side wraps it in a struct.

## SWIG: generating the bindings

Writing shims by hand gets tedious for a large C++ API. [SWIG](https://www.swig.org/) reads
your headers and generates both the C wrapper and the Go code. The go tool has built-in SWIG
support: if a package directory contains a `.swigcxx` file (or `.swig` for C), `go build`
runs SWIG and compiles the result. You don't run `swig` or `g++` yourself.

Install SWIG first:

```bash
sudo apt-get install swig   # Debian/Ubuntu
brew install swig           # macOS
```

Lay out the module with the C++ code in its own package. The SWIG module name becomes the
Go package name, so avoid names like `math` that clash with the standard library.

```text
swigdemo/
├── go.mod            # module example.com/swigdemo
├── main.go
└── mathx/
    ├── mathx.h
    ├── mathx.cpp
    └── mathx.swigcxx
```

```cpp
// mathx/mathx.h
class Math {
public:
    int add(int a, int b);
};
```

```cpp
// mathx/mathx.cpp
#include "mathx.h"

int Math::add(int a, int b) {
    return a + b;
}
```

```text
// mathx/mathx.swigcxx
%module mathx

%{
#include "mathx.h"
%}

%include "mathx.h"
```

SWIG turns the class into a Go interface named `Math`, with a constructor `NewMath`, a
destructor `DeleteMath`, and methods with an upper-case first letter:

```go
// main.go
package main

import (
	"fmt"

	"example.com/swigdemo/mathx"
)

func main() {
	m := mathx.NewMath()
	defer mathx.DeleteMath(m) // C++ memory isn't garbage-collected

	fmt.Println("3 + 4 =", m.Add(3, 4))
}
```

```bash
go run .
```

```text
3 + 4 = 7
```

If you do run SWIG by hand (for example, to inspect the generated code), the command is
`swig -go -c++ mathx.swigcxx` (SWIG versions before 4.1 also require `-intgosize 64`). Don't add `-gccgo`: that flag targets the gccgo compiler, not
the standard `go` toolchain.

## Which one to use

- A few C functions: cgo with a preamble or a header is simplest.
- A small C++ surface: an `extern "C"` shim keeps you in plain cgo and keeps the boundary
  explicit.
- A large C++ API you don't want to wrap by hand: SWIG, accepting generated code you'll
  sometimes need to read when things go wrong.

In every case cgo is in play, so builds need a C toolchain, cross-compiling gets harder, and
you lose Go's fully static, single-toolchain builds. If a pure-Go library does the job, it's
usually worth that trade.

## Further reading

- [cgo command documentation](https://pkg.go.dev/cmd/cgo)
- [SWIG and Go](https://www.swig.org/Doc4.2/Go.html)
