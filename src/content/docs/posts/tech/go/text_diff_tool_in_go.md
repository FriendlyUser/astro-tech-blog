---
tags: ['go']
title: Building a line-based text diff tool in Go
description: Build a small command-line diff in Go that compares two files line by line using a longest common subsequence (LCS) table and prints added and removed lines.
pubDate: Fri, 17 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1797349317.webp"
---

A diff tool answers one question: what is the smallest set of lines I need to delete from file A and add to get file B? The lines you *keep* are a longest common subsequence (LCS) of the two files, and everything else is a deletion or an insertion. This post builds a working line-based diff in Go around that idea, in about 80 lines with only the standard library.

You need Go 1.21 or later, because the code uses the built-in `max` function.

## How LCS gives you a diff

Treat each file as a list of lines, `a` (length `m`) and `b` (length `n`). Build an `(m+1) × (n+1)` table where `lcs[i][j]` is the length of the LCS of the suffixes `a[i:]` and `b[j:]`:

- If `a[i] == b[j]`, the line is common: `lcs[i][j] = lcs[i+1][j+1] + 1`.
- Otherwise drop a line from one side, whichever keeps more: `lcs[i][j] = max(lcs[i+1][j], lcs[i][j+1])`.
- The last row and column (empty suffixes) are 0.

Then walk from `(0, 0)`. When the lines match, print them as unchanged and advance both. When they don't, follow the larger neighbour: moving down in `a` means the line was deleted (`-`), moving along `b` means it was added (`+`).

Filling the table from the end lets the walk go forwards, so the output comes out in file order without reversing it.

## The program

Save this as `main.go`:

```go title="main.go"
package main

import (
	"fmt"
	"os"
	"strings"
)

// diffLines returns a, b compared line by line. Unchanged lines are
// prefixed with "  ", removed lines with "- " and added lines with "+ ".
func diffLines(a, b []string) []string {
	m, n := len(a), len(b)

	// lcs[i][j] is the length of the longest common subsequence of a[i:] and b[j:].
	lcs := make([][]int, m+1)
	for i := range lcs {
		lcs[i] = make([]int, n+1)
	}
	for i := m - 1; i >= 0; i-- {
		for j := n - 1; j >= 0; j-- {
			if a[i] == b[j] {
				lcs[i][j] = lcs[i+1][j+1] + 1
			} else {
				lcs[i][j] = max(lcs[i+1][j], lcs[i][j+1])
			}
		}
	}

	var out []string
	i, j := 0, 0
	for i < m && j < n {
		switch {
		case a[i] == b[j]:
			out = append(out, "  "+a[i])
			i++
			j++
		case lcs[i+1][j] >= lcs[i][j+1]:
			out = append(out, "- "+a[i])
			i++
		default:
			out = append(out, "+ "+b[j])
			j++
		}
	}
	for ; i < m; i++ {
		out = append(out, "- "+a[i])
	}
	for ; j < n; j++ {
		out = append(out, "+ "+b[j])
	}
	return out
}

// readLines reads a file and splits it into lines, accepting both \n and \r\n endings.
func readLines(path string) ([]string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	text := strings.ReplaceAll(string(data), "\r\n", "\n")
	text = strings.TrimSuffix(text, "\n")
	if text == "" {
		return nil, nil
	}
	return strings.Split(text, "\n"), nil
}

func main() {
	if len(os.Args) != 3 {
		fmt.Fprintln(os.Stderr, "usage: textdiff FILE1 FILE2")
		os.Exit(2)
	}

	a, err := readLines(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	b, err := readLines(os.Args[2])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	changed := false
	for _, line := range diffLines(a, b) {
		if !strings.HasPrefix(line, "  ") {
			changed = true
		}
		fmt.Println(line)
	}
	if changed {
		os.Exit(1) // same convention as diff(1): 0 = identical, 1 = different, 2 = error
	}
}
```

## Running it

Create two files:

```text title="old.txt"
apple
banana
cherry
```

```text title="new.txt"
apple
blueberry
cherry
date
```

Then:

```bash
go mod init textdiff
go run . old.txt new.txt
```

Output:

```text
  apple
- banana
+ blueberry
  cherry
+ date
```

Because the files differ, the program exits with status 1, so `go run` also prints `exit status 1` to stderr. Build it with `go build -o textdiff .` to use the exit code in scripts.

## Limitations and where to go next

- **Memory is O(m × n).** Two 10,000-line files need a 100-million-cell table, which is roughly 800 MB of `int`s on a 64-bit machine. GNU `diff` and Git default to Myers' O(ND) algorithm, which is fast when the files are similar. Git also offers `--patience` and `--histogram`, which often produce more readable diffs for code.
- **No hunks or context.** Real diff output groups changes into hunks with a few lines of context (`diff -u`). You can build that on top of the `-`/`+`/`  ` list by printing only changed lines plus N neighbours.
- **Ties are arbitrary.** When `lcs[i+1][j] == lcs[i][j+1]` this code prefers deletions first. Different tie-breaking gives different (equally short) diffs.

If you need a diff in a real Go program rather than as an exercise, use a library: [`github.com/sergi/go-diff/diffmatchpatch`](https://pkg.go.dev/github.com/sergi/go-diff/diffmatchpatch) is a Go port of Google's diff-match-patch and supports character and line-level diffs.

## Further reading

- Eugene W. Myers, ["An O(ND) Difference Algorithm and Its Variations"](http://www.xmailserver.org/diff2.pdf) (1986)
- [Longest common subsequence (Wikipedia)](https://en.wikipedia.org/wiki/Longest_common_subsequence)
- [`git diff` options: `--diff-algorithm`](https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-algorithmpatienceminimalhistogrammyers)
