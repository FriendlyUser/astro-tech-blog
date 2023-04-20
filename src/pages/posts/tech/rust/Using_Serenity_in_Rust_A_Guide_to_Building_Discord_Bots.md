---
title: Using Serenity in Rust A Guide to Building Discord Bots
pubDate: "2023-04-20T14:45:32.869Z"
description: "In this article, we will explore how to build a simple Discord bot using Serenity and Rust."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/733581468.png
---
# Using Serenity in Rust: A Guide to Building Discord Bots

Rust, a systems programming language with a focus on safety, speed, and concurrency, has grown in popularity in recent years. One area where Rust shines is in building Discord bots, thanks to the Serenity library. Serenity is a powerful and easy-to-use yet highly extensible library for creating Discord bots in Rust. In this article, we will explore how to build a simple Discord bot using Serenity and Rust.

## Setting Up Your Environment

Before we start, make sure you have Rust and Cargo installed. If not, follow the [official installation guide](https://www.rust-lang.org/tools/install) to set up your Rust environment.

Next, create a new Rust project:

```sh
cargo new my_discord_bot
cd my_discord_bot
```

Add the following dependencies to your `Cargo.toml` file:

```toml
[dependencies]
serenity = "0.10"
tokio = { version = "1", features = ["full"] }
```

## Creating a Simple Discord Bot

To create a basic Discord bot using Serenity, follow these steps:

### 1. Import Serenity

In `src/main.rs`, import Serenity and other necessary modules:

```rust
use serenity::{
    async_trait,
    model::{channel::Message, gateway::Ready},
    prelude::*,
};
```

### 2. Create a Handler Struct

Define a struct called `Handler` that will handle events from Discord:

```rust
struct Handler;
```

### 3. Implement the EventHandler Trait

Implement the `EventHandler` trait for your `Handler` struct. This trait allows you to define how your bot will react to various events.

For our simple bot, we will implement two methods: `ready` and `message`.

```rust
#[async_trait]
impl EventHandler for Handler {
    async fn ready(&self, ctx: Context, ready: Ready) {
        println!("{} is connected!", ready.user.name);
    }

    async fn message(&self, ctx: Context, msg: Message) {
        if msg.content == "!ping" {
            if let Err(why) = msg.channel_id.say(&ctx.http, "Pong!").await {
                println!("Error sending message: {:?}", why);
            }
        }
    }
}
```

The `ready` method is triggered when the bot is connected to Discord, and it prints the bot's username. The `message` method listens for messages and responds with "Pong!" if the message content is "!ping".

### 4. Set up the Tokio Runtime and Serenity Client

To run the bot, we need to set up the Tokio runtime and create a Serenity client with our `Handler`:

```rust
#[tokio::main]
async fn main() {
    let token = std::env::var("DISCORD_TOKEN").expect("Expected a token in the environment");

    let application_id: u64 = std::env::var("APPLICATION_ID")
        .expect("Expected an Application Id in the environment")
        .parse()
        .expect("Application Id must be a valid u64");

    let mut client = Client::builder(&token)
        .event_handler(Handler)
        .application_id(application_id)
        .await
        .expect("Error creating client");

    if let Err(why) = client.start().await {
        println!("Client error: {:?}", why);
    }
}
```

Make sure to replace `DISCORD_TOKEN` and `APPLICATION_ID` with your bot's token and application ID, which can be obtained from the [Discord Developer Portal](https://discord.com/developers/applications).

## Running Your Bot

Your simple Discord bot is now complete! To run it, execute the following command:

```sh
cargo run
```

Once your bot is connected, invite it to your server and try sending the command `!ping`. If everything is set up correctly, your bot will respond with "Pong!".

## Conclusion

This article introduced the basics of creating a Discord bot in Rust using the Serenity library. While our example bot is quite simple, Serenity provides many more features and capabilities that you can explore to create more advanced Discord bots. For more information and examples, visit the [official Serenity documentation](https://serenity-rs.github.io/serenity/).

