---
title: "Builders and the typestate pattern in Rust"
description: "From a plain Rust builder to one where missing required fields are compile errors, then a PhantomData state machine, with the trade-offs of encoding state in types."
tags: ["Rust", "Design Patterns", "Type System", "Generics", "PhantomData"]
pubDate: "2026-06-04T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_typestate_builder.webp"
imgAlt: "A state machine of three boxes, Disconnected, Connected and Authenticated, joined by arrows labelled with method names"
---

Rust has no named or default arguments, so types with many optional settings are usually built with a builder: a separate type with one method per setting and a final `build()`. The typestate pattern goes one step further and moves "has this been set yet?" from a runtime check into the type system, so forgetting a required field fails to compile.

This post starts with a plain builder, turns it into a typestate builder, then uses `PhantomData` for a small connection state machine, and ends with when the extra types are worth it. Everything is standard library only. The examples use the 2024 edition (Rust 1.85 or later), but nothing in them depends on recent language features.

## A plain builder

Here is an HTTP-request-like type with one required field (`url`) and a few optional ones:

```rust
#[derive(Debug)]
pub struct Request {
    pub url: String,
    pub method: Method,
    pub headers: Vec<(String, String)>,
    pub timeout_secs: u64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Method {
    Get,
    Post,
}

#[derive(Debug, PartialEq)]
pub enum BuildError {
    MissingUrl,
}

#[derive(Default)]
pub struct RequestBuilder {
    url: Option<String>,
    method: Option<Method>,
    headers: Vec<(String, String)>,
    timeout_secs: Option<u64>,
}

impl RequestBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }

    pub fn method(mut self, method: Method) -> Self {
        self.method = Some(method);
        self
    }

    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }

    pub fn timeout_secs(mut self, secs: u64) -> Self {
        self.timeout_secs = Some(secs);
        self
    }

    pub fn build(self) -> Result<Request, BuildError> {
        let url = self.url.ok_or(BuildError::MissingUrl)?;
        Ok(Request {
            url,
            method: self.method.unwrap_or(Method::Get),
            headers: self.headers,
            timeout_secs: self.timeout_secs.unwrap_or(30),
        })
    }
}
```

Usage reads well:

```rust
let request = RequestBuilder::new()
    .url("https://example.com/items")
    .header("accept", "application/json")
    .build()?;
```

Each method takes `self` by value and returns it, which is what makes chaining work without `&mut` juggling. The cost of this design is `build()` returning a `Result`. The caller has to handle `MissingUrl`, even though in practice it's a programming mistake that will never happen once the code is written correctly. And if it does happen, you only find out at runtime, maybe in a code path the tests didn't cover.

That's a perfectly good builder, and it's what most crates ship. The rest of the post is about removing that `Result`.

## Required fields in the type

The idea: give the builder a type parameter per required field. The parameter is either a "not set" marker or a type that holds the value. Methods that set a field are only defined when it's unset, and `build()` is only defined when everything required is set.

This version makes both `url` and `method` required, settable in either order:

```rust
// Markers for "not set yet" and wrappers holding the value once set.
pub struct NoUrl;
pub struct Url(String);
pub struct NoMethod;
pub struct WithMethod(Method);

pub struct RequestBuilder<U, M> {
    url: U,
    method: M,
    headers: Vec<(String, String)>,
    timeout_secs: u64,
}

impl RequestBuilder<NoUrl, NoMethod> {
    pub fn new() -> Self {
        RequestBuilder {
            url: NoUrl,
            method: NoMethod,
            headers: Vec::new(),
            timeout_secs: 30,
        }
    }
}

// Only available while the URL is unset, whatever the method state is.
impl<M> RequestBuilder<NoUrl, M> {
    pub fn url(self, url: impl Into<String>) -> RequestBuilder<Url, M> {
        RequestBuilder {
            url: Url(url.into()),
            method: self.method,
            headers: self.headers,
            timeout_secs: self.timeout_secs,
        }
    }
}

// Only available while the method is unset.
impl<U> RequestBuilder<U, NoMethod> {
    pub fn method(self, method: Method) -> RequestBuilder<U, WithMethod> {
        RequestBuilder {
            url: self.url,
            method: WithMethod(method),
            headers: self.headers,
            timeout_secs: self.timeout_secs,
        }
    }
}

// Optional settings work in every state and keep the state unchanged.
impl<U, M> RequestBuilder<U, M> {
    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }

    pub fn timeout_secs(mut self, secs: u64) -> Self {
        self.timeout_secs = secs;
        self
    }
}

// build() exists only when both required fields are set.
impl RequestBuilder<Url, WithMethod> {
    pub fn build(self) -> Request {
        Request {
            url: self.url.0,
            method: self.method.0,
            headers: self.headers,
            timeout_secs: self.timeout_secs,
        }
    }
}
```

Now `build()` returns `Request` directly, and the mistakes become compile errors:

```rust
let ok = RequestBuilder::new()
    .method(Method::Post)
    .header("content-type", "application/json")
    .url("https://example.com/items")
    .build(); // RequestBuilder<Url, WithMethod>: build() exists

let missing = RequestBuilder::new()
    .url("https://example.com/items")
    .build(); // error: no method named `build` found for `RequestBuilder<Url, NoMethod>`

let twice = RequestBuilder::new()
    .url("https://a.example")
    .url("https://b.example"); // error: no method named `url` found for `RequestBuilder<Url, NoMethod>`
```

For the missing `build()`, rustc's error also notes the type the method *was* found for (`RequestBuilder<Url, WithMethod>`), which is a decent hint once you know the pattern.

A few things to notice:

