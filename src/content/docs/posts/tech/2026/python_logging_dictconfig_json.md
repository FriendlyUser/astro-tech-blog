---
title: "Python logging setup: dictConfig, JSON log lines and per-library levels"
description: "Configure Python logging with dictConfig: the logger hierarchy, a small JSON formatter, quieter third-party libraries, logging.exception, and library rules."
tags: ["Python", "Logging", "dictConfig", "JSON", "Observability"]
pubDate: "2026-07-03T16:00:00.000Z"
imgSrc: "/imgs/2026/python_logging_dictconfig_json.webp"
imgAlt: "A logger tree from root to myapp, myapp.billing and urllib3, with root sending records to a console handler and a JSON file"
---

Python's standard `logging` module is configurable enough for most applications, but its defaults are unhelpful: nothing below `WARNING` is shown, the format has no timestamp, and every library's debug chatter goes through the same pipe as yours. A dozen lines of configuration fix all of that.

This post sets up logging for a small application with `logging.config.dictConfig`: human-readable lines on the console, one JSON object per line in a file, and separate levels for noisy libraries. It also covers `logging.exception` and what libraries should and should not do. Examples were run on Python 3.12 with only the standard library.

## The logger hierarchy in two minutes

Loggers are named with dots, and the dots form a tree. `logging.getLogger("myapp.billing")` is a child of `myapp`, which is a child of the root logger. When you log a message:

