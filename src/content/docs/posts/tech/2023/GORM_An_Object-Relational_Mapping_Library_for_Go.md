---
description: In this article, we'll discuss how to use GORM in your Go projects, covering
  installation, basic CRUD operations, and advanced features
imgSrc: /imgs/2023/3619698287.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-01-20T00:38:00.000Z'
tags: []
title: GORM An Object-Relational Mapping Library for Go
---

# GORM: An Object-Relational Mapping Library for Go

GORM is a powerful and easy-to-use object-relational mapping (ORM) library for Go (Golang). It provides a high-level, flexible, and customizable interface to interact with various databases while adhering to Go's idiomatic and concurrent programming style. In this article, we'll discuss how to use GORM in your Go projects, covering installation, basic CRUD operations, and advanced features.

## Table of Contents

1. [Installation and Setup](#installation-and-setup)
2. [Defining Models](#defining-models)
3. [CRUD Operations](#crud-operations)
   1. [Create](#create)
   2. [Read](#read)
   3. [Update](#update)
   4. [Delete](#delete)
4. [Associations](#associations)
5. [Migrations](#migrations)
6. [Conclusion](#conclusion)

## Installation and Setup

To install GORM, use the `go get` command:

```bash
go get -u gorm.io/gorm
```

GORM supports several databases, including PostgreSQL, MySQL, SQLite, and SQL Server. For this tutorial, we'll use SQLite. Install the SQLite driver by running:

```bash
go get -u gorm.io/driver/sqlite
```

Now, let's import the necessary packages and configure GORM to use SQLite:

```go
package main

import (
	"gorm.io/gorm"
	"gorm.io/driver/sqlite"
)

func main() {
	db, err := gorm.Open(sqlite.Open("gorm.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect to database")
	}
}
```

## Defining Models

In GORM, you define models as Go structs with annotations to map them to the database schema. For example, let's create a `User` model:

```go
type User struct {
	ID        uint   `gorm:"primaryKey"`
	FirstName string `gorm:"size:64"`
	LastName  string `gorm:"size:64"`
	Email     string `gorm:"uniqueIndex;size:128"`
	Age       int
}
```

The `gorm` tags define the column constraints and indexes. In this case, we've set primary key, size, and unique index constraints.

## CRUD Operations

### Create

To insert a new record, create an instance of the model, and use the `Create` method:

```go
user := User{FirstName: "John", LastName: "Doe", Email: "john.doe@example.com", Age: 30}
result := db.Create(&user)
if result.Error != nil {
	panic("failed to create user")
}
```

### Read

You can retrieve records using various query methods supported by GORM. Some examples are:

- `First`: Fetch the first record matching the conditions
- `Find`: Fetch all records matching the conditions
- `Take`: Fetch one record matching the conditions

```go
// Find a user by primary key
var user User
db.First(&user, 1)

// Find users with age greater than 25
var users []User
db.Where("age > ?", 25).Find(&users)
```

### Update

To update a record, you can use the `Save` method, which updates all fields, or the `Updates` method, which updates only non-zero fields:

```go
// Update a single field
db.Model(&user).Update("age", 35)

// Update multiple fields
db.Model(&user).Updates(User{FirstName: "Johnathan", LastName: "Smith"})

// Update only non-zero fields
db.Model(&user).Updates(map[string]interface{}{"FirstName": "Johnathan", "LastName": "Smith"})
```

### Delete

To delete a record, use the `Delete` method:

```go
db.Delete(&user)
```

## Associations

GORM supports associations like `Has One`, `Has Many`, `Belongs To`, and `Many-to-Many`. For example, let's create `User` and `Post` models with a one-to-many relationship:

```go
type User struct {
	ID    uint   `gorm:"primaryKey"`
	Name  string `gorm:"size:64"`
	Posts []Post
}

type Post struct {
	ID     uint   `gorm:"primaryKey"`
	Title  string `gorm:"size:128"`
	Body   string `gorm:"type:text"`
	UserID uint
}
```

To create a new post and associate it with a user, you can do the following:

```go
post := Post{Title: "My first post", Body: "This is the content of my first post."}
db.Model(&user).Association("Posts").Append(&post)
```

## Migrations

GORM provides a simple way to create and modify the database schema using migrations. To create the schema for your models, use the `AutoMigrate` method:

```go
db.AutoMigrate(&User{}, &Post{})
```

GORM will automatically create tables and columns based on your model definitions. If you change a model's schema, you can run `AutoMigrate` again to apply the changes. However, note that GORM doesn't support migrating column data types or deleting columns.

## Conclusion

In this article, we've introduced GORM, a powerful ORM library for Go, and demonstrated how to perform basic CRUD operations, work with associations, and manage migrations. GORM provides many advanced features, such as transactions, hooks, scopes, and query builders, which can be explored further in the [official documentation](https://gorm.io/docs/).

By leveraging GORM in your Go projects, you can achieve a cleaner, more maintainable, and more idiomatic codebase for interacting with databases.