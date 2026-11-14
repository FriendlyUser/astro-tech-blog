---
description: How to install the Levenshtein package (formerly python-Levenshtein) and use distance, ratio, Jaro-Winkler and editops to compare strings in Python.
imgSrc: /imgs/2023/3708253319.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-02-08T13:34:49.000Z'
lastUpdated: 2026-11-14
tags:
  - python
title: 'Python Levenshtein: edit distance and string similarity in Python'
---

The Levenshtein distance between two strings is the minimum number of single-character insertions, deletions and substitutions needed to turn one into the other. `kitten` → `sitting` is 3: substitute k→s, substitute e→i, insert g. The `Levenshtein` package computes this (and a few related similarity measures) in C++, so it is much faster than a pure-Python implementation.

:::note
The project used to be published as `python-Levenshtein`. It is now maintained under the [rapidfuzz](https://github.com/rapidfuzz/Levenshtein) organisation as `Levenshtein`; `python-Levenshtein` still exists but is only a wrapper that depends on it. Install `Levenshtein` directly. The import name is `Levenshtein` either way.
:::

## Installation

```bash
pip install Levenshtein
```

Version 0.27.5 (the current release when this was revised) requires Python 3.11 or newer. The package is licensed GPL-2.0-or-later, which matters if you ship it inside proprietary software; [RapidFuzz](https://github.com/rapidfuzz/RapidFuzz), which `Levenshtein` is built on, offers the same metrics under the MIT licence.

## Distance

```python
import Levenshtein

print(Levenshtein.distance("kitten", "sitting"))  # 3
```

`distance` also takes a `score_cutoff`. If the real distance is larger than the cutoff, it returns `score_cutoff + 1` and can stop early, which helps when you only care about "close enough" matches:

```python
print(Levenshtein.distance("kitten", "sitting", score_cutoff=2))  # 3, i.e. "more than 2"
```

## Ratio and Jaro-Winkler

Raw distances are hard to compare across strings of different lengths, so the package also gives normalised scores between 0 and 1:

```python
import Levenshtein

a, b = "Python", "Pythin"

print(Levenshtein.distance(a, b))      # 1
print(Levenshtein.ratio(a, b))         # 0.8333333333333334
print(Levenshtein.jaro(a, b))          # 0.888888888888889
print(Levenshtein.jaro_winkler(a, b))  # 0.9333333333333333
```

- `ratio` is `1 - indel_distance / (len(a) + len(b))`, where the indel distance only allows insertions and deletions (a substitution counts as two edits). Here that is 1 − 2/12.
- `jaro` counts matching characters within a sliding window and penalises transpositions.
- `jaro_winkler` boosts the Jaro score when the strings share a prefix (up to 4 characters). `Python` and `Pythin` share `Pyth`, so the score rises from 0.889 to 0.933. It works well for short strings such as names.

## Seeing the edits

`editops` and `opcodes` tell you *which* edits make up the distance, which is useful for highlighting differences:

```python
from Levenshtein import opcodes

for op in opcodes("kitten", "sitting"):
    print(op)
```

```text
('replace', 0, 1, 0, 1)
('equal', 1, 4, 1, 4)
('replace', 4, 5, 4, 5)
('equal', 5, 6, 5, 6)
('insert', 6, 6, 6, 7)
```

Each tuple is `(tag, a_start, a_end, b_start, b_end)`, the same format as `difflib.SequenceMatcher.get_opcodes()`.

## A small spelling suggester

```python
from Levenshtein import distance

words = ["apple", "apply", "ample", "maple", "angle"]
typo = "appel"

ranked = sorted(words, key=lambda w: distance(typo, w))
print(ranked[:3])  # ['apple', 'apply', 'ample']
```

This compares the typo against every word, which is fine for a few thousand entries. For large dictionaries or fuzzy matching across big datasets, use `rapidfuzz.process.extract`, which batches the comparisons and supports cutoffs, or an index such as a BK-tree.

## Gotchas

- Comparisons are case- and whitespace-sensitive. Normalise first (`.lower()`, `.strip()`, Unicode normalisation) if that is not what you want.
- Edit distance measures spelling, not meaning. "car" and "automobile" are far apart.
- `Levenshtein.ratio` returns 0–1. The `fuzz.ratio` in `thefuzz`/`rapidfuzz` uses the same indel-based measure but scales it to 0–100, so don't mix thresholds between the two.

## Further reading

- [Levenshtein documentation](https://rapidfuzz.github.io/Levenshtein/)
- [Levenshtein on PyPI](https://pypi.org/project/Levenshtein/)
- [RapidFuzz documentation](https://rapidfuzz.github.io/RapidFuzz/)
