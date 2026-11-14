---
title: "Building a Go CLI with subcommands using google/subcommands"
pubDate: "2023-05-30T19:37:46.152Z"
lastUpdated: 2026-11-14
description: "Build a small Go command-line tool with add and multiply subcommands using the google/subcommands package, including per-command flags and help output."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---

Subcommands (`git commit`, `go build`) let one binary group related actions, each with its own flags and help text. Go's standard `flag` package parses flags but has no notion of subcommands. [`github.com/google/subcommands`](https://github.com/google/subcommands) is a small package that adds them on top of `flag`: each subcommand is a type that implements a five-method interface, and the package handles dispatch and `help`.

The package is stable but small and rarely updated; its latest tag is v1.2.0 from 2019. If you want shell completion, nested command trees or POSIX-style `--long` flags, look at [Cobra](https://github.com/spf13/cobra) or [urfave/cli](https://github.com/urfave/cli) instead.

## Setup

```bash
mkdir mycli && cd mycli
go mod init example.com/mycli
go get github.com/google/subcommands
```

## The Command interface

Each subcommand implements `subcommands.Command`:

```go
type Command interface {
	Name() string             // what the user types, e.g. "add"
	Synopsis() string         // one line, shown in the command list
	Usage() string            // longer text, shown by "help add"
	SetFlags(*flag.FlagSet)   // register flags for this subcommand
	Execute(ctx context.Context, f *flag.FlagSet, args ...interface{}) ExitStatus
}
```

`Execute` receives the subcommand's own `FlagSet`, already parsed, so positional arguments are in `f.Args()`. The variadic `args` are whatever you passed to `subcommands.Execute` in `main`, which is a way to hand shared state (a config, a database handle) to every command.

## A calculator with two subcommands

Put this in `main.go`. Both commands take two integers; `multiply` also has a `-v` flag to show the working.

```go
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"strconv"

	"github.com/google/subcommands"
)

// parseTwoInts reads exactly two integer positional arguments.
func parseTwoInts(f *flag.FlagSet) (int, int, error) {
	if f.NArg() != 2 {
		return 0, 0, fmt.Errorf("expected two arguments, got %d", f.NArg())
	}
	a, err := strconv.Atoi(f.Arg(0))
	if err != nil {
		return 0, 0, fmt.Errorf("first argument: %w", err)
	}
	b, err := strconv.Atoi(f.Arg(1))
	if err != nil {
		return 0, 0, fmt.Errorf("second argument: %w", err)
	}
	return a, b, nil
}

type addCmd struct{}

func (*addCmd) Name() string     { return "add" }
func (*addCmd) Synopsis() string { return "Add two integers." }
func (*addCmd) Usage() string {
	return "add <num1> <num2>:\n  Add two integers and print the result.\n"
}
func (*addCmd) SetFlags(*flag.FlagSet) {}

func (*addCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...interface{}) subcommands.ExitStatus {
	a, b, err := parseTwoInts(f)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return subcommands.ExitUsageError
	}
	fmt.Println(a + b)
	return subcommands.ExitSuccess
}

type multiplyCmd struct {
	verbose bool
}

func (*multiplyCmd) Name() string     { return "multiply" }
func (*multiplyCmd) Synopsis() string { return "Multiply two integers." }
func (*multiplyCmd) Usage() string {
	return "multiply [-v] <num1> <num2>:\n  Multiply two integers and print the result.\n"
}
func (m *multiplyCmd) SetFlags(f *flag.FlagSet) {
	f.BoolVar(&m.verbose, "v", false, "print the full expression")
}

func (m *multiplyCmd) Execute(_ context.Context, f *flag.FlagSet, _ ...interface{}) subcommands.ExitStatus {
	a, b, err := parseTwoInts(f)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		return subcommands.ExitUsageError
	}
	if m.verbose {
		fmt.Printf("%d * %d = %d\n", a, b, a*b)
	} else {
		fmt.Println(a * b)
	}
	return subcommands.ExitSuccess
}

func main() {
	subcommands.Register(subcommands.HelpCommand(), "")
	subcommands.Register(subcommands.FlagsCommand(), "")
	subcommands.Register(&addCmd{}, "")
	subcommands.Register(&multiplyCmd{}, "")

	flag.Parse()
	os.Exit(int(subcommands.Execute(context.Background())))
}
```

`Register`'s second argument is a group name. Commands in the same group are listed together in the help output; the empty string is the default group.

`flag.Parse()` parses top-level flags (none here) and must run before `subcommands.Execute`, which then picks the subcommand from the first remaining argument.

## Trying it

```bash
go build
./mycli help
```

With no top-level flags defined, the output is:

```text
Usage: mycli <flags> <subcommand> <subcommand args>

Subcommands:
	add              Add two integers.
	flags            describe all known top-level flags
	help             describe subcommands and their syntax
	multiply         Multiply two integers.

```

The subcommands work as expected, and flags go after the subcommand name:

```bash
$ ./mycli add 3 4
7
$ ./mycli multiply -v 3 4
3 * 4 = 12
$ ./mycli add 3 x
second argument: strconv.Atoi: parsing "x": invalid syntax
```

`./mycli help multiply` prints the `Usage()` text followed by the subcommand's flags.

## Gotchas

- Flags must come before positional arguments: `multiply -v 3 4` works, `multiply 3 4 -v` treats `-v` as a third argument. This is standard `flag` package behaviour.
- `ExitUsageError` is exit code 2 and `ExitFailure` is 1, matching common Unix conventions.
- Every command is registered on the package-level `DefaultCommander`. In tests, create a separate `subcommands.NewCommander(flagSet, "name")` so state doesn't leak between cases.

## Further reading

- [google/subcommands on pkg.go.dev](https://pkg.go.dev/github.com/google/subcommands)
