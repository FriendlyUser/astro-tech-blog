---
description: "What Hibernate ORM does and how to use it today: annotated entities, a SessionFactory, persisting and querying with HQL in Hibernate 7, plus the old APIs that are now gone."
imgSrc: /imgs/2023/251520990.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-07-06T05:08:26.000Z'
lastUpdated: 2026-11-14
tags: ["java"]
title: "Hibernate ORM basics: map, save and query Java entities with Hibernate 7"
---

:::caution
An earlier version of this post used Hibernate 5.6 with `hbm.xml` mapping files and `session.save()`. Those APIs are gone: `hbm.xml` was deprecated in Hibernate 6, and `Session.save()`, `update()` and `saveOrUpdate()` were removed in Hibernate 7. The example below uses annotations and Hibernate 7.4.
:::

Hibernate ORM maps Java classes to relational tables. You annotate a class as an entity, and Hibernate generates the SQL to insert, update, load and delete rows for it. It also tracks changes to loaded objects and writes them back when a transaction commits. Hibernate implements the Jakarta Persistence (JPA) specification and adds its own APIs on top. It's the default JPA provider in Spring Boot and Quarkus.

## Setup

Hibernate 7 requires Java 17 or later. For Maven, add Hibernate and a JDBC driver. This example uses the H2 in-memory database so it runs without a database server:

```xml
<dependencies>
    <dependency>
        <groupId>org.hibernate.orm</groupId>
        <artifactId>hibernate-core</artifactId>
        <version>7.4.15.Final</version>
    </dependency>
    <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <version>2.5.252</version>
        <scope>runtime</scope>
    </dependency>
</dependencies>
```

Note the group ID: since Hibernate 6 the artifacts are published under `org.hibernate.orm`, not `org.hibernate`.

## Define an entity

```java
package com.example;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity
public class Book {
    @Id
    @GeneratedValue
    Long id;

    String title;
    String author;

    protected Book() {}  // JPA needs a no-arg constructor

    public Book(String title, String author) {
        this.title = title;
        this.author = author;
    }

    @Override
    public String toString() {
        return id + ": " + title + " by " + author;
    }
}
```

The imports are `jakarta.persistence`, not `javax.persistence`. Hibernate 6 moved to the Jakarta namespace, which is the most common reason old tutorials fail to compile. By default the table is named after the class (`Book`) and each column after its field.

## Save and query

```java
package com.example;

import org.hibernate.jpa.HibernatePersistenceConfiguration;

public class Main {
    public static void main(String[] args) {
        try (var sessionFactory = new HibernatePersistenceConfiguration("Bookshelf")
                .managedClass(Book.class)
                .jdbcUrl("jdbc:h2:mem:db1")
                .jdbcCredentials("sa", "")
                .showSql(true, true, true)
                .createEntityManagerFactory()) {

            // create tables for the managed entities
            sessionFactory.getSchemaManager().create(true);

            // insert two rows in one transaction
            sessionFactory.inTransaction(session -> {
                session.persist(new Book("Hibernate in Action", "Christian Bauer"));
                session.persist(new Book("Java Persistence with Hibernate", "Christian Bauer"));
            });

            // query with HQL
            var books = sessionFactory.fromTransaction(session ->
                    session.createSelectionQuery(
                                    "from Book where title like :pattern order by title", Book.class)
                            .setParameter("pattern", "%Persistence%")
                            .getResultList());

            books.forEach(System.out::println);
        }
    }
}
```

A few points about this code:

- `HibernatePersistenceConfiguration` configures Hibernate in code, with no XML. The older `Configuration` class and a JPA `persistence.xml` file are alternatives.
- `inTransaction` and `fromTransaction` open a `Session`, begin a transaction, commit it (or roll it back if an exception is thrown) and close the session. That replaces the manual `beginTransaction()` / `commit()` / `close()` boilerplate.
- `persist()` is the JPA method for inserting a new entity. The ID is assigned from a database sequence because of `@GeneratedValue`.
- HQL queries entity and field names (`Book`, `title`), not table and column names. Always bind parameters (`:pattern`) instead of concatenating strings.
- Without a connection pool library on the classpath, Hibernate uses a simple built-in pool that isn't meant for production. Add `hibernate-agroal` or `hibernate-hikaricp` for real applications.

To use MySQL instead, swap H2 for `com.mysql:mysql-connector-j` (version 26.10.0 at the time of writing) and change the URL to something like `jdbc:mysql://localhost:3306/mydb`. You don't need to set a dialect: Hibernate detects the database from the JDBC connection.

## What else Hibernate gives you

- **Dirty checking.** Load an entity in a transaction, change a field, and Hibernate issues the `UPDATE` at commit. There's no `update()` call.
- **Caching.** Each `Session` acts as a first-level cache, so loading the same ID twice returns the same object. A second-level cache shared across sessions is optional and needs a provider such as a JCache implementation.
- **Queries.** Besides HQL, you can use the Jakarta Persistence Criteria API to build queries in code, or native SQL. Hibernate's own legacy `Criteria` API was removed in Hibernate 6.
- **Schema management.** `getSchemaManager()` (or the `hibernate.hbm2ddl.auto` setting) can create or validate tables. Use a migration tool like Flyway or Liquibase in production instead of letting Hibernate alter the schema.

## Gotchas

- **N+1 queries.** Lazy associations load one row at a time when you iterate them. Use `join fetch` in HQL or entity graphs when you know you need the related data.
- **`LazyInitializationException`.** Accessing a lazy association after the session has closed fails. Fetch what you need inside the transaction.
- **`equals`/`hashCode` on entities.** Don't base them on a generated ID that is `null` until the entity is persisted.

## Further reading

- [An Introduction to Hibernate 7](https://docs.hibernate.org/orm/7.4/introduction/html_single/Hibernate_Introduction.html)
- [Hibernate 7.0 migration guide](https://docs.hibernate.org/orm/7.0/migration-guide/)
- [Hibernate ORM releases](https://hibernate.org/orm/releases/)
