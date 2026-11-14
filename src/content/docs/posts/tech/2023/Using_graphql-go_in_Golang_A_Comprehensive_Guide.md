---
description: Build a small GraphQL server in Go with graphql-go and graphql-go/handler, with a book type, a query, a mutation and GraphiQL for testing.
imgSrc: /imgs/2023/1231025858.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-05-28T04:50:15.000Z'
lastUpdated: 2026-11-14
tags: ["go", "graphql"]
title: "Building a GraphQL server in Go with graphql-go"
---

[graphql-go](https://github.com/graphql-go/graphql) is a Go implementation of GraphQL where you define the schema in Go code: object types, fields, arguments and a resolver function per field. Its companion package [graphql-go/handler](https://github.com/graphql-go/handler) serves that schema over HTTP. This post builds a small in-memory book API with one query and one mutation.

The code was checked against `graphql-go/graphql` v0.8.1 and `graphql-go/handler` v0.2.4, the latest tagged releases.

## Set up the module

```sh
mkdir graphql-go-example
cd graphql-go-example
go mod init example.com/graphql-go-example
go get github.com/graphql-go/graphql@v0.8.1 github.com/graphql-go/handler@v0.2.4
```

## Define the Book type

A GraphQL object type is a `graphql.NewObject` with a name and fields. `graphql.NewNonNull` marks a field that is never null:

```go
type Book struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Author string `json:"author"`
}

var bookType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Book",
	Fields: graphql.Fields{
		"id":     &graphql.Field{Type: graphql.NewNonNull(graphql.ID)},
		"title":  &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
		"author": &graphql.Field{Type: graphql.NewNonNull(graphql.String)},
	},
})
```

Fields without a `Resolve` function use the default resolver, which reads the matching struct field: first by Go field name (case-insensitive), then by the `json` or `graphql` struct tag. So `"title"` maps to `Book.Title`.

## Write the resolvers

Resolvers receive `graphql.ResolveParams` and return the value for the field. Books live in a map. The HTTP server handles requests on separate goroutines, so the map needs a mutex:

```go
var (
	mu    sync.Mutex
	books = map[string]*Book{}
)

func getBook(p graphql.ResolveParams) (interface{}, error) {
	id, _ := p.Args["id"].(string)
	mu.Lock()
	defer mu.Unlock()
	book, ok := books[id]
	if !ok {
		return nil, nil // unknown id resolves to null
	}
	return book, nil
}

func createBook(p graphql.ResolveParams) (interface{}, error) {
	title, _ := p.Args["title"].(string)
	author, _ := p.Args["author"].(string)
	mu.Lock()
	defer mu.Unlock()
	id := strconv.Itoa(len(books) + 1)
	book := &Book{ID: id, Title: title, Author: author}
	books[id] = book
	return book, nil
}
```

Returning `nil, nil` for a missing book gives `"book": null`, which is what GraphQL clients expect for "not found". Return an error only when something actually failed.

## Build the schema

The root `Query` and `Mutation` types are ordinary objects whose fields take arguments. `graphql.NewSchema` validates everything and returns an error if, for example, a type is misconfigured, so check it rather than discarding it:

```go
func newSchema() (graphql.Schema, error) {
	queryType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Query",
		Fields: graphql.Fields{
			"book": &graphql.Field{
				Type:        bookType,
				Description: "Get a book by its ID",
				Args: graphql.FieldConfigArgument{
					"id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.ID)},
				},
				Resolve: getBook,
			},
		},
	})

	mutationType := graphql.NewObject(graphql.ObjectConfig{
		Name: "Mutation",
		Fields: graphql.Fields{
			"createBook": &graphql.Field{
				Type:        bookType,
				Description: "Create a new book",
				Args: graphql.FieldConfigArgument{
					"title":  &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
					"author": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
				},
				Resolve: createBook,
			},
		},
	})

	return graphql.NewSchema(graphql.SchemaConfig{
		Query:    queryType,
		Mutation: mutationType,
	})
}
```

## Serve it over HTTP

`handler.New` turns the schema into an `http.Handler`. `GraphiQL: true` serves the GraphiQL editor when you open the endpoint in a browser, and `Pretty: true` indents the JSON responses.

```go
func main() {
	schema, err := newSchema()
	if err != nil {
		log.Fatalf("building schema: %v", err)
	}

	h := handler.New(&handler.Config{
		Schema:   &schema,
		Pretty:   true,
		GraphiQL: true,
	})

	http.Handle("/graphql", h)
	log.Println("listening on http://localhost:8080/graphql")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

All of the snippets above go in one `main.go`, in `package main`, with these imports:

```go
import (
	"log"
	"net/http"
	"strconv"
	"sync"

	"github.com/graphql-go/graphql"
	"github.com/graphql-go/handler"
)
```

## Try it

Run `go run .` and open `http://localhost:8080/graphql` to get GraphiQL. Create a book:

```graphql
mutation {
  createBook(title: "The Catcher in the Rye", author: "J.D. Salinger") {
    id
    title
    author
  }
}
```

Then fetch it by ID:

```graphql
query {
  book(id: "1") {
    id
    title
    author
  }
}
```

Or skip the browser and use curl:

```sh
curl -X POST http://localhost:8080/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ book(id: \"1\") { id title author } }"}'
```

## Things to know

- **Data is in memory.** Restarting the server loses every book. Swap the map for a database call inside the resolvers; nothing else changes.
- **The ID scheme is a toy.** `len(books) + 1` works only because nothing is ever deleted.
- **graphql-go is code-first and slow-moving.** You build the schema in Go, which gets verbose as it grows, and the last tagged release is from 2023. If you'd rather write the schema in GraphQL SDL and generate typed Go resolvers, look at [gqlgen](https://gqlgen.com/).
- **GraphiQL is for development.** Turn `GraphiQL` off, or put the endpoint behind auth, before exposing the server publicly.
