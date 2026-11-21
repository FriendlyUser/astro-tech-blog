---
title: "Cutting LLM costs with prompt caching in the Claude API"
description: "How prefix caching works, where to put cache_control breakpoints, minimum lengths and TTLs, and how to read the cache usage fields to confirm you are getting hits."
tags: ["Claude", "LLM", "Prompt Caching", "Python", "Cost"]
pubDate: "2026-05-24T16:00:00.000Z"
imgSrc: "/imgs/2026/prompt_caching_cost.webp"
imgAlt: "A prompt drawn as stacked blocks, with the stable top blocks marked as cached and the last block marked as new"
---

Most LLM applications send the same long prefix on every request: a system prompt, tool definitions, a reference document, or the conversation so far. Prompt caching lets the API keep the processed form of that prefix for a few minutes, so later requests that start with the same bytes are billed at a fraction of the normal input price and usually return their first token sooner.

This post explains how the cache matches prompts, how to mark breakpoints in the Claude API, and how to check from the response that caching is working. Examples use the `anthropic` Python SDK (0.104) and `claude-sonnet-4-5`. I won't quote prices here because they change; the [pricing page](https://platform.claude.com/docs/en/about-claude/pricing) lists cache write and cache read rates per model.

## How prefix caching works

The cache is keyed on an exact **prefix** of the request. The API renders a request in a fixed order:

1. `tools`
2. `system`
3. `messages`

When you put a `cache_control` marker on a content block, you are saying "cache everything up to and including this block". On a later request, if everything up to that point is byte-for-byte identical, the API reads it from the cache instead of processing it again. If one byte differs anywhere before the marker, it's a miss, and everything after the change is processed (and written) again.

That has one practical consequence that matters more than anything else in this post: **stable content first, variable content last.** A timestamp at the top of a system prompt ("Today is 2026-05-24 16:03:11") makes every request a cache miss, even if the 20,000 tokens after it never change.

There are three numbers to know, all documented in the [prompt caching guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching):

- **Breakpoints.** Up to 4 `cache_control` markers per request.
- **Minimum length.** A prefix shorter than the model's minimum is not cached at all. For Claude Sonnet 4.5 the minimum is 1024 tokens; some other models need 2048 or 4096, so check the table in the guide for the model you use. A too-short prefix doesn't cause an error: the cache fields in the usage just stay at zero.
- **Lifetime (TTL).** The default is 5 minutes, refreshed each time the entry is read. You can ask for a 1-hour TTL with `{"type": "ephemeral", "ttl": "1h"}`. Writing a 1-hour entry costs more than writing a 5-minute one, so it pays off only when requests sharing the prefix are more than 5 minutes apart.

Writes cost more than normal input tokens and reads cost much less. So caching saves money when a prefix is read at least once or twice after being written, and costs a little extra when it never is.

## A worked example: questions about a long document

The classic case is a long document plus many questions about it. The document goes in the system prompt, with the breakpoint on it; the question goes in the user message, after the breakpoint.

```python
# cached_qa.py: ask several questions about one long document, caching the document
import os
import sys
from pathlib import Path

import anthropic

MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-5")
client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY

document = Path(sys.argv[1]).read_text(encoding="utf-8")

# Stable prefix: instructions + the document. The breakpoint goes on the last
# block that is the same for every request.
system = [
    {
        "type": "text",
        "text": "You answer questions about the internal runbook below. "
                "Quote the section you used. If the runbook does not say, reply 'not covered'.",
    },
    {
        "type": "text",
        "text": f"<runbook>\n{document}\n</runbook>",
        "cache_control": {"type": "ephemeral"},  # 5-minute TTL
    },
]

count = client.messages.count_tokens(
    model=MODEL, system=system, messages=[{"role": "user", "content": "x"}]
)
print(f"prefix is about {count.input_tokens} tokens")


def ask(question: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": question}],  # varies, so after the breakpoint
    )
    u = response.usage
    print(
        f"write={u.cache_creation_input_tokens} "
        f"read={u.cache_read_input_tokens} "
        f"uncached={u.input_tokens} out={u.output_tokens}"
    )
    return response.content[0].text


for q in [
    "How do I rotate the database password?",
    "Who gets paged for a disk-full alert?",
    "What is the rollback procedure for a bad deploy?",
]:
    print(q, "->", ask(q)[:80])
```

