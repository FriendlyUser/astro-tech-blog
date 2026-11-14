---
description: Getting started with GORM in Go using SQLite, covering models, AutoMigrate,
  create/read/update/delete, and a one-to-many association, with zero-value gotchas.
imgSrc: /imgs/2023/3619698287.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-20T00:38:00.000Z'
lastUpdated: 2026-11-14
tags: ['go']
title: 'GORM basics in Go: models, migrations, CRUD, and associations'
---

GORM is the most widely used ORM for Go. You describe tables as structs, and GORM generates the SQL for inserts, queries, updates, and schema migrations. It supports PostgreSQL, MySQL, SQLite, and SQL Server through separate driver packages. This post builds a small program against SQLite that covers the parts you'll use every day.

## Installation

```bash
go get gorm.io/gorm
go get gorm.io/driver/sqlite
```

`gorm.io/driver/sqlite` wraps `github.com/mattn/go-sqlite3`, which needs cgo (and a C compiler). If you want a pure-Go build, GORM's docs list `github.com/glebarez/sqlite` as a drop-in alternative with the same `sqlite.Open` API.

## Models

A model is a struct. GORM maps `ID` to the primary key, converts field names to snake_case column names (`FirstName` → `first_name`), and pluralises the table name (`User` → `users`). Struct tags adjust the schema:

```go
type User struct {
	ID        uint   `gorm:"primaryKey"`
	FirstName string `gorm:"size:64"`
	LastName  string `gorm:"size:64"`
	Email     string `gorm:"uniqueIndex;size:128"`
	Age       int
	Posts     []Post
}

type Post struct {
	ID     uint   `gorm:"primaryKey"`
	Title  string `gorm:"size:128"`
	Body   string `gorm:"type:text"`
	UserID uint
}
```

`Posts []Post` plus the `UserID` field on `Post` is a has-many association: GORM infers the foreign key from the field name.

If you embed `gorm.Model`, you get `ID`, `CreatedAt`, `UpdatedAt`, and `DeletedAt` fields. `DeletedAt` turns on soft delete, covered below.

## A complete program

Everything below is one `main.go` you can run with `go run .`:

```go
package main

import (
	"errors"
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// User and Post as defined above.

func main() {
	db, err := gorm.Open(sqlite.Open("gorm.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("connect: %v", err)
	}

	// Create or update tables to match the structs.
	if err := db.AutoMigrate(&User{}, &Post{}); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Create
	user := User{FirstName: "John", LastName: "Doe", Email: "john.doe@example.com", Age: 30}
	if err := db.Create(&user).Error; err != nil {
		log.Fatalf("create: %v", err)
	}
	fmt.Println("new user ID:", user.ID) // GORM fills in the generated key

	// Read one record by primary key
	var found User
	err = db.First(&found, user.ID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		log.Fatal("user not found")
	} else if err != nil {
		log.Fatalf("first: %v", err)
	}

	// Read many records with a condition
	var adults []User
	if err := db.Where("age > ?", 25).Find(&adults).Error; err != nil {
		log.Fatalf("find: %v", err)
	}
	fmt.Println("users over 25:", len(adults))

	// Update one column
	db.Model(&found).Update("age", 35)

	// Update several columns from a struct (zero values are skipped)
	db.Model(&found).Updates(User{FirstName: "Johnathan", LastName: "Smith"})

	// Update from a map (zero values are written)
	db.Model(&found).Updates(map[string]interface{}{"age": 0})

	// Association: add a post to the user
	post := Post{Title: "My first post", Body: "This is the content of my first post."}
	if err := db.Model(&found).Association("Posts").Append(&post); err != nil {
		log.Fatalf("append post: %v", err)
	}

	// Load the user together with their posts
	var withPosts User
	db.Preload("Posts").First(&withPosts, found.ID)
	fmt.Println("posts:", len(withPosts.Posts))

	// Delete
	db.Where("user_id = ?", found.ID).Delete(&Post{})
	db.Delete(&found)
}
```

GORM methods return a `*gorm.DB`; errors are on its `.Error` field, so check them explicitly. The update and delete calls above skip the check only to keep the example short.

## Gotchas

- **Struct updates skip zero values.** `Updates(User{Age: 0})` does nothing, because `0` is the zero value for `int`. Use a map (keys are column names, e.g. `"age"`), or `Select("Age").Updates(...)`, when you need to write `0`, `false`, or `""`.
- **`Save` writes every field** and is an upsert: if the primary key is set it runs an `UPDATE`, falling back to `INSERT` if no rows were affected. Don't use it on a partially loaded struct.
- **Updates and deletes need a condition.** `db.Model(&User{}).Update("age", 1)` with no primary key or `Where` returns `gorm.ErrMissingWhereClause` instead of updating every row.
- **Soft delete.** If the model has a `gorm.DeletedAt` field (for example via `gorm.Model`), `Delete` sets `deleted_at` instead of removing the row, and normal queries exclude it. Use `db.Unscoped().Delete(...)` to remove it for real.
- **`AutoMigrate` is additive.** It creates missing tables, columns, indexes, and foreign keys, and it will alter a column's type when its size or precision changes or when it goes from `NOT NULL` to nullable. It won't drop unused columns. Use `db.Migrator().DropColumn(...)` for that, or a dedicated migration tool for production schemas.
- **Associations aren't loaded automatically.** After a plain `First`, `user.Posts` is empty; GORM has no lazy loading. Use `Preload("Posts")` (one extra query for all loaded users) or `Joins` for has-one/belongs-to relations.

## Further reading

- [GORM documentation](https://gorm.io/docs/)
- [Connecting to a database](https://gorm.io/docs/connecting_to_the_database.html)
- [Update](https://gorm.io/docs/update.html) and [Migration](https://gorm.io/docs/migration.html) reference pages
