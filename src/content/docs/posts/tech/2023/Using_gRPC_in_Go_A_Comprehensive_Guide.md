---
description: "Build a gRPC service in Go: define it in Protocol Buffers, generate code with protoc-gen-go and protoc-gen-go-grpc, then write the server and client."
imgSrc: /imgs/2023/2892583015.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-01T18:40:54.000Z'
lastUpdated: 2026-11-14
tags: ["go", "microservices"]
title: "gRPC in Go: define a service, generate code, and write a server and client"
---

:::caution
An earlier version of this post used `github.com/golang/protobuf/protoc-gen-go` with `--go_out=plugins=grpc`. That module is deprecated in favour of `google.golang.org/protobuf`, and the `plugins=grpc` option has been removed; gRPC code now comes from a separate `protoc-gen-go-grpc` plugin. `grpc.Dial` and `grpc.WithInsecure` are also deprecated. The steps below use the current tooling.
:::

[gRPC](https://grpc.io/) is an RPC framework: you describe a service and its messages in a `.proto` file, generate client and server code for your language, and call remote methods as if they were local functions. Messages are serialised with Protocol Buffers and sent over HTTP/2, which gives you a compact binary format, a typed contract between services, and streaming in both directions.

This post builds a one-method `ExampleService` in Go, with a server and a client.

## Install the tools

You need Go, the Protocol Buffers compiler `protoc` (download it from the [protobuf releases page](https://github.com/protocolbuffers/protobuf/releases) or your package manager), and the two Go code generators:

```bash
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

`protoc` finds plugins on your `PATH`, so make sure Go's bin directory is on it:

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

## Project layout

```text
grpc-demo/
├── go.mod
├── example/
│   └── example.proto
├── server/
│   └── main.go
└── client/
    └── main.go
```

Create the module:

```bash
mkdir grpc-demo && cd grpc-demo
go mod init example.com/grpc-demo
```

The server and client each get their own directory because both are `package main`; two `main` functions in one directory won't build together.

## Define the service

`example/example.proto`:

```protobuf
syntax = "proto3";

package example;

option go_package = "example.com/grpc-demo/example";

service ExampleService {
  rpc SayHello (HelloRequest) returns (HelloResponse);
}

message HelloRequest {
  string name = 1;
}

message HelloResponse {
  string message = 1;
}
```

`go_package` tells the generator the Go import path of the generated code. Current `protoc-gen-go` requires it.

Generate the code from the project root:

```bash
protoc --go_out=. --go_opt=paths=source_relative \
  --go-grpc_out=. --go-grpc_opt=paths=source_relative \
  example/example.proto
```

This writes two files next to the `.proto`:

- `example/example.pb.go`: the message types (`HelloRequest`, `HelloResponse`).
- `example/example_grpc.pb.go`: the `ExampleServiceServer` interface, `RegisterExampleServiceServer`, and the `ExampleServiceClient`.

Then pull in the runtime dependencies:

```bash
go mod tidy
```

## Write the server

`server/main.go`:

```go
package main

import (
	"context"
	"log"
	"net"

	"google.golang.org/grpc"

	pb "example.com/grpc-demo/example"
)

type server struct {
	pb.UnimplementedExampleServiceServer
}

func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloResponse, error) {
	return &pb.HelloResponse{Message: "Hello, " + req.GetName()}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterExampleServiceServer(s, &server{})

	log.Printf("gRPC server listening at %v", lis.Addr())
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

Embedding `pb.UnimplementedExampleServiceServer` is required by the generated code. It makes any method you haven't implemented return an `Unimplemented` error, so adding a new RPC to the `.proto` doesn't break the build of existing servers.

Use the generated getters like `req.GetName()` rather than reading fields directly: they are nil-safe.

## Write the client

`client/main.go`:

```go
package main

import (
	"context"
	"log"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	pb "example.com/grpc-demo/example"
)

func main() {
	conn, err := grpc.NewClient("localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	defer conn.Close()

	client := pb.NewExampleServiceClient(conn)

	name := "World"
	if len(os.Args) > 1 {
		name = os.Args[1]
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: name})
	if err != nil {
		log.Fatalf("SayHello failed: %v", err)
	}
	log.Printf("Response: %s", resp.GetMessage())
}
```

`grpc.NewClient` does not connect immediately. The connection is made on the first RPC, so a server that isn't running shows up as an error from `SayHello`, not from `NewClient`.

`insecure.NewCredentials()` disables TLS, which is fine for local testing. In production, use `credentials.NewTLS` or your platform's credentials instead.

## Run it

In one terminal:

```bash
go run ./server
```

In another:

```bash
go run ./client Alice
```

The client logs (after the timestamp `log` adds):

```text
Response: Hello, Alice
```

## Next steps and gotchas

- **Deadlines.** Always set a timeout on the client context, as above. Without one, a hung server can block the caller indefinitely.
- **Errors.** Return errors from handlers with `status.Error(codes.NotFound, "...")` from `google.golang.org/grpc/status` and `google.golang.org/grpc/codes`, so clients get a proper gRPC status code instead of `Unknown`.
- **Debugging with grpcurl.** Register server reflection with `reflection.Register(s)` from `google.golang.org/grpc/reflection`, then tools like [grpcurl](https://github.com/fullstorydev/grpcurl) can list and call your methods without the `.proto` file.
- **Browsers.** Browsers can't speak native gRPC directly. Use gRPC-Web or Connect if a web front end needs to call the service.

## Further reading

- [gRPC Go quick start](https://grpc.io/docs/languages/go/quickstart/)
- [gRPC Go basics tutorial](https://grpc.io/docs/languages/go/basics/)
- [Protocol Buffers Go generated code guide](https://protobuf.dev/reference/go/go-generated/)
