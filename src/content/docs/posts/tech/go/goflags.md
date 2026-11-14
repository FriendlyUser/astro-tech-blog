---
title: "Parsing command-line flags in Go with go-flags"
pubDate: "2023-05-30T19:37:46.189Z"
lastUpdated: 2026-11-14
description: "Define CLI options as struct tags with jessevdk/go-flags, parse them, add subcommands, and handle --help and parse errors correctly."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

[go-flags](https://github.com/jessevdk/go-flags) is a command-line parser for Go that reads
option definitions from struct tags. Compared with the standard library's `flag` package it
gives you short and long forms (`-p` / `--port`), defaults, required options, subcommands
and a generated `--help` page, without writing any registration code. The examples below were
checked against v1.6.1, the latest release at the time of writing.

## Installing

```bash
go get github.com/jessevdk/go-flags@latest
```

## Defining options

Each exported struct field becomes an option. The `short` and `long` tags give its names,
`description` feeds the help text, and `default` sets the value used when the flag is absent.

```go
type Options struct {
	Verbose bool   `short:"v" long:"verbose" description:"Show verbose debug information"`
	Port    int    `short:"p" long:"port" description:"Port to listen on" default:"8080"`
	Config  string `short:"c" long:"config" description:"Path to the configuration file"`
}
```

Other useful tags include `required:"true"`, `choice:"..."` (repeatable, restricts the
allowed values) and `env:"PORT"` to fall back to an environment variable.

## Parsing

`flags.Parse` fills the struct and returns any arguments it didn't consume.

```go
package main

import (
	"fmt"
	"os"

	"github.com/jessevdk/go-flags"
)

type Options struct {
	Verbose bool   `short:"v" long:"verbose" description:"Show verbose debug information"`
	Port    int    `short:"p" long:"port" description:"Port to listen on" default:"8080"`
	Config  string `short:"c" long:"config" description:"Path to the configuration file"`
}

func main() {
	var opts Options
	args, err := flags.Parse(&opts)
	if err != nil {
		if flags.WroteHelp(err) {
			os.Exit(0) // --help was requested and has already been printed
		}
		os.Exit(1) // the parse error has already been printed to stderr
	}

	fmt.Printf("Verbose: %v\n", opts.Verbose)
	fmt.Printf("Port: %d\n", opts.Port)
	fmt.Printf("Config: %s\n", opts.Config)
	fmt.Printf("Remaining args: %v\n", args)
}
```

Running `./myprog -v -p 9000 --config=config.toml` prints:

```text
Verbose: true
Port: 9000
Config: config.toml
Remaining args: []
```

## Errors and help

`flags.Parse` uses the `flags.Default` options, which are `HelpFlag | PrintErrors |
PassDoubleDash`. That means:

- `-h` / `--help` is added for you, and the help text is printed automatically.
- Parse errors (an unknown flag, a non-integer for `--port`) are also printed automatically.
- Everything after `--` is passed through as a positional argument.

So your code shouldn't print the error again. It only needs to decide the exit code, which
is what `flags.WroteHelp(err)` (added in v1.5.0) is for. If you need to inspect the error
yourself, it's a `*flags.Error` with a `Type` field:

```go
var flagsErr *flags.Error
if errors.As(err, &flagsErr) && flagsErr.Type == flags.ErrUnknownFlag {
	// ...
}
```

If you'd rather print errors yourself, create the parser with
`flags.NewParser(&opts, flags.HelpFlag|flags.PassDoubleDash)` and handle the error from
`parser.Parse()`.

The generated help for the `Options` struct above looks like this:

```text
Usage:
  myprog [OPTIONS]

Application Options:
  -v, --verbose  Show verbose debug information
  -p, --port=    Port to listen on (default: 8080)
  -c, --config=  Path to the configuration file

Help Options:
  -h, --help     Show this help message
```

## Subcommands

A struct field tagged with `command` becomes a subcommand with its own options. The neatest
way to run them is to implement the `flags.Commander` interface (`Execute(args []string)
error`); the parser calls `Execute` on the command the user picked.

```go
package main

import (
	"fmt"
	"os"

	"github.com/jessevdk/go-flags"
)

type ServeCommand struct {
	Port int `short:"p" long:"port" description:"Port to listen on" default:"8080"`
}

func (c *ServeCommand) Execute(args []string) error {
	fmt.Printf("Starting server on port %d\n", c.Port)
	return nil
}

type VersionCommand struct {
	Revision bool `short:"r" long:"revision" description:"Show revision number"`
}

func (c *VersionCommand) Execute(args []string) error {
	fmt.Println("Version 1.0")
	if c.Revision {
		fmt.Println("Revision: 12345")
	}
	return nil
}

type Options struct {
	Serve   ServeCommand   `command:"serve" description:"Start the server"`
	Version VersionCommand `command:"version" description:"Show version information"`
}

func main() {
	var opts Options
	parser := flags.NewParser(&opts, flags.Default)
	if _, err := parser.Parse(); err != nil {
		if flags.WroteHelp(err) {
			os.Exit(0)
		}
		os.Exit(1)
	}
}
```

`./myprog serve -p 9000` prints `Starting server on port 9000`. Running `./myprog` with no
command is an error ("Please specify one command of: serve or version") unless you set
`parser.SubcommandsOptional = true`.

If you don't want `Execute` methods, skip them and check which command ran after parsing:
`parser.Active` is the active `*flags.Command` (or `nil`), so `parser.Active.Name` tells you
whether it was `serve` or `version`.

## When to use something else

- For a handful of flags, the standard library's `flag` package is enough and has no
  dependency.
- For large CLIs with nested command trees, shell completion and generated docs,
  [cobra](https://github.com/spf13/cobra) is the more common choice in the Go ecosystem.

## Further reading

- [go-flags API docs](https://pkg.go.dev/github.com/jessevdk/go-flags)
- [go-flags on GitHub](https://github.com/jessevdk/go-flags)
