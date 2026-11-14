---
description: Build a small in-memory books REST API with Gin in Go, covering routing, route groups, path parameters, JSON binding and status codes.
imgSrc: /imgs/2023/3053072516.webp
layout: '@/templates/BasePost.astro'
pubDate: '2025-04-12T02:45:18.000Z'
lastUpdated: 2026-11-14
tags:
  - go
title: Building a REST API in Go with the Gin framework
---

Gin is an HTTP web framework for Go. It gives you a router with path parameters and route groups, middleware, and helpers for binding and validating JSON, on top of the standard `net/http` package. This post builds a small CRUD API for books that you can run with `go run`.

## Setup

You need a recent Go toolchain (check the [Gin README](https://github.com/gin-gonic/gin) for the minimum supported version). Create a module and add Gin:

```bash
mkdir books-api && cd books-api
go mod init example.com/books-api
go get github.com/gin-gonic/gin
```

## Hello, Gin

```go
package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello, Gin!"})
	})
	r.Run() // listens on :8080 unless the PORT env var is set
}
```

`gin.Default()` returns an engine with the Logger and Recovery middleware already attached; use `gin.New()` if you want to choose middleware yourself. `r.Run()` with no arguments listens on `:8080`, or on the port in the `PORT` environment variable. Pass an address such as `r.Run(":3000")` to override it.

## A books API

The API exposes five endpoints under `/api/v1`:

- `GET /books`: list books
- `GET /books/:id`: get one book
- `POST /books`: create a book
- `PUT /books/:id`: replace a book
- `DELETE /books/:id`: delete a book

Books are kept in a map guarded by a mutex, because Gin serves each request on its own goroutine. Replace `main.go` with:

```go
package main

import (
	"net/http"
	"sort"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"
)

type Book struct {
	ID     int    `json:"id"`
	Title  string `json:"title" binding:"required"`
	Author string `json:"author" binding:"required"`
}

var (
	mu     sync.Mutex
	books  = map[int]Book{}
	nextID = 1
)

func main() {
	r := gin.Default()

	v1 := r.Group("/api/v1")
	{
		v1.GET("/books", getBooks)
		v1.GET("/books/:id", getBookByID)
		v1.POST("/books", addBook)
		v1.PUT("/books/:id", updateBook)
		v1.DELETE("/books/:id", deleteBook)
	}

	r.Run()
}

// parseID reads the :id path parameter and writes a 400 response if it isn't an integer.
func parseID(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id must be an integer"})
		return 0, false
	}
	return id, true
}

func getBooks(c *gin.Context) {
	mu.Lock()
	defer mu.Unlock()

	list := make([]Book, 0, len(books))
	for _, b := range books {
		list = append(list, b)
	}
	sort.Slice(list, func(i, j int) bool { return list[i].ID < list[j].ID })
	c.JSON(http.StatusOK, list)
}

func getBookByID(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	mu.Lock()
	defer mu.Unlock()

	b, found := books[id]
	if !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "book not found"})
		return
	}
	c.JSON(http.StatusOK, b)
}

func addBook(c *gin.Context) {
	var b Book
	if err := c.ShouldBindJSON(&b); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	b.ID = nextID
	nextID++
	books[b.ID] = b
	c.JSON(http.StatusCreated, b)
}

func updateBook(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var b Book
	if err := c.ShouldBindJSON(&b); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mu.Lock()
	defer mu.Unlock()

	if _, found := books[id]; !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "book not found"})
		return
	}
	b.ID = id
	books[id] = b
	c.JSON(http.StatusOK, b)
}

func deleteBook(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	mu.Lock()
	defer mu.Unlock()

	if _, found := books[id]; !found {
		c.JSON(http.StatusNotFound, gin.H{"error": "book not found"})
		return
	}
	delete(books, id)
	c.Status(http.StatusNoContent)
}
```

A few things worth noting:

- `r.Group("/api/v1")` prefixes every route registered on `v1`. The braces are only a visual block; Go doesn't require them.
- `c.Param("id")` always returns a string, so the handler converts it and returns 400 on bad input.
- `ShouldBindJSON` decodes the body and runs the `binding:"required"` validation tags. It returns an error and leaves the response to you. `BindJSON` (without `Should`) writes a 400 itself and aborts, which makes it harder to control the error body.
- Map iteration order is random in Go, so `getBooks` sorts by ID to give stable output.

## Trying it out

```bash
go run .

curl -X POST localhost:8080/api/v1/books \
  -H 'Content-Type: application/json' \
  -d '{"title":"The Go Programming Language","author":"Donovan & Kernighan"}'

curl localhost:8080/api/v1/books
curl localhost:8080/api/v1/books/1
curl -X DELETE localhost:8080/api/v1/books/1
```

Posting a body without `title` or `author` returns a 400 with the validator's error message.

## Next steps

- The data disappears on restart. Swap the map for a database (`database/sql`, `pgx`, or GORM) behind the same handlers.
- Set `gin.SetMode(gin.ReleaseMode)` (or `GIN_MODE=release`) in production to turn off debug logging of routes.
- Since Go 1.22, the standard library's `http.ServeMux` supports method and wildcard patterns like `GET /books/{id}`. For a small API like this one, that may be enough without a framework.

Further reading: [Gin documentation](https://gin-gonic.com/en/docs/) and the [Gin repository](https://github.com/gin-gonic/gin).
