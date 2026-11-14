---
tags: ['go']
title: Reading and writing files in Go, and handling errors
description: "Read and write files with the os package, stream large files, and handle Go errors: returning them, wrapping with %w, and checking with errors.Is."
pubDate: Fri, 21 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2898315273.webp
---
File I/O is a good place to learn Go's error handling, because nearly every file operation can fail and returns an `error` you're expected to check. This post covers reading and writing files with the `os` package, then the error-handling patterns you'll use around them.

## Reading a whole file

For small files, `os.ReadFile` reads everything into a byte slice:

```go
package main

import (
	"fmt"
	"os"
)

func main() {
	data, err := os.ReadFile("example.txt")
	if err != nil {
		fmt.Println("Error reading file:", err)
		return
	}
	fmt.Println("File contents:", string(data))
}
```

Older code uses `ioutil.ReadFile`. The `io/ioutil` package is deprecated: as of Go 1.16 the same functions live in `os` and `io`, and `ioutil.ReadFile` just calls `os.ReadFile`.

## Reading a file in chunks

For large files, open the file and read it piece by piece. `os.Open` returns an `*os.File`, and its `Read` method fills a buffer:

```go
package main

import (
	"errors"
	"fmt"
	"io"
	"os"
)

func main() {
	file, err := os.Open("example.txt")
	if err != nil {
		fmt.Println(err)
		return
	}
	defer file.Close()

	buf := make([]byte, 1024)
	for {
		n, err := file.Read(buf)
		if n > 0 {
			fmt.Print(string(buf[:n]))
		}
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			fmt.Println(err)
			return
		}
	}
}
```

The order of the checks matters. `Read` returns the number of bytes read *and* possibly an error in the same call, so use the `n` bytes first, then look at the error. `io.EOF` means the end of the file was reached, which is the normal way the loop ends.

In practice you rarely write this loop yourself. `io.Copy(os.Stdout, file)` does the same thing, and `bufio.Scanner` reads line by line:

```go
scanner := bufio.NewScanner(file)
for scanner.Scan() {
	fmt.Println(scanner.Text())
}
if err := scanner.Err(); err != nil {
	fmt.Println(err)
}
```

By default `bufio.Scanner` can't handle lines longer than 64 KiB; call `scanner.Buffer` to raise the limit if you need to.

## Writing files

`os.WriteFile` creates (or truncates) a file and writes a byte slice in one call:

```go
err := os.WriteFile("example.txt", []byte("hello world\n"), 0o644)
if err != nil {
	fmt.Println(err)
}
```

For writing in several steps, use `os.Create` and the file's `Write` or `WriteString` methods:

```go
package main

import (
	"fmt"
	"os"
)

func writeGreeting(path string) (err error) {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer func() {
		if cerr := file.Close(); cerr != nil && err == nil {
			err = cerr
		}
	}()

	_, err = file.WriteString("hello world\n")
	return err
}

func main() {
	if err := writeGreeting("example.txt"); err != nil {
		fmt.Println(err)
	}
}
```

When writing, don't throw away the error from `Close`. Some filesystems only report a failed write when the file is closed, so a plain `defer file.Close()` can hide data loss. The deferred function above returns the `Close` error if nothing else failed first. For files you only read, `defer file.Close()` is fine.

## Handling errors

`error` is a built-in interface with one method, `Error() string`. Functions that can fail return an `error` as their last result, and `nil` means success:

```go
package main

import (
	"errors"
	"fmt"
)

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, errors.New("division by zero")
	}
	return a / b, nil
}

func main() {
	result, err := divide(10, 0)
	if err != nil {
		fmt.Println("Error:", err)
		return
	}
	fmt.Println("Result:", result)
}
```

Use `fmt.Println` rather than the built-in `println` here. `println` writes to standard error and prints floats in scientific notation (`+5.000000e+000`); it's meant for debugging the runtime, not program output.

### Adding context and checking error types

When you pass an error up, add context with `fmt.Errorf` and the `%w` verb. `%w` wraps the original error so callers can still inspect it with `errors.Is` (compare against a sentinel value) or `errors.As` (extract a specific error type):

```go
package main

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
)

func loadConfig(path string) ([]byte, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("load config %q: %w", path, err)
	}
	return data, nil
}

func main() {
	_, err := loadConfig("missing.json")
	if errors.Is(err, fs.ErrNotExist) {
		fmt.Println("no config file, using defaults")
		return
	}
	if err != nil {
		fmt.Println(err)
		return
	}
}
```

The error message reads `load config "missing.json": open missing.json: ...`, and `errors.Is` still sees the underlying "file does not exist" error. Comparing with `err == fs.ErrNotExist` would be false, because the value you get back is the wrapper, not the sentinel.

### panic

Go also has `panic`, which stops normal execution and unwinds the stack. Reserve it for programmer errors and truly unrecoverable states (for example, a required template that fails to parse at startup). For anything a caller could reasonably handle, such as a missing file, return an error.

## Further reading

- [`os` package](https://pkg.go.dev/os)
- [Error handling and Go](https://go.dev/blog/error-handling-and-go)
- [Working with errors in Go 1.13](https://go.dev/blog/go1.13-errors)
