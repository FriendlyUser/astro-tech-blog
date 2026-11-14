---
title: "Building a Go CLI with Cobra: commands, subcommands and flags"
pubDate: "2023-09-26T05:59:48.000Z"
lastUpdated: 2026-11-14
description: "Build a command-line app in Go with Cobra: scaffold it with cobra-cli, add commands and subcommands, and define local and persistent flags."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3558128873.png
---

[Cobra](https://github.com/spf13/cobra) is the Go library behind the CLIs of `kubectl`, `hugo` and `gh`. You describe a tree of commands, and Cobra parses arguments, handles POSIX-style flags (through [pflag](https://github.com/spf13/pflag)), generates `--help` output and shell completions, and suggests a command when the user mistypes one.

This post was checked against Cobra v1.10.2.

## Minimal app by hand

Cobra doesn't need a generator. A single file is enough to see how it fits together:

```bash
mkdir greet && cd greet
go mod init example.com/greet
go get github.com/spf13/cobra@latest
```

```go
// main.go
package main

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

func main() {
	var name string
	var verbose bool

	rootCmd := &cobra.Command{
		Use:   "greet",
		Short: "A tiny example CLI",
	}

	// Persistent flags are inherited by every subcommand.
	rootCmd.PersistentFlags().BoolVarP(&verbose, "verbose", "v", false, "verbose output")

	helloCmd := &cobra.Command{
		Use:   "hello [extra words...]",
		Short: "Say hello",
		Args:  cobra.ArbitraryArgs,
		Run: func(cmd *cobra.Command, args []string) {
			if verbose {
				fmt.Fprintln(os.Stderr, "running hello")
			}
			fmt.Printf("Hello, %s! %v\n", name, args)
		},
	}

	// Local flag: only valid on "hello".
	helloCmd.Flags().StringVarP(&name, "name", "n", "world", "who to greet")

	rootCmd.AddCommand(helloCmd)

	if err := rootCmd.Execute(); err != nil {
		os.Exit(1)
	}
}
```

```bash
go run . hello --name Gopher
go run . hello -n Gopher -v
go run . helo            # Error: unknown command "helo" ... Did you mean this? hello
go run . hello --help
```

`Execute()` already prints the error and usage, so `main` only needs to set the exit code.

## Scaffolding with cobra-cli

For larger apps, the generator lays out one file per command. It moved out of the main repo into [`cobra-cli`](https://github.com/spf13/cobra-cli). The old `go get github.com/spf13/cobra/cobra` command from older tutorials no longer works.

```bash
go install github.com/spf13/cobra-cli@latest

mkdir my-cli-app && cd my-cli-app
go mod init example.com/my-cli-app
cobra-cli init
```

`cobra-cli init` must run inside a Go module. It takes the package name from `go.mod`, runs `go get` for Cobra, and creates `main.go` and `cmd/root.go`. Pass `--license apache` (or `mit`, etc.) to add a license header and file.

Add commands with `cobra-cli add`:

```bash
cobra-cli add serve
cobra-cli add config
cobra-cli add create -p 'configCmd'
```

Each command gets its own file under `cmd/`. The `-p` flag sets the parent command. It takes the Go variable name of the parent, and the generator appends `Cmd` to the name, so the parent of `create` is `configCmd`, not `config`. The result is `my-cli-app config create`.

A generated command looks roughly like this. You fill in `Run` and register flags in `init()`:

```go
// cmd/serve.go
var port int

var serveCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the server",
	Run: func(cmd *cobra.Command, args []string) {
		fmt.Printf("listening on :%d\n", port)
	},
}

func init() {
	rootCmd.AddCommand(serveCmd)
	serveCmd.Flags().IntVarP(&port, "port", "p", 8080, "port to listen on")
}
```

## Flags

- `cmd.Flags()` are **local** to that command. `cmd.PersistentFlags()` apply to the command **and all its subcommands**.
- Bind flags to variables with the `...Var`/`...VarP` functions (`StringVarP`, `IntVarP`, `BoolVarP`). The `P` variants take a one-letter shorthand.
- If you don't bind a variable, read the value inside `Run` with `cmd.Flags().GetString("name")`. It returns `(string, error)`, and the error is non-nil only if the flag doesn't exist or has a different type.
- Mark a flag as mandatory with `cmd.MarkFlagRequired("name")`.
- Validate positional arguments with `Args`: `cobra.NoArgs`, `cobra.ExactArgs(1)`, `cobra.MinimumNArgs(1)`, or your own function.

## Gotchas

- Use `RunE` instead of `Run` when the command can fail. Returning an error lets Cobra print it and makes `Execute()` return it, instead of you calling `os.Exit` deep inside a command.
- By default, Cobra prints the full usage text on every error, which is noisy for runtime failures. Setting `SilenceUsage: true` on the root command turns that off. A common pattern is to set `cmd.SilenceUsage = true` in `PersistentPreRun`, after flags have parsed, so usage still appears for bad flags.
- Cobra adds a `completion` command automatically. `my-cli-app completion bash` (or `zsh`, `fish`, `powershell`) prints a completion script.

## Further reading

- [Cobra user guide](https://github.com/spf13/cobra/blob/main/site/content/user_guide.md)
- [cobra-cli README](https://github.com/spf13/cobra-cli/blob/main/README.md)
- [Cobra on pkg.go.dev](https://pkg.go.dev/github.com/spf13/cobra)
