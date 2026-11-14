---
title: "sqlx in Go: scanning rows into structs, named queries and transactions"
pubDate: "2023-05-03T14:16:45.171Z"
lastUpdated: 2026-11-14
description: "Use jmoiron/sqlx with PostgreSQL to scan query results into structs, insert with named parameters, run transactions and handle sql.ErrNoRows."
tags: ["go"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3072838870.webp
---

[sqlx](https://github.com/jmoiron/sqlx) is a thin layer over Go's standard `database/sql` package. It keeps the same connection pool, drivers and plain SQL, and removes the most tedious part: calling `rows.Scan` with a pointer for every column. Its main additions are:

- `Get` and `Select`, which scan one row or many rows straight into a struct or slice of structs;
- named parameters (`:email`) bound from struct fields or maps;
- `sqlx.In` for expanding `IN (?)` clauses from a slice;
- `Beginx`, which returns a transaction with the same helpers.

sqlx does not check your SQL at compile time (that is the Rust crate of the same name) and is not an ORM. Queries are strings, and mistakes show up at run time.

## Setup

```bash
go get github.com/jmoiron/sqlx github.com/lib/pq
```

The examples use sqlx v1.4.0 and the `lib/pq` PostgreSQL driver. Any `database/sql` driver works; for example, with pgx v5 you import `github.com/jackc/pgx/v5/stdlib` and use the driver name `"pgx"`.

They assume this table:

```sql
CREATE TABLE users (
    id         SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name  TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE
);
```

## Connecting and mapping a struct

```go
package main

import (
	"database/sql"
	"errors"
	"fmt"
	"log"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // registers the "postgres" driver
)

type User struct {
	ID        int    `db:"id"`
	FirstName string `db:"first_name"`
	LastName  string `db:"last_name"`
	Email     string `db:"email"`
}

func main() {
	db, err := sqlx.Connect("postgres",
		"user=postgres password=mysecretpassword dbname=mydb sslmode=disable")
	if err != nil {
		log.Fatalln(err)
	}
	defer db.Close()

	if err := createUser(db, &User{FirstName: "Ada", LastName: "Lovelace", Email: "ada@example.com"}); err != nil {
		log.Fatalln(err)
	}

	users, err := getUsers(db)
	if err != nil {
		log.Fatalln(err)
	}
	fmt.Println(users)
}
```

`sqlx.Connect` opens the pool and pings the database, so a bad connection string fails here rather than on the first query.

The `db` struct tags map columns to fields. Without a tag, sqlx matches the lowercased field name, so `Email` would map to `email` on its own, but `FirstName` would look for `firstname` and fail. Tagging every field avoids surprises.

## Selecting rows

`Select` runs a query and appends each row to a slice:

```go
func getUsers(db *sqlx.DB) ([]User, error) {
	var users []User
	err := db.Select(&users, "SELECT id, first_name, last_name, email FROM users ORDER BY id")
	return users, err
}
```

`Get` scans exactly one row and returns `sql.ErrNoRows` if there isn't one. sqlx doesn't define its own error values; check for the standard library's:

```go
func getUserByEmail(db *sqlx.DB, email string) (*User, error) {
	var user User
	err := db.Get(&user, "SELECT id, first_name, last_name, email FROM users WHERE email = $1", email)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("user %q not found", email)
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}
```

List columns explicitly rather than using `SELECT *`. If the query returns a column that has no matching field, sqlx returns a "missing destination name" error, so adding a column to the table would break every `SELECT *` query.

Placeholders are whatever your driver uses: `$1` for PostgreSQL, `?` for MySQL and SQLite. `db.Rebind` converts `?` to the driver's style if you want to write queries once.

## Inserting with named parameters

`NamedExec` replaces `:name` placeholders with the struct field that has the matching `db` tag:

```go
func createUser(db *sqlx.DB, user *User) error {
	_, err := db.NamedExec(
		`INSERT INTO users (first_name, last_name, email)
		 VALUES (:first_name, :last_name, :email)`, user)
	return err
}
```

To get the generated `id` back in PostgreSQL, add `RETURNING id` and use `db.PrepareNamed(...)` followed by `stmt.Get(&user.ID, user)`. `Result.LastInsertId` is not supported by `lib/pq`.

## Transactions

`Beginx` returns a `*sqlx.Tx` with the same `Get`, `Select` and `NamedExec` methods:

```go
func createUsers(db *sqlx.DB, users []User) error {
	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	// Rollback after a successful Commit is a no-op that returns sql.ErrTxDone.
	defer tx.Rollback()

	const query = `INSERT INTO users (first_name, last_name, email)
	               VALUES (:first_name, :last_name, :email)`
	for _, user := range users {
		if _, err := tx.NamedExec(query, user); err != nil {
			return err
		}
	}
	return tx.Commit()
}
```

If any insert fails, the function returns early and the deferred `Rollback` undoes the earlier inserts. For a request-scoped operation, use `BeginTxx(ctx, nil)` so the transaction is cancelled with the request.

## Gotchas

- Use the `...Context` variants (`GetContext`, `SelectContext`, `NamedExecContext`) in servers so queries stop when the request is cancelled.
- `Select` loads the whole result set into memory. For large results, use `Queryx` and call `rows.StructScan` in a loop.
- Nullable columns need `sql.NullString`, `*string` or similar, or scanning a `NULL` fails.

## Further reading

- [sqlx on pkg.go.dev](https://pkg.go.dev/github.com/jmoiron/sqlx)
- [Illustrated guide to SQLx](https://jmoiron.github.io/sqlx/)
