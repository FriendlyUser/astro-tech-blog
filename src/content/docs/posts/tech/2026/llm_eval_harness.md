---
title: "A small eval runner for LLM features in Python"
description: "Build a 160-line eval runner for an LLM feature: JSONL test cases, exact, regex and LLM-as-judge graders, concurrent runs and scores tracked per prompt version."
tags: ["LLM", "Evals", "Claude", "Python", "asyncio", "Testing"]
pubDate: "2026-03-28T16:00:00.000Z"
imgSrc: "/imgs/2026/llm_eval_harness.webp"
imgAlt: "A scoreboard comparing prompt v1 and v2 across exact, regex and judge graders, with bars for each pass rate"
---

Changing a prompt is changing code, but most LLM features ship without the equivalent of a test suite. Someone edits the system prompt, tries three examples in a playground, and merges. Two weeks later a different kind of input breaks, and nobody can tell whether the last edit made things better or worse overall.

An eval runner fixes that. It runs a fixed set of inputs through the feature, grades every output, and records the score next to the prompt version that produced it. You don't need a platform for this. The runner in this post is about 160 lines of Python with the `anthropic` SDK and SQLite, and it covers the parts that matter: test cases in JSONL, three kinds of graders, concurrent requests, and a history you can compare. Examples use Python 3.12, `anthropic` 0.86, `claude-haiku-4-5` as the feature's model and `claude-sonnet-4-5` as the judge.

## The feature under test

The example is a support triage step. It reads a customer email and returns a category and a draft reply in a fixed format:

```text
CATEGORY: billing
REPLY: Sorry about the double charge on order ORD-104233. ...
```

The prompt lives in a file, one file per version, so a prompt change is a diff you can review and a file you can run evals against:

```text
# prompts/triage_v1.txt
You triage customer support emails.
Reply in exactly this format:
CATEGORY: one of billing, technical, account
REPLY: a short reply to the customer
```

```text
# prompts/triage_v2.txt
You triage customer support emails for a home networking company.
Reply in exactly this format, with nothing before or after:
CATEGORY: one of billing, technical, account
REPLY: a reply to the customer, under 80 words

Rules for the reply:
- If the email mentions an order number, repeat it.
- Refunds take 5-7 business days. Never promise a different timeline.
- Never offer discounts or upgrades.
```

(The `#` lines are labels for this post, not part of the files.)

## Golden cases in JSONL

Each line of `cases.jsonl` is one input with a list of checks. JSONL keeps every case on one line, which makes diffs readable and lets you append cases from production logs with a one-line script:

```json
{"id": "refund-01", "input": "I was charged twice for order ORD-104233. Please fix this.", "checks": [{"type": "exact", "field": "CATEGORY", "expected": "billing"}, {"type": "regex", "field": "REPLY", "pattern": "ORD-104233"}, {"type": "judge", "rubric": "Apologises, says the duplicate charge will be refunded, and if it gives a refund timeline, the timeline is 5-7 business days."}]}
{"id": "wifi-01", "input": "My router keeps dropping the 5 GHz network every evening.", "checks": [{"type": "exact", "field": "CATEGORY", "expected": "technical"}, {"type": "judge", "rubric": "Suggests at least one concrete troubleshooting step and does not ask for an order number."}]}
{"id": "cancel-01", "input": "Third time asking. Cancel my account NOW.", "checks": [{"type": "exact", "field": "CATEGORY", "expected": "account"}, {"type": "regex", "field": "REPLY", "pattern": "(?i)cancel"}, {"type": "judge", "rubric": "Calm and short (under 80 words), confirms the cancellation request, does not offer discounts or upgrades."}]}
```

Three cases are enough to build the runner. They are nowhere near enough to make decisions with; more on that below.

Where cases come from matters more than how many you have. Good sources: real inputs that went wrong (with personal data removed), inputs that support or product people say are tricky, and edge cases you write deliberately (empty emails, two problems in one email, another language). Avoid only writing cases that the current prompt already handles. That just measures the status quo.

## Three graders, cheapest first

Use the cheapest grader that can answer the question:

- **Exact match** for fields with one correct answer: a category, a label, a number.
- **Regex** for "must contain" or "must not contain" rules: an order number, a URL format, a forbidden phrase.
- **LLM-as-judge** for things only a reader can assess: tone, whether the reply addresses the actual problem, whether it follows a policy written in prose.

Exact and regex graders are free, fast and deterministic. A judge costs a model call per check and is itself a model that can be wrong. Push as much as you can into the first two.

## The runner

Install the SDK and set your key, then save this as `evals.py` next to `cases.jsonl` and the `prompts/` folder:

```bash
pip install anthropic
export ANTHROPIC_API_KEY=...
```

```python
"""A small eval runner. Usage: python evals.py prompts/triage_v2.txt"""
import asyncio
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

import anthropic
from anthropic.types import ToolParam

APP_MODEL = os.environ.get("APP_MODEL", "claude-haiku-4-5")
JUDGE_MODEL = os.environ.get("JUDGE_MODEL", "claude-sonnet-4-5")
CONCURRENCY = 8

client = anthropic.AsyncAnthropic()
limit = asyncio.Semaphore(CONCURRENCY)


# --- the feature under test ---------------------------------------------------

async def run_feature(system_prompt: str, email: str) -> str:
    async with limit:
        response = await client.messages.create(
            model=APP_MODEL,
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": email}],
        )
    return "".join(b.text for b in response.content if b.type == "text")


def field(output: str, name: str) -> str:
    """Return the text after 'NAME:' up to the next 'OTHER:' line."""
    match = re.search(rf"^{name}:\s*(.*?)(?=^[A-Z]+:|\Z)", output, re.M | re.S)
    return match.group(1).strip() if match else ""


# --- graders --------------------------------------------------------------------

def grade_exact(check: dict, output: str) -> tuple[bool, str]:
    got = field(output, check["field"]).lower()
    return got == check["expected"], f"got {got!r}"


def grade_regex(check: dict, output: str) -> tuple[bool, str]:
    text = field(output, check["field"]) if "field" in check else output
    found = re.search(check["pattern"], text) is not None
    return found, "" if found else f"no match for {check['pattern']!r}"


JUDGE_TOOL: ToolParam = {
    "name": "record_grade",
    "description": "Record whether the reply meets every point of the rubric.",
    "input_schema": {
        "type": "object",
        "properties": {
            "reasoning": {"type": "string", "description": "Check each rubric point in turn."},
            "verdict": {"type": "string", "enum": ["pass", "fail"]},
        },
        "required": ["reasoning", "verdict"],
    },
}

JUDGE_SYSTEM = (
    "You grade replies written by a customer support assistant. "
    "Judge only against the rubric. Length, tone and style matter only if the rubric "
    "mentions them. If any rubric point is not met, the verdict is fail."
)


async def grade_judge(check: dict, output: str, email: str) -> tuple[bool, str]:
    prompt = (
        f"<email>\n{email}\n</email>\n\n"
        f"<reply>\n{field(output, 'REPLY')}\n</reply>\n\n"
        f"<rubric>\n{check['rubric']}\n</rubric>"
    )
    async with limit:
        response = await client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=1024,
            temperature=0,
            system=JUDGE_SYSTEM,
            tools=[JUDGE_TOOL],
            tool_choice={"type": "tool", "name": "record_grade"},
            messages=[{"role": "user", "content": prompt}],
        )
    grade = next(b.input for b in response.content if b.type == "tool_use")
    return grade["verdict"] == "pass", str(grade["reasoning"])


async def grade(check: dict, output: str, email: str) -> tuple[bool, str]:
    if check["type"] == "exact":
        return grade_exact(check, output)
    if check["type"] == "regex":
        return grade_regex(check, output)
    if check["type"] == "judge":
        return await grade_judge(check, output, email)
    raise ValueError(f"unknown check type {check['type']!r}")


# --- running and storing ----------------------------------------------------------

async def eval_case(system_prompt: str, case: dict) -> list[dict]:
    grades: list[tuple[bool | None, str]]
    try:
        output = await run_feature(system_prompt, case["input"])
        grades = list(await asyncio.gather(
            *(grade(c, output, case["input"]) for c in case["checks"])
        ))
    except anthropic.APIError as err:
        # Record infrastructure failures as "not scored", never as a fail.
        output, grades = "", [(None, f"API error: {err}")] * len(case["checks"])
    return [
        {"case": case["id"], "check": i, "grader": c["type"],
         "passed": ok, "detail": detail, "output": output}
        for i, (c, (ok, detail)) in enumerate(zip(case["checks"], grades))
    ]


def open_db(path: str = "evals.db") -> sqlite3.Connection:
    db = sqlite3.connect(path)
    db.execute("""CREATE TABLE IF NOT EXISTS results (
        run_id TEXT, prompt TEXT, prompt_hash TEXT, app_model TEXT, judge_model TEXT,
        case_id TEXT, check_idx INTEGER, grader TEXT, passed INTEGER,
        detail TEXT, output TEXT)""")
    return db


async def main(prompt_path: str, cases_path: str = "cases.jsonl") -> None:
    system_prompt = Path(prompt_path).read_text(encoding="utf-8")
    prompt_hash = hashlib.sha256(system_prompt.encode()).hexdigest()[:8]
    lines = Path(cases_path).read_text(encoding="utf-8").splitlines()
    cases = [json.loads(line) for line in lines if line.strip()]
    run_id = time.strftime("%Y%m%d-%H%M%S")

    per_case = await asyncio.gather(*(eval_case(system_prompt, c) for c in cases))
    rows = [row for case_rows in per_case for row in case_rows]

    db = open_db()
    with db:
        db.executemany(
            "INSERT INTO results VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            [(run_id, Path(prompt_path).name, prompt_hash, APP_MODEL, JUDGE_MODEL,
              r["case"], r["check"], r["grader"], r["passed"], r["detail"], r["output"])
             for r in rows],
        )

    for r in rows:
        if r["passed"] is not True:
            print(f"FAIL {r['case']} [{r['grader']}] {r['detail'][:120]}")
    print(f"\nrun {run_id}: {Path(prompt_path).name} ({prompt_hash}) on {APP_MODEL}")
    for grader in ("exact", "regex", "judge"):
        scored = [r for r in rows if r["grader"] == grader and r["passed"] is not None]
        if scored:
            print(f"  {grader:6} {sum(r['passed'] for r in scored)}/{len(scored)}")


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
```

