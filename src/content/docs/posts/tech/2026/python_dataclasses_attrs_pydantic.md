---
title: "dataclasses, attrs or Pydantic: picking a Python data class library"
description: "The same order model written with dataclasses, attrs and Pydantic: frozen objects, slots, defaults, validation, conversion and JSON, and when to use each."
tags: ["Python", "Dataclasses", "attrs", "Pydantic", "Data Validation"]
pubDate: "2026-02-06T16:00:00.000Z"
imgSrc: "/imgs/2026/python_dataclasses_attrs_pydantic.webp"
imgAlt: "A grid comparing dataclasses, attrs and Pydantic on frozen, slots, validation, conversion and JSON support"
---

Python has three common ways to declare a class that is mostly fields: the standard library's `dataclasses`, the third-party `attrs` package, and Pydantic. They look almost the same at the definition site, which hides the fact that they answer different questions. `dataclasses` and `attrs` generate boilerplate for objects your own code creates. Pydantic validates and converts data that came from somewhere else.

This post writes one small model three ways and compares the parts that matter day to day: immutability, `__slots__`, defaults, validation, type conversion and serialisation. Examples were run on Python 3.12 with attrs 25.4, cattrs 25.3 and Pydantic 2.12.

## The model

An order with an integer ID, a customer name, a timestamp, a tuple of item names and a list of tags. We want it immutable, and we want a blank customer name to be rejected.

### dataclasses

```python
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True, slots=True)
class OrderDC:
    order_id: int
    customer: str
    placed_at: datetime
    items: tuple[str, ...] = ()
    tags: list[str] = field(default_factory=list)
```

`frozen=True` makes assignment raise `FrozenInstanceError` and generates `__hash__`. `slots=True` (Python 3.10+) builds a class with `__slots__`, so instances have no `__dict__` and use less memory per object. A mutable default such as `[]` must go through `default_factory`; the decorator raises `ValueError` if you write `tags: list[str] = []`.

What a dataclass does not do is check anything. The type annotations are only used to find the fields:

```python
>>> OrderDC("1", "", "yesterday")
OrderDC(order_id='1', customer='', placed_at='yesterday', items=(), tags=[])
```

To reject a blank name you would write a `__post_init__` that raises.

### attrs

```python
import attrs
from datetime import datetime


@attrs.frozen
class OrderAttrs:
    order_id: int = attrs.field(converter=int)
    customer: str = attrs.field(validator=attrs.validators.min_len(1))
    placed_at: datetime
    items: tuple[str, ...] = attrs.field(default=(), converter=tuple)
    tags: list[str] = attrs.Factory(list)
```

`attrs` is where dataclasses came from, and it still does more. `@attrs.frozen` is `@attrs.define(frozen=True)`, and `define` uses slots by default, so there is nothing extra to switch on. Per-field **validators** and **converters** are opt-in: the `order_id` converter turns `"2"` into `2`, the `items` converter turns a list into a tuple, and `min_len(1)` rejects an empty customer.

```python
>>> OrderAttrs("2", "ada", now, ["book", "pen"])
OrderAttrs(order_id=2, customer='ada', placed_at=datetime.datetime(2026, 2, 6, 9, 30), items=('book', 'pen'), tags=[])
>>> OrderAttrs(3, "", now)
ValueError: Length of 'customer' must be >= 1: 0
```

The important point is that attrs only validates what you ask it to. `placed_at` has no validator, so `OrderAttrs(1, "ada", "yesterday")` is accepted. That is a design choice: attrs treats validation as an explicit, per-field decision, not something implied by annotations.

### Pydantic

```python
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class OrderPD(BaseModel):
    model_config = ConfigDict(frozen=True)

    order_id: int
    customer: str = Field(min_length=1)
    placed_at: datetime
    items: tuple[str, ...] = ()
    tags: list[str] = []

    @field_validator("customer")
    @classmethod
    def strip_customer(cls, v: str) -> str:
        return v.strip()
```

Pydantic reads the annotations and validates every field on construction. It also converts: in the default "lax" mode a string `"3"` becomes `3` and an ISO 8601 string becomes a `datetime`. A mutable default like `[]` is fine here, because Pydantic copies defaults per instance.

```python
>>> OrderPD.model_validate({"order_id": "3", "customer": "  ada ",
...                         "placed_at": "2026-02-06T09:30:00", "items": ["book"]})
OrderPD(order_id=3, customer='ada', placed_at=datetime.datetime(2026, 2, 6, 9, 30), items=('book',), tags=[])
```

Bad input produces one error per field, with the location and the reason:

```text
3 validation errors for OrderPD
order_id
  Input should be a valid integer, unable to parse string as an integer [type=int_parsing, input_value='three', input_type=str]
customer
  String should have at least 1 character [type=string_too_short, input_value='', input_type=str]
placed_at
  Input should be a valid datetime or date, input is too short [type=datetime_from_date_parsing, input_value='yesterday', input_type=str]
```

(Each error also prints a link to the error-type docs; I trimmed those lines.) That structured error list is the main reason to use Pydantic on API input: `e.errors()` gives you a list of dicts you can return to the caller as-is.

If you do not want the coercion, set `ConfigDict(strict=True)` on the model or `Field(strict=True)` on one field, and `"3"` is rejected for an `int`.

## Side by side

