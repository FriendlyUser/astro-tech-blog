---
title: Using graphql-go in Golang A Comprehensive Guide
pubDate: "2024-05-28T04:50:15.000Z"
description: "In this article, we will explore how to use the `graphql- library to build a GraphQL server in Golang"
tags: []
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.png
---
# Using graphql-go in Golang: A Comprehensive Guide

GraphQL is a query language for your API, and a runtime for executing those queries against your data. It provides a more efficient, powerful, and flexible alternative to the traditional REST API. In this article, we will explore how to use the `graphql- library to build a GraphQL server in Golang.

## Table of Contents

1. [Introduction to GraphQL](#introduction-to-graphql)
2. [Setting up the Project](#setting-up-the-project)
3. [Defining the GraphQL Schema](#defining-the-graphql-schema)
4. [Implementing Resolvers](#implementing-resolvers)
5. [Setting up the GraphQL Server](#setting-up-the-graphql-server)
6. [Testing the GraphQL Server](#testing-the-graphql-server)
7. [Conclusion](#conclusion)

## Introduction to GraphQL

GraphQL was developed by Facebook in 2012 and released as an open-source project in 2015. It addresses some of the limitations of REST APIs by allowing clients to request only the data they need, improving performance and reducing bandwidth usage. The key components of GraphQL are:

- **Queries**: Requests for data from the server.
- **Mutations**: Requests to change data on the server.
- **Schema**: A description of the types and fields available in the API.
- **Resolvers**: Functions that resolve the data for each field in the schema.

## Setting up the Project

To get started, make sure you have Go installed on your machine. You can check your installation by running `go version`. Next, create a new directory for your project and initialize it as a Go module:

```sh
mkdir graphql-go-example
cd graphql-go-example
go mod init github.com/yourusername/graphql-go-example
```

Now, we need to install the `graphql- library and its HTTP handler:

```sh
go get github.com/graphql-go/graphql
go get github.com/graphql-go/handler
```

## Defining the GraphQL Schema

First, let's define the schema for our example application. We'll create a simple `Book` type with a few fields:

```go
package main

import (
	"github.com/graphql-go/graphql"
)

// Book is a struct representing a book.
type Book struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Author string `json:"author"`
}

// Define the Book type for GraphQL.
var bookType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Book",
	Fields: graphql.Fields{
		"id": &graphql.Field{
			Type: graphql.String,
		},
		"title": &graphql.Field{
			Type: graphql.String,
		},
		"author": &graphql.Field{
			Type: graphql.String,
		},
	},
})
```

Now that we have our `Book` type, let's define the GraphQL schema. We'll create a query for fetching books and a mutation for adding new books:

```go
// Define the root query.
var queryType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Query",
	Fields: graphql.Fields{
		"book": &graphql.Field{
			Type:        bookType,
			Description: "Get a book by its ID",
			Args: graphql.FieldConfigArgument{
				"id": &graphql.ArgumentConfig{
					Type: graphql.String,
				},
			},
			Resolve: getBook,
		},
	},
})

// Define the root mutation.
var mutationType = graphql.NewObject(graphql.ObjectConfig{
	Name: "Mutation",
	Fields: graphql.Fields{
		"createBook": &graphql.Field{
			Type:        bookType,
			Description: "Create a new book",
			Args: graphql.FieldConfigArgument{
				"title": &graphql.ArgumentConfig{
					Type: graphql.NewNonNull(graphql.String),
				},
				"author": &graphql.ArgumentConfig{
					Type: graphql.NewNonNull(graphql.String),
				},
			},
			Resolve: createBook,
		},
	},
})

// Create the GraphQL schema.
var schema, _ = graphql.NewSchema(graphql.SchemaConfig{
	Query:    queryType,
	Mutation: mutationType,
})
```

## Implementing Resolvers

Now we need to implement the `getBook` and `createBook` resolver functions. For simplicity, we'll store our books in a map:

```go
var books = make(map[string]*Book)

func getBook(params graphql.ResolveParams) (interface{}, error) {
	id, ok := params.Args["id"].(string)
	if ok {
		return books[id], nil
	}
	return nil, errors.New("book not found")
}

func createBook(params graphql.ResolveParams) (interface{}, error) {
	title, _ := params.Args["title"].(string)
	author, _ := params.Args["author"].(string)
	id := strconv.Itoa(len(books) + 1)
book := &Book{
		ID:     id,
		Title:  title,
		Author: author,
	}
	books[id] = book
	return book, nil
}

## Setting up the GraphQL Server

Now that we have our schema and resolvers implemented, let's set up the GraphQL server using the `handler` package. We'll create a simple HTTP server that listens on port 8080:

```go
package main

import (
	"net/http"

	"github.com/graphql-go/handler"
)

func main() {
	// Create a new GraphQL HTTP handler.
	h := handler.New(&handler.Config{
		Schema:   &schema,
		Pretty:   true,
		GraphiQL: true,
	})

	// Set up the HTTP server.
	http.Handle("/graphql", h)
	http.ListenAndServe(":8080", nil)
}
```

Here, we create a new GraphQL HTTP handler with our schema and enable pretty-printed JSON responses and the GraphiQL in-browser IDE. Then, we register the handler at the `/graphql` endpoint and start the HTTP server.

## Testing the GraphQL Server

To test our GraphQL server, start the application by running `go run main.. Then, open your browser and navigate to `http://localhost:8080/graphql`. You should see the GraphiQL interface.

To create a new book, enter the following mutation in the left pane:

```graphql
mutation {
  createBook(title: "The Catcher in the Rye", author: "J.D. Salinger") {
    id
    title
    author
  }
}
```

Click the "Run" button, and you should see the created book in the right pane. Now, let's query the book by its ID:

```graphql
query {
  book(id: "1") {
    id
    title
    author
  }
}
```

Again, click the "Run" button, and you should see the book's details in the right pane.

## Conclusion

In this article, we demonstrated how to build a simple GraphQL server in Golang using the `graphql- library. We defined a basic schema for our `Book` type, implemented resolvers for fetching and creating books, and set up a GraphQL server using the `handler` package.

This example serves as a starting point for more complex applications. You can extend the schema with additional types and fields, implement relationships between types, and connect your server to a database for persistent storage. The `graphql- library provides a flexible and efficient way to build GraphQL APIs in Golang, enabling you to take advantage of the numerous benefits of GraphQL.