Run it with `uv run --with anthropic cached_qa.py runbook.md`. The `count_tokens` call is a cheap way to confirm the prefix is over the minimum before you rely on caching; it doesn't run the model.

## Reading the usage fields

Each response's `usage` splits the input into three parts:

| Field | What it counts |
|---|---|
| `cache_creation_input_tokens` | Tokens written to the cache by this request (billed at the write rate) |
| `cache_read_input_tokens` | Tokens served from the cache (billed at the read rate) |
| `input_tokens` | Tokens after the last breakpoint, processed normally |

The total input for the request is the sum of the three. With a 6,000-token runbook, the pattern from the script above looks like this (illustrative numbers, not a recorded run):

```text
write=6050 read=0 uncached=14 out=210
write=0 read=6050 uncached=13 out=180
write=0 read=6050 uncached=15 out=240
```

The first request writes the prefix; the next two read it. If you see `write` on every request, something in the prefix changes between calls. If you see zeros in both cache fields, the prefix is under the minimum, or the `cache_control` marker isn't where you think it is.

Log these three numbers in production, per endpoint. A cache hit rate (`read / (read + write + uncached)`) that drops after a deploy almost always means someone added something variable to the top of a prompt.

## Caching a conversation

In a chat, the whole history is the prefix. Put the breakpoint on the **last** block of the newest message, and each turn reads the previous turn's cache and writes a slightly longer entry:

```python
def chat_turn(history: list[dict], user_text: str) -> str:
    # Drop the marker from older messages so we stay under 4 breakpoints.
    for message in history:
        if message["role"] == "user":
            for block in message["content"]:
                block.pop("cache_control", None)

    history.append({
        "role": "user",
        "content": [{"type": "text", "text": user_text, "cache_control": {"type": "ephemeral"}}],
    })
    response = client.messages.create(
        model=MODEL, max_tokens=1024, system=system, messages=history
    )
    history.append({"role": "assistant", "content": response.content})
    return response.content[0].text
```

On a hit, the API looks for the longest previously cached prefix by checking block boundaries before your breakpoint. That lookback has a limit of about 20 content blocks, so if a single turn adds many blocks (long runs of tool calls and results, for example), add a second breakpoint earlier in the turn, or the previous entry can fall out of reach and the whole conversation gets written again.

## Ordering the prompt for cache hits

Because the cache is a prefix match in `tools` → `system` → `messages` order, a change in an early section invalidates everything after it:

- **Changing the tool list** (adding, removing or reordering tools) invalidates the whole cache. Keep the tool set fixed per endpoint and sort it deterministically.
- **Changing the system prompt** invalidates the system and message caches, but not cached tools.
- **Changing request settings** such as `tool_choice`, or turning extended thinking on or off, can invalidate the cached messages even when the text is the same.

Some habits that keep the prefix stable:

- Put dates, user names, request IDs and feature flags in the user message, not the system prompt. "The current date is ..." can sit at the end of the latest user turn.
- Serialise JSON with sorted keys (`json.dumps(obj, sort_keys=True)`). Python dicts keep insertion order, which can vary between code paths.
- Keep retrieved documents (RAG results) after the breakpoint unless the same documents really are reused across requests.
- If several prompts share a long common part, put that part first in all of them, so they can share one entry.

## Gotchas

- **Parallel cold starts don't share.** An entry is available only once the first response that writes it has started. If you fire 50 requests at once against a cold prefix, they all pay for a write. Send one request first, then fan out.
- **Caches are scoped.** Entries are never shared between organizations (on the Claude API they are isolated per workspace), and different models have separate caches. Switching model mid-conversation means a fresh write.
- **The TTL counts from the start of a request.** A long generation uses up part of the 5 minutes before the next request can read the entry.
- **Short prompts gain nothing.** Under the minimum length, a `cache_control` marker is silently ignored. That is fine; just don't count on savings.
- **Batch and caching combine.** Message Batches requests can carry `cache_control` too, but batch requests run in whatever order the service chooses, so hits are opportunistic rather than guaranteed.

## Further reading

- [Prompt caching guide](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)
- [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing)
