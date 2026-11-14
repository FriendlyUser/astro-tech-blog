---
description: Build a small FastAPI app in Python, covering path and query parameters,
  Pydantic request validation, and dependencies with yield for resource cleanup.
imgSrc: /imgs/2023/1899250612.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-03-05T02:02:13.000Z'
lastUpdated: 2026-11-14
tags: ["fastapi", "python"]
title: 'FastAPI basics: routes, validation, and dependencies in Python'
---

FastAPI is a Python web framework for building HTTP APIs. It is built on Starlette (the ASGI layer) and Pydantic (data validation). You declare parameters and request bodies with ordinary type hints, and FastAPI uses those hints to parse and validate requests, serialize responses, and generate an OpenAPI schema with interactive docs at `/docs`.

The examples below use Pydantic 2 and the current FastAPI release (0.162 at the time of writing). That release requires Python 3.11 or later.

## Install and run

Install FastAPI with the `standard` extra. It pulls in Uvicorn (the ASGI server) and the `fastapi` CLI:

```bash
pip install "fastapi[standard]"
```

Create `main.py`:

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}
```

Run it in development mode, which turns on auto-reload:

```bash
fastapi dev main.py
```

Running `uvicorn main:app --reload` also works. `fastapi dev` is a wrapper around the same server.

Open `http://127.0.0.1:8000/` to see `{"Hello": "World"}`, and `http://127.0.0.1:8000/docs` for the generated Swagger UI. In production, use `fastapi run main.py` instead, which turns reload off.

## Path and query parameters

A function argument that matches a `{placeholder}` in the path becomes a path parameter. Any other simple-typed argument becomes a query parameter:

```python
@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}
```

`GET /items/5?q=hammer` returns `{"item_id": 5, "q": "hammer"}`. `GET /items/abc` returns a 422 error, because `abc` can't be converted to `int`. `q` is optional because it has a default of `None`. Without a default, it would be required.

## Request bodies with Pydantic

A parameter whose type is a Pydantic model is read from the JSON request body:

```python
from pydantic import BaseModel


class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None


@app.post("/items/", status_code=201)
def create_item(item: Item) -> Item:
    return item
```

If the body is missing `name` or sends `"price": "cheap"`, FastAPI returns a 422 error before your function runs. The error body lists each failing field, for example `["body", "price"]`. The `-> Item` return annotation tells FastAPI to validate the response against `Item` and to use that model in the OpenAPI schema.

## Dependencies with `yield`

`Depends` lets a route declare something it needs, such as a database session, the current user or settings, without creating it itself. If the dependency function uses `yield`, the code after `yield` runs after the request is handled. That is the standard place to close connections.

Here is a complete `main.py` that uses a dependency for a fake in-memory database:

```python
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


class Item(BaseModel):
    name: str
    description: str | None = None
    price: float
    tax: float | None = None


class Database:
    """Stand-in for a real connection or session."""

    def __init__(self, items: dict[int, Item]) -> None:
        self.items = items

    def close(self) -> None:
        print("connection closed")


ITEMS: dict[int, Item] = {}


def get_db():
    db = Database(ITEMS)
    try:
        yield db
    finally:
        db.close()


DbDep = Annotated[Database, Depends(get_db)]


@app.post("/items/{item_id}", status_code=201)
def create_item(item_id: int, item: Item, db: DbDep) -> Item:
    if item_id in db.items:
        raise HTTPException(status_code=409, detail="Item already exists")
    db.items[item_id] = item
    return item


@app.get("/items/{item_id}")
def read_item(item_id: int, db: DbDep) -> Item:
    item = db.items.get(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
```

Every request to these routes gets its own `Database` from `get_db`, and `close()` runs once the request is done, even if the handler raises. The `Annotated[..., Depends(...)]` alias is the form the FastAPI docs now recommend. The older `db: Database = Depends(get_db)` form still works.

## Gotchas

- **Duplicate routes don't raise an error.** If you register `GET /items/{item_id}` twice, the first registration handles every request and the second is never called. An earlier version of this post had exactly this bug.
- **`def` vs `async def`.** FastAPI runs plain `def` handlers in a thread pool, so blocking calls are fine there. Inside an `async def` handler, a blocking call (such as a synchronous database driver or `time.sleep`) blocks the whole event loop. Only use `async def` when everything you await is async.
- **Don't swallow exceptions in a `yield` dependency.** If you catch an exception after `yield`, re-raise it or raise an `HTTPException`. Otherwise the client gets a 500 and nothing is logged.
- **Pydantic 2.** Older tutorials use Pydantic 1 methods like `.dict()` and `.json()`. Pydantic 2 deprecates these in favour of `.model_dump()` and `.model_dump_json()`.

## Further reading

- [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Dependencies with yield](https://fastapi.tiangolo.com/tutorial/dependencies/dependencies-with-yield/)
- [FastAPI release notes](https://fastapi.tiangolo.com/release-notes/)
