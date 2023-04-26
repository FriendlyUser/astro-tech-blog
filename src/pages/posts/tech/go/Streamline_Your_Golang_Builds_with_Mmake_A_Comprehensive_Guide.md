---
title: Streamline Your Golang Builds with Mmake A Comprehensive Guide
pubDate: "2023-04-26T15:32:48.993Z"
description: "In this article, we'll explore how to use `mmake` in Golang projects to streamline your build process."
tags: ["go", "mmake"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1115596181.png
---
# Streamline Your Golang Builds with Mmake: A Comprehensive Guide

Building and testing Golang projects can become cumbersome as the complexity of a project grows. Developers often find themselves using long, repetitive commands to build, test, and deploy their code. Fortunately, the `mmake` tool simplifies this process by allowing developers to define and run custom Makefile targets with ease. In this article, we'll explore how to use `mmake` in Golang projects to streamline your build process.

## What is Mmake?

`Mmake` (short for "Modern Make") is a command-line tool developed by Tobias G. Müller that aims to improve the developer experience when working with Makefiles. It provides a more readable and maintainable alternative to traditional Makefiles, using a simple and expressive syntax.

Key features of `mmake` include:

- Support for writing tasks in YAML or JSON
- Easy installation through `go get`
- Human-friendly task descriptions
- Colored output for better readability
- Autocompletion for shell commands

## Getting Started with Mmake

First, you'll need to install `mmake` on your system. You can do this by running the following `go get` command:

```bash
go get -u github.com/tj/mmake/cmd/mmake
```

Now, let's create a simple Golang project to demonstrate `mmake` in action:

1. Create a new directory for your project:

```bash
mkdir my-golang-project
cd my-golang-project
```

2. Initialize the project with a `main. file:

```go
// main.go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Mmake!")
}
```

3. Create a `.mmakefile.yml` file in the project root:

```yaml
.mmakefile.yml
build:
  description: "Build the project"
  script: "go build -o my-golang-project"

run:
  description: "Run the project"
  script: "./my-golang-project"

test:
  description: "Run tests"
  script: "go test"
```

In this `.mmakefile.yml`, we've defined three tasks: `build`, `run`, and `test`. Each task has a `description` and a `script` to be executed when the task runs.

## Using Mmake Tasks

Now that we have a basic project set up, let's see how to use `mmake` to execute our tasks.

1. To list all available tasks and their descriptions, run:

```bash
mmake help
```

You should see output similar to the following:

```
Tasks:

  build  Build the project
  run    Run the project
  test   Run tests
```

2. To build the project, run:

```bash
mmake build
```

This will execute the `go build -o my-golang-project` command defined in the `build` task.

3. To run the project, execute:

```bash
mmake run
```

This will execute the `./my-golang-project` command defined in the `run` task, and you should see the output `Hello, Mmake!`.

4. To run tests, use:

```bash
mmake test
```

Since we don't have any tests defined yet, the output will show that no tests were executed.

## Conclusion

In this article, we've explored how to use `mmake` to simplify building, running, and testing Golang projects. By leveraging the power of `mmake`, you can streamline your development process and improve the maintainability of your build scripts.

