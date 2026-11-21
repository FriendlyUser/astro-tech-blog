---
title: "Processing thousands of prompts with the Claude Message Batches API"
description: "When the Message Batches API fits, and a script that submits a batch with custom IDs, polls it, reads the results and resubmits errored or expired requests."
tags: ["Claude", "LLM", "Batch Processing", "Python", "Message Batches API"]
pubDate: "2026-10-22T16:00:00.000Z"
imgSrc: "/imgs/2026/llm_batch_processing.webp"
imgAlt: "A grid of batch request tiles coloured as succeeded, processing, errored or expired, with the counts below"
---

Plenty of LLM work has no user waiting for it: labelling a backlog of support tickets, summarising last month's documents, generating test data, running an evaluation set. For that kind of job, the Message Batches API lets you submit up to 100,000 Messages requests in one call, and collect the results when they're done. It's billed at a discount to the standard rate and has its own rate limits, so a big job doesn't compete with your interactive traffic.

This post covers when batches fit, and walks through a script that submits a batch, polls it, reads the results and handles the requests that didn't succeed. Examples use the `anthropic` Python SDK 2.1, Python 3.12 and `claude-haiku-5-5`.

## When a batch fits

Batches trade latency for cost and throughput. The documented limits, at the time of writing:

- **Up to 100,000 requests or 256 MB** per batch, whichever comes first.
- **Most batches finish within an hour**, but there's no guarantee; anything not processed within **24 hours** expires.
- **Results stay available for 29 days** after the batch is created.
- Each request is an ordinary Messages request, so system prompts, images, tools and prompt caching all work. You can't stream inside a batch.

Use a batch when a job has more than a few hundred requests, no request needs an answer within minutes, and you'd otherwise be writing a concurrent client with rate limiting and retries. Don't use one for anything a user is waiting on, or for multi-step agent loops where each call depends on the previous answer: every step would be a separate batch with its own wait.

## The script

The example labels product reviews by sentiment. The input is a JSONL file with an `id` and a `text` per line:

```text
{"id": "r-1001", "text": "I love this kettle, it boils in two minutes."}
{"id": "r-1002", "text": "Arrived broken and support never replied."}
{"id": "r-1003", "text": "Love the colour, hate the lid."}
{"id": "r-1004", "text": "It is a kettle. It boils water."}
```

The script has three subcommands, so each step can run separately (from a cron job, a CI step, or by hand):

```python
# batch_classify.py: label thousands of reviews with the Message Batches API
#   python batch_classify.py submit reviews.jsonl   -> creates a batch, prints its ID
#   python batch_classify.py wait <batch_id>        -> polls until processing has ended
#   python batch_classify.py collect <batch_id>     -> writes labels.csv and retry.jsonl
import csv
import json
import os
import sys
import time

import anthropic
from anthropic.types.message_create_params import MessageCreateParamsNonStreaming
from anthropic.types.messages.batch_create_params import Request

MODEL = os.environ.get("CLAUDE_MODEL", "claude-haiku-5-5")
LABELS = {"positive", "negative", "neutral"}
SYSTEM = (
    "You label product reviews by sentiment. "
    "Reply with exactly one word: positive, negative or neutral."
)
client = anthropic.Anthropic()


def make_request(review: dict) -> Request:
    return Request(
        custom_id=str(review["id"]),  # 1-64 chars of letters, digits, - and _
        params=MessageCreateParamsNonStreaming(
            model=MODEL,
            max_tokens=1024,
            output_config={"effort": "low"},
            system=SYSTEM,
            messages=[{"role": "user", "content": review["text"]}],
        ),
    )


def submit(path: str) -> None:
    with open(path, encoding="utf-8") as f:
        reviews = [json.loads(line) for line in f if line.strip()]
    batch = client.messages.batches.create(requests=[make_request(r) for r in reviews])
    print(f"{batch.id} {batch.processing_status} ({len(reviews)} requests)")


def wait(batch_id: str, every: int = 60) -> None:
    while True:
        batch = client.messages.batches.retrieve(batch_id)
        c = batch.request_counts
        print(f"{batch.processing_status}: processing={c.processing} succeeded={c.succeeded} "
              f"errored={c.errored} canceled={c.canceled} expired={c.expired}")
        if batch.processing_status == "ended":
            return
        time.sleep(every)


def collect(batch_id: str) -> None:
    labels, retry, rejected = [], [], []
    for entry in client.messages.batches.results(batch_id):  # streamed, in any order
        result = entry.result
        if result.type == "succeeded":
            text = next((b.text for b in result.message.content if b.type == "text"), "")
            label = text.strip().lower().rstrip(".")
            labels.append((entry.custom_id, label if label in LABELS else "unparsed"))
        elif result.type == "errored" and result.error.error.type == "invalid_request_error":
            rejected.append((entry.custom_id, result.error.error.message))  # fix the request first
        else:  # server errors, "expired" and "canceled" can simply be sent again
            retry.append(entry.custom_id)

    with open("labels.csv", "w", newline="", encoding="utf-8") as f:
        csv.writer(f).writerows([("id", "label"), *sorted(labels)])
    with open("retry.jsonl", "w", encoding="utf-8") as f:
        f.writelines(json.dumps({"id": cid}) + "\n" for cid in retry)
    print(f"{len(labels)} labelled, {len(retry)} to retry, {len(rejected)} rejected")
    for cid, message in rejected:
        print(f"  {cid}: {message}")


if __name__ == "__main__":
    command, arg = sys.argv[1], sys.argv[2]
    {"submit": submit, "wait": wait, "collect": collect}[command](arg)
```

