---
title: "Table-driven tests and native fuzzing in Go"
description: "Write table-driven Go tests with t.Run and t.Parallel, keep fixtures in testdata, then add a fuzz target that finds a real bug in a small version parser."
tags: ["Go", "Testing", "Fuzzing", "Table-Driven Tests", "go test"]
pubDate: "2026-05-10T16:00:00.000Z"
imgSrc: "/imgs/2026/go_fuzzing_table_tests.webp"
imgAlt: "A grid of test cases with green passing cells and one red cell marking a fuzzer-found input, 01.2.3"
---

Table-driven tests are the standard way to test a Go function: a slice of cases, one loop, and `t.Run` so each case reports on its own. Fuzzing, built into `go test` since Go 1.18, is the complement. Instead of the cases you thought of, it generates inputs you didn't, guided by code coverage, and checks a property you state. This post builds both for a small version-string parser, and the fuzz target finds a bug the table missed.

Examples use Go 1.26. The table tests and the seed corpus were run with `go test`.

## The code under test

A parser for `MAJOR.MINOR.PATCH` with an optional `-PRERELEASE` suffix, the shape of semantic version strings. Create a module with `go mod init example.com/version` and add `version.go`:

```go
// Package version parses MAJOR.MINOR.PATCH[-PRERELEASE] version strings.
package version

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type Version struct {
	Major, Minor, Patch int
	Pre                 string // pre-release, e.g. "rc.1"; empty for a release
}

func Parse(s string) (Version, error) {
	var v Version
	core, pre, hasPre := strings.Cut(s, "-")
	if hasPre {
		if pre == "" {
			return Version{}, errors.New("empty pre-release")
		}
		v.Pre = pre
	}
	parts := strings.Split(core, ".")
	if len(parts) != 3 {
		return Version{}, fmt.Errorf("want MAJOR.MINOR.PATCH, got %q", core)
	}
	nums := []*int{&v.Major, &v.Minor, &v.Patch}
	for i, p := range parts {
		n, err := strconv.Atoi(p)
		if err != nil {
			return Version{}, fmt.Errorf("part %d of %q: %w", i+1, s, err)
		}
		*nums[i] = n
	}
	return v, nil
}

func (v Version) String() string {
	s := fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
	if v.Pre != "" {
		s += "-" + v.Pre
	}
	return s
}
```

It looks fine, and it has a bug. Keep reading before you look for it.

## A table-driven test

Each case is a struct with a name, the input and the expected result. The loop runs each one as a subtest:

```go
package version

import (
	"bufio"
	"os"
	"testing"
)

func TestParse(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    Version
		wantErr bool
	}{
		{name: "release", in: "1.2.3", want: Version{1, 2, 3, ""}},
		{name: "zeros", in: "0.0.0", want: Version{0, 0, 0, ""}},
		{name: "pre-release", in: "2.0.0-rc.1", want: Version{2, 0, 0, "rc.1"}},
		{name: "big numbers", in: "10.200.3000", want: Version{10, 200, 3000, ""}},
		{name: "too few parts", in: "1.2", wantErr: true},
		{name: "too many parts", in: "1.2.3.4", wantErr: true},
		{name: "not a number", in: "1.x.3", wantErr: true},
		{name: "empty pre-release", in: "1.2.3-", wantErr: true},
		{name: "empty string", in: "", wantErr: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := Parse(tc.in)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("Parse(%q) = %v, want an error", tc.in, got)
				}
				return
			}
			if err != nil {
				t.Fatalf("Parse(%q) returned error: %v", tc.in, err)
			}
			if got != tc.want {
				t.Errorf("Parse(%q) = %+v, want %+v", tc.in, got, tc.want)
			}
		})
	}
}
```

What each part buys you:

- **`t.Run(name, ...)`** makes each case a subtest. A failure reports `TestParse/not_a_number` (spaces become underscores), and `t.Fatalf` stops only that case, not the whole table.
- **Running one case**: `go test -run 'TestParse/^pre-release$' -v`. The part after `/` is an unanchored regular expression matched against subtest names, so without `^` and `$` it would also run `empty_pre-release`.
- **`t.Parallel()`** inside the subtest pauses it until the loop finishes, then runs all the paused subtests concurrently. Since Go 1.22 each loop iteration has its own `tc`, so the old `tc := tc` line is no longer needed (the `go.mod` must say `go 1.22` or later).
- **`got != tc.want`** works because `Version` is a comparable struct. For structs with slices or maps, use `reflect.DeepEqual` or the `go-cmp` package's `cmp.Diff`, which also prints what differs.
- **`%q` in messages** shows invisible characters and empty strings, which matters for a parser.

Run it with `go test ./...`. Every case passes.

## Fixtures in testdata

The `go` tool ignores any directory named `testdata`, and `go test` runs with the package directory as the working directory. That makes `testdata/` the place for input files and golden outputs. A list of known-good versions, `testdata/valid.txt`:

```text
# one version per line; each must parse and print back unchanged
1.0.0
0.9.12
2.0.0-rc.1
10.20.30-alpha.beta
```

And a test that reads it:

```go
// TestRoundTripFile checks every version listed in testdata/valid.txt.
func TestRoundTripFile(t *testing.T) {
	f, err := os.Open("testdata/valid.txt")
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if line == "" || line[0] == '#' {
			continue
		}
		v, err := Parse(line)
		if err != nil {
			t.Errorf("Parse(%q): %v", line, err)
			continue
		}
		if v.String() != line {
			t.Errorf("Parse(%q).String() = %q", line, v.String())
		}
	}
	if err := sc.Err(); err != nil {
		t.Fatal(err)
	}
}
```

This also passes. The test checks a property, "a valid version prints back unchanged", but only for inputs someone typed. That is exactly what fuzzing generalises.

