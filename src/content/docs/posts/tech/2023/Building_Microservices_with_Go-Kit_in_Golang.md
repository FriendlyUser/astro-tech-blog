---
title: "Go kit basics: services, endpoints and HTTP transport in Go"
description: 'Build a small string service with Go kit: define the service, wrap it in endpoints, expose it over HTTP, and add logging middleware.'
imgSrc: /imgs/2023/2269624161_forest.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-03-16T04:50:20.000Z'
lastUpdated: 2026-11-14
tags: ["go", "microservices"]
---

[Go kit](https://gokit.io/) is a set of Go packages for building services. It is a toolkit, not a framework: you write a plain Go interface for your business logic, and Go kit gives you the pieces to wrap it in endpoints, transports (HTTP, gRPC, NATS and others), and middleware such as logging, rate limiting, circuit breaking and service discovery.

The cost is boilerplate. Each method needs request and response types, an endpoint, and decode/encode functions per transport. That pays off when you want the same service exposed over several transports with shared middleware; for a single JSON API, `net/http` alone is less code.

This post was checked against Go kit v0.13.0 (May 2023), which is still the latest tagged release.

## Setup

```sh
mkdir stringsvc && cd stringsvc
go mod init example.com/stringsvc
go get github.com/go-kit/kit@v0.13.0
```

The example is a service with two methods: concatenate two strings, and count the characters in a string. The service code lives in the module root (package `stringsvc`) and the binary in `cmd/stringsvc`.

## 1. Define and implement the service

`service.go`:

```go
package stringsvc

import "unicode/utf8"

// StringService is the business logic. It knows nothing about HTTP.
type StringService interface {
	Concat(a, b string) string
	Count(s string) int
}

type stringService struct{}

func NewStringService() StringService {
	return stringService{}
}

func (stringService) Concat(a, b string) string {
	return a + b
}

// Count returns the number of characters (runes), not bytes.
func (stringService) Count(s string) int {
	return utf8.RuneCountInString(s)
}
```

## 2. Wrap each method in an endpoint

An endpoint is Go kit's unit of RPC: `func(ctx context.Context, request any) (response any, err error)`. Endpoints are transport-agnostic, so the same endpoint can be served over HTTP and gRPC, and middleware written for endpoints applies to both.

`endpoints.go`:

```go
package stringsvc

import (
	"context"

	"github.com/go-kit/kit/endpoint"
)

type ConcatRequest struct {
	A string `json:"a"`
	B string `json:"b"`
}

type ConcatResponse struct {
	Result string `json:"result"`
}

type CountRequest struct {
	S string `json:"s"`
}

type CountResponse struct {
	Count int `json:"count"`
}

type Endpoints struct {
	Concat endpoint.Endpoint
	Count  endpoint.Endpoint
}

func MakeEndpoints(s StringService) Endpoints {
	return Endpoints{
		Concat: func(_ context.Context, request any) (any, error) {
			req := request.(ConcatRequest)
			return ConcatResponse{Result: s.Concat(req.A, req.B)}, nil
		},
		Count: func(_ context.Context, request any) (any, error) {
			req := request.(CountRequest)
			return CountResponse{Count: s.Count(req.S)}, nil
		},
	}
}
```

The type assertions are safe because the decode functions below are the only things that produce these requests.

## 3. Add an HTTP transport

The HTTP transport turns an `*http.Request` into a request value, calls the endpoint, and encodes the response. Go kit ships `EncodeJSONResponse` for the common case.

`transport_http.go`:

```go
package stringsvc

import (
	"context"
	"encoding/json"
	"net/http"

	httptransport "github.com/go-kit/kit/transport/http"
)

func NewHTTPHandler(e Endpoints) http.Handler {
	mux := http.NewServeMux()
	mux.Handle("POST /concat", httptransport.NewServer(
		e.Concat, decodeConcatRequest, httptransport.EncodeJSONResponse,
	))
	mux.Handle("POST /count", httptransport.NewServer(
		e.Count, decodeCountRequest, httptransport.EncodeJSONResponse,
	))
	return mux
}

func decodeConcatRequest(_ context.Context, r *http.Request) (any, error) {
	var req ConcatRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}

func decodeCountRequest(_ context.Context, r *http.Request) (any, error) {
	var req CountRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	return req, err
}
```

The `"POST /concat"` patterns use the method matching added to `http.ServeMux` in Go 1.22. If a decode function returns an error, Go kit's default error encoder responds with a 500; pass `httptransport.ServerErrorEncoder(...)` to `NewServer` to map errors to other status codes.

## 4. Add middleware

Middleware is where Go kit earns its keep. An endpoint middleware is a `func(endpoint.Endpoint) endpoint.Endpoint`, so one function can log every call regardless of transport. Add this to `endpoints.go` (it also needs `"log"` and `"time"` in the imports):

```go
func LoggingMiddleware(name string) endpoint.Middleware {
	return func(next endpoint.Endpoint) endpoint.Endpoint {
		return func(ctx context.Context, request any) (any, error) {
			start := time.Now()
			resp, err := next(ctx, request)
			log.Printf("method=%s took=%s err=%v", name, time.Since(start), err)
			return resp, err
		}
	}
}
```

The same pattern is how Go kit's `ratelimit` and `circuitbreaker` packages plug in.

## 5. Run it

`cmd/stringsvc/main.go`:

```go
package main

import (
	"log"
	"net/http"

	"example.com/stringsvc"
)

func main() {
	svc := stringsvc.NewStringService()

	e := stringsvc.MakeEndpoints(svc)
	e.Concat = stringsvc.LoggingMiddleware("concat")(e.Concat)
	e.Count = stringsvc.LoggingMiddleware("count")(e.Count)

	log.Println("listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", stringsvc.NewHTTPHandler(e)))
}
```

```sh
go run ./cmd/stringsvc
```

In another terminal:

```sh
curl -X POST -d '{"a": "hello", "b": "world"}' http://localhost:8080/concat
# {"result":"helloworld"}
curl -X POST -d '{"s": "héllo"}' http://localhost:8080/count
# {"count":5}
```

## Where to go next

- Go kit's own [stringsvc examples](https://gokit.io/examples/stringsvc.html) build this up further with instrumentation and calling other services.
- The `sd` packages cover service discovery (Consul, etcd, DNS SRV and others) and client-side load balancing.
- The [package docs](https://pkg.go.dev/github.com/go-kit/kit) list every transport and middleware.

If you don't need multiple transports or shared endpoint middleware, plain `net/http` or a gRPC server on its own is simpler.
