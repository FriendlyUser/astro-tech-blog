---
tags: ["js", "rust"]
title: Fetching Pokémon data from PokeAPI in Rust with reqwest and serde
description: Build a small Rust CLI that looks up a Pokémon on PokeAPI, deserializes the JSON with serde, and prints its height, weight, and types.
pubDate: Fri, 25 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/262205434.webp
---

[PokeAPI](https://pokeapi.co/) is a free, read-only REST API with data on every Pokémon: types, stats, abilities, moves and more. It needs no API key, which makes it a good target for practising HTTP and JSON in Rust.

This post builds a command-line tool that takes a Pokémon name and prints its height, weight, and types. It uses `reqwest` for HTTP, `serde` to deserialize the JSON, and `tokio` as the async runtime.

## Setting up the project

Install Rust with [rustup](https://www.rust-lang.org/tools/install) if you haven't already, then:

```sh
cargo new pokeapi_rust
cd pokeapi_rust
cargo add reqwest --features json
cargo add serde --features derive
cargo add tokio --features macros,rt-multi-thread
```

The resulting dependencies (versions current as of November 2026):

```toml
[dependencies]
reqwest = { version = "0.13", features = ["json"] }
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

You don't need `serde_json` as a direct dependency: `reqwest`'s `json` feature handles deserialization through `Response::json`.

## Data structures and the request

The `/api/v2/pokemon/{name}` response is large, but serde ignores fields you don't declare, so the structs only need the parts you use. Put this in `src/pokemon.rs`:

```rust
// src/pokemon.rs
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct Pokemon {
    pub name: String,
    /// Height in decimetres
    pub height: u32,
    /// Weight in hectograms
    pub weight: u32,
    pub types: Vec<PokemonType>,
}

#[derive(Deserialize, Debug)]
pub struct PokemonType {
    #[serde(rename = "type")]
    pub type_data: TypeData,
}

#[derive(Deserialize, Debug)]
pub struct TypeData {
    pub name: String,
}

pub async fn fetch_pokemon_data(pokemon_name: &str) -> Result<Pokemon, reqwest::Error> {
    let url = format!("https://pokeapi.co/api/v2/pokemon/{pokemon_name}");
    reqwest::get(&url)
        .await?
        .error_for_status()?
        .json::<Pokemon>()
        .await
}
```

The JSON field is called `type`, which is a Rust keyword, so `#[serde(rename = "type")]` maps it to `type_data`.

`error_for_status()` matters here. For an unknown name, PokeAPI returns a 404 with a small error body that doesn't match the `Pokemon` struct. Without that call, `reqwest` treats the 404 as a successful response and you'd get a confusing JSON decoding error instead of "404 Not Found".

## Printing the result

```rust
// src/main.rs
mod pokemon;

use pokemon::{fetch_pokemon_data, PokemonType};
use std::env;
use std::process::ExitCode;

fn types_to_string(types: &[PokemonType]) -> String {
    types
        .iter()
        .map(|t| t.type_data.name.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}

#[tokio::main]
async fn main() -> ExitCode {
    let Some(pokemon_name) = env::args().nth(1) else {
        eprintln!("Usage: pokeapi_rust <pokemon_name>");
        return ExitCode::FAILURE;
    };

    match fetch_pokemon_data(&pokemon_name).await {
        Ok(pokemon) => {
            println!("Name: {}", pokemon.name);
            println!("Height: {:.1} m", pokemon.height as f32 / 10.0);
            println!("Weight: {:.1} kg", pokemon.weight as f32 / 10.0);
            println!("Types: {}", types_to_string(&pokemon.types));
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("Error: {error}");
            ExitCode::FAILURE
        }
    }
}
```

PokeAPI reports height in decimetres and weight in hectograms, so dividing by 10 gives metres and kilograms. Returning `ExitCode` means the program exits non-zero on failure, which is useful if you script it.

## Running it

```sh
cargo run -- pikachu
```

```text
Name: pikachu
Height: 0.4 m
Weight: 6.0 kg
Types: electric
```

An unknown name (`cargo run -- notapokemon`) prints a `404 Not Found` error and exits with status 1.

## Next steps and gotchas

- **Cache responses.** PokeAPI's fair use policy asks clients to cache resources locally and limit how often they call the API. The data rarely changes, so writing each response to disk is an easy win.
- **Reuse a `reqwest::Client`.** `reqwest::get` builds a new client per call. If you fetch many Pokémon, create one `Client` and call `client.get(url)` so connections are pooled.
- **Ready-made wrapper.** PokeAPI's docs list community wrapper libraries, including [Rustemon](https://crates.io/crates/rustemon) for Rust, which caches responses automatically.

## Further reading

- [PokeAPI documentation](https://pokeapi.co/docs/v2)
- [`reqwest` docs](https://docs.rs/reqwest)
- [serde field attributes](https://serde.rs/field-attrs.html)
