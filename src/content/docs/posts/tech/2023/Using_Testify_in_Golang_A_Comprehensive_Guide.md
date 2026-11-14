---
description: How to use Testify's assert, require, suite, and mock packages in Go tests, with runnable examples and the gotchas that trip people up.
imgSrc: /imgs/2023/1797349317.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-29T08:21:13.000Z'
lastUpdated: 2026-11-14
tags: ["go", "testing", "testify"]
title: 'Testing in Go with Testify: assert, require, suites, and mocks'
---

[Testify](https://github.com/stretchr/testify) is a set of packages that sit on top of Go's standard `testing` package. It doesn't replace `go test`; it gives you assertion helpers (so you don't write `if got != want { t.Errorf(...) }` by hand), a way to group tests with shared setup, and a simple mocking library.

The examples below were checked against testify v1.12.1. The maintainers keep the module at v1 with no breaking changes, and it supports Go 1.19 and later.

## Installing

Inside a module (a directory with a `go.mod`):

```bash
go get github.com/stretchr/testify
```

You don't need `-u`; that also upgrades testify's own dependencies, which you rarely want.

## assert and require

Say you have a package with one function:

```go
// calc.go
package calc

func Add(a, b int) int {
	return a + b
}
```

A test using `assert`:

```go
// calc_test.go
package calc

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAdd(t *testing.T) {
	assert.Equal(t, 5, Add(2, 3), "Add(2, 3)")
	assert.Equal(t, 0, Add(-1, 1))
}
```

Run it with `go test ./...`. On failure, testify prints the expected and actual values and a diff for structs, slices, and maps.

The argument order is `expected, actual`. Swapping them still fails the test correctly, but the failure message labels the values the wrong way round.

`assert` functions record a failure and keep going (they call `t.Errorf`). The `require` package has the same functions but stops the test immediately (`t.FailNow`). Use `require` when the rest of the test makes no sense after a failure, typically error checks and nil checks:

```go
package calc

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseAndAdd(t *testing.T) {
	n, err := strconv.Atoi("40")
	require.NoError(t, err) // no point continuing if this fails

	assert.Equal(t, 42, Add(n, 2))
}
```

Other assertions you'll use often: `NoError`, `Error`, `ErrorIs`, `Nil`, `NotNil`, `True`, `Len`, `Contains`, `ElementsMatch` (same elements, any order), and `JSONEq`. The full list is in the [assert package docs](https://pkg.go.dev/github.com/stretchr/testify/assert).

## Suites

The `suite` package lets you put related tests on a struct and run setup and teardown hooks around them. Embed `suite.Suite`, write methods whose names start with `Test`, and hand the struct to `suite.Run` from a normal test function:

```go
package calc

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

type CalcSuite struct {
	suite.Suite
	pairs [][2]int
}

// SetupTest runs before every Test* method.
func (s *CalcSuite) SetupTest() {
	s.pairs = [][2]int{{2, 3}, {-1, 1}, {0, 0}}
}

func (s *CalcSuite) TestAddIsCommutative() {
	for _, p := range s.pairs {
		s.Equal(Add(p[0], p[1]), Add(p[1], p[0]))
	}
}

func TestCalcSuite(t *testing.T) {
	suite.Run(t, new(CalcSuite))
}
```

The embedded `Suite` gives you the `assert` functions as methods (`s.Equal`, `s.NoError`) and `require` via `s.Require().NoError(err)`. The available hooks are `SetupSuite`/`TearDownSuite` (once per suite) and `SetupTest`/`TearDownTest` (around each test method).

Each method runs as a subtest, so you can run one with `go test -run 'TestCalcSuite/TestAddIsCommutative'`.

Two things to know:

- **Suites don't support parallel tests.** The README says so directly. If you need `t.Parallel()`, use plain test functions.
- **Don't depend on method order.** Each test should set up its own state, which is what `SetupTest` is for.

For small packages, a table-driven test with `t.Run` usually does the same job with less ceremony. Suites pay off when several tests share expensive setup, such as a database connection created in `SetupSuite`.

## Mocks

The `mock` package helps you write test doubles for interfaces. You write a struct that embeds `mock.Mock` and implements your interface by forwarding each call to `m.Called(...)`. The test then declares which calls it expects and what they return.

Here's the code under test. The service depends on a `Repository` interface rather than a concrete database:

```go
// user.go
package user

import (
	"errors"
	"fmt"
)

var ErrNotFound = errors.New("user not found")

type User struct {
	ID   int
	Name string
}

type Repository interface {
	FindUserByID(id int) (*User, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) DisplayName(id int) (string, error) {
	u, err := s.repo.FindUserByID(id)
	if err != nil {
		return "", fmt.Errorf("display name for %d: %w", id, err)
	}
	return fmt.Sprintf("%s (#%d)", u.Name, u.ID), nil
}
```

And the test, with a hand-written mock:

```go
// user_test.go
package user

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type RepositoryMock struct {
	mock.Mock
}

func (m *RepositoryMock) FindUserByID(id int) (*User, error) {
	args := m.Called(id)
	// Comma-ok assertion: Return(nil, err) stores an untyped nil,
	// and a plain args.Get(0).(*User) would panic on it.
	u, _ := args.Get(0).(*User)
	return u, args.Error(1)
}

func TestDisplayName(t *testing.T) {
	repo := new(RepositoryMock)
	repo.Test(t) // report unexpected calls as test failures instead of panics
	repo.On("FindUserByID", 1).Return(&User{ID: 1, Name: "Alice"}, nil).Once()

	name, err := NewService(repo).DisplayName(1)

	require.NoError(t, err)
	assert.Equal(t, "Alice (#1)", name)
	repo.AssertExpectations(t)
}

func TestDisplayNameNotFound(t *testing.T) {
	repo := new(RepositoryMock)
	repo.Test(t)
	repo.On("FindUserByID", 2).Return(nil, ErrNotFound)

	_, err := NewService(repo).DisplayName(2)

	assert.ErrorIs(t, err, ErrNotFound)
	repo.AssertExpectations(t)
}
```

`On` sets up an expected call and its arguments, `Return` gives the values that `Called` hands back, and `AssertExpectations` fails the test if an expected call never happened. `Once()`, `Times(n)`, and `Maybe()` control how many calls are allowed. Use `mock.Anything` or `mock.MatchedBy(func(x T) bool {...})` when you don't care about an exact argument.

Writing these structs by hand gets tedious for large interfaces. [mockery](https://github.com/vektra/mockery) generates them from your interfaces.

## Gotchas

- **`Equal` compares types too.** `assert.Equal(t, 5, int64(5))` fails because `int` and `int64` are different types. Use `EqualValues` if you want conversion, or make the types match.
- **Mock arguments are matched by type as well.** If a method takes an `int64`, `On("Method", 1)` won't match because the untyped `1` becomes an `int`. Write `On("Method", int64(1))`.
- **Without `repo.Test(t)`, an unexpected mock call panics** (with "mock: Unexpected Method Call" or "I don't know what to return"). The message is useful, but a normal test failure reads better in CI output and lets the other tests run.
- **Mocks can hide bugs in the real dependency.** A mock only checks that your code calls the interface the way you told it to. For a database repository, an integration test against a real database (for example in a container) catches the mistakes a mock can't.

## Further reading

- [testify on GitHub](https://github.com/stretchr/testify)
- [assert](https://pkg.go.dev/github.com/stretchr/testify/assert), [require](https://pkg.go.dev/github.com/stretchr/testify/require), [suite](https://pkg.go.dev/github.com/stretchr/testify/suite), and [mock](https://pkg.go.dev/github.com/stretchr/testify/mock) package docs
- [Go's testing package](https://pkg.go.dev/testing)
