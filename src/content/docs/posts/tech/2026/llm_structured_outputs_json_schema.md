---
title: "Getting reliable JSON from an LLM: schemas, structured outputs and validation"
description: "Three ways to get JSON out of Claude in Python: prompting, a forced tool call and the structured outputs beta, with Pydantic validation, retries and stop reasons."
tags: ["LLM", "Claude", "Python", "Pydantic", "JSON Schema", "Structured Outputs"]
pubDate: "2026-01-08T16:00:00.000Z"
imgSrc: "/imgs/2026/llm_structured_outputs_json_schema.webp"
imgAlt: "Free-form text flowing through a schema filter and coming out as validated JSON fields, with a retry arrow looping back"
---

Most LLM features end in code, not in a chat window: a ticket router needs a `severity`, an importer needs an `order_id`, and neither can do anything with a friendly paragraph. Getting JSON back is easy to demo and annoyingly easy to get wrong in production, where one stray code fence or one invented enum value breaks the pipeline.

This post shows three ways to get structured data out of Claude from Python, from least to most constrained, and the validation layer that should sit behind all of them. Examples use the `anthropic` Python SDK 0.75, Pydantic 2.12 and `claude-sonnet-4-5`.

## The schema comes first

Whatever technique you use, write the target shape down once as a Pydantic model. It gives you a JSON Schema to send to the model and a validator for what comes back, from the same source.

The running example turns a customer email into a support ticket:

```python
# ticket_schema.py
from typing import Literal

from pydantic import BaseModel, Field


class Ticket(BaseModel):
    """A support request extracted from a customer email."""

    customer_name: str
    product: Literal["router", "modem", "mesh"]
    severity: Literal["low", "medium", "high"]
    order_id: str | None = Field(
        default=None, description="Order number like ORD-123456, if the email has one"
    )
    summary: str = Field(description="One sentence, under 200 characters")
```

`Ticket.model_json_schema()` produces the JSON Schema: `Literal` becomes an `enum`, `str | None` becomes an `anyOf` with `null`, and the `description` strings travel along. Those descriptions are prompt text. The model reads them, so write them for the model.

Install the two libraries:

```bash
pip install "anthropic>=0.75" pydantic
export ANTHROPIC_API_KEY=...
```

## Option 1: ask for JSON in the prompt

The oldest approach is to describe the format and parse whatever comes back. It works with every model and every provider, and it fails in predictable ways: Markdown fences around the JSON, a sentence before it, a field with a value outside the enum, or output cut off at `max_tokens`.

The fix is not a cleverer prompt. It is a loop that validates, and on failure shows the model its answer and the validation error:

```python
# extract_prompt.py
import json
import os

import anthropic
from pydantic import ValidationError

from ticket_schema import Ticket

MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
client = anthropic.Anthropic()

SYSTEM = (
    "You extract support tickets from customer emails. "
    "Reply with a single JSON object and nothing else. "
    "It must match this JSON Schema:\n"
    + json.dumps(Ticket.model_json_schema())
)


class ExtractionError(Exception):
    pass


def strip_fences(text: str) -> str:
    """Remove a ```json ... ``` wrapper if the model added one anyway."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    return text.strip()


def extract_ticket(email: str, max_attempts: int = 3) -> Ticket:
    messages = [{"role": "user", "content": email}]
    for attempt in range(1, max_attempts + 1):
        response = client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=SYSTEM,
            messages=messages,
        )
        if response.stop_reason == "refusal":
            raise ExtractionError("model refused to process this email")
        if response.stop_reason == "max_tokens":
            raise ExtractionError("output was cut off; raise max_tokens")

        text = "".join(b.text for b in response.content if b.type == "text")
        try:
            return Ticket.model_validate_json(strip_fences(text))
        except ValidationError as err:
            # Show the model its own answer and what was wrong with it.
            messages += [
                {"role": "assistant", "content": text},
                {
                    "role": "user",
                    "content": "That JSON did not validate:\n"
                    f"{err}\nReply with the corrected JSON object only.",
                },
            ]
    raise ExtractionError(f"no valid JSON after {max_attempts} attempts")


if __name__ == "__main__":
    email = (
        "Hi, this is Dana Ortiz. The mesh kit from order ORD-482913 drops "
        "every device in the house about once an hour. I work from home, "
        "so this is urgent."
    )
    print(extract_ticket(email).model_dump_json(indent=2))
```

A few details in there matter more than they look:

- **Check `stop_reason` before parsing.** `max_tokens` means the JSON is truncated, and retrying with the same limit will truncate it again. Fail loudly and fix the limit. `refusal` means the model declined; there is nothing to parse.
- **Retry with the error, not from scratch.** Pydantic's error message says which field failed and why (for example, `severity: Input should be 'low', 'medium' or 'high'`). The model fixes that kind of mistake reliably when it can see it. A blind retry just rolls the dice again.
- **Cap the attempts.** Two or three is plenty. If the third attempt fails, the input is probably the problem, and you want that email in an error queue, not in an infinite loop.

The email above says "urgent", which is not one of the allowed severities. That is exactly the kind of input that produces an off-schema value on the first try with this approach.

## Option 2: a forced tool call

