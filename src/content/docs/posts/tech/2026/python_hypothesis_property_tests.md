---
title: "Property-based testing in Python with Hypothesis"
description: "Property-based tests with Hypothesis and pytest: strategies, @given, a real bug in a run-length encoder, shrinking, @example, settings and the example database."
tags: ["Python", "Testing", "Hypothesis", "pytest", "Property-Based Testing"]
pubDate: "2026-08-01T16:00:00.000Z"
imgSrc: "/imgs/2026/python_hypothesis_property_tests.webp"
imgAlt: "A funnel shrinking random failing strings down to the minimal failing input text='01'"
---

An example-based test checks that one input gives one expected output. A property-based test states something that should hold for **every** input, such as "decoding what I encoded gives back the original", and lets a library generate the inputs. Hypothesis is the standard library for this in Python. It generates hundreds of inputs per test, deliberately tries awkward ones (empty strings, unusual Unicode, boundary integers), and when it finds a failure it shrinks the input to the smallest one that still fails.

This post finds a real bug in a small run-length encoder, then covers strategies, shrinking, `@example`, settings and the example database. Examples were run with Hypothesis 6.164 and pytest 9.1 on Python 3.12. For pytest basics, see [Getting started with pytest](/posts/tech/2023/A_Comprehensive_Guide_to_Pytest_in_Python/).

## A function with a bug in it

Run-length encoding replaces runs of a repeated character with a count: `"aaab"` becomes `"3a1b"`. Here is a straightforward implementation:

```python
# rle.py
import re


def encode(text: str) -> str:
    """Run-length encode: 'aaab' -> '3a1b'."""
    if not text:
        return ""
    out = []
    current, count = text[0], 1
    for ch in text[1:]:
        if ch == current:
            count += 1
        else:
            out.append(f"{count}{current}")
            current, count = ch, 1
    out.append(f"{count}{current}")
    return "".join(out)


def decode(encoded: str) -> str:
    return "".join(ch * int(n) for n, ch in re.findall(r"(\d+)(.)", encoded, flags=re.DOTALL))
```

And the example-based tests anyone would write first, which pass:

```python
def test_examples():
    assert encode("aaab") == "3a1b"
    assert decode("3a1b") == "aaab"
    assert encode("") == ""
```

## The property

The obvious property of any encoder is the round trip: for every string, `decode(encode(text)) == text`. With Hypothesis, that is the whole test:

```python
# test_rle.py
from hypothesis import given, strategies as st

from rle import decode, encode


@given(st.text())
def test_round_trip(text):
    assert decode(encode(text)) == text
```

Install and run:

```bash
pip install hypothesis pytest
pytest -q test_rle.py
```

```text
.F                                                                       [100%]
...
text = '01'

    @given(st.text())
    def test_round_trip(text):
>       assert decode(encode(text)) == text
E       AssertionError: assert '111111111111...1111111111111' == '01'
E
E         - 01
E         + 11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111
E       Failing test case: test_round_trip(
E           text='01',
E       )
```

The failing input is `"01"`. `encode("01")` produces `"1011"`: one `0`, then one `1`. But `decode` cannot tell where a count ends and a digit character begins, and the greedy `\d+` reads `"101"` as the count, giving 101 copies of `"1"`. The encoded format is ambiguous for any input containing digits. None of the hand-written examples had a digit in them, and that is the point: you test the inputs you think of, and Hypothesis tests the ones you didn't.

### Shrinking

Whatever failing string Hypothesis generated first, it then **shrank** it: it tried removing characters, replacing them with simpler ones, and shortening the input, keeping each change that still failed, until nothing smaller failed. What you get is close to a minimal reproduction, which is usually the most valuable part of the report. A 40-character string of random Unicode that fails is a puzzle; `"01"` explains itself.

Interestingly `"0"` alone does not fail: `encode("0")` is `"10"`, and the regex backtracks to read it correctly. Shrinking found the smallest input that actually breaks, not just the first one you might guess.

## Fixing it, and pinning the failure with `@example`

The fix is to stop squeezing structure into a string. Return the runs as a list of `(count, char)` pairs:

```python
# rle.py
def encode(text: str) -> list[tuple[int, str]]:
    """Run-length encode: 'aaab' -> [(3, 'a'), (1, 'b')]."""
    runs: list[tuple[int, str]] = []
    for ch in text:
        if runs and runs[-1][1] == ch:
            runs[-1] = (runs[-1][0] + 1, ch)
        else:
            runs.append((1, ch))
    return runs


def decode(runs: list[tuple[int, str]]) -> str:
    return "".join(ch * n for n, ch in runs)
```

Then add the failing input as an explicit example, so it runs every time regardless of what Hypothesis generates:

```python
from hypothesis import example, given, strategies as st


@given(st.text())
@example("01")  # the input that broke the string-based version
def test_round_trip(text):
    assert decode(encode(text)) == text
```

`@example` inputs are tried first, before any generated ones. Use it for regressions and for edge cases you want to document in the test itself.

## More properties

A round trip is the first property to try, but rarely the only one. Good properties often fall into a few shapes:

- **Round trip:** `decode(encode(x)) == x`, `loads(dumps(x)) == x`, `parse(format(x)) == x`.
- **Invariants of the output:** a sorted list has the same length and items as the input; every chunk is at most `n` long.
- **Comparison with a simple reference implementation:** your fast version agrees with an obvious slow one.
- **Idempotence:** `normalise(normalise(x)) == normalise(x)`.

