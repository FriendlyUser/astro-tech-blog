---
title: "Building a Discord ping bot in Rust with Serenity"
pubDate: "2023-04-20T14:45:32.869Z"
lastUpdated: 2026-11-14
description: "Write a minimal Discord bot in Rust with Serenity 0.12 that answers !ping, including gateway intents, the bot token and inviting it to a server."
tags: ["rust"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/733581468.webp
---

[Serenity](https://github.com/serenity-rs/serenity) is a Rust library for the Discord API. It handles the gateway WebSocket connection, reconnects, rate limits and the REST API, and hands you events through an async trait. This post builds the smallest useful bot: it replies "Pong!" when someone sends `!ping`.

The code targets Serenity 0.12.5. Serenity 0.12 requires gateway intents in `Client::builder`, so the 0.10-era code that the original version of this post used no longer compiles.

## Setting up the project

```sh
cargo new my_discord_bot
cd my_discord_bot
```

```toml
[dependencies]
serenity = "0.12.5"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

## Creating the bot in the Developer Portal

1. Create an application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. On the **Bot** page, reset/copy the token. Treat it like a password: don't commit it, and regenerate it if it leaks.
3. On the same page, enable **Message Content Intent**. It's a privileged intent, and without it your bot receives messages with an empty `content` field (except DMs and messages that mention the bot), so the `!ping` check never matches. If the code requests this intent but it isn't enabled in the portal, Discord closes the connection with close code 4014 (disallowed intents).

## The code

Put this in `src/main.rs`. It's essentially Serenity's own [basic ping bot example](https://github.com/serenity-rs/serenity/tree/current/examples/e01_basic_ping_bot):

```rust
use std::env;

use serenity::async_trait;
use serenity::model::channel::Message;
use serenity::model::gateway::Ready;
use serenity::prelude::*;

struct Handler;

#[async_trait]
impl EventHandler for Handler {
    async fn message(&self, ctx: Context, msg: Message) {
        // Ignore other bots (and ourselves) to avoid reply loops
        if msg.author.bot {
            return;
        }

        if msg.content == "!ping" {
            if let Err(why) = msg.channel_id.say(&ctx.http, "Pong!").await {
                println!("Error sending message: {why:?}");
            }
        }
    }

    async fn ready(&self, _: Context, ready: Ready) {
        println!("{} is connected!", ready.user.name);
    }
}

#[tokio::main]
async fn main() {
    let token = env::var("DISCORD_TOKEN").expect("Expected DISCORD_TOKEN in the environment");

    let intents = GatewayIntents::GUILD_MESSAGES
        | GatewayIntents::DIRECT_MESSAGES
        | GatewayIntents::MESSAGE_CONTENT;

    let mut client = Client::builder(&token, intents)
        .event_handler(Handler)
        .await
        .expect("Error creating client");

    if let Err(why) = client.start().await {
        println!("Client error: {why:?}");
    }
}
```

How it fits together:

- `EventHandler` has a default no-op method for every gateway event. You override the ones you care about. `ready` fires once the connection is established, and `message` fires for every message the bot can see.
- **Intents** tell Discord which events to send. `GUILD_MESSAGES` and `DIRECT_MESSAGES` deliver message events from servers and DMs, and `MESSAGE_CONTENT` lets you read the text. If you leave an intent out, the matching events simply never arrive, and nothing reports an error.
- `Client::builder` takes the raw token. Serenity adds the `Bot ` prefix itself.
- `client.start()` runs a single shard until it fails. Serenity reconnects automatically with backoff. Large bots use `start_autosharded()` instead.

The original version of this post also read an `APPLICATION_ID` variable and passed it to the builder. A prefix-command bot like this doesn't need it, so it's gone.

## Running it

```sh
DISCORD_TOKEN=your-token-here cargo run
```

(In PowerShell: `$env:DISCORD_TOKEN = "your-token-here"; cargo run`.)

To add the bot to a server, open **OAuth2 → URL Generator** in the Developer Portal, tick the `bot` scope and the **Send Messages** and **Read Message History** permissions, then open the generated URL. Send `!ping` in a channel the bot can see and it should reply `Pong!`.

## Where to go next

Discord now pushes bots towards slash commands (application commands) rather than parsing message text. They don't need the Message Content intent and show up in Discord's command picker. Serenity supports them through its `model::application` types (see the interaction examples in the repository), and the [poise](https://github.com/serenity-rs/poise) framework, built on Serenity, lets you define slash and prefix commands as annotated async functions.

## Further reading

- [Serenity API docs](https://docs.rs/serenity/latest/serenity/)
- [Serenity examples](https://github.com/serenity-rs/serenity/tree/current/examples)
- [Discord gateway intents documentation](https://docs.discord.com/developers/events/gateway#gateway-intents)
