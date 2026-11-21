---
title: "Python typing with Protocols and the PEP 695 generic syntax"
description: "Structural typing with typing.Protocol, the limits of runtime_checkable, Python 3.12's generic syntax and type statement, checked with mypy and Pyright."
tags: ["Python", "Typing", "Protocols", "Generics", "mypy", "Pyright"]
pubDate: "2026-04-22T16:00:00.000Z"
imgSrc: "/imgs/2026/python_protocols_and_generics.webp"
imgAlt: "InMemoryRepo plugging into both slots of a Repository protocol while ReadOnlyRepo fails because it has no put method"
---

A `Protocol` describes what an object must be able to do, not what it inherits from. Any class with matching methods satisfies it, without importing it or subclassing it. That is how Python code is usually written anyway (duck typing), and Protocols let a type checker verify it.

Generics are the other half: a `Repository[User]` and a `Repository[Order]` share one definition but keep their item types apart. Python 3.12 added a much shorter syntax for generics (PEP 695) and a `type` statement for aliases. This post covers both, with the examples checked by mypy 1.20 and Pyright 1.1.409 and run on Python 3.12.

## Structural typing with `Protocol`

Start with the simplest useful protocol:

```python
from typing import Protocol


class SupportsClose(Protocol):
    def close(self) -> None: ...


def shutdown(*resources: SupportsClose) -> None:
    for r in resources:
        r.close()
```

`shutdown` accepts a file, a socket, a database connection, or any class you write with a `close()` method. None of them know `SupportsClose` exists. With an abstract base class, every one of those types would have to inherit from it, which you cannot arrange for the standard library or third-party code.

The body of a protocol method is `...`. Protocol members can also be attributes (`name: str`) or properties.

### A generic protocol

A repository interface that works for any item type:

```python
from dataclasses import dataclass
from typing import Protocol


class Repository[T](Protocol):
    def get(self, key: str) -> T | None: ...
    def put(self, key: str, value: T) -> None: ...


@dataclass
class User:
    name: str
    email: str


def register(repo: Repository[User], user: User) -> None:
    if repo.get(user.email) is not None:
        raise ValueError(f"{user.email} already registered")
    repo.put(user.email, user)
```

`class Repository[T](Protocol)` is the PEP 695 syntax. Before 3.12 the same thing needed a module-level `TypeVar` and an explicit `Generic` base:

```python
from typing import Generic, Protocol, TypeVar

T = TypeVar("T")


class Repository(Protocol[T]):
    def get(self, key: str) -> T | None: ...
    def put(self, key: str, value: T) -> None: ...
```

The new form scopes `T` to the class, so there is no stray `T` at module level and no risk of reusing one `TypeVar` in two unrelated places.

An implementation does not mention the protocol at all:

```python
class InMemoryRepo[T]:
    def __init__(self) -> None:
        self._items: dict[str, T] = {}

    def get(self, key: str) -> T | None:
        return self._items.get(key)

    def put(self, key: str, value: T) -> None:
        self._items[key] = value

    def close(self) -> None:
        self._items.clear()


repo = InMemoryRepo[User]()
register(repo, User("Ada", "ada@example.com"))
shutdown(repo, open(__file__))
```

`InMemoryRepo[User]` satisfies `Repository[User]` because its methods match, and it satisfies `SupportsClose` because it has `close()`. One class, two protocols, zero inheritance.

### What the type checker catches

Put a few mistakes in a second file:

```python
from shapes import InMemoryRepo, User, largest, register


class ReadOnlyRepo:
    def get(self, key: str) -> User | None:
        return None


register(ReadOnlyRepo(), User("a", "b"))        # no put()
register(InMemoryRepo[int](), User("a", "b"))   # wrong item type
largest("a", "b")                               # covered below
```

mypy in strict mode:

```text
errors.py:9: error: Argument 1 to "register" has incompatible type "ReadOnlyRepo"; expected "Repository[User]"  [arg-type]
errors.py:9: note: "ReadOnlyRepo" is missing following "Repository" protocol member:
errors.py:9: note:     put
errors.py:10: error: Argument 1 to "register" has incompatible type "InMemoryRepo[int]"; expected "Repository[User]"  [arg-type]
errors.py:11: error: Value of type variable "T" of "largest" cannot be "str"  [type-var]
Found 3 errors in 1 file (checked 2 source files)
```

Pyright reports the same three problems, and for the second one it explains exactly which method signatures disagree (`"get" is an incompatible type ... "int | None" is not assignable to "T@Repository | None"`). When a protocol mismatch is confusing, Pyright's message is usually the quicker one to read.

## `runtime_checkable` and its caveats

Protocols are a static-typing feature. If you try `isinstance(x, SupportsClose)` you get:

```text
TypeError: Instance and class checks can only be used with @runtime_checkable protocols
```

Decorating the protocol with `@runtime_checkable` allows `isinstance`, but the check is much weaker than what the type checker does. It only tests that the attributes **exist**:

```python
from typing import Protocol, runtime_checkable


@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...


class Door:
    def close(self, force: bool) -> str:  # wrong signature
        return "slam"


class Flag:
    close = True  # not even callable


print(isinstance(Door(), Closeable))  # True
print(isinstance(Flag(), Closeable))  # True
```

Signatures, return types and even callability are not checked. A few more rules:

