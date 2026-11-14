---
description: "Define models, create tables, and insert, query, update and delete rows with the SQLAlchemy 2.x ORM, plus relationships, transactions and inheritance."
imgSrc: "/imgs/2023/futuristic-towers-skybridge.webp"
layout: '@/templates/BasePost.astro'
pubDate: '2023-10-24T03:02:10.000Z'
lastUpdated: 2026-11-14
tags: ['python', 'sql']
title: "SQLAlchemy 2.x ORM basics: models, sessions and queries in Python"
---

SQLAlchemy is a Python database toolkit with two layers: Core, which builds SQL expressions, and the ORM, which maps Python classes to tables. This post covers the ORM: defining models, creating tables, CRUD operations, relationships, transactions and inheritance.

The examples use the 2.0-style API (`DeclarativeBase`, `Mapped`, `mapped_column`, `select()`), which is what the current 2.x releases document. If you've seen older code using `declarative_base()` from `sqlalchemy.ext.declarative` and `session.query(...)`, that's the 1.x style; `session.query()` still works as a legacy API, but new code should use `select()`.

Everything below uses SQLite, so it runs without a database server. To use PostgreSQL or MySQL, change the connection URL and install the matching driver; the ORM code stays the same.

## Installation

```sh
pip install sqlalchemy
```

## Defining models

A model is a class that maps to a table. Type annotations on `Mapped[...]` tell SQLAlchemy the column type and whether it's nullable.

```python
from sqlalchemy import ForeignKey, String, create_engine, select
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    Session,
    mapped_column,
    relationship,
)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    age: Mapped[int]

    posts: Mapped[list["Post"]] = relationship(
        back_populates="author", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"User(id={self.id}, name={self.name!r}, age={self.age})"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    content: Mapped[str | None]
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    author: Mapped["User"] = relationship(back_populates="posts")
```

`Mapped[str]` becomes a `NOT NULL` column; `Mapped[str | None]` is nullable. `age: Mapped[int]` with no `mapped_column()` is fine when you don't need any extra options. `cascade="all, delete-orphan"` means a user's posts are deleted along with the user.

## Creating the engine and tables

The engine manages the connection pool and the SQL dialect. `create_all()` issues `CREATE TABLE` for every model that doesn't have a table yet:

```python
engine = create_engine("sqlite:///example.db", echo=True)
Base.metadata.create_all(engine)
```

`echo=True` logs every SQL statement, which is useful while learning. See the [engine configuration docs](https://docs.sqlalchemy.org/en/20/core/engines.html) for URL formats for other databases.

`create_all()` won't alter existing tables. For schema changes in a real project, use [Alembic](https://alembic.sqlalchemy.org/) migrations.

## Sessions

A `Session` tracks the objects you've loaded or added and writes the changes in a transaction when you commit. Use it as a context manager so it's always closed:

```python
with Session(engine) as session:
    ...
```

## Inserting rows

```python
with Session(engine) as session:
    alice = User(name="Alice", age=30)
    alice.posts.append(Post(title="Hello", content="First post"))
    session.add(alice)
    session.commit()
```

Adding `alice` also adds her post, because the relationship cascades `save-update` by default.

## Querying

Build a `select()` statement and run it with `session.scalars()` (one ORM object per row) or `session.execute()` (tuples of columns).

```python
with Session(engine) as session:
    # All users
    users = session.scalars(select(User)).all()

    # By primary key
    user = session.get(User, 1)

    # Filtering
    alices = session.scalars(select(User).where(User.name == "Alice")).all()
    thirty_plus = session.scalars(select(User).where(User.age >= 30)).all()

    # Ordering
    by_age = session.scalars(select(User).order_by(User.age)).all()

    # Exactly one result, or raise
    alice = session.scalars(select(User).where(User.name == "Alice")).one()

    # Join through the relationship
    stmt = select(Post.title, User.name).join(Post.author)
    for title, author_name in session.execute(stmt):
        print(title, author_name)
```

`session.get()` replaces the legacy `session.query(User).get(1)`, which is deprecated.

## Updating rows

Change attributes on a loaded object and commit:

```python
with Session(engine) as session:
    user = session.get(User, 1)
    if user is not None:
        user.age = 35
        session.commit()
```

## Deleting rows

```python
with Session(engine) as session:
    user = session.get(User, 1)
    if user is not None:
        session.delete(user)
        session.commit()
```

Alice's post is deleted too, because of the `delete-orphan` cascade on `User.posts`. With the default cascade, SQLAlchemy would instead set the post's `user_id` to `NULL`, and the commit would fail with an `IntegrityError` because that column is `NOT NULL`.

## Transactions

A session starts a transaction automatically on first use. To make a block atomic, with commit on success and rollback on any exception, use `session.begin()` as a context manager:

```python
with Session(engine) as session:
    with session.begin():
        session.add_all([User(name="Bob", age=25), User(name="Carol", age=28)])
    # committed here, or rolled back if the block raised
```

Don't call `session.begin()` on a session that has already been used without committing: a transaction is already in progress and SQLAlchemy raises an error.

## Inheritance

SQLAlchemy supports single-table, joined-table and concrete-table inheritance. With single-table inheritance, all subclasses share one table and a discriminator column records which class each row belongs to:

```python
class Animal(Base):
    __tablename__ = "animals"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    type: Mapped[str] = mapped_column(String(20))

    __mapper_args__ = {
        "polymorphic_identity": "animal",
        "polymorphic_on": "type",
    }


class Cat(Animal):
    meow_sound: Mapped[str | None]

    __mapper_args__ = {"polymorphic_identity": "cat"}


class Dog(Animal):
    bark_sound: Mapped[str | None]

    __mapper_args__ = {"polymorphic_identity": "dog"}


Base.metadata.create_all(engine)

with Session(engine) as session:
    session.add_all([
        Cat(name="Tom", meow_sound="meow"),
        Dog(name="Rex", bark_sound="woof"),
    ])
    session.commit()

    for animal in session.scalars(select(Animal)):
        print(type(animal).__name__, animal.name)  # Cat Tom, Dog Rex
```

`Cat` and `Dog` have no `__tablename__`, so their columns are added to the `animals` table. Subclass-only columns must be nullable, since a `Dog` row has no `meow_sound`. Querying `Animal` returns instances of the right subclass based on the `type` column.

Single-table inheritance is simplest and fastest to query, but the table gets wide and sparse as subclasses add columns. Joined-table inheritance gives each subclass its own table at the cost of a join per query.

## Gotchas

- Objects expire after `commit()` by default, so reading an attribute afterwards issues a new `SELECT`. Accessing them after the session has closed raises `DetachedInstanceError`. Pass `expire_on_commit=False` to `Session` if you need to use objects after committing.
- Accessing a relationship in a loop (`for u in users: u.posts`) runs one query per user. Use `selectinload()` in the `select()` to load them in one extra query.
- `create_all()` is for prototypes and tests; use Alembic for anything with real data.

## Further reading

- [SQLAlchemy Unified Tutorial](https://docs.sqlalchemy.org/en/20/tutorial/index.html)
- [ORM Quick Start](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [Mapping class inheritance hierarchies](https://docs.sqlalchemy.org/en/20/orm/inheritance.html)
