---
title: 'Rust memory management: ownership, borrowing and smart pointers'
pubDate: "2024-11-29T22:54:50.000Z"
lastUpdated: 2026-11-14
description: "How Rust frees memory without a garbage collector: ownership and moves, borrowing rules, Box, Rc, Arc, Cell and RefCell, with runnable examples."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3893879687.webp
---

Rust has no garbage collector and no manual `free`. Every value has an owner, and the compiler inserts the cleanup code where the owner goes out of scope. Borrowing rules, also checked at compile time, stop you from using memory after it's freed or mutating data while something else is reading it. The smart pointer types in the standard library cover the cases where one owner isn't enough. All the examples below compile and run on stable Rust.

## Ownership

The [ownership rules](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html) are:

1. Each value has an owner.
2. There can only be one owner at a time.
3. When the owner goes out of scope, the value is dropped.

Assigning a heap-backed value such as a `String` to another variable *moves* ownership; the old variable can't be used afterwards:

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1; // ownership of the heap buffer moves to s2
    // println!("{s1}"); // error[E0382]: borrow of moved value: `s1`
    println!("{s2}");
} // s2 goes out of scope here and the String's memory is freed
```

Because only `s2` owns the buffer, it's freed exactly once. Types that are cheap to copy and own no heap memory (integers, `bool`, `char`, and tuples of them) implement `Copy` and are copied instead of moved.

## Borrowing

Moving values into every function that needs them would be awkward, so you usually pass a reference instead. A reference *borrows* the value without taking ownership. The [borrowing rules](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html) are:

- At any time you can have either any number of shared references (`&T`) or exactly one mutable reference (`&mut T`), not both.
- A reference can't outlive the value it points to.

```rust
fn total_len(words: &[String]) -> usize {
    words.iter().map(|w| w.len()).sum()
}

fn add_word(words: &mut Vec<String>, word: &str) {
    words.push(word.to_string());
}

fn main() {
    let mut words = vec![String::from("borrow"), String::from("check")];

    let r1 = &words;
    let r2 = &words;
    println!("{} {}", r1.len(), total_len(r2)); // many shared borrows: fine

    add_word(&mut words, "er"); // one mutable borrow, after r1/r2 are done
    println!("{:?}", words);
}
```

The first rule is what prevents data races and iterator invalidation (pushing to a `Vec` while iterating over it, for example). The second prevents dangling pointers. Neither rule is about leaks: safe Rust can still leak memory, as the `Rc` section shows.

Borrowing is also the main tool for using memory efficiently. Taking `&str` or `&[T]` instead of `String` or `Vec<T>` lets callers pass data without cloning it.

## `Box`: a single owner on the heap

`Box<T>` puts a value on the heap and owns it; dropping the box frees the allocation. You need it for values whose size isn't known at compile time, such as recursive types and trait objects (`Box<dyn Trait>`), and when you want to move a large value around without copying its bytes.

```rust
#[derive(Debug)]
enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let heap_integer = Box::new(42);
    println!("heap_integer = {heap_integer}");

    // Without the Box, List would contain itself and have infinite size.
    let list = Cons(1, Box::new(Cons(2, Box::new(Nil))));
    println!("{list:?}");
}
```

## `Rc` and `Arc`: shared ownership

Sometimes a value really does have several owners, such as a config shared by several components or a node in a graph. `Rc<T>` keeps a reference count next to the value. `Rc::clone` increments the count without copying the data, dropping an `Rc` decrements it, and the value is freed when the count reaches zero.

```rust
use std::rc::Rc;