| | dataclasses | attrs | Pydantic |
|---|---|---|---|
| Install | standard library | `pip install attrs` | `pip install pydantic` |
| Immutable | `frozen=True` | `@attrs.frozen` | `ConfigDict(frozen=True)` |
| `__slots__` | `slots=True` (3.10+) | on by default with `define` | no; fields live in the instance `__dict__` |
| Mutable defaults | `default_factory` | `attrs.Factory` | plain `[]` is copied |
| Validation | none (write `__post_init__`) | opt-in validators per field | every field, from the annotations |
| Conversion | none | opt-in converters per field | automatic in lax mode |
| Copy with changes | `dataclasses.replace` | `attrs.evolve` | `model.model_copy(update=...)` |
| To dict | `dataclasses.asdict` | `attrs.asdict` | `model.model_dump()` |
| To/from JSON | do it yourself | use `cattrs` | `model_dump_json()` / `model_validate_json()` |

One detail from that table: `model_copy(update=...)` does **not** validate the update. `p.model_copy(update={"customer": ""})` produces an object with a blank customer. If the new values are untrusted, build a new model with `model_validate` instead.

## Serialisation and conversion

`dataclasses.asdict` and `attrs.asdict` give you a nested dict, but values such as `datetime` stay as Python objects, so `json.dumps` on the result fails. For dataclasses you write a small `default=` function for `json.dumps`. For attrs, the companion library **cattrs** does structured conversion in both directions:

```python
from datetime import datetime
import attrs
import cattrs


@attrs.frozen
class Order:
    order_id: int
    customer: str
    placed_at: datetime
    items: tuple[str, ...] = ()


conv = cattrs.Converter()
conv.register_structure_hook(datetime, lambda v, _: datetime.fromisoformat(v))
conv.register_unstructure_hook(datetime, lambda d: d.isoformat())

o = conv.structure(
    {"order_id": 1, "customer": "ada", "placed_at": "2026-02-06T09:30:00", "items": ["book"]},
    Order,
)
print(o)
print(conv.unstructure(o))
```

```text
Order(order_id=1, customer='ada', placed_at=datetime.datetime(2026, 2, 6, 9, 30), items=('book',))
{'order_id': 1, 'customer': 'ada', 'placed_at': '2026-02-06T09:30:00', 'items': ['book']}
```

The hooks live on the converter, not the class. That keeps the model free of any knowledge about JSON, which is the attrs philosophy in one sentence.

Pydantic has serialisation built in: `model_dump()` for a dict, `model_dump(mode="json")` for a JSON-safe dict, and `model_dump_json()` for a string:

```text
{"order_id":3,"customer":"ada","placed_at":"2026-02-06T09:30:00","items":["book"],"tags":[]}
```

Pydantic can also validate plain dataclasses without converting them to models, through `TypeAdapter`:

```python
from dataclasses import dataclass
from pydantic import TypeAdapter


@dataclass
class Point:
    x: int
    y: int


ta = TypeAdapter(Point)
print(ta.validate_python({"x": "1", "y": 2}))  # Point(x=1, y=2)
print(ta.dump_json(Point(1, 2)))               # b'{"x":1,"y":2}'
```

That is a handy middle ground: keep stdlib dataclasses inside your code, and validate them only at the edge.

## Running the comparison yourself

The full script with all three models is short enough to paste into one file. With `uv` you can run it without creating a virtual environment:

```bash
uv run --with attrs --with cattrs --with pydantic models.py
```

Try passing a string for `order_id` and an empty `customer` to each class. The dataclass accepts both, attrs converts the first and rejects the second, and Pydantic converts the first and reports the second with its field name.

## Which one to pick

- **Internal data that your own code creates:** `dataclasses`. No dependency, type checkers understand it fully, and `frozen=True, slots=True` covers most needs. If you find yourself writing validation in `__post_init__` for several classes, that is the point to look at attrs.
- **Internal data with some invariants, or many classes:** `attrs`. Validators and converters per field, slots by default, and cattrs when you need JSON without tying the model to a format.
- **Untrusted input (HTTP bodies, config files, queue messages):** Pydantic. Validation and coercion are the whole point, the error reports are good, and frameworks such as FastAPI build on it.

A common split in larger codebases is Pydantic models at the boundary (request and response schemas, settings) and dataclasses or attrs classes for the domain objects inside. Converting between them is a few lines, and it stops HTTP-shaped concerns from leaking into the core logic.

### Things to watch for

- **Pydantic is not a drop-in for dataclasses.** Its models have their own method names (`model_dump`, `model_copy`, `model_validate`) and pydantic-specific behaviour such as coercion. Code that calls `dataclasses.asdict` on them will not work.
- **Coercion can hide bugs.** Lax mode accepts `"3"` for an `int` and `1` for a `bool`. If your internal code passes the wrong type, Pydantic will often fix it silently. Strict mode is worth considering for models that are not built from external input.
- **Don't compare speed from blog posts.** Pydantic's validation core is compiled, attrs and dataclasses generate plain Python methods, and which is faster depends on whether you validate. Measure your own workload if it matters.

## Further reading

- [`dataclasses` documentation](https://docs.python.org/3/library/dataclasses.html)
- [attrs documentation](https://www.attrs.org/en/stable/)
- [cattrs documentation](https://catt.rs/en/stable/)
- [Pydantic documentation](https://docs.pydantic.dev/latest/)
- [Why not Pydantic? (from the attrs docs)](https://www.attrs.org/en/stable/why.html)
