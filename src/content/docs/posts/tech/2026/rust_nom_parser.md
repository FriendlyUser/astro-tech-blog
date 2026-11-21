---
title: "Writing a parser in Rust with nom 8"
description: "Parse key=value log lines in Rust with nom 8: the Parser trait and .parse(input), core combinators, typed values with map_res, cut for clearer errors, and tests."
tags: ["Rust", "nom", "Parsing", "Parser Combinators"]
pubDate: "2026-09-30T16:00:00.000Z"
imgSrc: "/imgs/2026/rust_nom_parser.webp"
imgAlt: "A parse tree splitting one log line into its level, target and key=value fields"
---

nom is a parser combinator library: you write small functions that each recognise one piece of input (a word, a number, a quoted string), then combine them into bigger parsers with functions like `alt`, `delimited` and `separated_list0`. It works on `&str` and `&[u8]`, returns slices that borrow from the input instead of copying, and needs no separate grammar file or code generation step.

This post builds a parser for structured log lines with nom 8 and covers the API change that makes most older nom tutorials fail to compile. The examples use nom 8.0.0 and the 2024 edition:

```toml
[dependencies]
nom = "8.0"
```

## What changed in nom 8

Up to nom 7, combinators returned closures, and you called them directly: `tag("abc")(input)`, `delimited(a, b, c)(input)`. In nom 8, most combinators return a type implementing the `Parser` trait, and you run it with the `parse` method:

```rust
// nom 7
let (rest, word) = delimited(char('['), alpha1, char(']'))(input)?;

// nom 8
use nom::Parser;
let (rest, word) = delimited(char('['), alpha1, char(']')).parse(input)?;
```

Other changes you'll run into:

- **Tuples are parsers.** `(a, b, c).parse(input)` runs three parsers in sequence and returns a tuple of their outputs. The old `tuple((a, b, c))` function is deprecated.
- **`VerboseError` moved** to the companion crate `nom-language`, together with `convert_error`.
- **Input traits were merged.** `InputIter`, `InputTake`, `InputLength` and friends became a single `Input` trait. This only matters if you wrote parsers over your own input type.

Functions you write yourself, with the signature `fn(&str) -> IResult<&str, T>`, still work everywhere a parser is expected. nom implements `Parser` for any function or closure with that shape, so you can mix them freely with the built-in combinators.

## The format

The parser handles log lines like this:

```text
[WARN] payments: latency_ms=812 user="ana b" retry=true
```

That's a level in brackets, a target followed by a colon, and zero or more `key=value` fields separated by spaces. A value is either a quoted string (which may contain spaces) or a bare word. Bare words that parse as integers become numbers.

## The parser

`src/lib.rs`:

```rust
use nom::{
    branch::alt,
    bytes::complete::{tag, take_while, take_while1},
    character::complete::{char, digit1, space0, space1},
    combinator::{all_consuming, cut, map, map_res, value},
    multi::separated_list0,
    sequence::{delimited, preceded, separated_pair, terminated},
    Finish, IResult, Parser,
};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Level {
    Info,
    Warn,
    Error,
}

#[derive(Debug, PartialEq)]
pub enum Value<'a> {
    Int(i64),
    Str(&'a str),
}

#[derive(Debug, PartialEq)]
pub struct LogLine<'a> {
    pub level: Level,
    pub target: &'a str,
    pub fields: Vec<(&'a str, Value<'a>)>,
}

/// `[INFO]`, `[WARN]` or `[ERROR]`.
fn level_tag(input: &str) -> IResult<&str, Level> {
    delimited(
        char('['),
        alt((
            value(Level::Info, tag("INFO")),
            value(Level::Warn, tag("WARN")),
            value(Level::Error, tag("ERROR")),
        )),
        char(']'),
    )
    .parse(input)
}

/// Letters, digits, `_` and `.`.
fn identifier(input: &str) -> IResult<&str, &str> {
    take_while1(|c: char| c.is_ascii_alphanumeric() || c == '_' || c == '.').parse(input)
}

/// `"..."`: once the opening quote is seen, a missing closing quote is fatal.
fn quoted(input: &str) -> IResult<&str, &str> {
    preceded(
        char('"'),
        cut(terminated(take_while(|c: char| c != '"'), char('"'))),
    )
    .parse(input)
}

/// Anything up to the next space or quote.
fn bare(input: &str) -> IResult<&str, &str> {
    take_while1(|c: char| !c.is_whitespace() && c != '"').parse(input)
}

fn to_value(s: &str) -> Value<'_> {
    match s.parse::<i64>() {
        Ok(n) => Value::Int(n),
        Err(_) => Value::Str(s),
    }
}

fn field_value(input: &str) -> IResult<&str, Value<'_>> {
    alt((map(quoted, Value::Str), map(bare, to_value))).parse(input)
}

/// `key=value`
fn field(input: &str) -> IResult<&str, (&str, Value<'_>)> {
    separated_pair(identifier, char('='), field_value).parse(input)
}

/// One log line, possibly followed by unparsed input.
pub fn log_line(input: &str) -> IResult<&str, LogLine<'_>> {
    let (input, (level, _, target, _, fields)) = (
        level_tag,
        space1,
        terminated(identifier, char(':')),
        space0,
        separated_list0(space1, field),
    )
        .parse(input)?;
    Ok((input, LogLine { level, target, fields }))
}

/// A whole line, with nothing left over.
pub fn parse_line(input: &str) -> Result<LogLine<'_>, nom::error::Error<&str>> {
    all_consuming(delimited(space0, log_line, space0))
        .parse(input)
        .finish()
        .map(|(_, line)| line)
}

/// A port number: digits that fit in a u16.
fn port(input: &str) -> IResult<&str, u16> {
    map_res(digit1, |s: &str| s.parse::<u16>()).parse(input)
}

/// `host:port`
pub fn host_port(input: &str) -> IResult<&str, (&str, u16)> {
    separated_pair(identifier, char(':'), port).parse(input)
}
```

### Reading it bottom-up

Each function returns `IResult<Input, Output>`, which is `Result<(remaining_input, output), nom::Err<Error>>`. A parser takes the input, consumes what it recognises, and hands back the rest.

- `level_tag` uses `delimited(open, inner, close)` to keep only the middle result, and `alt` to try alternatives in order. `value(Level::Info, tag("INFO"))` replaces the matched text with a fixed value.
- `identifier` and `bare` use `take_while1`, which consumes characters while the predicate holds and fails if it matched none. `take_while` (without the 1) can match zero characters, which is what an empty quoted string needs.
- `field_value` tries `quoted` first, then `bare`. `map(parser, f)` transforms a parser's output. `Value::Str` works as a function here, because tuple-variant constructors are functions.
- `log_line` runs five parsers in sequence with a tuple and destructures the result, ignoring the whitespace parts.
- `separated_list0(space1, field)` parses zero or more fields separated by spaces. When a separator matches but the next field doesn't, it stops *before* that separator. That leaves the trailing spaces for the `space0` in `parse_line`.

Everything here returns borrowed slices of the input (`&'a str`), so parsing a line allocates only the `Vec` of fields.

I wrote `to_value` as a named function rather than a closure on purpose. A closure whose parameter type is written as `|s: &str|` and whose result borrows from `s` runs into a lifetime error, because the compiler treats each call as having its own unrelated lifetime. The named function's signature ties the output lifetime to the input and avoids that. The `map_res` closure in `port` is fine, because a `u16` doesn't borrow anything.

### `complete` versus `streaming`

The imports come from `bytes::complete` and `character::complete`. nom also has `streaming` versions of these parsers. When a streaming parser reaches the end of its input, it returns `Err::Incomplete`, meaning "give me more data". A complete parser treats the end of input as the end. For a line or a whole file already in memory, use `complete`. Use `streaming` when parsing data as it arrives from a socket.

## Errors

nom has two kinds of failure, and the difference matters:

- `Err::Error` means "this parser didn't match here". Combinators like `alt`, `opt` and `separated_list0` treat it as a cue to backtrack and try something else.
- `Err::Failure` means "the input is wrong, stop". Nothing backtracks past it.

`cut(parser)` turns an `Error` into a `Failure`. In `quoted`, once we've seen an opening quote, a missing closing quote is definitely an error. Without `cut`, `alt` would quietly try `bare` instead, `separated_list0` would stop, and the error would point at the start of the field, or somewhere even less helpful. With `cut`, the error points at the end of the input, where the closing quote should have been.