- `issubclass()` does not work on protocols that have non-method members. With a `name: str` member you get `TypeError: Protocols with non-method members don't support issubclass()`.
- The check looks up every protocol member on the object, so it is slower than an `isinstance` against a normal class. In a hot loop that can show up.
- A `True` result does not narrow anything you can trust at runtime. Treat it as "probably has these methods" and nothing more.

I use `runtime_checkable` for dispatch on clearly different kinds of object (does this thing have `read` or not), and never as validation.

## The PEP 695 syntax in functions and aliases

Generic functions declare their type parameters in brackets after the name:

```python
def first[T](items: list[T]) -> T:
    return items[0]
```

### Bounds and constraints

A bound restricts `T` to subtypes of something, and works with protocols:

```python
class HasName(Protocol):
    @property
    def name(self) -> str: ...


def names[T: HasName](items: list[T]) -> list[str]:
    return [i.name for i in items]
```

Constraints restrict `T` to exactly one of a list of types. Note the tuple:

```python
def largest[T: (int, float)](a: T, b: T) -> T:
    return a if a >= b else b
```

`largest(3, 7)` is fine and `largest("a", "b")` is the error shown earlier. The difference matters: with a bound, `T` solves to the actual argument type (say `User`); with constraints, `T` becomes exactly one of the listed types.

Python 3.13 added defaults for type parameters (PEP 696), written `class Box[T = int]: ...`. That syntax is a `SyntaxError` on 3.12.

### Variance is inferred

With the old `TypeVar`, you had to declare `covariant=True` or `contravariant=True` yourself and get it right. With PEP 695 syntax the checker works it out from how `T` is used:

```python
class Animal: ...
class Dog(Animal): ...


class Box[T]:
    def __init__(self, item: T) -> None:
        self.item = item  # public, mutable attribute

    def get(self) -> T:
        return self.item


class ReadOnly[T]:
    def __init__(self, item: T) -> None:
        self._item = item

    def get(self) -> T:
        return self._item


def feed_box(b: Box[Animal]) -> None: ...
def feed_ro(b: ReadOnly[Animal]) -> None: ...


feed_box(Box[Dog](Dog()))      # error: Box is invariant
feed_ro(ReadOnly[Dog](Dog()))  # fine: ReadOnly is covariant
```

`Box` exposes a writable `item`, so a `Box[Dog]` used as a `Box[Animal]` could have a `Cat` written into it; mypy rejects it. `ReadOnly` only hands `T` out, so it is inferred covariant and a `ReadOnly[Dog]` is accepted where a `ReadOnly[Animal]` is expected. `Repository[T]` above uses `T` both in and out, so it is invariant.

### The `type` statement

```python
type Pair[T] = tuple[T, T]
type JSON = dict[str, JSON] | list[JSON] | str | int | float | bool | None


def swap[T](pair: Pair[T]) -> Pair[T]:
    a, b = pair
    return b, a


config: JSON = {"debug": True, "ports": [80, 443]}
```

`type` creates a `TypeAliasType`. Its value is evaluated lazily, which is why `JSON` can refer to itself without quotes. Aliases can be generic (`Pair[T]`).

Because the alias is an object and not the underlying type, you cannot use it at runtime as a class:

```python
type IntList = list[int]
isinstance([1], IntList)
# TypeError: isinstance() arg 2 must be a type, a tuple of types, or a union
```

Use `IntList.__value__` if you need the real type at runtime.

## Running the checks yourself

With uv installed, no project setup is needed:

```bash
uvx mypy --strict shapes.py errors.py
uvx pyright shapes.py errors.py
```

The `pyright` package on PyPI is a wrapper that downloads the Node-based checker on first run. If you already have Node, `npx pyright` does the same.

Both checkers support PEP 695 syntax. If your project's minimum Python is below 3.12, though, you cannot use it: the new brackets are a `SyntaxError` on older interpreters. Use `TypeVar` and `Generic` there, and the same type checks apply.

## Gotchas

- **Inference can widen instead of failing.** `swap((1, "two"))` passes both checkers, because `T` is solved as `object` (mypy) or `int | str` (Pyright) rather than rejected. If you need two arguments of exactly the same type, a generic signature alone will not enforce it.
- **Parameter names are part of the signature.** Pyright rejects an implementation whose `f(self, name: str)` doesn't match the protocol's `f(self, key: str)`, because a caller could pass `key=` by keyword. mypy 1.20 accepted the same code. If names should not matter, make the protocol's parameters positional-only with `/`.
- **Explicit subclassing is allowed.** `class InMemoryRepo[T](Repository[T])` works and makes the checker verify the class at its definition instead of at the first call site. It is a reasonable choice for implementations you own.
- **Don't over-abstract.** A protocol with one implementation and one caller is just indirection. They pay off at boundaries: test doubles, plugins, and functions that accept several unrelated types.

## Further reading

- [typing.Protocol in the Python docs](https://docs.python.org/3/library/typing.html#typing.Protocol)
- [Protocols in the typing specification](https://typing.python.org/en/latest/spec/protocol.html)
- [PEP 695: Type Parameter Syntax](https://peps.python.org/pep-0695/)
- [mypy: Protocols and structural subtyping](https://mypy.readthedocs.io/en/stable/protocols.html)
- [Pyright documentation](https://microsoft.github.io/pyright/)
