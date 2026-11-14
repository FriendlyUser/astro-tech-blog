---
title: "Dnote: keeping Go notes from the command line"
pubDate: "2023-05-30T19:37:46.129Z"
lastUpdated: 2026-11-14
description: "How to install the Dnote CLI and use books, add, view, find and edit to keep short notes about Go (or anything else) from your terminal."
tags: ["dnote", "go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/186810635.webp
---

[Dnote](https://github.com/dnote/dnote) is a small command-line notebook written in Go. You
add one-line (or longer) notes to named "books" from the terminal, then list or full-text
search them later. It's handy for the snippets you keep re-learning: a `go test` flag, a
`go mod` command, how a channel pattern works. Notes live in a local SQLite database
(`~/.local/share/dnote/dnote.db` by default); syncing between machines is optional and goes
through a Dnote server you host yourself.

## Installation

On macOS:

```bash
brew install dnote
```

On Linux (the install script also lists Windows support):

```bash
curl -s https://www.getdnote.com/install | sh
```

You can also download a binary for your platform from the
[CLI releases page](https://github.com/dnote/cli/releases) and put it on your `PATH`.
Check it worked with `dnote version`.

## Adding notes

A book is just a named group of notes, and it's created the first time you add a note to it.
Pass the content with `-c`; without it, Dnote opens your editor.

```bash
dnote add go -c "Use the fmt package for formatted I/O"
dnote add go-concurrency -c "Use channels to pass data between goroutines"
```

Stdin works too, which is useful for saving command output:

```bash
go env GOPATH GOMODCACHE | dnote add go
```

## Viewing notes

`dnote view` does three things depending on how many arguments you give it:

```bash
dnote view               # list all books
dnote view go            # list the notes in the "go" book, with their ids
dnote view go 1          # show a single note
```

## Searching

`dnote find` runs a full-text search across every book, or one book with `-b`:

```bash
dnote find "channels"
dnote find "goroutines" -b go-concurrency
```

## Editing and removing

Notes are edited or removed by the id shown in `dnote view <book>`. Books are addressed by
name.

```bash
dnote edit 3 -c "Use buffered channels when the producer shouldn't block"
dnote edit 3 -b go-concurrency   # move note 3 to another book
dnote edit go-concurrency -n go-conc   # rename a book
dnote remove 5
```

`remove` asks for confirmation unless you pass `-y`.

## Tips

- Pick a naming scheme for books early (`go`, `go-concurrency`, `go-testing`) so `dnote view`
  stays readable.
- Keep each note to one idea. Short notes are easier to find with `dnote find`.
- If you want notes on more than one machine, set up the self-hosted server, then run
  `dnote login --apiEndpoint <your server>/api` and `dnote sync`. Without a server, everything
  stays local.

## Further reading

- [Dnote CLI command reference](https://www.getdnote.com/docs/cli/commands/)
- [Dnote on GitHub](https://github.com/dnote/dnote)