fn main() {
    let shared = Rc::new(String::from("config"));
    let a = Rc::clone(&shared);
    {
        let b = Rc::clone(&shared);
        println!("count = {}", Rc::strong_count(&shared)); // 3
        println!("{b}");
    }
    println!("count = {}", Rc::strong_count(&shared)); // 2
    println!("{a}");
}
```

`Rc` isn't thread-safe, and the compiler won't let you send it to another thread. `Arc<T>` is the same idea with an atomic counter, at a small cost per clone and drop. Both give shared, read-only access; to mutate through them, combine them with a type that allows it, such as `Mutex` for threads:

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = Vec::new();

    for _ in 0..4 {
        let counter = Arc::clone(&counter);
        handles.push(thread::spawn(move || {
            *counter.lock().unwrap() += 1;
        }));
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("total = {}", *counter.lock().unwrap()); // 4
}
```

## `Cell` and `RefCell`: interior mutability

Normally you can only mutate through a `&mut`. *Interior mutability* types let you mutate through a shared reference, which you need for things like caches or a value shared through an `Rc`. Both are single-threaded.

- `Cell<T>` never hands out references to its contents. You `set`, `replace` or `take` the whole value, and `get` returns a copy (so `get` needs `T: Copy`). There's no runtime check because there's nothing to check.
- `RefCell<T>` hands out references through `borrow()` and `borrow_mut()`, and enforces the borrowing rules at runtime. Breaking them panics; `try_borrow` and `try_borrow_mut` return a `Result` instead.

```rust
use std::cell::{Cell, RefCell};

fn main() {
    let hits = Cell::new(0);
    hits.set(hits.get() + 1);
    println!("hits = {}", hits.get()); // 1

    let shared_value = RefCell::new(42);
    {
        let reader = shared_value.borrow();
        println!("reader = {}", *reader);
        // shared_value.borrow_mut() here would panic: already borrowed
        assert!(shared_value.try_borrow_mut().is_err());
    }
    {
        let mut writer = shared_value.borrow_mut();
        *writer += 1;
    }
    println!("value = {}", shared_value.borrow()); // 43
}
```

The thread-safe equivalents are `Mutex`, `RwLock` and the atomic types in `std::sync::atomic`.

## Gotchas

### Reference cycles leak

If two `Rc` values point at each other, neither count reaches zero and neither is freed. Use `Weak` for back-references (child to parent, observer to subject). A `Weak` doesn't keep the value alive; `upgrade()` returns `None` once it's gone.

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    parent: RefCell<Weak<Node>>,
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    let parent = Rc::new(Node {
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    });
    let child = Rc::new(Node {
        parent: RefCell::new(Rc::downgrade(&parent)),
        children: RefCell::new(Vec::new()),
    });
    parent.children.borrow_mut().push(Rc::clone(&child));

    println!("parent strong = {}", Rc::strong_count(&parent)); // 1
    println!("parent weak = {}", Rc::weak_count(&parent)); // 1
    println!("child has parent: {}", child.parent.borrow().upgrade().is_some());
}
```

### Pre-size collections you're about to fill

A `Vec` that grows one `push` at a time reallocates and copies as it goes. If you know roughly how many items are coming, reserve the space up front:

```rust
fn main() {
    let mut v: Vec<u64> = Vec::with_capacity(1_000);
    let ptr = v.as_ptr();
    for i in 0..1_000 {
        v.push(i);
    }
    assert_eq!(ptr, v.as_ptr()); // no reallocation happened
    println!("len = {}, capacity = {}", v.len(), v.capacity());
}
```

`String::with_capacity` and `HashMap::with_capacity` work the same way.

### Don't reach for `Rc<RefCell<T>>` first

It's tempting to wrap everything in `Rc<RefCell<T>>` when the borrow checker complains, but it moves errors from compile time to runtime panics and adds counting overhead. Often restructuring so one owner holds the data and others take short borrows, or storing indices into a `Vec` instead of pointers, is simpler.

## Further reading

- [The Rust Book: Understanding Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [The Rust Book: Smart Pointers](https://doc.rust-lang.org/book/ch15-00-smart-pointers.html), including [reference cycles](https://doc.rust-lang.org/book/ch15-06-reference-cycles.html)
- [`std::cell` documentation](https://doc.rust-lang.org/std/cell/index.html)
