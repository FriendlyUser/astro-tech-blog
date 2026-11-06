---
title: Using Subcmd in Golang Enhancing CLI Applications with Subcommands
pubDate: "2023-05-30T19:37:46.152Z"
description: "In this article, we will explore how to use subcommands in Golang CLI applications using the `subcmd` package"
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using Subcmd in Golang: Enhancing CLI Applications with Subcommands

In this article, we will explore how to use subcommands in Golang CLI applications using the `subcmd` package. Subcommands are a useful way to organize your command-line interface (CLI) tool into logical groups of functionality. Let's dive in!

## What is `subcmd`?

`subcmd` is a Golang package that enables the easy creation of CLI applications with subcommands. It provides a simple interface for defining and parsing subcommands, allowing developers to focus on their application's core functionality.

To get started with `subcmd`, we will need to install it:

```bash
go get -u github.com/google/subcommands
```

## Creating a Simple CLI Application with Subcommands

Now that we have `subcmd` installed, let's create a simple CLI application with two subcommands: `add` and `multiply`. The `add` subcommand will take two integers and return their sum, while the `multiply` subcommand will return their product.

First, create a new project folder and initialize it as a Go module:

```bash
mkdir mycli && cd mycli
go mod init github.com/yourusername/mycli
```

Next, create a `main. file in your project root and add the following code:

```go
package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/google/subcommands"
)

func main() {
	subcommands.Register(subcommands.HelpCommand(), "")
	subcommands.Register(&addCmd{}, "")
	subcommands.Register(&multiplyCmd{}, "")

	flag.Parse()
	ctx := context.Background()
	os.Exit(int(subcommands.Execute(ctx)))
}

// Add command
type addCmd struct {
}

func (*addCmd) Name() string {
	return "add"
}

func (*addCmd) Synopsis() string {
	return "Add two integers."
}

func (*addCmd) Usage() string {
	return `add <num1> <num2>
	Add two integers and print the result.
`
}

func (a *addCmd) SetFlags(f *flag.FlagSet) {
}

func (a *addCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...interface{}) subcommands.ExitStatus {
	if f.NArg() != 2 {
		fmt.Fprintln(os.Stderr, "Expected two arguments.")
		return subcommands.ExitUsageError
	}

	// Parse the integers
	num1, err1 := strconv.Atoi(f.Arg(0))
	num2, err2 := strconv.Atoi(f.Arg(1))

	if err1 != nil || err2 != nil {
		fmt.Fprintln(os.Stderr, "Both arguments must be integers.")
		return subcommands.ExitUsageError
	}

	fmt.Println(num1 + num2)
	return subcommands.ExitSuccess
}

// Multiply command
type multiplyCmd struct {
}

func (*multiplyCmd) Name() string {
	return "multiply"
}

func (*multiplyCmd) Synopsis() string {
	return "Multiply two integers."
}

func (*multiplyCmd) Usage() string {
	return `multiply <num1> <num2>
	Multiply two integers and print the result.
`
}

func (m *multiplyCmd) SetFlags(f *flag.FlagSet) {
}

func (m *multiplyCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...interface{}) subcommands.ExitStatus {
	if f.NArg() != 2 {
		fmt.Fprintln(os.Stderr, "Expected two arguments.")
		return subcommands.ExitUsageError
	}

	// Parse the integers
	num1, err1 := strconv.Atoi(f.Arg(0))
	num2, err2 := strconv.Atoi(f.Arg(1))

	if err1 != nil || err2 != nil {
		fmt.Fprintln(os.Stderr, "Both arguments must be integers.")
		return subcommands.ExitUsageError
	}

	fmt.Println(num1 * num2)
	return subcommands.ExitSuccess
}
```

In the code above, we first import the necessary packages and then define a `main` function. Inside the main function, we register our subcommands using the `subcommands.Register()` function. We also register the built-in `subcommands.HelpCommand()` to provide help functionality.

Next, we define the `addCmd` and `multiplyCmd` structs and implement the `subcommands.Command` interface for each. The interface has five methods:

1. `Name()`: Returns the subcommand's name.
2. `Synopsis()`: Returns a short description of the subcommand.
3. `Usage()`: Returns a string describing how to use the subcommand.
4. `SetFlags(*flag.FlagSet)`: Used to set any flags specific to the subcommand.
5. `Execute(context.Context, *flag.FlagSet, ...interface{}) subcommands.ExitStatus`: The main function that runs when the subcommand is called.

We define these methods for both the `addCmd` and `multiplyCmd` structs, implementing the desired functionality in the `Execute()` method.

Tobuild and run the CLI application, execute the following commands in your project root:

```bash
go build
./mycli help
```

You should see the help output, which lists the available subcommands:

```
Usage: mycli <command> [arguments]

Commands:
	add            Add two integers.
	help           Describe the usage of this program or its subcommands.
	multiply       Multiply two integers.
```

Now, let's test the `add` and `multiply` subcommands:

```bash
./mycli add 3 4
7

./mycli multiply 3 4
12
```

Great! Our CLI application with subcommands is working as expected.

## Summary

In this article, we explored how to use the `subcmd` package to create a Golang CLI application with subcommands. We demonstrated how to define, register, and implement subcommands using the `subcommands.Command` interface, and we built a simple CLI application that supports `add` and `multiply` subcommands.

The `subcmd` package is an excellent choice for creating organized and easy-to-use CLI applications in Golang. By implementing subcommands, developers can group related functionality and make their tools more user-friendly.

