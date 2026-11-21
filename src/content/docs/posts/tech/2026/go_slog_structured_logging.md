---
title: "Structured logging in Go with log/slog"
description: "Use Go's log/slog: attributes, text and JSON handlers, levels with LevelVar, With and groups, LogValuer for redacting secrets, and a context-aware handler."
tags: ["Go", "slog", "Logging", "Observability", "Standard Library"]
pubDate: "2026-02-24T16:00:00.000Z"
imgSrc: "/imgs/2026/go_slog_structured_logging.webp"
imgAlt: "A terminal of JSON log lines tagged INFO, WARN, DEBUG and ERROR, with a token value shown as redacted"
---

`log/slog` is the structured logger in Go's standard library. Every log call produces a record with a message, a level and typed key-value attributes, and a handler decides how to write it: as `key=value` text for humans, or as JSON for a log pipeline. It has been in the standard library since Go 1.21, so for most services there is no longer a reason to pull in a third-party logger just to get structured output.

Examples use Go 1.26 and were run on the Go playground.

## The basics

The package-level functions log through a default logger:

```go
slog.Info("order placed", "order_id", 1001, "items", 3, "took", 42*time.Millisecond)
```

Until you configure anything, the default logger writes through the old `log` package to stderr:

```text
2026/02/24 16:00:00 INFO order placed order_id=1001 items=3 took=42ms
```

The arguments after the message alternate key and value. That is short, but easy to get wrong. With an odd number of arguments, the last one is logged under the key `!BADKEY`. `go vet` catches this ("call to slog.Logger.Info missing a final value"), so keep vet in CI.

The typed form avoids the problem and allocates less:

```go
slog.LogAttrs(ctx, slog.LevelInfo, "order placed",
	slog.Int("order_id", 1001),
	slog.Duration("took", 42*time.Millisecond),
)
```

`slog.String`, `slog.Int`, `slog.Bool`, `slog.Time`, `slog.Duration` and `slog.Any` all build an `slog.Attr`. You can mix `Attr` values and key-value pairs in the ordinary calls too.

## Handlers: text or JSON

To change the output, create a logger with a handler and make it the default:

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
	Level:     slog.LevelDebug,
	AddSource: true, // adds the source file and line of the log call
}))
slog.SetDefault(logger)
```

The two built-in handlers write the same record differently:

- `slog.NewTextHandler` writes `time=... level=INFO msg="order placed" order_id=1001`. Good for local development and for logs a person reads with `grep`.
- `slog.NewJSONHandler` writes one JSON object per line. Use it when logs go to Loki, Elasticsearch, CloudWatch or anything else that indexes fields.

`slog.SetDefault` also redirects the old `log` package. After it, `log.Printf` calls from your code and from libraries go through your handler at level INFO, so you get one consistent format.

`HandlerOptions.ReplaceAttr` is a hook that sees every attribute before it is written. It can rename keys (`msg` to `message` for a pipeline that expects that), drop the timestamp in tests, or change how values are formatted.

## Levels and LevelVar

There are four built-in levels: `LevelDebug` (-4), `LevelInfo` (0), `LevelWarn` (4) and `LevelError` (8). They are integers, so a custom level such as `slog.Level(12)` sorts above errors. A handler drops records below its configured level, and the default is Info.

`HandlerOptions.Level` takes a `slog.Leveler`. Pass a `*slog.LevelVar` instead of a constant and you can change the level while the program runs:

```go
var level = new(slog.LevelVar) // zero value is Info

logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))

// Later, from an admin endpoint, a signal handler or a config reload:
level.Set(slog.LevelDebug)
```

`LevelVar` is safe to use from multiple goroutines, so an HTTP handler can flip it while requests are being logged.

## With and groups

`logger.With(...)` returns a child logger that adds the same attributes to every record. Use it for request-scoped or component-scoped fields:

```go
billing := logger.With("component", "billing")
billing.Info("invoice created", "id", 1001)
```

Groups nest attributes under a key. `slog.Group("http", "method", "GET", "status", 200)` is a single grouped attribute, and `logger.WithGroup("invoice")` puts every attribute added later under `invoice`. In JSON that becomes a nested object, and in text the keys become `invoice.id=1001`.

## LogValuer: redaction where the type is defined

The safest place to stop a secret from being logged is the type that holds it. A type that implements `slog.LogValuer` decides how it is logged, wherever it ends up:

```go
type Token string

func (Token) LogValue() slog.Value { return slog.StringValue("[redacted]") }

type User struct {
	ID       int
	Email    string
	Password string
}

func (u User) LogValue() slog.Value {
	return slog.GroupValue(
		slog.Int("id", u.ID),
		slog.String("email_domain", domain(u.Email)),
	)
}
```

Now `slog.Info("login", "user", u, "token", tok)` logs the user's ID and email domain, and never the password or the token, even if someone adds `"user", u` to a log call two years from now. `LogValue` is also called lazily, so an expensive representation is only computed if the record is actually written.

## A context-aware handler

`slog.InfoContext(ctx, ...)` passes the context to the handler, but the built-in handlers ignore it. To log a request ID or a trace ID from the context, wrap the handler:

```go
type ctxKey struct{}

type ContextHandler struct {
	slog.Handler
}