For the encoder, the output should have no empty runs and no two neighbouring runs with the same character:

```python
@given(st.text())
def test_runs_are_maximal(text):
    runs = encode(text)
    assert all(n > 0 for n, _ in runs)
    assert all(a[1] != b[1] for a, b in zip(runs, runs[1:]))
```

And going the other way, decoding any list of runs and re-encoding it must preserve the total length, even when neighbouring runs share a character and get merged:

```python
@given(st.lists(st.tuples(st.integers(1, 5), st.characters()), max_size=20))
def test_decode_then_encode_keeps_length(runs):
    text = decode(runs)
    assert sum(n for n, _ in encode(text)) == len(text)
```

## Strategies

A strategy describes how to generate values. The common ones are in `hypothesis.strategies`, usually imported as `st`:

- Scalars: `st.integers(min_value, max_value)`, `st.floats(allow_nan=False)`, `st.text(alphabet, min_size, max_size)`, `st.booleans()`, `st.dates()`.
- Collections: `st.lists(elements, min_size, max_size, unique=True)`, `st.tuples(...)`, `st.dictionaries(keys, values)`, `st.sets(...)`.
- Choices: `st.sampled_from(["GET", "POST"])`, `st.one_of(a, b)`, `st.none() | st.integers()`.

You build richer data by combining them. `st.builds` calls a class or function with generated arguments, `.map` transforms values, and `@st.composite` lets one drawn value depend on another:

```python
from dataclasses import dataclass
from datetime import date

from hypothesis import given, strategies as st


@dataclass
class Booking:
    guest: str
    check_in: date
    nights: int


bookings = st.builds(
    Booking,
    guest=st.text(min_size=1, max_size=30),
    check_in=st.dates(min_value=date(2026, 1, 1), max_value=date(2027, 12, 31)),
    nights=st.integers(min_value=1, max_value=30),
)


@st.composite
def date_ranges(draw):
    start = draw(st.dates(min_value=date(2026, 1, 1), max_value=date(2026, 12, 31)))
    end = draw(st.dates(min_value=start, max_value=date(2026, 12, 31)))
    return start, end


even_numbers = st.integers().map(lambda n: n * 2)
```

Prefer constructing valid data over filtering. `st.integers().filter(lambda n: n % 2 == 0)` works, but if a filter rejects most values Hypothesis spends its time discarding inputs and eventually fails a health check. `.map(lambda n: n * 2)` produces only valid values.

## Settings

`@settings` adjusts how a test runs:

```python
from hypothesis import given, settings, strategies as st


@settings(max_examples=1000)
@given(st.text(alphabet="ab", max_size=50))
def test_two_letter_alphabet(text):
    assert decode(encode(text)) == text
```

The ones you will touch most:

- `max_examples` (default 100): how many inputs to try. Raise it for important code or in a nightly run.
- `deadline` (default 200 ms): a single example taking longer than this fails the test. Set `deadline=None` for tests that are legitimately slow, such as ones touching a database.
- `suppress_health_check`: silences specific health checks, for example when a fixture makes data generation slow on purpose.

Rather than decorating every test, register **profiles** in `conftest.py` and pick one per environment:

```python
# conftest.py
import os

from hypothesis import settings

settings.register_profile("ci", max_examples=1000)
settings.register_profile("dev", max_examples=50)
settings.load_profile(os.getenv("HYPOTHESIS_PROFILE", "default"))
```

The pytest plugin, installed with Hypothesis, also takes `--hypothesis-profile=ci` on the command line, and `--hypothesis-show-statistics` prints how many examples each test ran and why it stopped:

```text
test_rle.py::test_two_letter_alphabet:

  - during generate phase (0.56 seconds):
    - Typical runtimes: < 1ms, of which < 1ms in data generation
    - 1000 passing, 0 failing, and 0 invalid test cases

  - Stopped because settings.max_examples=1000
```

## The example database

When a test fails, Hypothesis saves the failing input in a local database, by default in a `.hypothesis/` directory next to where you run pytest. On the next run, saved failures are replayed first, so a bug you are fixing reproduces immediately instead of depending on random generation finding it again.

Add `.hypothesis/` to `.gitignore`. It is a cache, not something to commit. In CI, either let it start empty each run, or cache the directory between runs so failures found on one build are retried on the next. For a failure you want to keep forever, copy the input into an `@example`.

Hypothesis is deterministic enough to debug: `--hypothesis-seed=1234` fixes the random seed for a run.

## When it is not the right tool

- **When you cannot state a property.** If the only way to say what the right answer is would be to reimplement the function, start with example tests and look for partial properties (output length, types, invariants) instead.
- **For slow tests.** A hundred examples of a test that takes a second each is a hundred seconds. Keep property tests on pure, fast code, and reduce `max_examples` for anything heavier.
- **As a replacement for example tests.** Keep a few readable examples that document the behaviour; add properties alongside them to find the cases nobody wrote down.

## Further reading

- [Hypothesis documentation](https://hypothesis.readthedocs.io/en/latest/)
- [What you can generate and how (strategies reference)](https://hypothesis.readthedocs.io/en/latest/reference/strategies.html)
- [Hypothesis on GitHub](https://github.com/HypothesisWorks/hypothesis)
