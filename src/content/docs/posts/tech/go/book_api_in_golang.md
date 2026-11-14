---
tags: ['go', 'googlebooks', 'deta', 'openapi']
title: How I made a book API in Go with OpenAPI Generator and Google Books
description: How I generated a Go server from an OpenAPI spec and wired its one endpoint to the Google Books API, plus the bugs I fixed in the service code.
pubDate: Fri, 10 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1246994641.png"
---

:::caution
I originally deployed this to Deta Space, which has since shut down. The Spacefile section is kept for reference; the repo also has a Dockerfile that runs on any container host.
:::

This is a toy project: a small Go HTTP API with one endpoint, `GET /book`, that forwards a search to the [Google Books API](https://developers.google.com/books/docs/v1/using) and returns the results as JSON. Google Books lets you search its catalogue and get volume metadata such as title, authors, publication date, description and cover links. Public searches need an API key; anything involving a user's bookshelves needs OAuth.

Rather than write the HTTP plumbing by hand, I described the endpoint in an OpenAPI spec and generated a Go server from it. The generator writes the routing, parameter parsing and JSON encoding, and I only fill in the service method. If the spec changes, I regenerate and the handler signatures stay in sync with it.

## Generating the server

The repo uses the [OpenAPI Generator](https://openapi-generator.tech/) `go-server` generator, which puts the generated package in a `go/` directory:

```sh
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g go-server -o .
```

Two interfaces come out of it. The router binds HTTP requests to handlers; the servicer is where the business logic goes:

```go
// BookApiRouter defines the required methods for binding the api requests to a responses for the BookApi
type BookApiRouter interface {
	BookGetBook(http.ResponseWriter, *http.Request)
}

// BookApiServicer defines the api actions for the BookApi service
type BookApiServicer interface {
	BookGetBook(context.Context, string, string, string, int32, int32, string, string) (ImplResponse, error)
}
```

The eight `BookGetBook` arguments are the request context and the query parameters from my spec, which mirror Google's: `q`, `filter`, `download`, `startIndex`, `maxResults`, `printType` and `orderBy`.

The generated controller reads those parameters from the query string, calls the service, and encodes the result:

```go
func (c *BookApiController) BookGetBook(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	qParam := query.Get("q")
	filterParam := query.Get("filter")
	downloadParam := query.Get("download")
	startIndexParam, err := parseInt32Parameter(query.Get("startIndex"), false)
	if err != nil {
		c.errorHandler(w, r, &ParsingError{Err: err}, nil)
		return
	}
	maxResultsParam, err := parseInt32Parameter(query.Get("maxResults"), false)
	if err != nil {
		c.errorHandler(w, r, &ParsingError{Err: err}, nil)
		return
	}
	printTypeParam := query.Get("printType")
	orderByParam := query.Get("orderBy")
	result, err := c.service.BookGetBook(r.Context(), qParam, filterParam, downloadParam, startIndexParam, maxResultsParam, printTypeParam, orderByParam)
	if err != nil {
		c.errorHandler(w, r, err, &result)
		return
	}
	EncodeJSONResponse(result.Body, &result.Code, w)
}
```

The rest of the generated code (`routers.go`) builds a [gorilla/mux](https://github.com/gorilla/mux) router from the route table and provides helpers such as `EncodeJSONResponse` and `parseInt32Parameter`. I didn't touch it.

## The service

This is the only file I wrote by hand. Add `go/api_book_service.go` to `.openapi-generator-ignore` so regenerating doesn't overwrite it.

My first version had a few bugs: it ignored the error from `http.Get` (so a network failure caused a nil-pointer panic on `resp.Body`), never checked the status code or the JSON decode error, dropped four of the seven parameters, and printed the request URL, API key included, to stdout. The version below fixes those:

```go
package openapi

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
)

type BookApiService struct{}

func NewBookApiService() BookApiServicer {
	return &BookApiService{}
}

// BookGetBook - Get book details
func (s *BookApiService) BookGetBook(ctx context.Context, q string, filter string, download string, startIndex int32, maxResults int32, printType string, orderBy string) (ImplResponse, error) {
	if q == "" {
		return Response(http.StatusBadRequest, nil), errors.New("q is required")
	}
	key := GetEnvVar("GOOGLE_BOOK_API_KEY", "")
	if key == "" {
		return Response(http.StatusInternalServerError, nil), errors.New("GOOGLE_BOOK_API_KEY is not set")
	}

	params := url.Values{}
	params.Set("q", q)
	params.Set("key", key)
	if filter != "" {
		params.Set("filter", filter)
	}
	if download != "" {
		params.Set("download", download)
	}
	if startIndex > 0 {
		params.Set("startIndex", strconv.Itoa(int(startIndex)))
	}
	if maxResults > 0 {
		params.Set("maxResults", strconv.Itoa(int(maxResults)))
	}
	if printType != "" {
		params.Set("printType", printType)
	}
	if orderBy != "" {
		params.Set("orderBy", orderBy)
	}

	endpoint := "https://www.googleapis.com/books/v1/volumes?" + params.Encode()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return Response(http.StatusInternalServerError, nil), err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Response(http.StatusBadGateway, nil), err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Response(http.StatusBadGateway, nil), fmt.Errorf("google books returned %s", resp.Status)
	}

	var bookResponse GoogleBookResponse
	if err := json.NewDecoder(resp.Body).Decode(&bookResponse); err != nil {
		return Response(http.StatusBadGateway, nil), err
	}
	return Response(http.StatusOK, bookResponse), nil
}
```

`GoogleBookResponse` (in `go/types.go`) is a struct mirroring Google's volume search response, and `GetEnvVar` (in `go/helpers.go`) returns an environment variable or a default. Using `NewRequestWithContext` with the incoming request's context means the upstream call is cancelled if the client disconnects.

## main.go

```go
package main

import (
	"log"
	"net/http"

	openapi "github.com/FriendlyUser/bookapi/go"
)

func main() {
	log.Printf("Server started")

	BookApiService := openapi.NewBookApiService()
	BookApiController := openapi.NewBookApiController(BookApiService)

	router := openapi.NewRouter(BookApiController)
	port := openapi.GetEnvVar("PORT", "8080")
	log.Fatal(http.ListenAndServe(":"+port, router))
}
```

Run it with `GOOGLE_BOOK_API_KEY=... go run main.go`, then try `curl "http://localhost:8080/book?q=dune&maxResults=5"`.

## Deploying to Deta Space

I hosted it on Deta Space. The `Spacefile` in the repo root told Space how to build and run the app and prompted for the API key as an environment variable:

```yaml
v: 0
micros:
  - name: go-app
    src: .
    engine: custom
    commands:
      - go get
      - go build main.go
    run: ./main
    include:
      - main
    presets:
      env:
        - name: GOOGLE_BOOK_API_KEY
          description: Google Books API Key
```

With the `custom` engine, Space ran the build `commands`, kept only the files listed under `include` (the compiled `main` binary), and started the app with `run`.

## References

- https://github.com/FriendlyUser/bookapi
- [Google Books API: using the API](https://developers.google.com/books/docs/v1/using)
- [OpenAPI Generator go-server docs](https://openapi-generator.tech/docs/generators/go-server)
