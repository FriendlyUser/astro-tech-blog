---
tags: ["js"]
title: Using the PokeAPI REST API in Rust
description: In this article, we will explore how to interact with the PokeAPI REST API using the Rust programming language.
pubDate: Fri, 25 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/262205434.png
---

# Using the PokeAPI REST API in Rust

In this article, we will explore how to interact with the [PokeAPI](https://pokeapi.co/) REST API using the Rust programming language. PokeAPI provides a wealth of information about Pokémon, including their abilities, types, stats, and more. Rust is a systems programming language that focuses on safety, speed, and concurrency.

We'll build a simple command-line application that fetches and displays information about a Pokémon using the PokeAPI. To achieve this, we will leverage the `reqwest` and `serde` crates for making HTTP requests and handling JSON data, respectively.

## Setting Up the Project

To start, ensure you have Rust and Cargo installed. If not, you can follow the official [installation guide](https://www.rust-lang.org/tools/install).

Create a new Rust project by running:

```sh
cargo new pokeapi_rust
cd pokeapi_rust
```

Open the `Cargo.toml` file and add the dependencies:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

Now, let's write the code to interact with the PokeAPI.

## Defining the Data Structures

Create a new module called `pokemon.rs`, which will contain the data structures and functions for interacting with the PokeAPI.

```rust
// src/pokemon.rs
use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct Pokemon {
    pub name: String,
    pub height: u32,
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
```

Here, we define three structs: `Pokemon`, `PokemonType`, and `TypeData`. These structs will help us deserialize the JSON data returned from the PokeAPI. The `Deserialize` trait from the `serde` crate is derived for these structs so that we can easily deserialize the JSON data.

## Fetching Pokémon Data

Now, let's create a function that fetches a Pokémon's data from the PokeAPI. We'll use the `reqwest` crate to make an HTTP GET request to the PokeAPI.

```rust
// src/pokemon.rs
use reqwest::Error;

pub async fn fetch_pokemon_data(pokemon_name: &str) -> Result<Pokemon, Error> {
    let url = format!("https://pokeapi.co/api/v2/pokemon/{}", pokemon_name);
    let response = reqwest::get(&url).await?;
    let pokemon: Pokemon = response.json().await?;
    Ok(pokemon)
}
```

The `fetch_pokemon_data` function is an asynchronous function that takes a reference to a `pokemon_name` string and returns a `Result` with either a `Pokemon` struct or an `Error`. In the body of the function, we format the PokeAPI URL and make an HTTP GET request using `reqwest::get`. Then, we use the `json` method to deserialize the response into a `Pokemon` struct.

## Displaying Pokémon Data

Now, let's create a function in the `main.rs` file that calls `fetch_pokemon_data` and prints the Pokémon data to the console.

```rust
// src/main.rs
mod pokemon;

use pokemon::{fetch_pokemon_data, Pokemon};
use std::env;
use tokio;

async fn display_pokemon_data(pokemon_name: &str) {
    match fetch_pokemon_data(pokemon_name).await {
        Ok(pokemon) => {
            println!("Name: {}", pokemon.name);
            println!("Height: {}", pokemon.height);
            println!("Weight: {}", pokemon.weight);
            println!("Types: {}", types_to_string(&pokemon.types));
        }
        Err(error) => {
            eprintln!("Error: {}", error);
        }
    }
}

fn types_to_string(types: &[pokemon::PokemonType]) -> String {
    types
        .iter()
        .map(|ptype| ptype.type_data.name.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}

#[tokio::main]
async fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() == 2 {
        let pokemon_name = &args[1];
        display_pokemon_data(pokemon_name).await;
    } else {
        eprintln!("Usage: pokeapi_rust <pokemon_name>");
    }
}
```

In `main.rs`, we define an asynchronous function `display_pokemon_data` that calls the `fetch_pokemon_data` function and prints the Pokémon datato the console. We also define a helper function, `types_to_string`, that takes a reference to a slice of `PokemonType` and converts it into a comma-separated string of type names.

The `main` function uses the `tokio::main` attribute macro, which allows us to use the `await` keyword in the main function. We then parse command-line arguments and call the `display_pokemon_data` function with the provided Pokémon name.

## Testing the Application

Now that our code is complete, let's test the application. Build and run the application by entering the following command in your terminal:

```sh
cargo run <pokemon_name>
```

Replace `<pokemon_name>` with the name of a Pokémon, such as "pikachu" or "charmander". For example:

```sh
cargo run pikachu
```

You should see output similar to the following:

```
Name: pikachu
Height: 4
Weight: 60
Types: electric
```

If you see this output, congratulations! You have successfully built a Rust application that fetches and displays Pokémon data using the PokeAPI REST API.

## Conclusion

In this article, we demonstrated how to interact with the PokeAPI REST API using Rust. We built a simple command-line application that fetches and displays information about a Pokémon. The `reqwest` and `serde` crates were used for making HTTP requests and handling JSON data, respectively.

You can extend this application by adding more features, such as fetching and displaying additional Pokémon properties, or by implementing a more sophisticated user interface. The PokeAPI offers a wealth of data, and Rust provides a powerful and safe foundation for building applications. Happy coding!