## The fuzz target

A fuzz test is a function named `FuzzXxx` that takes `*testing.F`. You add seed inputs with `f.Add`, then pass `f.Fuzz` a function whose arguments after `*testing.T` are the generated values. Add it to `version_test.go`:

```go
func FuzzParse(f *testing.F) {
	for _, seed := range []string{"1.2.3", "0.0.0", "2.0.0-rc.1", "1.2", "1.x.3", ""} {
		f.Add(seed)
	}
	f.Fuzz(func(t *testing.T, s string) {
		v, err := Parse(s)
		if err != nil {
			return // rejecting input is fine; we only check what Parse accepts
		}
		// Every accepted string must already be in canonical form.
		if got := v.String(); got != s {
			t.Fatalf("Parse(%q) accepted a non-canonical version; String() = %q", s, got)
		}
		// And the canonical form must parse back to the same value.
		v2, err := Parse(v.String())
		if err != nil || v2 != v {
			t.Fatalf("round trip of %q: got %+v, %v", s, v2, err)
		}
	})
}
```

The hard part of fuzzing is not the API; it is deciding what to assert, because the fuzzer can't know the right answer for a random string. Properties that work well for parsers:

- it never panics (you get this one for free: a panic fails the run);
- whatever it accepts round-trips through the printer;
- it agrees with a slower, obviously correct implementation;
- it rejects everything a reference parser rejects.

A plain `go test` runs `FuzzParse` with only the seed inputs, as a normal test. They all pass. To actually fuzz:

```bash
go test -fuzz=FuzzParse -fuzztime=60s
```

`-fuzz` takes a regular expression that must match exactly one fuzz target. Without `-fuzztime`, it runs until it finds a failure or you press Ctrl+C. The fuzzer mutates the seeds, keeps inputs that reach new code, and runs workers in parallel (as many as `GOMAXPROCS` by default).

## What it finds

The seeds contain valid versions, and inputs such as `01.2.3` or `1.+2.3` are a single inserted byte away from them. Both are accepted by `Parse`, and both print back as `1.2.3`. `strconv.Atoi` accepts a leading `+` and leading zeros, and the table never tried either. Semantic Versioning forbids leading zeros, and two different strings meaning the same version is the kind of thing that breaks a cache key or a uniqueness check later.

When the property fails, the fuzzer stops, prints the failing input, and writes it to a file under `testdata/fuzz/FuzzParse/`. The exact input differs from run to run. The file looks like this:

```text
go test fuzz v1
string("01.2.3")
```

From then on, a plain `go test` runs that file as a subtest of `FuzzParse`, so the bug stays reproducible for everyone, with no fuzzing needed. Commit the file. It's a regression test that writes itself.

## The fix

Accept only digits, with no sign and no leading zero:

```go
// parseNum accepts only canonical non-negative integers: digits, no sign,
// no leading zeros.
func parseNum(p string) (int, error) {
	if p == "" {
		return 0, errors.New("empty number")
	}
	if len(p) > 1 && p[0] == '0' {
		return 0, fmt.Errorf("leading zero in %q", p)
	}
	for _, c := range p {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("%q is not a number", p)
		}
	}
	return strconv.Atoi(p)
}
```

In `Parse`, replace `strconv.Atoi(p)` with `parseNum(p)`. Add the two inputs to the table as error cases too, so the intent is written down where people read it:

```go
		{name: "leading zero", in: "01.2.3", wantErr: true},
		{name: "plus sign", in: "1.+2.3", wantErr: true},
```

With the fix, `go test` passes, including the saved corpus file. For the buggy version, the two new table cases fail with `Parse("01.2.3") = 1.2.3, want an error` and `Parse("1.+2.3") = 1.2.3, want an error`. `strconv.Atoi` still does the conversion, and also rejects numbers that overflow `int`.

## Gotchas and practical notes

- **Supported argument types.** Fuzz functions can take `string`, `[]byte`, `bool`, `rune`, `byte`, the sized and unsized `int` and `uint` types, and `float32`/`float64`. For structured input, take `[]byte` or a few primitives and build the struct inside the function.
- **Don't modify or keep `[]byte` inputs.** The `testing` docs say the fuzz function must not change the data it is given or hold on to it between calls. Copy the slice first if the code under test writes to it.
- **Keep the target fast and deterministic.** No network, no clock, no global state that carries between calls. A flaky property makes the fuzzer report failures it can't reproduce.
- **The generated corpus lives in the build cache**, under `$GOCACHE/fuzz`, not in your repo. Only failing inputs are written to `testdata`. `go clean -fuzzcache` deletes the cache.
- **CI.** Run the normal `go test ./...` on every push, which replays the seeds and saved failures. Run real fuzzing on a schedule with a time limit (`-fuzztime=5m`), not on every pull request.
- **Platform.** The fuzzing docs recommend running on a platform with coverage instrumentation, currently amd64 and arm64, so the corpus can grow as new code is reached. Each call of the fuzz function also has a 1-second timeout.
- **Test helpers.** Call `t.Helper()` at the top of assertion helpers, so failures point at the caller's line. `t.Context()` (Go 1.24) gives a context that is cancelled when the test ends, and `t.ArtifactDir()` (Go 1.26) gives a directory for files you want to keep after a run with `go test -artifacts`.

## Further reading

- [Go Fuzzing](https://go.dev/doc/security/fuzz/) (official documentation)
- [Tutorial: Getting started with fuzzing](https://go.dev/doc/tutorial/fuzz)
- [Go wiki: TableDrivenTests](https://go.dev/wiki/TableDrivenTests)
- [`testing` package](https://pkg.go.dev/testing)
- [Semantic Versioning 2.0.0](https://semver.org/)
