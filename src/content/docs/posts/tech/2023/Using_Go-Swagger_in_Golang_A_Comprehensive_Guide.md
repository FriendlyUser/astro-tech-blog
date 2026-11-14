---
description: Use go-swagger to validate a Swagger 2.0 spec, generate a Go server and client from it, and wire up a handler for a small todo API.
imgSrc: /imgs/2023/3063879952.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-11-01T19:53:10.000Z'
lastUpdated: 2026-11-14
tags:
  - go
title: Generating a Go API server and client from a Swagger spec with go-swagger
---

go-swagger is a code generator and toolkit for the Swagger 2.0 (OpenAPI 2.0) specification in Go. You write the API contract in YAML, and `swagger` generates the models, request parameter parsing and validation, routing, a runnable server, and a typed client. You fill in the handlers.

:::note
go-swagger supports **Swagger 2.0 only**; it does not support OpenAPI 3.x. If your spec is OpenAPI 3, look at a generator such as [oapi-codegen](https://github.com/oapi-codegen/oapi-codegen) instead.
:::

## Installation

Either download a prebuilt binary from the [releases page](https://github.com/go-swagger/go-swagger/releases/latest), or build it with Go:

```sh
go install github.com/go-swagger/go-swagger/cmd/swagger@latest
```

`go install` puts the binary in `$(go env GOPATH)/bin`, so make sure that directory is on your `PATH`. Building from source needs a recent Go toolchain; the [install docs](https://goswagger.io/go-swagger/install/) list the current requirement. (The older `go get -u .../cmd/swagger` command no longer installs binaries in module mode.)

## Writing the spec

Start a module and save this as `swagger.yaml`:

```sh
mkdir todo && cd todo
go mod init example.com/todo
```

```yaml
swagger: '2.0'
info:
  title: Todo API
  description: A simple Todo API
  version: 1.0.0
basePath: /api/v1
schemes:
  - http
consumes:
  - application/json
produces:
  - application/json
paths:
  /todos:
    get:
      tags:
        - todos
      operationId: listTodos
      summary: List all todos
      responses:
        '200':
          description: An array of todos
          schema:
            type: array
            items:
              $ref: '#/definitions/Todo'
definitions:
  Todo:
    type: object
    properties:
      id:
        type: integer
        format: int64
      title:
        type: string
      completed:
        type: boolean
```

`tags` and `operationId` matter more than they look: go-swagger uses the first tag as the Go package name for the operation and the `operationId` for the generated type names. Without them you get names derived from the method and path.

Validate the spec before generating anything:

```sh
swagger validate ./swagger.yaml
```

This checks the document against the Swagger 2.0 schema and reports problems such as unresolved `$ref`s or invalid parameter definitions.

## Generating the server and client

```sh
swagger generate server -A todo -f ./swagger.yaml
swagger generate client -A todo -f ./swagger.yaml
go mod tidy
```

`-A todo` sets the application name, which drives identifiers such as `operations.TodoAPI` and the `cmd/todo-server` directory. The server generator writes:

- `models/` with a `Todo` struct
- `restapi/operations/todos/` with the `ListTodos` parameters, responses, and handler types
- `restapi/configure_todo.go`, the one file meant for you to edit
- `cmd/todo-server/main.go`

The client generator writes a `client/` package you can import from other Go programs.

## Implementing the handler

Everything under `restapi/operations` is regenerated each time you run `swagger generate server`, so don't put code there. go-swagger generates `restapi/configure_todo.go` once and won't overwrite it later; that's where handlers go. The generated `configureAPI` assigns a placeholder that returns `middleware.NotImplemented(...)`; replace it with a real handler:

```go
func configureAPI(api *operations.TodoAPI) http.Handler {
	// ...generated setup code...

	api.TodosListTodosHandler = todos.ListTodosHandlerFunc(func(params todos.ListTodosParams) middleware.Responder {
		items := []*models.Todo{
			{ID: 1, Title: "First Todo", Completed: false},
			{ID: 2, Title: "Second Todo", Completed: true},
		}
		return todos.NewListTodosOK().WithPayload(items)
	})

	// ...generated setup code...
	return setupGlobalMiddleware(api.Serve(setupMiddlewares))
}
```

Add `example.com/todo/models` to the imports; the file already imports `middleware` (`github.com/go-openapi/runtime/middleware`), `operations`, and `todos`. Note that the local variable is `items`, not `todos`: naming it `todos` would shadow the `todos` package and the `NewListTodosOK` call wouldn't compile.

The generated handler field is named after the tag and operation ID (`Todos` + `ListTodos`), and the response constructor after the operation ID and status (`NewListTodosOK`). The array payload is `[]*models.Todo`.

All three `Todo` properties are optional, so the generated fields are plain `int64`, `string`, and `bool` and the struct literal above works as written. If you add a `required` list to the definition, those properties generally become pointer fields (for example `*string`) so validation can tell "missing" from a zero value, and you'll need to take addresses when building values. The go-swagger docs on schema generation describe the exact nullability rules.

## Running it

```sh
go run ./cmd/todo-server --port 8080
curl http://localhost:8080/api/v1/todos
```

Without `--port` (or the `PORT` environment variable), the generated server listens on a random port and prints it on startup.

## Gotchas

- Regenerating overwrites everything except `configure_<app>.go`. Commit the spec and treat the generated code as build output.
- Generated code depends on the `github.com/go-openapi/*` packages, so `go mod tidy` after each generation.
- go-swagger can also work the other way round and generate a spec from annotated Go code (`swagger generate spec`), but you then maintain the annotations instead of the YAML.

Further reading: [go-swagger documentation](https://goswagger.io/go-swagger/), including the [todo-list tutorial](https://goswagger.io/go-swagger/tutorial/todo-list/), and the [GitHub repository](https://github.com/go-swagger/go-swagger).