Tool use gives you a better channel for structured data. You declare a tool whose `input_schema` is your schema, then force the model to call it with `tool_choice`. The arguments come back as an already-parsed dict in a `tool_use` block, so fences and preambles stop being a problem:

```python
# extract_tool.py
import os

import anthropic

from ticket_schema import Ticket

MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
client = anthropic.Anthropic()

TICKET_TOOL = {
    "name": "record_ticket",
    "description": "Record the support ticket extracted from the email.",
    "input_schema": Ticket.model_json_schema(),
}


def extract_ticket(email: str) -> Ticket:
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        tools=[TICKET_TOOL],
        tool_choice={"type": "tool", "name": "record_ticket"},
        messages=[{"role": "user", "content": email}],
    )
    if response.stop_reason == "max_tokens":
        raise RuntimeError("tool call was cut off; raise max_tokens")
    block = next(b for b in response.content if b.type == "tool_use")
    return Ticket.model_validate(block.input)  # still validate: enums, types, required


if __name__ == "__main__":
    print(extract_ticket("Dana Ortiz here. My router reboots nightly. Not urgent."))
```

The schema guides the model, but in this mode it does not constrain it. The input usually matches, and occasionally does not: a missing required field, a number as a string, an enum value that was "close enough". Keep `model_validate` and wrap the call in the same retry loop as Option 1 if you need it.

Forcing a specific tool has one restriction to know about: it does not work together with extended thinking. If you want the model to think first, use `tool_choice={"type": "auto"}` and tell it in the prompt to call the tool.

## Option 3: structured outputs (beta)

In November 2025 Anthropic added structured outputs to the API as a public beta. With it, the response is generated under a grammar compiled from your JSON Schema, so it cannot contain an invalid enum value or skip a required field. It covers two cases:

- **JSON outputs**: the text response itself follows a schema (`output_format`).
- **Strict tool use**: set `"strict": True` on a tool definition and its inputs follow the schema.

The Python SDK has a helper that takes the Pydantic model directly:

```python
# extract_structured.py
import os

import anthropic

from ticket_schema import Ticket

MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
client = anthropic.Anthropic()


def extract_ticket(email: str) -> Ticket:
    response = client.beta.messages.parse(
        model=MODEL,
        max_tokens=1024,
        betas=["structured-outputs-2025-11-13"],
        output_format=Ticket,
        messages=[{"role": "user", "content": f"Extract the support ticket:\n\n{email}"}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("model refused")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("output was cut off; raise max_tokens")
    return response.parsed_output


if __name__ == "__main__":
    print(extract_ticket("Dana Ortiz here. My modem light is blinking orange."))
```

`parse()` converts `Ticket` to JSON Schema, sends it as `output_format={"type": "json_schema", "schema": ...}`, adds the beta header if you forget it, and validates the reply back into a `Ticket` on `response.parsed_output`.

Things worth knowing before you rely on it:

- **Not every JSON Schema feature is enforced by the grammar.** The SDK rewrites the schema into the subset the API accepts and moves constraints such as `maxLength` and `pattern` into the field's description, so the model sees them as instructions. Pydantic then checks them on the way back. A string can still be too long; you just find out at validation time instead of downstream.
- **Objects must be closed.** The API requires `additionalProperties: false`. The `parse()` helper adds it for you. If you write strict tool schemas by hand, add it yourself, or set `model_config = ConfigDict(extra="forbid")` on the Pydantic model so `model_json_schema()` emits it.
- **Stop reasons still matter.** A refusal or a `max_tokens` cut-off can produce output that does not match the schema, which is why the function checks `stop_reason` first.
- **The first request with a new schema is slower**, because the API has to compile it. Requests that reuse the same schema don't pay that again, so avoid generating a slightly different schema per request.
- **Model support is a list, not "all models".** At launch it covered Claude Sonnet 4.5 and Opus 4.1. Check the structured outputs page for the current list before switching a model ID.
- **It is a beta.** The parameter names and header can change before general availability. Keep the call in one function so a rename is a one-line fix.

## Which one to use

I would pick in this order:

1. **Structured outputs** when the model supports it and the schema fits the supported subset. It removes a whole class of failures, and the code is the shortest.
2. **A forced tool call** when you need to stay on stable, non-beta API surface or on a model without structured outputs. Validate and retry.
3. **Prompted JSON** for providers or models without either feature, or when the output is mostly prose with a small JSON block in it. Always with the retry loop.

In all three cases, keep the Pydantic validation. A guaranteed-valid shape is not a guaranteed-correct value: the grammar can make sure `severity` is one of three strings, but only your tests can tell you whether "I work from home, so this is urgent" should be `high`. That is a job for an eval set, not a schema.

## Gotchas

- **Optional fields are a design decision.** If `order_id` is required, the model will fill it with something when the email has no order number. Make it `str | None` and say in the description when to use `null`.
- **Enums beat free text** for anything you branch on. A `Literal` turns "is this high severity?" into a string comparison you can trust.
- **Keep schemas shallow.** Deeply nested optional objects are harder for the model and harder to review. Two small calls are often better than one giant schema.
- **Log the raw text on failure.** When validation fails after the last retry, save the model's output with the input. Those cases are the start of your test set.

## Further reading

- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) in the Claude docs
- [Tool use overview](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview), including `tool_choice`
- [Pydantic JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/) for how models map to schemas
- [anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python) on GitHub
