---
title: "Adding help output and remote includes to a Go Makefile with mmake"
pubDate: "2023-05-26T15:32:48.993Z"
lastUpdated: 2026-11-14
description: "How to use mmake, a wrapper around make, to turn Makefile comments into a help command and share targets across Go projects with remote includes."
tags: ["go", "mmake"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1115596181.webp
---

:::caution
mmake has seen little activity since its last release (v1.4.0, October 2019). It still works as a thin wrapper around GNU Make, but don't expect new features or quick fixes.
:::

[mmake](https://github.com/tj/mmake) ("Modern Make") by TJ Holowaychuk is a small program that wraps `make`. It adds two things Make lacks, a `help` command built from comments in your Makefile and includes that point at URLs, and passes everything else straight through to `make`. You keep writing an ordinary Makefile; there is no separate YAML or JSON task format.

## Install

From source (needs Go):

```bash
go install github.com/tj/mmake/cmd/mmake@latest
```

Or with Homebrew:

```bash
brew tap tj/mmake https://github.com/tj/mmake.git
brew install tj/mmake/mmake
```

The README suggests aliasing it so you keep typing `make`:

```bash
alias make=mmake
```

The examples below call `mmake` explicitly.

## A Go project with a commented Makefile

Start with a module and a `main.go`:

```bash
mkdir my-go-project
cd my-go-project
go mod init example.com/my-go-project
```

```go
// main.go
package main

import "fmt"

func main() {
	fmt.Println("Hello, mmake!")
}
```

Now a `Makefile`. The comment directly above each target becomes its help text; the first sentence is the short description. Recipe lines must be indented with a tab.

```makefile
# Build the binary.
build:
	go build -o bin/my-go-project .
.PHONY: build

# Run the program.
#
# Builds first if needed.
run: build
	./bin/my-go-project
.PHONY: run

# Run the tests.
#- Lines starting with "#-" are left out of the help output.
test:
	go test ./...
.PHONY: test
```

## Using the help command

List every documented target:

```bash
mmake help
```

```text
  build   Build the binary.
  run     Run the program.
  test    Run the tests.
```

Filter with a glob pattern, or show the full comments with `-v`:

```bash
mmake help r*
mmake help -v run
```

Any other target goes to `make` unchanged, so `mmake build`, `mmake run` and `mmake test` behave exactly like `make build`, `make run` and `make test`. The `test` target prints `[no test files]` until you add a `_test.go` file.

## Remote includes

The other feature is `include` lines that point at a URL or a GitHub path:

```makefile
include github.com/apex/make/golang
include https://github.com/apex/make/test/make.mk
```

mmake downloads these into `/usr/local/include`, the directory GNU Make searches for includes by default, so the Makefile still works with plain `make` once the files are there. Includes are resolved recursively, and if a repository has an `index.mk` you can include the repository path on its own. Downloads are cached; run `mmake update` to fetch fresh copies.

Two things to watch:

- A remote include is code that runs on your machine. The README's advice is to fork any Makefile repository you include, so you control what changes.
- Writing to `/usr/local/include` often needs elevated permissions, and teammates who use plain `make` without having run mmake once won't have the included files.

## Further reading

- [mmake README](https://github.com/tj/mmake)
- [GNU Make manual](https://www.gnu.org/software/make/manual/make.html)
