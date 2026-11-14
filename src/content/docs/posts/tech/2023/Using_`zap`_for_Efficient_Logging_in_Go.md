---
title: "Structured logging in Go with zap: loggers, levels, fields and encoders"
pubDate: "2024-05-09T12:01:52.000Z"
lastUpdated: 2026-11-14
description: "Set up Uber's zap logger in Go: production vs development presets, log levels, structured fields, console output and custom time formats."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3582974242.webp
---

[zap](https://github.com/uber-go/zap) is a structured logging library for Go from Uber. Its main selling point is low overhead: the core `Logger` takes strongly typed fields (`zap.String`, `zap.Int`, ...) instead of `interface{}` values, which avoids reflection and most allocations on the hot path. If you'd rather write `printf`-style calls, it also has a slower but friendlier `SugaredLogger`.

The examples here were checked against zap v1.28.0.

## Install

```bash
go get go.uber.org/zap
```

## Production and development presets

zap ships two ready-made configurations:

- `zap.NewProduction()` logs at Info level and above, as JSON, to stderr, with sampling enabled to cap repeated messages.
- `zap.NewDevelopment()` logs at Debug level and above, in a human-readable console format, to stderr, and adds stack traces to Warn and above.

```go
package main

import "go.uber.org/zap"

func main() {
	logger, err := zap.NewDevelopment()
	if err != nil {
		panic(err)
	}
	defer logger.Sync() // flush buffered entries before exit

	logger.Debug("starting up")
	logger.Info("listening", zap.Int("port", 8080))
	logger.Warn("config file not found, using defaults")
}
```

`Sync` flushes any buffered output. Call it before the program exits. When logging to a terminal it can return an error such as "invalid argument" on some platforms; that's harmless, which is why the deferred call above ignores it.

## Structured fields

Pass context as typed fields rather than formatting it into the message. Log aggregators can then filter on `user_id` or `status` directly.

```go
logger.Info("request handled",
	zap.String("method", "GET"),
	zap.String("path", "/users"),
	zap.Int("status", 200),
	zap.Duration("latency", 12*time.Millisecond),
)
```

To attach fields to every entry from a component, create a child logger with `With`:

```go
reqLogger := logger.With(zap.String("request_id", "abc123"))
reqLogger.Info("fetching user")
reqLogger.Error("user not found", zap.Int("user_id", 42))
```

If you prefer looser syntax, `logger.Sugar()` returns a `SugaredLogger` that accepts key-value pairs:

```go
sugar := logger.Sugar()
sugar.Infow("request handled", "method", "GET", "status", 200)
sugar.Infof("listening on port %d", 8080)
```

## Levels

zap has seven levels: `Debug`, `Info`, `Warn`, `Error`, `DPanic`, `Panic` and `Fatal`. `DPanic` panics in development mode and only logs in production; `Panic` logs then panics; `Fatal` logs then calls `os.Exit(1)`.

The easiest way to change the minimum level is to start from a preset config and override it:

```go
package main

import "go.uber.org/zap"

func main() {
	cfg := zap.NewProductionConfig()
	cfg.Level = zap.NewAtomicLevelAt(zap.WarnLevel)

	logger, err := cfg.Build()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Info("not printed")
	logger.Warn("printed")
}
```

`cfg.Level` is an `AtomicLevel`, so you can keep a reference to it and call `SetLevel` while the program runs, for example from an admin endpoint. `AtomicLevel` also implements `http.Handler` for exactly that purpose.

## Console output and custom time formats

Starting from a preset also avoids filling in every `EncoderConfig` field by hand. This logs to stdout in console format with a custom timestamp layout:

```go
package main

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	cfg := zap.NewProductionConfig()
	cfg.Encoding = "console"
	cfg.OutputPaths = []string{"stdout"}
	cfg.EncoderConfig.EncodeLevel = zapcore.CapitalLevelEncoder
	cfg.EncoderConfig.EncodeTime = zapcore.TimeEncoderOfLayout("2006-01-02 15:04:05")

	logger, err := cfg.Build()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	logger.Info("console output with a custom timestamp")
}
```

Use JSON in production, where something else parses your logs, and console format for local development.

## Building a logger from a Core

For full control, such as writing JSON to a file and console output to the terminal at the same time, assemble `zapcore.Core` values and pass them to `zap.New`:

```go
package main

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func main() {
	file, err := os.OpenFile("app.log", os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		panic(err)
	}
	defer file.Close()

	jsonCore := zapcore.NewCore(
		zapcore.NewJSONEncoder(zap.NewProductionEncoderConfig()),
		zapcore.AddSync(file),
		zap.InfoLevel,
	)
	consoleCore := zapcore.NewCore(
		zapcore.NewConsoleEncoder(zap.NewDevelopmentEncoderConfig()),
		zapcore.Lock(os.Stdout),
		zap.DebugLevel,
	)

	logger := zap.New(zapcore.NewTee(jsonCore, consoleCore), zap.AddCaller())
	defer logger.Sync()

	logger.Debug("only on the console")
	logger.Info("on the console and in app.log")
}
```

`zapcore.NewTee` fans each entry out to every core whose level allows it. `zapcore.Lock` wraps `os.Stdout` so concurrent writes don't interleave.

## zap and log/slog

Go 1.21 added structured logging to the standard library as `log/slog`. For new code with modest logging needs, `slog` may be enough on its own. If you want slog's API with zap's encoders and outputs, zap provides a `slog.Handler` in the `go.uber.org/zap/exp/zapslog` package.

## Further reading

- [zap on pkg.go.dev](https://pkg.go.dev/go.uber.org/zap)
- [zapcore package](https://pkg.go.dev/go.uber.org/zap/zapcore)
- [zap FAQ](https://github.com/uber-go/zap/blob/master/FAQ.md)
