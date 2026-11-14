---
title: Writing generic Rust code with traits and trait bounds
pubDate: "2025-03-20T22:29:34.000Z"
lastUpdated: 2026-11-14
description: "Define a Rust trait, implement it for your own types, and write generic functions with trait bounds, impl Trait, where clauses and dyn Trait."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1736328419.png
---

A trait in Rust describes behaviour that several types can share, much like an interface in Java or Go. Combined with generics, traits let you write one function that works with any type that has that behaviour, and the compiler still checks every call at compile time.

## Defining and implementing a trait

A trait lists method signatures. Each type that implements the trait provides the bodies:

```rust
trait Shape {
    fn area(&self) -> f64;
    fn perimeter(&self) -> f64;
}

struct Rectangle {
    width: f64,
    height: f64,
}

impl Shape for Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }
}
```

A trait can also provide default method bodies that implementors may override. You can implement your own traits for any type, including standard library types like `f64`. You can implement a foreign trait (such as `std::fmt::Display`) only for your own types. This is called the orphan rule.

## Generic functions with trait bounds

`T: Shape` is a *trait bound*: this function accepts a reference to any type `T` that implements `Shape`.

```rust
fn print_shape_info<T: Shape>(shape: &T) {
    println!("Area: {}", shape.area());
    println!("Perimeter: {}", shape.perimeter());
}
```

The compiler generates a separate copy of the function for each concrete type it's called with. This is called monomorphization. The calls are static and can be inlined, so the abstraction has no runtime cost. The trade-off is more machine code.

## Multiple bounds

Use `+` to require more than one trait. Here's the full program, with a second trait and a second shape:

```rust
use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn perimeter(&self) -> f64;
}

trait Named {
    fn name(&self) -> &str;
}

struct Rectangle {
    width: f64,
    height: f64,
}

struct Circle {
    radius: f64,
}

impl Shape for Rectangle {
    fn area(&self) -> f64 {
        self.width * self.height
    }
    fn perimeter(&self) -> f64 {
        2.0 * (self.width + self.height)
    }
}

impl Named for Rectangle {
    fn name(&self) -> &str {
        "Rectangle"
    }
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.radius * self.radius
    }
    fn perimeter(&self) -> f64 {
        2.0 * PI * self.radius
    }
}

fn print_shape_info<T: Shape>(shape: &T) {
    println!("Area: {:.2}, perimeter: {:.2}", shape.area(), shape.perimeter());
}

fn print_named_shape_info<T: Named + Shape>(shape: &T) {
    println!("{}:", shape.name());
    print_shape_info(shape);
}

fn main() {
    let rectangle = Rectangle { width: 10.0, height: 5.0 };
    let circle = Circle { radius: 2.0 };

    print_shape_info(&rectangle);
    print_shape_info(&circle);
    print_named_shape_info(&rectangle);
    // print_named_shape_info(&circle);
    // error[E0277]: the trait bound `Circle: Named` is not satisfied
}
```

Uncomment the last call and the program won't compile. The bound is checked where the function is called, not at runtime.

## Other ways to write bounds

These three signatures accept the same arguments (pick one; they can't coexist under the same name):

```rust
fn print_named_shape_info<T: Named + Shape>(shape: &T) { /* ... */ }

fn print_named_shape_info(shape: &(impl Named + Shape)) { /* ... */ }

fn print_named_shape_info<T>(shape: &T)
where
    T: Named + Shape,
{ /* ... */ }
```

`impl Trait` in argument position is shorter when you don't need to name the type. A `where` clause is easier to read when there are several type parameters or long bounds.

## When you need different types in one collection: `dyn Trait`

Generics pick one concrete type per call, so a `Vec<T>` can't hold both a `Rectangle` and a `Circle`. For that, use a trait object. The method is then looked up through a vtable at runtime:

```rust
let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Rectangle { width: 10.0, height: 5.0 }),
    Box::new(Circle { radius: 2.0 }),
];

let total: f64 = shapes.iter().map(|s| s.area()).sum();
println!("Total area: {total:.2}");
```

Use generics by default. Reach for `dyn Trait` when you need a mixed collection, or when you want to avoid the extra code that monomorphization generates.

## Further reading

- [The Rust Book: traits](https://doc.rust-lang.org/book/ch10-02-traits.html)
- [The Rust Book: trait objects](https://doc.rust-lang.org/book/ch18-02-trait-objects.html)
- [Rust Reference: trait bounds](https://doc.rust-lang.org/reference/trait-bounds.html)
