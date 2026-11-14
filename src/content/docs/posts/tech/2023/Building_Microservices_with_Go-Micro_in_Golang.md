---
description: 'Write and call a Go Micro v6 service: handlers, mDNS and Consul service discovery, client-side load balancing, retries and timeouts.'
imgSrc: /imgs/2023/358691897-blank-card-on-brown-table.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-06-25T08:00:17.000Z'
lastUpdated: 2026-11-14
tags: ["go", "microservices"]
title: 'Go Micro basics: writing, discovering and calling services in Go'
---

:::caution
The first version of this post used `github.com/asim/go-micro/v3` and the `github.com/micro/go-plugins` repository. Both are out of date: Go Micro now lives at `go-micro.dev`, and plugins such as the Consul registry are part of the main module. The examples below use Go Micro v6 (v6.16.0 when this was checked). The Hystrix wrapper the old post used is gone; the circuit-breaker section has been replaced with the client's built-in retries and timeouts.
:::

[Go Micro](https://go-micro.dev/) is a Go framework for RPC services. You write a struct whose methods are handlers, and Go Micro registers the service in a registry, finds other services by name, picks an instance to call, and encodes requests (JSON by default, protobuf if you use it). Each of those parts (registry, selector, transport, codec, broker) is an interface you can swap.

## Setup

The `micro` CLI's install instructions ask for Go 1.26 or newer.

```sh
mkdir hello-service && cd hello-service
go mod init example.com/hello-service
go get go-micro.dev/v6@latest
go install go-micro.dev/v6/cmd/micro@latest
```

## A hello service

`main.go`:

```go
package main

import (
	"context"
	"log"

	"go-micro.dev/v6"
)

type HelloRequest struct {
	Name string `json:"name"`
}

type HelloResponse struct {
	Msg string `json:"msg"`
}

type Greeter struct{}

func (g *Greeter) Hello(ctx context.Context, req *HelloRequest, rsp *HelloResponse) error {
	rsp.Msg = "Hello, " + req.Name
	return nil
}

func main() {
	service := micro.NewService("hello")
	service.Init()

	if err := service.Handle(new(Greeter)); err != nil {
		log.Fatal(err)
	}
	if err := service.Run(); err != nil {
		log.Fatal(err)
	}
}
```

Each exported method with the shape `(ctx, *Request, *Response) error` becomes an endpoint named `Type.Method`, here `Greeter.Hello`. `service.Init()` also parses command-line flags, so options such as the registry can be set at startup.

Run it, then call it from another terminal:

```sh
go run .
```

```sh
micro call hello Greeter.Hello '{"name": "John"}'
```

```json
{"msg": "Hello, John"}
```

## Service discovery

The default registry is multicast DNS (`registry.NewMDNSRegistry()`), which works on a single machine or LAN with no extra infrastructure. It does not work where multicast is blocked, which includes most cloud networks and many container setups. For those, use a shared registry. Consul is one option:

```go
import (
	"go-micro.dev/v6"
	"go-micro.dev/v6/registry"
	"go-micro.dev/v6/registry/consul"
)

func main() {
	service := micro.NewService("hello",
		micro.Registry(consul.NewConsulRegistry(
			registry.Addrs("127.0.0.1:8500"),
		)),
	)
	// ...
}
```

Every service and client that should see each other must use the same registry. A local Consul agent for testing can be started with `consul agent -dev`.

## Calling a service from Go

Clients look services up by name, so the caller never needs an address. This client lives in its own module or directory and declares matching request and response types:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"go-micro.dev/v6"
	"go-micro.dev/v6/client"
)

type HelloRequest struct {
	Name string `json:"name"`
}

type HelloResponse struct {
	Msg string `json:"msg"`
}

func main() {
	service := micro.NewService("hello.client")
	service.Init()

	c := service.Client()
	req := c.NewRequest("hello", "Greeter.Hello", &HelloRequest{Name: "John"})

	var rsp HelloResponse
	err := c.Call(context.Background(), req, &rsp,
		client.WithRetries(3),
		client.WithRequestTimeout(5*time.Second),
	)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(rsp.Msg)
}
```

## Load balancing

Load balancing is done on the client. For each call, the client's selector gets the list of `hello` instances from the registry and picks one. The default strategy is **random**, not round-robin; `selector.RoundRobin` is available if you build a selector with `selector.SetStrategy(selector.RoundRobin)` and pass it to the client with `client.Selector(...)`.

To see it, start two or three copies of the service (each picks a free port and registers itself) and call it repeatedly. Calls spread across instances, but with the random strategy not in a strict rotation.

## Retries and timeouts

Instead of a separate circuit-breaker plugin, start with the client's own settings:

- `client.DefaultRetries` is 5 and `client.DefaultRequestTimeout` is 30 seconds.
- Override them per call with `client.WithRetries` and `client.WithRequestTimeout`, as in the client above, or for the whole client with `client.Retries` and `client.RequestTimeout`.
- `client.Retry(fn)` sets which errors are retried.

Retries on a call that changes state are only safe if the handler is idempotent.

If you need a real circuit breaker, wrap the client with `micro.WrapClient(...)` and implement the breaker in a `client.Wrapper`, for example around a library such as `sony/gobreaker`.

## Further reading

- [Go Micro docs](https://go-micro.dev/docs/)
- [Package reference](https://pkg.go.dev/go-micro.dev/v6)
- [Source and examples](https://github.com/micro/go-micro)
