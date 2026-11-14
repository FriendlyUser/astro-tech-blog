---
tags: ['go', 'script', 'matlab', 'github', 'ci']
title: Collecting files for GitHub Pages with Go and bitfield/script
description: A small Go program that uses bitfield/script to gather HTML and PDF reports into a gh-pages folder, write an index page, and deploy it with GitHub Actions.
pubDate: Fri, 7 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3194903180.webp"
---

I wanted to host my old university MATLAB assignments on GitHub Pages. The repository already had the published reports as HTML and PDF files scattered across folders, so all the deploy needed was:

1. Copy every `.html` and `.pdf` file into one `gh-pages` folder.
2. Write an `index.html` that links to each of them.
3. Publish that folder from GitHub Actions.

A shell script would do, but I wrote it in Go using [`github.com/bitfield/script`](https://github.com/bitfield/script), which gives you shell-style pipelines (`find`, `grep`, `exec`) as Go method chains. The examples below were checked against `script` v0.25.2.

## The plain shell version

For comparison, the core of the job in bash:

```bash
#!/usr/bin/env bash
set -euo pipefail

out=gh-pages
rm -rf "$out"
mkdir -p "$out"

# Copy every HTML and PDF file, flattening the folder structure
find . -path "./$out" -prune -o -path ./.git -prune -o \
  -type f \( -name '*.html' -o -name '*.pdf' \) -print \
  | while read -r f; do cp "$f" "$out/"; done
```

`cp` overwrites silently, so two reports with the same filename in different folders will clobber each other. That was fine for my repo, but worth knowing.

## The Go version with bitfield/script

`script.FindFiles(".")` lists every file under the current directory, one path per line. `MatchRegexp` keeps only the lines that match, and `Slice` collects them into a `[]string`. After that it's ordinary Go: copy the files and render the index with `html/template`.

```go
package main

import (
	"html/template"
	"log"
	"os"
	"path/filepath"
	"regexp"

	"github.com/bitfield/script"
)

const outputFolder = "gh-pages"

var index = template.Must(template.New("files").Parse(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>List of Matlab Reports and Files</title>
  </head>
  <body>
    <h1>List of Files</h1>
    <ul>
    {{- range . }}
      <li><a href="{{ . }}">{{ . }}</a></li>
    {{- end }}
    </ul>
  </body>
</html>
`))

func main() {
	// Start from an empty output folder.
	if err := os.RemoveAll(outputFolder); err != nil {
		log.Fatal(err)
	}

	// Find every .html and .pdf file in the repo.
	files, err := script.FindFiles(".").
		MatchRegexp(regexp.MustCompile(`\.(html|pdf)$`)).
		Slice()
	if err != nil {
		log.Fatal(err)
	}

	if err := os.MkdirAll(outputFolder, 0o755); err != nil {
		log.Fatal(err)
	}

	// Copy each file into gh-pages and keep its base name for the index.
	var names []string
	for _, f := range files {
		name := filepath.Base(f)
		if _, err := script.File(f).WriteFile(filepath.Join(outputFolder, name)); err != nil {
			log.Fatal(err)
		}
		names = append(names, name)
	}

	out, err := os.Create(filepath.Join(outputFolder, "index.html"))
	if err != nil {
		log.Fatal(err)
	}
	defer out.Close()

	if err := index.Execute(out, names); err != nil {
		log.Fatal(err)
	}
	log.Printf("copied %d files to %s", len(names), outputFolder)
}
```

Run it from the repository root with `go run .` after `go mod init` and `go get github.com/bitfield/script`.

A few notes on the changes from my original version (linked below):

- The original built shell commands as strings (`script.Exec("cp " + file + " gh-pages")`). That breaks on filenames with spaces and only works where `cp`, `mv` and `mkdir` exist, so not on a stock Windows machine. `script.File(f).WriteFile(dst)` copies the file without spawning a process.
- The original used `strings.Contains(line, ".html")`, which also matches paths like `notes.html.bak`. Anchoring the regex to the end of the path avoids that.
- Every `script` pipe call returns an error (`Stdout` returns `(int, error)`). The original ignored them, so a failed copy would still produce a "successful" deploy.
- The `href` value is now quoted. `html/template` escapes it either way, but quoted attributes are easier to read.

## Deploying with GitHub Actions

The workflow builds and runs the program, adds an `ads.txt` file, and publishes `gh-pages` with [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages). I've updated the action versions from the original (`checkout@v2`, `setup-go@v2`, `actions-gh-pages@v3`) to their current major releases.

```yaml
name: deploy

on:
  push:
    branches: [master]

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Set up Go
        uses: actions/setup-go@v7
        with:
          go-version: stable

      - name: Build
        run: |
          go build -o main .
          ./main
          echo "google.com, pub-2479144310234386, DIRECT, f08c47fec0942fa0" > gh-pages/ads.txt

      - name: Deploy to gh-pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./gh-pages
```

Two things that tripped me up:

- `actions-gh-pages` pushes to a `gh-pages` branch using `GITHUB_TOKEN`, so the job needs `contents: write`. Repositories created after early 2023 default to a read-only token. Then set **Settings → Pages → Source** to the `gh-pages` branch.
- Writing `ads.txt` straight into `gh-pages/` after `./main` runs avoids an ordering problem in the original: the Go program ran `mv ads.txt gh-pages` before the workflow step that writes `ads.txt`, so (unless the file is committed) that move failed silently.

## References

- [Original `main.go`](https://raw.githubusercontent.com/FriendlyUser/Matlab/master/main.go)
- [Original `deploy.yml`](https://raw.githubusercontent.com/FriendlyUser/Matlab/master/.github/workflows/deploy.yml)
- [bitfield/script documentation](https://pkg.go.dev/github.com/bitfield/script)