1. The logger checks its **level** (or, if it has none set, the nearest ancestor's level). Below that level, the record is dropped.
2. The record is passed to the logger's own **handlers**, then to its parent's handlers, and so on up to the root. This is called propagation.
3. Each **handler** has its own level and a **formatter** that turns the record into text.

The practical consequence: put handlers on the root logger only, and use levels on named loggers to control what gets through. Every module in your code does the same thing:

```python
import logging

log = logging.getLogger(__name__)
```

`__name__` is the module's dotted path, so the logger tree mirrors your package layout, and one setting on `myapp` controls all of `myapp.*`.

## A small application

Here is the layout for the example:

```text
main.py
myapp/
    __init__.py
    billing.py
    jsonlog.py
    logging_config.py
```

`myapp/billing.py` logs like any module would. The `extra=` dict attaches structured fields to the record:

```python
import logging

log = logging.getLogger(__name__)


def charge(order_id: int, cents: int) -> None:
    log.info("charging order %s", order_id, extra={"order_id": order_id, "cents": cents})
    if cents <= 0:
        raise ValueError(f"bad amount {cents}")
    log.debug("charge accepted")
```

Note `"charging order %s", order_id` instead of an f-string. The formatting is deferred until a handler actually emits the record, so a `debug` call that is filtered out costs almost nothing. It also keeps the message template constant, which helps when you group log lines by message in a log search tool.

### A JSON formatter

There are good third-party JSON formatters, but the core is short enough to own:

```python
# myapp/jsonlog.py
import json
import logging
from datetime import datetime, timezone

# Attributes every LogRecord has; anything else came from `extra=`.
_STANDARD = set(vars(logging.makeLogRecord({}))) | {"message", "asctime", "taskName"}


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(timespec="milliseconds"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in vars(record).items():
            if key not in _STANDARD and not key.startswith("_"):
                entry[key] = value
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, default=str)
```

`record.getMessage()` applies the `%` arguments. The loop copies any attribute that is not part of a standard `LogRecord`, which is exactly what `extra=` added. `default=str` makes sure an odd value (a `Decimal`, a `UUID`) does not crash the logging call.

### The `dictConfig`

```python
# myapp/logging_config.py
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {"format": "%(asctime)s %(levelname)-8s %(name)s: %(message)s", "datefmt": "%H:%M:%S"},
        "json": {"()": "myapp.jsonlog.JSONFormatter"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "console", "level": "INFO"},
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "json",
            "filename": "app.jsonl",
            "maxBytes": 10_000_000,
            "backupCount": 3,
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "myapp": {"level": "DEBUG"},
        "urllib3": {"level": "WARNING"},
        "httpx": {"level": "WARNING"},
    },
    "root": {"level": "INFO", "handlers": ["console", "file"]},
}
```

Reading it from the bottom up:

- **`root`** has both handlers and level `INFO`. Anything that propagates to the root and passes the logger's level is written to both.
- **`loggers`** sets levels only. `myapp` goes down to `DEBUG`, so the application's debug lines reach the handlers. `urllib3` and `httpx` go up to `WARNING`, so their per-request `DEBUG` and `INFO` lines are dropped at the source. Add a line here for any library that is too chatty.
- **`handlers`** have their own levels. The console handler is `INFO`, so debug lines reach the file but not the terminal.
- **`"()"`** in a formatter tells `dictConfig` to call that factory instead of building a plain `logging.Formatter`. The same key works for custom handlers and filters.
- **`disable_existing_loggers: False`** is the line people forget. The default is `True`, which disables every logger that already exists when `dictConfig` runs, unless it or an ancestor is named in the config. Loggers are created at import time, so with the default, a library you imported before configuring logging goes silent:

```python
import logging, logging.config

lib = logging.getLogger("stripe_client")   # created at import time
logging.config.dictConfig({"version": 1, "root": {"level": "INFO", "handlers": ["h"]},
                           "handlers": {"h": {"class": "logging.StreamHandler"}}})
lib.warning("card declined")               # prints nothing
print("disabled:", lib.disabled)           # disabled: True
```

### Wiring it up

Configure logging once, as early as possible, in the entry point and nowhere else:

```python
# main.py
import logging
import logging.config

from myapp.billing import charge
from myapp.logging_config import LOGGING

logging.config.dictConfig(LOGGING)
log = logging.getLogger("myapp")

log.info("starting")
logging.getLogger("urllib3.connectionpool").debug("Starting new HTTPS connection")  # dropped
logging.getLogger("urllib3.connectionpool").warning("Retrying after connection broken")

for order_id, cents in [(1001, 2500), (1002, 0)]:
    try:
        charge(order_id, cents)
    except ValueError:
        log.exception("charge failed for order %s", order_id)
```

The two `urllib3` lines stand in for what the real library would log. Running `python main.py` prints this to the console (file paths in the traceback shortened):

```text
09:30:00 INFO     myapp: starting
09:30:00 WARNING  urllib3.connectionpool: Retrying after connection broken
09:30:00 INFO     myapp.billing: charging order 1001
09:30:00 INFO     myapp.billing: charging order 1002
09:30:00 ERROR    myapp: charge failed for order 1002
Traceback (most recent call last):
  File "main.py", line 16, in <module>
    charge(order_id, cents)
  File ".../myapp/billing.py", line 9, in charge
    raise ValueError(f"bad amount {cents}")
ValueError: bad amount 0
```

And `app.jsonl` gets one object per line, including the debug line the console skipped and the `extra` fields:

```json
{"ts": "2026-07-03T09:30:00.002+00:00", "level": "INFO", "logger": "myapp", "msg": "starting"}
{"ts": "2026-07-03T09:30:00.003+00:00", "level": "WARNING", "logger": "urllib3.connectionpool", "msg": "Retrying after connection broken"}
{"ts": "2026-07-03T09:30:00.004+00:00", "level": "INFO", "logger": "myapp.billing", "msg": "charging order 1001", "order_id": 1001, "cents": 2500}
{"ts": "2026-07-03T09:30:00.005+00:00", "level": "DEBUG", "logger": "myapp.billing", "msg": "charge accepted"}
{"ts": "2026-07-03T09:30:00.006+00:00", "level": "INFO", "logger": "myapp.billing", "msg": "charging order 1002", "order_id": 1002, "cents": 0}
{"ts": "2026-07-03T09:30:00.007+00:00", "level": "ERROR", "logger": "myapp", "msg": "charge failed for order 1002", "exc": "Traceback (most recent call last):\n  File \"main.py\", line 16, ..."}
```

The traceback in the last line is shortened here; in the file it is the full text with `\n` escapes. JSON lines like these can be shipped as-is to most log collectors, and `jq` handles them locally: `jq 'select(.level == "ERROR")' app.jsonl`.

## `logging.exception`

`log.exception(msg)` logs at `ERROR` level and attaches the current exception's traceback. It is the same as `log.error(msg, exc_info=True)`, and it only makes sense inside an `except` block, where there is a current exception.

Two habits that keep error logs useful:

- **Log or raise, not both.** If you log an exception and then re-raise it, the caller probably logs it again, and you get the same traceback twice. Log at the level that handles the error.
- **Put the identifying values in the message or in `extra`.** "charge failed" is useless at 3 a.m.; "charge failed for order 1002" is not.

For a warning that should still show the traceback, pass `exc_info=True` to `log.warning`. To show where a log call came from without an exception, use `stack_info=True`.

## Changing levels without editing code

A common need is turning on debug output for one component in production. Since the config is a dict, read overrides from the environment before applying it:

```python
import os

level = os.environ.get("MYAPP_LOG_LEVEL")
if level:
    LOGGING["loggers"]["myapp"]["level"] = level.upper()
logging.config.dictConfig(LOGGING)
```

At runtime you can also call `logging.getLogger("myapp.billing").setLevel(logging.DEBUG)` from a debug endpoint or a signal handler.

## Rules for libraries

If you are writing a package other people import, the rules are different:

- **Never call `logging.basicConfig()` or `dictConfig()` in library code.** They configure the root logger, which belongs to the application. `basicConfig` also does nothing if the root logger already has handlers, so a library that calls it at import time can make the application's own `basicConfig` call silently do nothing.
- **Don't add handlers other than `NullHandler`.** Get a logger with `logging.getLogger(__name__)` and log to it. The application decides where the output goes.
- **Optionally add a `NullHandler` to your top-level logger** (`logging.getLogger("mylib").addHandler(logging.NullHandler())`). Without any handler configured, Python falls back to a last-resort handler that prints `WARNING` and above to stderr. The `NullHandler` stops that, so your library is silent unless the application configures logging.
- **Use `DEBUG` for per-call detail** and reserve `WARNING` for things the application developer should act on. That way the `"urllib3": {"level": "WARNING"}` style of override in the application config does the right thing.

## Gotchas

- **`basicConfig` after something else configured the root does nothing.** Pass `force=True` if you really need to replace the existing handlers, for example in a notebook.
- **Handler levels and logger levels both apply.** If debug lines are missing, check the logger level, every ancestor's level if it is unset, and the handler level.
- **`RotatingFileHandler` is not safe with several processes writing the same file.** With Gunicorn workers or multiprocessing, log to stdout and let the process manager or container runtime collect it, or use a `QueueHandler` that sends records to one writer.
- **Don't log secrets through `extra`.** The JSON formatter writes every extra field. Filter or redact tokens and personal data before they reach the record.

## Further reading

- [Logging HOWTO](https://docs.python.org/3/howto/logging.html)
- [Logging Cookbook](https://docs.python.org/3/howto/logging-cookbook.html)
- [`logging.config` and the dictionary schema](https://docs.python.org/3/library/logging.config.html)
- [Configuring logging for a library](https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library)
