---
title: Building Microservices with Go-Kit in Golang
description: ' Go-Kit offers a set of tools and best practices to develop and manage these services with ease.'
imgSrc: /imgs/2023/2269624161_forest.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-16T04:50:20.000Z'
tags: []
---

# Building Microservices with Go-Kit in Golang

In this technical article, we will discuss the Go-Kit library, a toolkit for building microservices in Golang. Microservices are a popular architectural pattern that decomposes an application into smaller, independently deployable and maintainable services. Go-Kit offers a set of tools and best practices to develop and manage these services with ease.

## What is Go-Kit?

[Go-Kit](https://gokit.io/) is an open-source, pluggable toolkit for building microservices in Golang. It provides a set of common components and design patterns, allowing developers to focus on writing business logic while keeping the architectural concerns organized and standardized.

Some key features of Go-Kit include:

- Middleware and decorator patterns to modularize cross-cutting concerns (e.g., logging, tracing, and authentication)
- Transport-agnostic service definitions
- Support for multiple transports, such as HTTP, gRPC, and NATS
- Service discovery and load balancing
- Circuit breaker and rate limiting for better resilience

## Getting Started

To get started with Go-Kit, first, install the library:

```sh
go get -u github.com/go-kit/kit
```

Now, let's create a simple example of a Go-Kit service.

## Example: String Service

In this example, we will create a simple string manipulation service that can concatenate and count the characters in a string.

### Step 1: Define the Service

Start by defining the service interface:

```go
package stringsvc

// StringService defines the service interface for string manipulation.
type StringService interface {
	Concat(a, b string) string
	Count(s string) int
}
```

### Step 2: Implement the Service

Next, implement the service by providing a concrete implementation of the `StringService` interface:

```go
package stringsvc

type stringServiceImpl struct{}

func NewStringService() StringService {
	return &stringServiceImpl{}
}

func (ss *stringServiceImpl) Concat(a, b string) string {
	return a + b
}

func (ss *stringServiceImpl) Count(s string) int {
	return len(s)
}
```

### Step 3: Define the Endpoints

Go-Kit uses the concept of _endpoints_ to decouple the service implementation from the transport layer. An endpoint represents a single RPC method and is transport-agnostic.

Define the endpoints for the `StringService`:

```go
package stringsvc

import (
	"context"

	"github.com/go-kit/kit/endpoint"
)

type StringEndpoints struct {
	ConcatEndpoint endpoint.Endpoint
	CountEndpoint  endpoint.Endpoint
}

func MakeStringEndpoints(s StringService) StringEndpoints {
	return StringEndpoints{
		ConcatEndpoint: makeConcatEndpoint(s),
		CountEndpoint:  makeCountEndpoint(s),
	}
}

func makeConcatEndpoint(s StringService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(ConcatRequest)
		result := s.Concat(req.A, req.B)
		return ConcatResponse{Result: result}, nil
	}
}

func makeCountEndpoint(s StringService) endpoint.Endpoint {
	return func(ctx context.Context, request interface{}) (interface{}, error) {
		req := request.(CountRequest)
		count := s.Count(req.S)
		return CountResponse{Count: count}, nil
	}
}
```

### Step 4: Add Transports

Now, let's add support for HTTP transport to expose our service over a RESTful API:

```go
package stringsvc

import (
	"context"
	"encoding/json"
	"net/http"

	httptransport "github.com/go-kit/kit/transport/http"
)

func NewHTTPHandler(endpoints StringEndpoints) http.Handler {
	m := http.NewServeMux()

	m.Handle("/concat", httptransport.NewServer(
		endpoints.ConcatEndpoint,
		decodeConcatRequest,
		encodeResponse,
	))

	m.Handle("/count", httptransport.NewServer(
		endpoints.CountEndpoint,
		decodeCountRequest,
		encodeResponse,
	))

	return m
}

func decodeConcatRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req ConcatRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func decodeCountRequest(_ context.Context, r *http.Request) (interface{}, error) {
	var req CountRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func encodeResponse(_ context.Context, w http.ResponseWriter, response interface{}) error {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	return json.NewEncoder(w).Encode(response)
}
```

### Step 5: Run the Service

Finally, create the main function to run the HTTP server:

```go
package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/yourusername/stringsvc"
)

func main(){
	// Create the service implementation
	service := stringsvc.NewStringService()

	// Create the service endpoints
	endpoints := stringsvc.MakeStringEndpoints(service)

	// Create the HTTP handler
	handler := stringsvc.NewHTTPHandler(endpoints)

	// Start the HTTP server
	port := "8080"
	fmt.Printf("Starting server on :%s...\n", port)
	err := http.ListenAndServe(":"+port, handler)
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}
```

Now, you can build and run the service:

```sh
go build -o stringsvc .
./stringsvc
```

To test the service, send HTTP requests to the `/concat` and `/count` endpoints:

```
curl -X POST -d '{"a": "hello", "b": "world"}' -H 'Content-Type: application/json' http://localhost:8080/concat
curl -X POST -d '{"s": "hello world"}' -H 'Content-Type: application/json' http://localhost:8080/count
```

## Conclusion

In this article, we explored Go-Kit, a toolkit for building microservices in Golang. We created a simple string manipulation service and demonstrated how to use Go-Kit to handle service definition, implementation, endpoints, and transports.

Go-Kit provides additional tools and best practices for building scalable, maintainable, and resilient microservices. You can further explore features such as logging, metrics, tracing, service discovery, load balancing, and more to enhance your microservices development experience.