---
title: "Rust match expressions: destructuring, guards, ranges, @ bindings and or-patterns"
pubDate: "2024-10-17T02:21:56.000Z"
lastUpdated: 2026-11-14
description: "How Rust's match works: exhaustiveness checking, destructuring enums, match guards, range patterns, @ bindings and or-patterns, with runnable examples."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3170249337.png
---

`match` compares a value against a list of patterns and runs the arm for the first one that matches. Unlike a C `switch`, it is an expression (it returns a value), it can destructure data, and the compiler checks that every possible value is handled.

## Syntax and exhaustiveness

```rust
match VALUE {
    PATTERN_1 => EXPRESSION_1,
    PATTERN_2 => EXPRESSION_2,
    _ => EXPRESSION_N,
}
```

`_` is a wildcard that matches anything. You only need it when your other arms don't already cover every value. If you match on an enum and list every variant, no `_` arm is required, and leaving it out is better: when someone adds a variant later, the compiler will point at every `match` that needs updating.

## Destructuring enums

```rust
enum Shape {
    Circle(f64),         // radius
    Rectangle(f64, f64), // width, height
    Square(f64),         // side
}

fn area(shape: &Shape) -> f64 {
    match shape {
        Shape::Circle(radius) => std::f64::consts::PI * radius * radius,
        Shape::Rectangle(width, height) => width * height,
        Shape::Square(side) => side * side,
    }
}

fn main() {
    println!("{:.2}", area(&Shape::Circle(1.0))); // 3.14
}
```

Each arm pulls the variant's fields into local variables. All three variants are covered, so there is no `_` arm.

## Match guards

A guard is an extra `if` condition on an arm. The arm only matches if the pattern matches *and* the guard is true.

```rust
fn number_type(n: i32) -> &'static str {
    match n {
        x if x < 0 => "negative",
        0 => "zero",
        _ => "positive",
    }
}
```

The compiler does not reason about guard conditions when checking exhaustiveness, so a match where every arm has a guard still needs a final unguarded arm. Here the last arm is a plain `_`, which handles the positive case without an `unreachable!()`.

## Range patterns

`a..=b` matches an inclusive range. Exclusive range patterns (`a..b`) have been stable since Rust 1.80; before that only `..=` was allowed in patterns.

```rust
fn grade(score: u32) -> Option<&'static str> {
    match score {
        0..=59 => Some("F"),
        60..=69 => Some("D"),
        70..=79 => Some("C"),
        80..=89 => Some("B"),
        90..=100 => Some("A"),
        _ => None, // anything above 100 is invalid input
    }
}
```

A `u32` can be larger than 100, so the final arm is reachable. Return an `Option` (or a `Result`) for that case instead of `unreachable!()`, which would panic on bad input.

## Binding with `@`

`name @ pattern` tests a value against a pattern and binds it to a name at the same time. It is most useful with ranges, where the pattern alone doesn't give you the value.

```rust
enum Message {
    Hello { id: i32 },
}

fn process_message(msg: Message) {
    match msg {
        Message::Hello { id: id @ 0..=100 } => println!("Special hello to id {id}"),
        Message::Hello { id } => println!("Regular hello to id {id}"),
    }
}
```

The first arm only matches ids from 0 to 100 and still makes `id` available in the arm body. Every other id falls through to the second arm.

## Or-patterns with `|`

`|` lets several patterns share one arm:

```rust
enum Color {
    Red,
    Green,
    Blue,
    Yellow,
}

fn is_primary_color(color: Color) -> bool {
    match color {
        Color::Red | Color::Green | Color::Blue => true,
        Color::Yellow => false,
    }
}
```

Listing `Color::Yellow` explicitly instead of `_` keeps the exhaustiveness check useful if more colors are added. When you only need a `bool`, the `matches!` macro is shorter: `matches!(color, Color::Red | Color::Green | Color::Blue)`.

## Gotchas

- A bare lowercase name in a pattern is a new binding, not a comparison. `match x { limit => ... }` matches everything and shadows any outer `limit`. Compare against a variable with a guard (`v if v == limit`) or use a `const`.
- If you only care about one pattern, `if let` or `let ... else` is usually clearer than a `match` with a `_ => {}` arm.
- Arms are checked top to bottom, so put specific patterns before general ones. The compiler warns about arms that can never be reached.

## Further reading

- [The Rust Book: The `match` control flow construct](https://doc.rust-lang.org/book/ch06-02-match.html)
- [The Rust Book: Pattern syntax](https://doc.rust-lang.org/book/ch19-03-pattern-syntax.html)
- [Rust Reference: Patterns](https://doc.rust-lang.org/reference/patterns.html)
