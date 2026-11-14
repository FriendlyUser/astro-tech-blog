---
title: "Rust lifetimes: why a struct can't borrow from its own field"
description: "Rust lifetimes through one example: a struct holding strings and references to them, why it won't compile, and two designs that do."
pubDate: Saturday, 24 December 2024 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/dalle-2022-10-01-22-10-49-transcribing-audio-to-text.webp'
---

A lifetime in Rust is the region of code where a reference is valid. Lifetime annotations like `'a` don't make anything live longer. They name a relationship between references so the borrow checker can reject code that might leave a reference pointing at freed memory.

This post uses one example: a struct that owns some strings and also holds references into them. It's a natural first design, it doesn't compile, and the reason why explains most of what lifetimes are for.

## The struct

```rust
struct Data<'a> {
    strs: Vec<String>,
    refs: Vec<&'a str>,
}
```

`Data<'a>` says: every `&str` in `refs` points at data that stays valid for at least `'a`, so a `Data<'a>` value can't outlive `'a`. Nothing here ties `'a` to `strs`. The compiler doesn't know the references are meant to point into the struct's own vector.

## Trying to build one

```rust
fn main() {
    let strings = vec![String::from("Hello"), String::from("World")];
    let string_slices: Vec<&str> = strings.iter().map(|s| s.as_str()).collect();
    let data = Data { strs: strings, refs: string_slices };
}
```

This fails:

```text
error[E0505]: cannot move out of `strings` because it is borrowed
```

`string_slices` borrows `strings`, and that borrow is still in use when `strings` is moved into `data.strs`. Rust doesn't allow moving a value while something borrows it.

You could argue the move is harmless here, because the `String` contents live on the heap and don't move. But once `data` exists, nothing stops code from calling `data.strs.clear()` or `data.strs.push(...)`, which can free or reallocate the strings that `data.refs` points at. The type system has no way to say "this field borrows from that sibling field", so it rejects the whole pattern. This is the *self-referential struct* problem.

## Fix 1: keep the owner outside the struct

If the struct only borrows, the lifetime has something real to refer to: the `Vec<String>` that lives in the caller.

```rust
struct Data<'a> {
    refs: Vec<&'a str>,
}

fn main() {
    let strings = vec![String::from("Hello"), String::from("World")];
    let data = Data {
        refs: strings.iter().map(|s| s.as_str()).collect(),
    };
    println!("{:?}", data.refs); // ["Hello", "World"]
}
```

Now the borrow checker enforces the rule you want. Drop the owner too early and it refuses to compile:

```rust
struct Data<'a> {
    refs: Vec<&'a str>,
}

fn main() {
    let data;
    {
        let strings = vec![String::from("Hello")];
        data = Data { refs: strings.iter().map(|s| s.as_str()).collect() };
    } // `strings` is dropped here
    println!("{:?}", data.refs);
}
```

```text
error[E0597]: `strings` does not live long enough
```

That error is lifetimes doing their job: `data` would otherwise hold dangling references.

## Fix 2: store indices instead of references

If the struct really does need to own the strings, store positions into the vector rather than references, and hand out borrows from a method:

```rust
struct Data {
    strs: Vec<String>,
    selected: Vec<usize>,
}

impl Data {
    fn selected(&self) -> impl Iterator<Item = &str> + '_ {
        self.selected.iter().map(|&i| self.strs[i].as_str())
    }
}

fn main() {
    let data = Data {
        strs: vec![String::from("Hello"), String::from("World")],
        selected: vec![1, 0],
    };
    let words: Vec<&str> = data.selected().collect();
    println!("{words:?}"); // ["World", "Hello"]
}
```

`Data` no longer needs a lifetime parameter at all. The references returned by `selected()` borrow `data`, so you can't mutate `strs` while you hold them.

## Gotchas

- Indices can go stale if you remove items from `strs`. If that matters, use ranges into one big `String`, or reference-counted strings (`Rc<str>` / `Arc<str>`) shared between fields.
- If you genuinely need a self-referential type (for example, a parsed view over a buffer you own), crates such as [`self_cell`](https://crates.io/crates/self_cell) wrap the unsafe code for you. Try the two fixes above first.
- Most functions need no lifetime annotations: the elision rules fill them in. You usually only write `'a` on structs that hold references and on functions that return a reference derived from more than one input.

## Further reading

- [The Rust Book: Validating References with Lifetimes](https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html)
- [Error index: E0505](https://doc.rust-lang.org/error_codes/E0505.html) and [E0597](https://doc.rust-lang.org/error_codes/E0597.html)
