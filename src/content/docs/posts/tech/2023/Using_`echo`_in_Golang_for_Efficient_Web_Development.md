---
description: "Build a small Go web server with the Echo framework: routes, a JSON POST handler with request binding, and the built-in logging and recovery middleware."
imgSrc: /imgs/2023/3437532028.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-27T06:04:59.000Z'
lastUpdated: 2026-11-14
tags: ["go"]
title: "Getting started with Echo in Go: routes, JSON handlers and middleware"
---

:::caution
This post was originally written for Echo v4. Echo v5 was released in January 2026 and changed the handler signature (`echo.Context` is now the concrete type `*echo.Context`) and some middleware names. v4 is in maintenance mode, so the examples below use v5. If you maintain a v4 app, see the [Echo repository](https://github.com/labstack/echo) for the v4 support timeline and upgrade notes.
:::

[Echo](https://echo.labstack.com/) is a small web framework for Go. It adds a router with path parameters, request binding, response helpers and a middleware chain on top of `net/http`, without much else. That makes it a reasonable middle ground between the standard library's `http.ServeMux` and heavier frameworks.

This post builds a small server with one GET route, one JSON POST route, and Echo's logging and recovery middleware.

## Set up the project

Echo v5 requires Go 1.25 or later. Create a module and add Echo:

```bash
mkdir echo-demo && cd echo-demo
go mod init example.com/echo-demo
go get github.com/labstack/echo/v5
```

## A minimal server

Create `main.go`:

```go
package main

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v5"
)

func main() {
	e := echo.New()

	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "Hello, Echo!")
	})

	if err := e.Start(":8080"); err != nil {
		slog.Error("failed to start server", "error", err)
	}
}
```

Run it with `go run .` and open `http://localhost:8080` to see `Hello, Echo!`.

Every Echo handler returns an `error`. Returning one hands it to Echo's central error handler, which turns it into an HTTP response, so you don't write the error response in every handler.

Also check the error from `e.Start`. Ignoring it, as many examples do, hides problems like the port already being in use.

## A JSON POST handler

Add a `User` type and a handler that binds the request body to it:

```go
type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func createUser(c *echo.Context) error {
	var u User
	if err := c.Bind(&u); err != nil {
		return err
	}
	if u.Name == "" || u.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name and email are required")
	}
	return c.JSON(http.StatusCreated, u)
}
```

Register it in `main`, before `e.Start`:

```go
e.POST("/users", createUser)
```

`c.Bind` decodes the body based on the `Content-Type` header (JSON, XML or form data) and can also fill fields from path and query parameters tagged with `param` and `query`. If decoding fails it returns an error that Echo turns into a `400 Bad Request`. Binding doesn't validate anything, which is why the handler checks the fields itself; for larger structs, plug a validator such as `go-playground/validator` into `e.Validator`.

Test it with curl:

```bash
curl -X POST http://localhost:8080/users \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

The response is the same user as JSON with status `201 Created`.

## Middleware

Middleware wraps handlers to run code before or after them. Echo ships common ones in the `middleware` package. Here is the complete `main.go` with request logging and panic recovery added:

```go
package main

import (
	"log/slog"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/labstack/echo/v5/middleware"
)

type User struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

func createUser(c *echo.Context) error {
	var u User
	if err := c.Bind(&u); err != nil {
		return err
	}
	if u.Name == "" || u.Email == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "name and email are required")
	}
	return c.JSON(http.StatusCreated, u)
}

func main() {
	e := echo.New()

	e.Use(middleware.RequestLogger()) // logs each request with log/slog
	e.Use(middleware.Recover())       // turns panics into 500 responses instead of crashing

	e.GET("/", func(c *echo.Context) error {
		return c.String(http.StatusOK, "Hello, Echo!")
	})
	e.POST("/users", createUser)

	if err := e.Start(":8080"); err != nil {
		slog.Error("failed to start server", "error", err)
	}
}
```

Middleware registered with `e.Use` runs for every route, in the order it was added. Restart the server and each request now produces a log line.

Other built-in middleware worth knowing: `CORS`, `BodyLimit`, `Gzip`, `RateLimiter` and `ContextTimeout`. You can also apply middleware to a single route or to a group created with `e.Group("/api")`.

## Gotchas

- In v4, handlers take `echo.Context` (an interface); in v5 they take `*echo.Context`. Code and examples written for one won't compile against the other, so check which major version a tutorial targets.
- v4's `middleware.Logger()` does not exist in v5; use `middleware.RequestLogger()`.
- Be careful with `c.RealIP()` and the IP-based rate limiter behind proxies. Configure `e.IPExtractor` to match your proxy setup, or clients can spoof their IP with `X-Forwarded-For`.

## Further reading

- [Echo documentation](https://echo.labstack.com/)
- [Echo on pkg.go.dev](https://pkg.go.dev/github.com/labstack/echo/v5)
- [Echo middleware package](https://pkg.go.dev/github.com/labstack/echo/v5/middleware)
