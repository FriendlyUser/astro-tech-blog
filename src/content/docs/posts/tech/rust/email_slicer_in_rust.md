---
title: "Email slicer in Rust: splitting an address into username and domain"
description: A small Rust exercise that splits an email address into its username and domain, first with a character loop and then with split_once.
pubDate: Saturday, 24 November 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["rust", "javascript"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-10-01 22.10.49 - transcribing audio to text.png'
---

An "email slicer" is a classic beginner exercise: take an address like `john.doe@example.com` and split it into the username (`john.doe`) and the domain (`example.com`). It's a useful excuse to practise string handling in Rust, including how to represent input that doesn't fit the pattern.

## First version: walk the characters

The direct approach is to loop over the characters and switch from the username to the domain when you hit `@`:

```rust
fn email_slicer(email: &str) -> (String, String) {
    let mut username = String::new();
    let mut domain = String::new();
    let mut is_username = true;

    for c in email.chars() {
        if c == '@' {
            is_username = false;
            continue;
        }
        if is_username {
            username.push(c);
        } else {
            domain.push(c);
        }
    }

    (username, domain)
}

fn main() {
    let (username, domain) = email_slicer("john.doe@example.com");
    println!("Username: {username}");
    println!("Domain: {domain}");
}
```

Output:

```text
Username: john.doe
Domain: example.com
```

This works for well-formed input, but it has problems:

- `"not-an-email"` returns the whole string as the username and an empty domain, with no sign that anything went wrong.
- `"a@b@c"` silently drops the second `@` and returns `("a", "bc")`.
- It copies every character into two new `String`s, even though both parts already exist inside the input.

## Better version: `split_once`

`str::split_once` (or `rsplit_once`) splits at a delimiter and returns `None` if the delimiter isn't there. Returning `Option<(&str, &str)>` makes the failure case explicit and borrows slices of the input instead of allocating:

```rust
fn email_slicer(email: &str) -> Option<(&str, &str)> {
    // The domain part can't contain '@', so split at the last one.
    let (username, domain) = email.trim().rsplit_once('@')?;
    if username.is_empty() || domain.is_empty() {
        return None;
    }
    Some((username, domain))
}

fn main() {
    for email in ["john.doe@example.com", "not-an-email", "@example.com"] {
        match email_slicer(email) {
            Some((username, domain)) => {
                println!("{email}: username = {username}, domain = {domain}")
            }
            None => println!("{email}: not a valid address"),
        }
    }
}
```

Output:

```text
john.doe@example.com: username = john.doe, domain = example.com
not-an-email: not a valid address
@example.com: not a valid address
```

The `?` after `rsplit_once` returns `None` early when there's no `@`. Because the returned slices borrow from `email`, the caller has to keep the input alive while using them; call `.to_string()` on them if you need owned values.

## Limits

This splits addresses; it doesn't validate them. Real address syntax ([RFC 5322](https://www.rfc-editor.org/rfc/rfc5322)) allows quoted local parts such as `"john@home"@example.com`, comments, and internationalised domains. If you need to accept or reject user input properly, use a dedicated crate such as [`email_address`](https://crates.io/crates/email_address), and remember that the only real test of an address is sending mail to it.
