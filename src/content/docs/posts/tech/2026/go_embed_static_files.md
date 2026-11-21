---
title: "Shipping a single Go binary with embed"
description: "Bundle static files and templates into a Go binary with //go:embed and embed.FS, serve them with http.FileServerFS, and keep a dev mode that reads from disk."
tags: ["Go", "embed", "net/http", "html/template", "Deployment"]
pubDate: "2026-07-21T16:00:00.000Z"
imgSrc: "/imgs/2026/go_embed_static_files.webp"
imgAlt: "A single binary block containing a folder tree of templates, CSS and a VERSION file, with an arrow out to a browser window"
---

The `embed` package lets you compile files into a Go binary: CSS, JavaScript, HTML templates, SQL migrations, a default config. The result is one file you can copy to a server or into a `FROM scratch` container image, with no "forgot to deploy the templates folder" class of bug. This post builds a small web app that serves embedded static files and templates, then adds a `-dev` flag that reads the same files from disk so you can edit them without rebuilding.

Examples use Go 1.26. The full app was built and run on the Go playground, with requests sent through `httptest`.

## The directive

A `//go:embed` comment directly above a package-level variable tells the compiler to fill it with file contents at build time. There are three variable types you can use:

```go
import "embed"

//go:embed VERSION
var version string // one file, as a string

//go:embed favicon.ico
var favicon []byte // one file, as bytes

//go:embed web
var embedded embed.FS // files and directories, as a read-only file system
```

The `embed` package must be imported even when you only embed into a `string` or `[]byte`. In that case nothing from the package is referenced, so use a blank import: `import _ "embed"`.

The rules worth knowing before you hit them:

- Patterns are relative to the directory of the source file, use forward slashes, and can't contain `.` or `..` path elements or point outside the module. To embed a top-level `web/` from a package in `cmd/server`, move the embedding to a package in the module root, or move the files.
- Patterns can be file names, directory names, or globs (`templates/*.html`). Several patterns can go on one line, or on several `//go:embed` lines above the same variable.
- Embedding a directory includes its files recursively, **except** names that start with `.` or `_`. Prefix the pattern with `all:` (`//go:embed all:web`) to include them. That exclusion keeps `.DS_Store` and editor swap files out, and also any `.well-known` directory, which surprises people.
- A pattern that matches nothing is a build error, which is what you want.
- The directive works only on package-level variables, not inside functions.

## The app

The layout:

```text
site/
├── go.mod
├── main.go
├── VERSION
└── web/
    ├── static/
    │   └── style.css
    └── templates/
        ├── index.html
        └── layout.html
```

`VERSION` contains `1.4.0`. The templates define a layout and a page that fills it in. `web/templates/layout.html`:

```html
{{define "layout"}}<!doctype html>
<html>
<head>
  <title>{{.Title}}</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  {{block "content" .}}{{end}}
  <footer>v{{.Version}}</footer>
</body>
</html>
{{end}}
```

`web/templates/index.html`:

```html
{{template "layout" .}}
{{define "content"}}
  <h1>{{.Title}}</h1>
  <ul>{{range .Items}}<li>{{.}}</li>{{end}}</ul>
{{end}}
```

`web/static/style.css` can be any CSS. And `main.go`, after `go mod init example.com/site`:

```go
package main

import (
	"embed"
	"flag"
	"html/template"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
)

//go:embed web
var embedded embed.FS

//go:embed VERSION
var version string

type server struct {
	files fs.FS              // root of the web/ directory, embedded or on disk
	tmpl  *template.Template // parsed once in production, nil in dev mode
}

func (s *server) templates() (*template.Template, error) {
	if s.tmpl != nil {
		return s.tmpl, nil
	}
	// Dev mode: parse on every request so template edits show up on reload.
	return template.ParseFS(s.files, "templates/*.html")
}

func (s *server) index(w http.ResponseWriter, r *http.Request) {
	t, err := s.templates()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data := map[string]any{
		"Title":   "Inventory",
		"Items":   []string{"lamp", "desk", "chair"},
		"Version": strings.TrimSpace(version),
	}
	if err := t.ExecuteTemplate(w, "index.html", data); err != nil {
		log.Println("render:", err)
	}
}

func newServer(dev bool) (*server, error) {
	var files fs.FS
	if dev {
		files = os.DirFS("web")
	} else {
		sub, err := fs.Sub(embedded, "web")
		if err != nil {
			return nil, err
		}
		files = sub
	}
	s := &server{files: files}
	if !dev {
		t, err := template.ParseFS(files, "templates/*.html")
		if err != nil {
			return nil, err
		}
		s.tmpl = t
	}
	return s, nil
}

func (s *server) routes() (http.Handler, error) {
	static, err := fs.Sub(s.files, "static")
	if err != nil {
		return nil, err
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", s.index)
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServerFS(static)))
	return mux, nil
}

func main() {
	dev := flag.Bool("dev", false, "serve web/ from disk instead of the embedded copy")
	addr := flag.String("addr", "localhost:8080", "listen address")
	flag.Parse()

	s, err := newServer(*dev)
	if err != nil {
		log.Fatal(err)
	}
	h, err := s.routes()
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("version %s, dev=%v, listening on http://%s", strings.TrimSpace(version), *dev, *addr)
	log.Fatal(http.ListenAndServe(*addr, h))
}
```

