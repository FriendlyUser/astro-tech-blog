---
title: "Gaper: rebuild and restart a Go program on crash or file change"
pubDate: "2023-05-26T15:32:48.952Z"
lastUpdated: 2026-11-14
description: "How to install and run gaper, a development-only supervisor that rebuilds your Go program when files change and restarts it when it exits."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1230376530.png
---

[Gaper](https://github.com/maxcnunes/gaper) is a command-line tool that builds your Go program, runs it, and rebuilds and restarts it when a watched file changes or when the program exits. It is the Go equivalent of `nodemon` or `node-supervisor`, and its README says it is aimed at development only. It is not a production process manager: for that, use systemd, a container restart policy, or similar.

You don't import gaper into your code. You run it from the project directory in place of `go run`.

:::note
The latest gaper release is v1.1.0 (August 2022), and the repository has had no commits since 2023. It still works as described here, but if you want an actively developed alternative, look at [Air](https://github.com/air-verse/air).
:::

## Install

With Go 1.17 or later, install the binary with `go install`:

```bash
go install github.com/maxcnunes/gaper/cmd/gaper@latest
```

This puts `gaper` in `$(go env GOPATH)/bin`, so make sure that directory is on your `PATH`. Prebuilt binaries are also on the [releases page](https://github.com/maxcnunes/gaper/releases).

## Run it

From the root of a `main` package, run gaper with no arguments:

```bash
gaper
```

With the defaults, gaper:

- builds the package in `.` into a binary named after the current directory;
- runs that binary;
- polls `.go` files every 500 ms and rebuilds and restarts the program when one changes;
- restarts the program whenever it exits, whether it crashed or not;
- ignores hidden files and folders, `*_test.go` files and the `vendor` folder.

## Useful flags

All configuration is done with command-line flags; there is no config file or environment variables.

| Flag | What it does |
| --- | --- |
| `--build-path` | Path to the program's source (default `.`) |
| `--bin-name` | Name of the binary gaper builds |
| `--build-args` | Extra arguments for `go build` |
| `--program-args` | Arguments passed to your program |
| `-w`, `--watch` | Files or folders to watch (repeatable, globs allowed) |
| `-i`, `--ignore` | Files or folders to ignore (repeatable, globs allowed) |
| `-e`, `--extensions` | File extensions to watch (default `go`) |
| `-p`, `--poll-interval` | Polling interval in milliseconds (default 500) |
| `-n`, `--no-restart-on` | `error`, `exit` or `success` (see below) |
| `--disable-default-ignore` | Also watch hidden files, tests and `vendor` |
| `--verbose` | Print gaper's own log messages |

`--no-restart-on` controls what happens when your program exits on its own:

- `error`: don't restart when the program fails; a clean exit (code 0) still restarts. In v1.1.0 the check is for exit code 1 specifically, so other non-zero codes still trigger a restart.
- `success`: don't restart on a clean exit; crashes still restart.
- `exit`: never restart automatically. Gaper still rebuilds and restarts on file changes.

A typical setup for a web server whose `main` package lives in `cmd/server`, and which also serves templates and static files:

```bash
gaper \
  --build-path cmd/server \
  --bin-name build/api-dev \
  -w . -e go -e html -e css \
  --program-args "-port 8080" \
  --no-restart-on exit
```

When adding a directory to `--watch` or `--ignore`, end it with a `/` (for example `build/`). Otherwise the pattern can also match files that start with the same name, such as `build_settings.go`.

## Gotchas

- Gaper polls the file system rather than using file system events, so very large trees with a short `--poll-interval` cost some CPU.
- Restarting on every exit is the default. If your program is a one-shot CLI rather than a server, pass `--no-restart-on success` or it will run in a loop.
- There is no backoff or retry limit. A program that crashes on startup is rebuilt and restarted over and over until you fix it. A Go panic exits with code 2, which `--no-restart-on error` does not catch, so use `--no-restart-on exit` if the loop gets noisy.
- If a rebuild fails, gaper logs the compiler error and keeps watching; the next file change triggers another build.

## Further reading

- [gaper README](https://github.com/maxcnunes/gaper)
- [Air](https://github.com/air-verse/air), a more actively maintained live-reload tool for Go
