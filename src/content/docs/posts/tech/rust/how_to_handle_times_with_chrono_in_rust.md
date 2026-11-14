---
title: Dates and times in Rust with the chrono crate
description: Create, parse, format and do arithmetic on dates and times with chrono, using the non-deprecated constructors and calendar-aware month math.
alt: my first blog post
tags: ["rust"]
layout: '@/templates/BasePost.astro'
pubDate: Friday, 17 Feb 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2023/335264211.webp'
---

The Rust standard library has `std::time::Instant` and `SystemTime` for measuring elapsed time, but nothing for calendar dates, time zones or formatting. [chrono](https://docs.rs/chrono) fills that gap and is the most widely used crate for it.

Examples here are written against chrono 0.4.45. Many older examples use `NaiveDate::from_ymd` and `NaiveTime::from_hms`; those have been deprecated since 0.4.23 because they panic on invalid input. Use the `_opt` versions, which return `Option`.

## Setup

```bash
cargo new chrono_demo
cd chrono_demo
cargo add chrono
```

```toml
[dependencies]
chrono = "0.4"
```

## The main types

- `NaiveDate`, `NaiveTime`, `NaiveDateTime`: a calendar date, a wall-clock time, and both together, with no time zone attached.
- `DateTime<Tz>`: an exact instant together with a time zone. `Tz` is usually `Utc`, `Local` (the system zone), or `FixedOffset` (e.g. `+05:30`, which is what you get from parsing an RFC 3339 string).
- `TimeDelta`: a signed duration. `chrono::Duration` is an older alias for the same type.

Use naive types for things like birthdays or "9:00 every day". Use `DateTime<Utc>` for timestamps you store or compare, and convert to a local zone only for display.

## Creating values

```rust
use chrono::{Local, NaiveDate, NaiveDateTime, NaiveTime, Utc};

fn main() {
    let date = NaiveDate::from_ymd_opt(2023, 4, 16).expect("valid date");
    let time = NaiveTime::from_hms_opt(12, 34, 56).expect("valid time");
    let datetime = NaiveDateTime::new(date, time); // or date.and_time(time)

    let now_utc = Utc::now();
    let now_local = now_utc.with_timezone(&Local);

    println!("Date:     {date}");      // 2023-04-16
    println!("Time:     {time}");      // 12:34:56
    println!("DateTime: {datetime}");  // 2023-04-16 12:34:56
    println!("UTC now:  {now_utc}");
    println!("Local:    {now_local}");

    // Invalid input gives None instead of panicking.
    assert!(NaiveDate::from_ymd_opt(2023, 2, 30).is_none());
}
```

## Parsing and formatting

`parse_from_str` and `format` use strftime-style specifiers (`%Y`, `%m`, `%d`, `%H`, ...). The full list is in [`chrono::format::strftime`](https://docs.rs/chrono/latest/chrono/format/strftime/index.html).

```rust
use chrono::{DateTime, NaiveDate, Utc};

fn main() -> Result<(), chrono::ParseError> {
    // Date only
    let date = NaiveDate::parse_from_str("2023-04-16", "%Y-%m-%d")?;
    println!("{}", date.format("%A, %B %e, %Y")); // Sunday, April 16, 2023

    // RFC 3339 / ISO 8601 timestamp; the result keeps the offset it was given
    let dt = DateTime::parse_from_rfc3339("2023-04-16T12:34:56+02:00")?;
    println!("{}", dt.format("%Y-%m-%d %H:%M:%S %z")); // 2023-04-16 12:34:56 +0200

    // Convert to UTC for storage or comparison
    let utc: DateTime<Utc> = dt.with_timezone(&Utc);
    println!("{}", utc.to_rfc3339()); // 2023-04-16T10:34:56+00:00

    Ok(())
}
```

Parse errors come back as `chrono::ParseError`, so `?` works instead of `unwrap()`.

## Arithmetic and comparisons

```rust
use chrono::{Months, NaiveDate, TimeDelta};

fn main() {
    let start = NaiveDate::from_ymd_opt(2023, 1, 31).unwrap();
    let end = NaiveDate::from_ymd_opt(2023, 5, 1).unwrap();

    // Fixed-length durations
    let next_week = start + TimeDelta::days(7);
    println!("One week later: {next_week}"); // 2023-02-07

    // Calendar months: clamps to the last valid day of the month
    let next_month = start.checked_add_months(Months::new(1)).unwrap();
    println!("One month later: {next_month}"); // 2023-02-28

    // Comparisons use the normal operators
    if start < end {
        println!("{start} is before {end}");
    }

    // Subtracting two dates gives a TimeDelta
    let gap = end - start;
    println!("{} days between them", gap.num_days()); // 90
}
```

`TimeDelta::days(30)` is not "one month": months have 28 to 31 days, so use `Months` with `checked_add_months` / `checked_sub_months` for calendar math. The `+` and `-` operators panic on overflow; `checked_add_signed` and `checked_sub_signed` return `Option` instead.

## Gotchas

- For named time zones such as `America/Toronto`, with daylight saving rules, add the [chrono-tz](https://docs.rs/chrono-tz) crate. `FixedOffset` only knows a fixed offset.
- Converting a naive local time to a zoned one can be ambiguous or impossible around DST changes. `TimeZone::from_local_datetime` returns a `MappedLocalTime` (called `LocalResult` in older releases) with `Single`, `Ambiguous` and `None` variants, so you have to handle those cases.
- [jiff](https://docs.rs/jiff) is a newer date/time crate with time zone support built in. It is worth a look for new projects that do a lot of zone-aware arithmetic.

## Further reading

- [chrono documentation](https://docs.rs/chrono/latest/chrono/)