func (h ContextHandler) Handle(ctx context.Context, r slog.Record) error {
	if id, ok := ctx.Value(ctxKey{}).(string); ok {
		r.AddAttrs(slog.String("request_id", id))
	}
	return h.Handler.Handle(ctx, r)
}

// WithAttrs and WithGroup must re-wrap, or logger.With(...) drops the wrapper.
func (h ContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return ContextHandler{h.Handler.WithAttrs(attrs)}
}

func (h ContextHandler) WithGroup(name string) slog.Handler {
	return ContextHandler{h.Handler.WithGroup(name)}
}
```

Embedding `slog.Handler` gives you `Enabled` for free. The two re-wrapping methods are the part people forget. Without them, `logger.With("component", "billing")` calls the embedded handler's `WithAttrs`, gets back a plain JSON handler, and every log from that child logger silently loses its request ID.

In an HTTP server, a middleware puts the ID in the context (`context.WithValue(r.Context(), ctxKey{}, id)`), and handlers log with `slog.InfoContext(r.Context(), ...)`.

## A complete program

This puts the pieces together. Add `ContextHandler`, `Token`, `User` and `domain` from above to the same `main.go`:

```go
package main

import (
	"context"
	"log/slog"
	"os"
)

func domain(email string) string {
	for i := len(email) - 1; i >= 0; i-- {
		if email[i] == '@' {
			return email[i+1:]
		}
	}
	return ""
}

func main() {
	level := new(slog.LevelVar) // defaults to Info

	opts := &slog.HandlerOptions{
		Level: level,
		// Drop the timestamp so the output below is stable.
		ReplaceAttr: func(groups []string, a slog.Attr) slog.Attr {
			if a.Key == slog.TimeKey && len(groups) == 0 {
				return slog.Attr{}
			}
			return a
		},
	}

	logger := slog.New(ContextHandler{slog.NewJSONHandler(os.Stdout, opts)})
	slog.SetDefault(logger)

	ctx := context.WithValue(context.Background(), ctxKey{}, "req-7f3a")

	u := User{ID: 42, Email: "ana@example.com", Password: "hunter2"}
	slog.InfoContext(ctx, "login", "user", u, "token", Token("abc123"))

	reqLog := logger.With("component", "billing").WithGroup("invoice")
	reqLog.InfoContext(ctx, "created", slog.Int("id", 1001), slog.Float64("total", 59.9))

	slog.Debug("not shown: level is Info")
	level.Set(slog.LevelDebug)
	slog.Debug("shown after level.Set", "cache_hits", 17)

	text := slog.New(slog.NewTextHandler(os.Stdout, opts))
	text.Warn("disk almost full", "mount", "/var", "used_pct", 91)
}
```

The output:

```text
{"level":"INFO","msg":"login","user":{"id":42,"email_domain":"example.com"},"token":"[redacted]","request_id":"req-7f3a"}
{"level":"INFO","msg":"created","component":"billing","invoice":{"id":1001,"total":59.9,"request_id":"req-7f3a"}}
{"level":"DEBUG","msg":"shown after level.Set","cache_hits":17}
level=WARN msg="disk almost full" mount=/var used_pct=91
```

Look at the second line: `request_id` landed inside the `invoice` group. Attributes added in `Handle` go into whatever group is open, because the handler can't tell them apart from the caller's. If your log pipeline expects `request_id` at the top level, either avoid `WithGroup` on request loggers, or add the request ID with `logger.With("request_id", id)` in the middleware and pass that logger down instead of reading it from the context.

## Logging to two places

Go 1.26 added `slog.NewMultiHandler`, which sends each record to several handlers. Each handler keeps its own level, so you can write warnings to the console and everything to a file:

```go
logger := slog.New(slog.NewMultiHandler(
	slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}),
	slog.NewJSONHandler(file, &slog.HandlerOptions{Level: slog.LevelDebug}),
))
```

On Go 1.25 and earlier you need a small fan-out handler of your own, or a third-party one.

## Gotchas

- **Keep `go vet` on.** It checks key-value pairs in slog calls, which is the main weakness of the untyped API.
- **`slog.Any` with a struct logs every exported field.** That includes fields you add later. Implement `LogValuer` on anything that can hold personal data or credentials.
- **Errors.** Log them as `"err", err`. Both built-in handlers write the result of `Error()`, so the JSON handler gives `"err":"connection refused"` rather than an empty object.
- **Tests.** Use `slog.New(slog.DiscardHandler)` (Go 1.24+) to silence logs in tests. If you write your own handler, run it through `testing/slogtest`, which checks the rules a handler must follow (ignoring empty attributes, handling groups, and so on).
- **Don't log in hot loops at Debug and hope the level saves you.** Arguments are still evaluated before the level check. Guard expensive work with `logger.Enabled(ctx, slog.LevelDebug)`, or use `LogValuer` so the work happens only when the record is written.

## Further reading

- [`log/slog` package documentation](https://pkg.go.dev/log/slog)
- [Structured Logging with slog](https://go.dev/blog/slog) (Go blog)
- [A Guide to Writing slog Handlers](https://github.com/golang/example/tree/master/slog-handler-guide)
- [`testing/slogtest`](https://pkg.go.dev/testing/slogtest)
