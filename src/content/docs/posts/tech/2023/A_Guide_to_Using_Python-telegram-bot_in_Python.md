---
description: Build a working Telegram echo bot with python-telegram-bot v22, using its asyncio Application API, command handlers and message filters.
imgSrc: /imgs/2023/945555918.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-08-17T13:13:00.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "python-telegram-bot: build an echo bot with commands"
---

:::caution
This post originally used the `Updater` / `dispatcher` / `Filters` API from python-telegram-bot v13. Version 20 (January 2023) rewrote the library around `asyncio`, and that API no longer exists. The code below targets the current v22 release.
:::

[python-telegram-bot](https://python-telegram-bot.org/) is a Python wrapper around the Telegram Bot API. It handles long polling or webhooks, parses incoming updates, and routes them to handler functions you write. This post builds a small bot that answers `/start` and `/help` and echoes any other text message back.

## Install

The current release (22.8 at the time of writing) requires Python 3.10 or newer:

```bash
pip install "python-telegram-bot==22.*"
```

## Get a bot token

Bots are created through Telegram's own [BotFather](https://core.telegram.org/bots/features#botfather) bot:

1. In Telegram, open a chat with `@BotFather`.
2. Send `/newbot`.
3. Choose a display name, then a username. The username must end in `bot` (for example `my_test_bot`).
4. BotFather replies with a token. Anyone holding it can control your bot, so keep it out of source control.

The example reads the token from an environment variable:

```bash
export TELEGRAM_BOT_TOKEN="123456:ABC..."
```

## The bot

Handlers are `async` functions that receive an `Update` and a context object. You register them on an `Application`, then start polling:

```python
import logging
import os

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(level=logging.INFO)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Hello! I am your Telegram bot.")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Send me a message and I will echo it back to you.")


async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(update.message.text)


def main() -> None:
    application = Application.builder().token(os.environ["TELEGRAM_BOT_TOKEN"]).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    # Any text message that isn't a /command
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))

    # Blocks until Ctrl-C; handles startup and shutdown of the bot for you.
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
```

Run it with `python bot.py`, open a chat with your bot, and send `/start`, `/help`, then any text.

## What changed from the v13 API

If you are porting an older bot, these are the renames you will hit most:

| v13 | v20+ |
| --- | --- |
| `Updater(token)` + `updater.dispatcher` | `Application.builder().token(token).build()` |
| `dp.add_handler(...)` | `application.add_handler(...)` |
| `updater.start_polling()` + `updater.idle()` | `application.run_polling()` |
| `Filters.text`, `Filters.command` | `filters.TEXT`, `filters.COMMAND` |
| `CallbackContext` | `ContextTypes.DEFAULT_TYPE` |
| `def handler(...)`: `update.message.reply_text(...)` | `async def handler(...)`: `await update.message.reply_text(...)` |

Every Bot API call is now a coroutine, so forgetting `await` is the usual mistake: the call silently does nothing and Python warns that a coroutine was never awaited.

## Gotchas

- **Group chats and privacy mode.** By default a bot in a group only sees commands and replies to its own messages. Turn privacy mode off with BotFather's `/setprivacy` if the echo handler should see every message.
- **Blocking work.** A slow synchronous call (a `requests.get`, a heavy computation) inside a handler stalls the whole bot. Use an async HTTP client or `asyncio.to_thread`.
- **Polling vs webhooks.** `run_polling()` is fine for development and small bots. For a deployed bot behind HTTPS, `run_webhook()` avoids the constant polling connection.

## Further reading

- [python-telegram-bot documentation](https://docs.python-telegram-bot.org/)
- [Examples in the GitHub repository](https://github.com/python-telegram-bot/python-telegram-bot/tree/master/examples), including inline keyboards and conversation handlers
- [Telegram Bot API reference](https://core.telegram.org/bots/api)