Run it once per prompt version:

```bash
python evals.py prompts/triage_v1.txt
python evals.py prompts/triage_v2.txt
```

Each run prints the failing checks with the reason (the exact grader's `got 'technical'`, the regex that didn't match, or the judge's reasoning), then a pass count per grader.

### How the concurrency works

Every case and every judge call is a coroutine, and `asyncio.gather` starts them all at once. The shared `asyncio.Semaphore` caps how many requests are actually in flight. Without it, a 500-case suite fires 500 requests at once and spends most of its time on rate-limit retries. The SDK retries 429 and 5xx responses twice by default with backoff, so a semaphore sized under your rate limit plus the built-in retries is usually enough.

Note what happens when a call still fails: the case is stored with `passed = NULL`, not as a failure. An outage during an eval run should show up as missing data, not as a prompt regression.

## Tracking scores across prompt versions

Every row in `evals.db` carries the prompt file name, a hash of its contents and the models used. The hash matters: if someone edits `triage_v2.txt` in place, its results get a new hash instead of silently mixing with the old ones.

A short report script compares the latest run of each version:

```python
"""Compare the latest run of each prompt version. Usage: python report.py"""
import sqlite3

db = sqlite3.connect("evals.db")
rows = db.execute("""
    SELECT prompt, prompt_hash, app_model, grader,
           SUM(passed), COUNT(passed), MAX(run_id) AS last_run
    FROM results
    WHERE run_id IN (SELECT MAX(run_id) FROM results GROUP BY prompt_hash, app_model)
    GROUP BY prompt_hash, app_model, grader
    ORDER BY last_run, grader
""").fetchall()

print(f"{'prompt':16} {'hash':8} {'model':16} {'grader':6} score")
for prompt, h, model, grader, passed, scored, _ in rows:
    print(f"{prompt:16} {h:8} {model:16} {grader:6} {passed}/{scored} ({passed / scored:.0%})")
```

`COUNT(passed)` skips the `NULL` rows, so unscored checks don't count against a version. The per-grader split is the useful part. If v2 improves judge scores but drops exact-match scores, the new prompt is producing better replies and breaking the format, and you want to see both.

Aggregate scores hide which cases changed. When two versions score the same, query the cases that flipped from pass to fail and read those outputs. That is where you learn what a prompt change really did.

## Keeping the judge honest

An LLM judge is a second model with its own biases, and its scores are only as good as its agreement with a careful human. Known problems and what the runner does about them:

- **Vague rubrics give noisy verdicts.** "Is this a good reply?" invites the judge's own taste. Each rubric here lists checkable points ("confirms the cancellation request, does not offer discounts"), and the verdict is binary. Pass/fail on specific criteria is far more stable than a 1-10 score.
- **Verbosity and style bias.** Judges tend to favour longer, more polished answers. The system prompt tells the judge to ignore length and tone unless the rubric names them.
- **Reasoning after the verdict is rationalisation.** The tool schema puts `reasoning` before `verdict`, and the field description asks for a point-by-point check. The judge writes its analysis first and decides second.
- **Leaking the answer.** The judge sees the email, the reply and the rubric. It does not see the prompt version, the other version's output, or which run it belongs to.
- **Self-preference.** A model grading its own outputs may rate them more kindly. Here the feature runs on Haiku and the judge on Sonnet. If you can, use a different, stronger model as the judge than the one under test.
- **Position bias in pairwise comparisons.** If you extend this to "is A or B better?", run each pair twice with the order swapped and only count consistent verdicts.

Then measure the judge itself. Label 30 to 50 judge checks by hand, put them in `labels.jsonl`, and compare:

```python
"""How often does the judge agree with you? Usage: python agreement.py <run_id>"""
import json
import sqlite3
import sys
from pathlib import Path

run_id = sys.argv[1]
# One line per hand-labelled check: {"case": "refund-01", "check": 2, "pass": true}
labels = [json.loads(line) for line in Path("labels.jsonl").read_text().splitlines() if line.strip()]

db = sqlite3.connect("evals.db")
both = disagree = 0
for label in labels:
    row = db.execute(
        "SELECT passed, detail FROM results WHERE run_id=? AND case_id=? AND check_idx=? AND grader='judge'",
        (run_id, label["case"], label["check"]),
    ).fetchone()
    if row is None or row[0] is None:
        continue
    both += 1
    if bool(row[0]) != label["pass"]:
        disagree += 1
        print(f"{label['case']}#{label['check']}: you={label['pass']} judge={bool(row[0])}: {row[1][:100]}")

if both:
    print(f"agreement {both - disagree}/{both} ({(both - disagree) / both:.0%})")
```

Read every disagreement. Usually the fix is in the rubric (it was ambiguous, and the judge read it differently from you), not in the judge prompt. Re-check agreement whenever you change the judge model or the judge prompt, and keep the judge model fixed while you compare prompt versions, or you are measuring two changes at once.

## Gotchas

- **Small suites are noisy.** With 20 cases, one case is 5 points. Model outputs also vary between runs. Before believing a 3-point difference, run the same version twice and see how much the score moves on its own. Grow the suite until a real change stands out from that noise.
- **Don't tune on the whole suite.** If you rewrite the prompt until every case passes, you have fitted the prompt to the cases. Keep a held-out set of cases you only run before shipping.
- **Pin what you can.** Record the model IDs with every run (the runner does). A model upgrade is a change to evaluate like any prompt change.
- **Judge calls cost money.** Exact and regex checks are free, so run them on every commit. Run the judge checks on demand or nightly.
- **Look at outputs, not just numbers.** The score tells you where to look. The outputs tell you what's wrong.

## Further reading

- [Define success criteria and build evaluations](https://platform.claude.com/docs/en/test-and-evaluate/develop-tests) in the Claude docs
- [asyncio synchronization primitives](https://docs.python.org/3/library/asyncio-sync.html), for `Semaphore`
- [anthropic-sdk-python](https://github.com/anthropics/anthropic-sdk-python), including retry and timeout settings
