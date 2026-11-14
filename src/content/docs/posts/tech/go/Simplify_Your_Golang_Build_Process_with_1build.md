---
title: Running Go build, test and fmt commands from one file with 1build
pubDate: "2023-05-26T15:32:48.932Z"
lastUpdated: 2026-11-14
description: "How to use 1build to keep a Go project's build, test, fmt and run commands in a single 1build.yaml and run them by name, with before/after hooks."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1091373203.webp
---

[1build](https://github.com/gopinath-langote/1build) is a small command-line tool that stores a project's commands in a `1build.yaml` file and runs them by name. Instead of remembering `go build -o bin/app .` or `go test -race ./...`, everyone on the team runs `1build build` or `1build test`. It is language-agnostic; this post uses a Go project as the example.

## Install

With Homebrew:

```sh
brew tap gopinath-langote/one-build
brew install one-build
```

Otherwise, download a binary from the [latest release](https://github.com/gopinath-langote/1build/releases/latest) and put it on your `PATH`. Check it works:

```sh
1build --version
```

## A minimal Go project

```sh
mkdir my-go-project
cd my-go-project
go mod init example.com/my-go-project
```

Add a `main.go`:

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello, 1build!")
}
```

## The 1build.yaml file

Generate a starter file with `1build init`:

```sh
1build init --name "my-go-project"
```

Then edit `1build.yaml`. Each entry under `commands` maps a name to the shell command it runs:

```yaml
project: my-go-project
commands:
  - build: go build -o my-app .
  - test: go test ./...
  - fmt: go fmt ./...
  - run: ./my-app
```

You can also add or remove commands from the CLI instead of editing the file by hand:

```sh
1build set vet "go vet ./..."
1build unset vet
```

## Running commands

Run a command by its name:

```sh
1build build
```

You can pass several names in one call:

```sh
1build fmt build run
```

Add `--quiet` (or `-q`) to print only SUCCESS or FAILURE instead of the command output, which is handy in CI logs.

## Before and after hooks

The optional `before` and `after` keys run around your commands, for example to set and clear an environment variable or start and stop a local database:

```yaml
project: my-go-project
before: export CGO_ENABLED=0
after: unset CGO_ENABLED
commands:
  - build: go build -o my-app .
```

They can also be set with `1build set before '...'` and removed with `1build unset before after`.

## When a Makefile is the better choice

1build only maps names to commands. It has no dependencies between targets and no "only rebuild if inputs changed" logic, and every contributor has to install it. If your project already has a `Makefile` or `Taskfile`, or you need targets that depend on each other, stick with those. 1build fits best when you want a short, readable list of commands with nothing else to learn.

## Further reading

- [1build on GitHub](https://github.com/gopinath-langote/1build)