### Custom IDs

Every request in a batch needs a `custom_id`, unique within the batch: 1 to 64 characters of letters, digits, hyphens and underscores. Results come back **in any order**, so the custom ID is the only reliable way to match a result to its input. Use the primary key of the thing you're processing (here, the review ID), not a position in a list.

### Model settings

`claude-haiku-5-5` is a good fit for high-volume labelling. It runs adaptive thinking by default, so two details in `make_request` matter:

- `output_config={"effort": "low"}` keeps the model from spending tokens on reasoning that a one-word label doesn't need.
- `max_tokens=1024` leaves room for any thinking plus the answer. A very low limit, like 5, risks a `max_tokens` stop before the text block arrives.

In `collect`, the label is read from the first **text** block, not from `content[0]`, because a response can start with a thinking block. The script also checks the label against the allowed values: a model will occasionally answer "Mixed." or add a sentence, and you want those counted, not silently written to the CSV.

## Running it

```bash
export ANTHROPIC_API_KEY=...
python batch_classify.py submit reviews.jsonl
python batch_classify.py wait msgbatch_...
python batch_classify.py collect msgbatch_...
```

`submit` prints the batch ID. Save it; it's the only handle you have on the job. `wait` prints the request counts every minute until `processing_status` is `ended` (illustrative output):

```text
in_progress: processing=4 succeeded=0 errored=0 canceled=0 expired=0
in_progress: processing=1 succeeded=3 errored=0 canceled=0 expired=0
ended: processing=0 succeeded=4 errored=0 canceled=0 expired=0
```

`processing_status` moves from `in_progress` to `ended` (or through `canceling` if you call `client.messages.batches.cancel(batch_id)`). A batch only reports `ended` once every request has an outcome, so you can't collect a partial result set while it's still running.

Polling once a minute is plenty. Batches take minutes to hours; polling every second only adds requests.

## Reading results and handling failures

`client.messages.batches.results(batch_id)` streams the results file one line at a time, so memory stays flat even for 100,000 results. Each line has the `custom_id` and a `result` with one of four types:

| `result.type` | Meaning | What to do |
|---|---|---|
| `succeeded` | `result.message` is a normal Message | Use it |
| `errored` with `invalid_request_error` | The request itself was invalid | Fix the request; resending it unchanged fails again |
| `errored` with another error type | A server-side problem with that request | Send it again |
| `expired` | Not processed within 24 hours | Send it again, possibly in a smaller batch |
| `canceled` | The batch was cancelled before this request ran | Send it again if you still need it |

Requests are validated when they run, not when the batch is created, so one malformed request doesn't reject the whole batch: it comes back as `errored` while the rest succeed. To catch mistakes before spending a day waiting, send one or two of the requests through `client.messages.create` first, and submit the batch only once they work.

In a test against a local stub server that rejected one request, `collect` printed:

```text
3 labelled, 0 to retry, 1 rejected
  r-1002: max_tokens: field required (stub)
```

`retry.jsonl` holds the IDs worth resubmitting. Turning them back into a batch is a join with the original input:

```python
retry_ids = {json.loads(line)["id"] for line in open("retry.jsonl", encoding="utf-8")}
reviews = [json.loads(line) for line in open("reviews.jsonl", encoding="utf-8")]
batch = client.messages.batches.create(
    requests=[make_request(r) for r in reviews if str(r["id"]) in retry_ids]
)
```

Each succeeded result carries `usage` like any other Message, so you can add up input and output tokens per batch and compare them with your estimate.

## Prompt caching in batches

Batch requests can use `cache_control` like normal requests. Put the shared instructions (a long system prompt, a style guide, few-shot examples) first and mark them as cacheable. Requests in a batch are processed in an order you don't control and partly in parallel, so cache hits are opportunistic rather than guaranteed, but with a large shared prefix they add up. The system prompt in this example is far too short to reach the minimum cacheable length, so it isn't marked.

## Gotchas

- **Keep the batch ID and the input.** The results file only has custom IDs and outputs. Store the batch ID next to the input file so you can always rebuild the mapping.
- **Results expire.** After 29 days the results file is gone. Collect results into your own storage as soon as the batch ends.
- **Size batches for your retry loop.** One batch of 100,000 is convenient, but if it expires you resubmit a lot. Several batches of 10,000 give you results sooner and smaller retries.
- **No streaming and no per-request deadline.** If some requests become urgent halfway through, send them through the normal Messages API instead of waiting for the batch.
- **Batches run with the API version of the request that created them.** If you upgrade the SDK while batches are in flight, results for those batches still follow the version they were created with.

## Further reading

- [Batch processing guide](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
- [Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python)