Run it with `go run .` and open `http://localhost:8080/`. The page renders the three items with `v1.4.0` in the footer, and `/static/style.css` is served as `text/css; charset=utf-8`. Then build it with `go build`, copy the binary to an empty directory, and run it from there: everything still works, because nothing is read from disk.

## How the pieces fit

### fs.Sub strips the prefix

`//go:embed web` keeps the directory name, so the embedded paths are `web/static/style.css` and `web/templates/index.html`. `fs.Sub(embedded, "web")` returns an `fs.FS` rooted at `web/`, so the rest of the code uses `static/style.css` and `templates/*.html`, exactly the paths that `os.DirFS("web")` produces. That is what makes the dev switch a one-line change: both branches give the server the same kind of value with the same paths.

The same trick is applied again for static files: `fs.Sub(s.files, "static")` so that the URL `/static/style.css`, after `http.StripPrefix`, maps to `style.css` in the sub-filesystem.

### http.FileServerFS

`http.FileServerFS` (Go 1.22) takes an `fs.FS` directly. On older code you will see `http.FileServer(http.FS(fsys))`, which does the same thing with an adapter. The file server sets `Content-Type` from the file extension, handles `Range` requests, and serves `index.html` for directory paths.

### Templates from an FS

`template.ParseFS(fsys, "templates/*.html")` parses every match and names each template after its file's base name, which is why the handler calls `ExecuteTemplate(w, "index.html", data)`. `index.html` invokes the `layout` template, which is defined in `layout.html`, and fills in the `content` block. `html/template` escapes `{{.}}` for its context, so an item named `<script>` comes out as text.

In production the templates are parsed once at startup, and a broken template stops the program before it serves traffic. In dev mode they are parsed on every request. That's slow but makes an edit visible on the next reload, which is the point of dev mode.

### Dev mode

```bash
go run . -dev
```

With `-dev`, `os.DirFS("web")` reads from the working directory, so edit `style.css` or a template, reload the browser, and see the change without restarting. Run it from the directory that contains `web/`. A Go code change still needs a restart; pair dev mode with a file-watching tool if you want that too.

An alternative is a build tag: a `dev.go` with `//go:build dev` that sets the FS to `os.DirFS`, and a `prod.go` with `//go:build !dev` that uses the embedded one. That keeps the dev code out of the production binary completely. The flag is simpler, and reading from disk only happens if someone passes `-dev`.

## Gotchas

- **No modification times.** Files in an `embed.FS` have a zero `ModTime`, so `http.FileServerFS` sends no `Last-Modified` header and can't answer conditional requests with `304 Not Modified`. Every page load downloads the CSS again. For real caching, put the version in the URL (`/static/style.css?v=1.4.0`, or a hashed file name from your asset build) and set a long `Cache-Control` in a small wrapper around the file server.
- **Directory listings.** A request for `/static/` returns an HTML list of the files in that directory. If you don't want that, wrap the handler and return 404 for paths that end in `/`, or put an `index.html` in each directory.
- **Hidden files are skipped.** With `//go:embed web`, `web/static/.hidden` is not embedded and the server returns 404 for it. Use `all:web` if you need dotfiles, and remember that this also pulls in anything else hidden in that tree.
- **`VERSION` has a trailing newline** if your editor adds one. `strings.TrimSpace` handles it. For build metadata, consider `-ldflags "-X main.version=..."` or `runtime/debug.ReadBuildInfo`, which includes the VCS revision without any file.
- **Binary size.** Embedded files are stored uncompressed in the binary. A few hundred kilobytes of CSS and templates doesn't matter; a gigabyte of video does. Pre-compress large assets or keep them on a CDN.
- **embed.FS is read-only** and safe for concurrent use. It implements `fs.ReadFileFS` and `fs.ReadDirFS`, so `fs.ReadFile` and `fs.WalkDir` work on it, which is handy for embedded SQL migrations.

## Further reading

- [`embed` package documentation](https://pkg.go.dev/embed), including the full pattern rules
- [`io/fs`](https://pkg.go.dev/io/fs): `fs.Sub`, `fs.WalkDir` and the interfaces
- [`http.FileServerFS`](https://pkg.go.dev/net/http#FileServerFS)
- [`template.ParseFS`](https://pkg.go.dev/html/template#ParseFS)