- **The state types carry the data.** `Url(String)` holds the URL, so `build()` reads `self.url.0` with no `Option` and no `unwrap`. `NoUrl` is a zero-sized unit struct, so the builder costs nothing extra while a field is unset.
- **Each transition rebuilds the struct.** Changing a type parameter means creating a new value of a different type, so every setter for a required field lists all the fields again. With many fields that gets repetitive. Grouping the optional settings into one inner struct keeps each transition to a few lines.
- **Generic `impl` blocks express "in any state".** `impl<U, M>` for the optional setters, `impl<M> RequestBuilder<NoUrl, M>` for "URL unset, method whatever".

## A state machine with `PhantomData`

In the builder, each type parameter was used by a field. Sometimes the state has no data at all: a connection is just *in* a state. If a struct declares a type parameter and no field uses it, the compiler rejects it (error E0392, "parameter is never used"). `std::marker::PhantomData<T>` is a zero-sized field that "uses" `T` and nothing else.

Using empty enums as the states makes the point clearer: they have no values, so they can only ever exist as type-level labels.

```rust
use std::marker::PhantomData;

pub enum Disconnected {}
pub enum Connected {}
pub enum Authenticated {}

pub struct Connection<State> {
    address: String,
    log: Vec<String>,
    _state: PhantomData<State>,
}

impl<S> Connection<S> {
    // Moves the same data into a different state.
    fn transition<T>(self) -> Connection<T> {
        Connection {
            address: self.address,
            log: self.log,
            _state: PhantomData,
        }
    }

    pub fn log(&self) -> &[String] {
        &self.log
    }
}

impl Connection<Disconnected> {
    pub fn new(address: impl Into<String>) -> Self {
        Connection {
            address: address.into(),
            log: Vec::new(),
            _state: PhantomData,
        }
    }

    pub fn connect(mut self) -> Connection<Connected> {
        self.log.push(format!("connected to {}", self.address));
        self.transition()
    }
}

impl Connection<Connected> {
    pub fn login(mut self, user: &str) -> Connection<Authenticated> {
        self.log.push(format!("logged in as {user}"));
        self.transition()
    }

    pub fn disconnect(self) -> Connection<Disconnected> {
        self.transition()
    }
}

impl Connection<Authenticated> {
    pub fn query(&mut self, sql: &str) {
        self.log.push(format!("query: {sql}"));
    }

    pub fn disconnect(self) -> Connection<Disconnected> {
        self.transition()
    }
}
```

`query` only exists on `Connection<Authenticated>`, so calling it before `login` doesn't compile. Because transitions take `self` by value, the old state is consumed: after `let conn = conn.connect();` there's no `Connection<Disconnected>` left around to misuse. Methods that don't change state, like `query`, take `&mut self` as usual.

`PhantomData` is zero-sized, so `Connection<Connected>` has exactly the same layout as `Connection<Disconnected>`. The state checks cost nothing at runtime.

One subtlety: `PhantomData<State>` tells the compiler the struct behaves as if it owns a `State`. That affects auto traits like `Send` and `Sync`, and drop checking. With empty enums as states it makes no difference, since they're `Send` and `Sync`. If your marker types might not be, the common idiom is `PhantomData<fn() -> State>`, which is always `Send` and `Sync` and doesn't claim ownership.

## The whole thing, runnable

Put the `Request`, `Method`, typestate `RequestBuilder` and `Connection` code above into `src/main.rs` (skip the plain builder and `BuildError`, since the names clash), then add:

```rust
fn main() {
    let request = RequestBuilder::new()
        .method(Method::Post)
        .url("https://example.com/api/items")
        .header("content-type", "application/json")
        .timeout_secs(10)
        .build();
    println!("{request:?}");

    let mut conn = Connection::new("db.internal:5432").connect().login("app");
    conn.query("SELECT 1");
    let conn = conn.disconnect();
    for line in conn.log() {
        println!("{line}");
    }
}
```

`cargo run` prints the request and three log lines. Then try the failing calls from earlier, or `Connection::new("x").query("SELECT 1")`, and read the errors.

## Trade-offs

Typestate is a good fit when misuse is easy and expensive: a protocol with a fixed order of steps, a builder whose required fields really are required, a resource that must be initialized before use. It costs you in other ways:

- **The state must be known at compile time.** If whether a connection is authenticated depends on runtime input, you can't hold "a connection in some state" in one variable or one `Vec`. You end up writing an enum like `enum AnyConnection { Disconnected(Connection<Disconnected>), Connected(Connection<Connected>), ... }` and matching on it, which brings back the runtime checks.
- **Conditional building gets awkward.** `if verbose { builder = builder.header(...) }` works for state-preserving setters, but not for ones that change the type: the two branches would produce different types. Set required fields unconditionally and keep the optional ones state-preserving.
- **Type signatures leak.** Storing a half-built builder in a struct field or returning one from a function means writing `RequestBuilder<Url, NoMethod>`. Most users never need to, but library authors should export the marker types and document them.
- **Boilerplate grows with required fields.** Each required field is another type parameter and another transition. Past three or four, look at a derive macro: [typed-builder](https://docs.rs/typed-builder) and [bon](https://docs.rs/bon) both generate builders where missing required fields are compile errors.

My rule of thumb: start with the plain builder. Reach for typestate when the runtime error has actually bitten someone, or when the type's whole purpose is enforcing an order of operations.

## Further reading

- [`PhantomData` in the standard library docs](https://doc.rust-lang.org/std/marker/struct.PhantomData.html), including the section on unused type parameters
- [The builder pattern](https://rust-unofficial.github.io/patterns/patterns/creational/builder.html) in the Rust Design Patterns book
- [Rust API Guidelines: builders](https://rust-lang.github.io/api-guidelines/type-safety.html#builders-enable-construction-of-complex-values-c-builder)
