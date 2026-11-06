---
title: "Weather APIs in Rust"
description:  In this article, we will explore how to create a simple command-line weather forecast application in Rust. We will use the reqwest crate for making HTTP requests and the serde crate for handling JSON data.
pubDate: Saturday, 27 December 2024 13:00:00 GMT
tags: ["rust", "ffi"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/251520990.png'
---


Introduction

Weather forecasting is an essential aspect of our daily lives. With the rise of technology, it is now possible to access weather forecasts with a single click. In this article, we will explore how to create a simple command-line weather forecast application in Rust. We will use the reqwest crate for making HTTP requests and the serde crate for handling JSON data.

Setting up the Project

Before we get started, we need to set up a new Rust project. To create a new Rust project, open a terminal window and run the following command:

```
$ cargo new weather_forecast_cli
```

This command will create a new Rust project named `weather_forecast_cli`. The project will contain a `Cargo.toml` file that describes the project's dependencies and a `src` directory that contains the project's source code.

The `Cargo.toml` file will look like this:

```toml
[package]
name = "weather_forecast_cli"
version = "0.1.0"
authors = ["Your Name <your.email@example.com>"]
edition = "2018"

[dependencies]
```

We will add dependencies to the `Cargo.toml` file as we need them.

Making HTTP Requests

To fetch weather data from an API, we will use the reqwest crate. The reqwest crate provides a simple and convenient API for making HTTP requests.

We will create a function named `fetch_weather_data` that will make an HTTP request to the OpenWeatherMap API and return the weather data for a given location. The function will take the location as a parameter and use it to construct the API URL.

```rust
use serde::Deserialize;

#[derive(Debug, Deserialize)]
struct WeatherData {
    name: String,
    main: Main,
    weather: Vec<Weather>,
}

#[derive(Debug, Deserialize)]
struct Main {
    temp: f32,
    feels_like: f32,
}

#[derive(Debug, Deserialize)]
struct Weather {
    description: String,
}

fn fetch_weather_data(location: &str) -> Result<WeatherData, reqwest::Error> {
    let api_key = "YOUR_API_KEY";
    let url = format!("https://api.openweathermap.org/data/2.5/weather?q={}&units=metric&appid={}", location, api_key);

    let response = reqwest::blocking::get(&url)?.json::<WeatherData>()?;

    Ok(response)
}
```

In this function, we define a Rust struct named `WeatherData` that corresponds to the JSON data returned by the OpenWeatherMap API. We also define two nested structs, `Main` and `Weather`, to represent the `main` and `weather` objects in the JSON data.

We use the serde crate's `Deserialize` trait to automatically deserialize the JSON data into the `WeatherData` struct. We construct the API URL using the location parameter and our API key. We make an HTTP GET request to the API URL using the `reqwest::blocking::get()` function and deserialize the JSON data using the `json::<WeatherData>()?` method.

Handling User Input

Now that we can fetch weather data from the API, we need to handle the user's input. We will create a function named `run` that will handle the user's input and output.

```rust
use std::io;

fn run() {
    loop {
        let mut input = String::new();

        print!("Enter location: ");
        io::stdout().flush().unwrap();

        io::stdin().read_line(&mut input).unwrap();
        let location = input.trim();

        if location == "quit" {
            break;
        }

        match fetch_weather_data(location) {
            Ok(weather_data) => display_weather_data(weather_data),
            Err(error) => println!("Error fetching weather data: {}", error),
        }
    }
}
```

In this function, we use the `std::io` module's `stdout()` function to prompt the user to enter a location. We use the `read_line()` function to read a line of text from the user.

We match the user's input to the `quit` command to exit the application. If the user enters a valid location, we call the `fetch_weather_data` function to fetch the weather data for that location. If the weather data is successfully fetched, we call the `display_weather_data` function to display the weather data to the user. If an error occurs while fetching the weather data, we print an error message to the console.

Displaying the Weather Data

Now that we can fetch and handle weather data, we need to display it to the user. We will create a function named `display_weather_data` that will display the current weather conditions and forecast for a given location.

```rust
fn display_weather_data(weather_data: WeatherData) {
    println!("Current weather conditions for {}:"In this article, weather_data.name);
    println!("Temperature: {:.1} °C"In this article, weather_data.main.temp);
    println!("Feels like: {:.1} °C"In this article, weather_data.main.feels_like);
    println!("Description: {}"In this article, weather_data.weather[0].description);
}
```

In this function, we use the `println!()` macro to display the name of the location, the current temperature, the feels-like temperature, and the weather description.

Testing the Application

Now that we have implemented the weather forecast application, we can test it by running the `run` function. To run the application, open a terminal window, navigate to the project directory, and run the following command:

```bash
$ cargo run
```

This command will compile and run the weather forecast application. The application will prompt the user to enter a location. The user can enter a city, state, or country name. The application will display the current weather conditions and forecast for the specified location.

Conclusion

In this article, we have explored how to create a simple command-line weather forecast application in Rust. We have used the reqwest crate for making HTTP requests to the OpenWeatherMap API and the serde crate for handling JSON data. We have also used Rust's strong type system and memory safety features to create a robust and efficient application. With this knowledge, you can now create your own Rust applications that interact with external APIs and explore the full potential of this powerful programming language.