`parse_line` wraps everything in `all_consuming`, which fails if any input is left over. `.finish()` (from the `Finish` trait) converts the `IResult` into a plain `Result` with the error type inside, which is easier to pass to the rest of your program. Don't call `finish` on the result of a streaming parser: it panics on `Incomplete`.

The default error type, `nom::error::Error<&str>`, holds the remaining input where parsing failed and an `ErrorKind` saying which parser failed. Its `Display` prints something like `error Tag at: DEBUG] x: a=1`. You can turn that into a position: the original input's length minus the remaining length is the byte offset of the failure. For messages that explain *what* was expected, use `VerboseError` from the `nom-language` crate, add labels with `nom::error::context("level", level_tag)`, and render with `nom_language::error::convert_error`. `context` exists on the default error type too, but it's a no-op there.

## Tests

Parsers are pure functions from `&str` to a result, which makes them easy to test:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_full_line() {
        let line =
            parse_line(r#"[WARN] payments: latency_ms=812 user="ana b" retry=true"#).unwrap();
        assert_eq!(line.level, Level::Warn);
        assert_eq!(line.target, "payments");
        assert_eq!(
            line.fields,
            vec![
                ("latency_ms", Value::Int(812)),
                ("user", Value::Str("ana b")),
                ("retry", Value::Str("true")),
            ]
        );
    }

    #[test]
    fn fields_are_optional() {
        let line = parse_line("[INFO] startup:").unwrap();
        assert!(line.fields.is_empty());
    }

    #[test]
    fn log_line_stops_at_what_it_cannot_parse() {
        let (rest, line) = log_line("[ERROR] db: code=5 !!").unwrap();
        assert_eq!(line.fields, vec![("code", Value::Int(5))]);
        assert_eq!(rest, " !!");
    }

    #[test]
    fn unknown_level_is_an_error() {
        let err = parse_line("[DEBUG] x: a=1").unwrap_err();
        assert_eq!(err.input, "DEBUG] x: a=1");
    }

    #[test]
    fn unterminated_quote_points_at_the_end() {
        let err = parse_line(r#"[INFO] api: msg="unterminated"#).unwrap_err();
        assert_eq!(err.input, "");
    }

    #[test]
    fn typed_values_with_map_res() {
        assert_eq!(host_port("db.internal:5432"), Ok(("", ("db.internal", 5432))));
        assert!(host_port("db.internal:99999").is_err());
    }
}
```

Test the small parsers as well as the top-level one. When `parse_line` fails on a real log file, a failing `field_value` test tells you much more than a failing `parse_line` test. The fact that `log_line` returns the unconsumed rest, as the third test shows, is handy here: you can see exactly how far parsing got.

## Using it

```rust
use std::io::{self, BufRead};

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.expect("read error");
        match logparse::parse_line(&line) {
            Ok(parsed) => println!("{parsed:?}"),
            Err(err) => eprintln!("skipping line: {err}"),
        }
    }
}
```

This goes in `src/main.rs` of a crate named `logparse`, next to the `lib.rs` above. Pipe a log file into `cargo run`.

## When not to use nom

- **The format has a grammar already.** For JSON, TOML, CSV and friends, use the existing crates (`serde_json`, `toml`, `csv`). They're faster and better tested than anything you'll write in an afternoon.
- **A regex is enough.** If a line has a fixed shape and you only need two fields out of it, the `regex` crate with named groups is shorter and easier to read.
- **You need great error messages.** nom can produce them, but it takes work. For languages users type by hand, look at `chumsky` or `winnow`. winnow started as a fork of nom and focuses on errors and ergonomics.

## Further reading

- [nom on docs.rs](https://docs.rs/nom/8.0.0/nom/)
- [nom's list of combinators](https://github.com/rust-bakery/nom/blob/main/doc/choosing_a_combinator.md)
- [nom CHANGELOG](https://github.com/rust-bakery/nom/blob/main/CHANGELOG.md), for the 8.0 changes
- [nom-language](https://docs.rs/nom-language) for `VerboseError` and precedence parsing
