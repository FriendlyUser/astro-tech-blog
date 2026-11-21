---
title: "Improving search results with a cross-encoder reranker"
description: "Add a cross-encoder reranking step to embedding or BM25 retrieval with sentence-transformers, measure what it gains on real queries, and what it costs in latency."
tags: ["Reranking", "Semantic Search", "Sentence Transformers", "RAG", "LLM", "Python"]
pubDate: "2026-11-25T16:00:00.000Z"
imgSrc: "/imgs/2026/reranking_search_results.webp"
imgAlt: "A funnel diagram: BM25 and embedding search feed fifty candidates into a cross-encoder that outputs a reordered top five"
---

Most semantic search and RAG pipelines retrieve with a bi-encoder: documents and queries are embedded separately, and the closest vectors win. It's fast because document vectors are computed once, ahead of time. A cross-encoder reranker adds a second stage: take the top 50 or so candidates and score each one against the query with a model that reads both texts together. It's much slower per document, and usually more accurate, so you only run it on a short list.

This post explains the difference between the two kinds of model, builds a retrieve-then-rerank pipeline with sentence-transformers and `cross-encoder/ms-marco-MiniLM-L6-v2`, adds BM25 for a hybrid first stage, and measures both the quality gain and the latency cost on a set of test questions. Examples use Python 3.12 and sentence-transformers 6.3, running on CPU.

## Bi-encoders and cross-encoders

A **bi-encoder** turns each text into a vector on its own. The query never sees the document; similarity is a dot product between two vectors that were computed independently. That's why it scales: you embed a million documents once, store the vectors (in pgvector, a vector database or a numpy array), and each search costs one query embedding plus a nearest-neighbour lookup.

The price is that a whole passage has to be squeezed into one fixed vector before anyone knows what the question will be. Fine distinctions get lost: "how do I *avoid* X" and "how do I do X" can land close together, and a passage that mentions the right words in passing can outrank one that answers the question.

A **cross-encoder** takes the query and one document as a single input, `[CLS] query [SEP] document [SEP]`, and outputs one relevance score. Every layer of the transformer can compare query words with document words directly, which is why cross-encoders are better judges of relevance. But nothing can be precomputed: scoring 50 candidates means 50 forward passes through the model, at query time.

So the usual design is a funnel:

1. **Retrieve** a generous candidate list (say 50) with something cheap: a bi-encoder, BM25, or both.
2. **Rerank** those candidates with the cross-encoder.
3. **Keep** the top few (say 5) for display or for the LLM prompt.

The reranker can only reorder what the first stage found. If the right document isn't in the top 50, reranking can't recover it; that's why recall at the first stage matters more than precision.

## The test setup

To measure anything you need queries with known answers. The corpus here is 18 chapters of [The Rust Programming Language](https://doc.rust-lang.org/book/) (variables and types through error handling), which is Markdown with a clear heading structure. Each of 20 questions, written the way a user might type them, is paired with the section (or sections) that answers it.

```bash
mkdir book
for f in ch03-01-variables-and-mutability ch03-02-data-types ch03-03-how-functions-work \
         ch03-05-control-flow ch04-01-what-is-ownership ch04-02-references-and-borrowing \
         ch04-03-slices ch05-01-defining-structs ch05-03-method-syntax ch06-01-defining-an-enum \
         ch06-02-match ch06-03-if-let ch08-01-vectors ch08-02-strings ch08-03-hash-maps \
         ch09-01-unrecoverable-errors-with-panic ch09-02-recoverable-errors-with-result \
         ch09-03-to-panic-or-not-to-panic; do
  curl -sSo "book/$f.md" "https://raw.githubusercontent.com/rust-lang/book/main/src/$f.md"
done
pip install sentence-transformers rank_bm25
```

## The pipeline

The script chunks the chapters by heading, builds a bi-encoder index and a BM25 index over the same chunks, and compares five ways of producing a top 10:

```python
# rerank_demo.py: BM25, bi-encoder, hybrid and cross-encoder reranking on the same queries
import os
import re
import time
from pathlib import Path

import numpy as np
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

bi_encoder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
reranker = CrossEncoder(os.environ.get("RERANKER", "cross-encoder/ms-marco-MiniLM-L6-v2"))
tok = bi_encoder.tokenizer
ntokens = lambda s: len(tok(s, add_special_tokens=False)["input_ids"])

HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


def clean(md: str) -> str:
    md = re.sub(r"^\{\{#.*\}\}$", "", md, flags=re.M)  # mdBook include directives
    return re.sub(r"<[^>]+>", "", md)  # HTML tags (figures, anchors, captions)


def chunk_markdown(md: str, max_tokens: int = 200) -> list[tuple[str, str]]:
    """Split at headings, then pack paragraphs into chunks of about max_tokens.
    Returns (section heading, chunk text) pairs; the text starts with the heading path."""
    out, path, levels, paragraphs = [], [], [], []

    def flush():
        current = ""
        for para in paragraphs:
            if current and ntokens(current + para) > max_tokens:
                out.append((path[-1] if path else "", " > ".join(path) + "\n\n" + current))
                current = ""
            current += para + "\n\n"
        if current.strip():
            out.append((path[-1] if path else "", " > ".join(path) + "\n\n" + current))
        paragraphs.clear()

    in_fence = False
    for block in clean(md).split("\n\n"):
        heading = None if in_fence else HEADING.match(block.strip())
        in_fence ^= block.count("```") % 2 == 1  # a block that opens or closes a code fence
        if heading:
            flush()
            level = len(heading.group(1))
            while levels and levels[-1] >= level:
                levels.pop()
                path.pop()
            levels.append(level)
            path.append(heading.group(2).strip().replace("’", "'"))
        elif block.strip():
            paragraphs.append(block.strip())
    flush()
    return out


# --- index: the Rust book chapters in ./book, chunked, embedded and indexed for BM25
chunks = [c for p in sorted(Path("book").glob("*.md")) for c in chunk_markdown(p.read_text(encoding="utf-8"))]
sections = [section for section, _ in chunks]
texts = [text for _, text in chunks]
doc_emb = bi_encoder.encode(texts, normalize_embeddings=True, batch_size=64)
words = lambda s: re.findall(r"\w+", s.lower())
bm25 = BM25Okapi([words(t) for t in texts])
print(f"{len(chunks)} chunks")


def dense_search(query: str, k: int) -> list[int]:
    q = bi_encoder.encode(query, normalize_embeddings=True)
    return list(np.argsort(-(doc_emb @ q))[:k])


def bm25_search(query: str, k: int) -> list[int]:
    return list(np.argsort(-bm25.get_scores(words(query)))[:k])


def hybrid_search(query: str, k: int, pool: int = 50, c: int = 60) -> list[int]:
    """Reciprocal rank fusion: score = sum of 1 / (c + rank) over both result lists."""
    scores: dict[int, float] = {}
    for ranking in (dense_search(query, pool), bm25_search(query, pool)):
        for rank, idx in enumerate(ranking):
            scores[idx] = scores.get(idx, 0.0) + 1 / (c + rank + 1)
    return sorted(scores, key=scores.get, reverse=True)[:k]


def rerank(query: str, candidates: list[int], k: int) -> list[int]:
    ranked = reranker.rank(query, [texts[i] for i in candidates], top_k=k, batch_size=64)
    return [candidates[r["corpus_id"]] for r in ranked]


# --- evaluation: questions phrased like a user, and the section(s) that answer them
EVAL = [
    ("how do I let a variable change after it is declared", {"Variables and Mutability"}),
    ("reuse a variable name with a different type", {"Shadowing"}),
    ("difference between a constant and an immutable variable", {"Declaring Constants"}),
    ("what happens when a u8 goes past 255 in a release build", {"Integer Types"}),
    ("break out of an outer loop from inside a nested loop", {"Disambiguating with Loop Labels"}),
    ("return a value from a loop", {"Returning Values from Loops"}),
    ("why can't I use a value after assigning it to another variable",
     {"Variables and Data Interacting with Move"}),
    ("copy a struct but change one field", {"Creating Instances with Struct Update Syntax"}),
    ("can a struct have no fields at all", {"Defining Unit-Like Structs"}),
    ("functions in an impl block that don't take self", {"Associated Functions"}),
    ("why doesn't rust have null", {"The `Option` Enum"}),
    ("do I have to handle every enum variant in a match",
     {"Matches Are Exhaustive", "Catch-All Patterns and the `_` Placeholder"}),
    ("put values of different types in one vector", {"Using an Enum to Store Multiple Types"}),
    ("why can't I write s[0] to get the first character of a String",
     {"Indexing into Strings", "Internal Representation", "Bytes, Scalar Values, and Grapheme Clusters"}),
    ("count how many times each word appears in some text", {"Updating a Value Based on the Old Value"}),
    ("insert into a map only if the key is missing", {"Adding a Key and Value Only If a Key Isn't Present"}),
    ("is the default HashMap hasher the fastest option", {"Hashing Functions"}),
    ("get a stack trace when my program crashes", {"Unrecoverable Errors with `panic!`"}),
    ("pass an error up to the calling function without a match",
     {"Propagating Errors", "The `?` Operator Shortcut"}),
    ("is it ok to use unwrap in quick prototypes", {"Examples, Prototype Code, and Tests"}),
]
relevant = [{i for i, s in enumerate(sections) if s in wanted} for _, wanted in EVAL]
assert all(relevant), "every question needs at least one relevant chunk"

methods = {
    "BM25": lambda q: bm25_search(q, 10),
    "bi-encoder": lambda q: dense_search(q, 10),
    "hybrid (RRF)": lambda q: hybrid_search(q, 10),
    "bi-encoder top 50 + rerank": lambda q: rerank(q, dense_search(q, 50), 10),
    "hybrid top 50 + rerank": lambda q: rerank(q, hybrid_search(q, 50), 10),
}
for name, search in methods.items():
    hit1 = hit5 = mrr = 0.0
    start = time.perf_counter()
    for (query, _), rel in zip(EVAL, relevant):
        ranked = search(query)
        first = next((r for r, idx in enumerate(ranked, 1) if idx in rel), None)
        hit1 += first == 1
        hit5 += first is not None and first <= 5
        mrr += 1 / first if first else 0
    ms = (time.perf_counter() - start) / len(EVAL) * 1000
    n = len(EVAL)
    print(f"{name:<28} hit@1={hit1 / n:.2f}  hit@5={hit5 / n:.2f}  MRR@10={mrr / n:.2f}  {ms:6.1f} ms/query")
```

The parts that matter:

- **`dense_search`** is a plain bi-encoder search: normalised embeddings and a dot product, which is cosine similarity.
- **`bm25_search`** is keyword search with the `rank_bm25` package. It's weak on paraphrases but strong on exact terms like `HashMap` or `RUST_BACKTRACE`.
- **`hybrid_search`** merges the two rankings with **reciprocal rank fusion** (RRF): each document scores `1 / (60 + rank)` in each list it appears in, and the sums are sorted. RRF uses only ranks, so you don't have to make BM25 scores and cosine similarities comparable. The constant 60 comes from the original RRF paper and works well without tuning.
- **`rerank`** calls `CrossEncoder.rank()`, which scores each (query, document) pair and returns the indices sorted by score.

The metrics are **hit@1** (the right section is first), **hit@5** (it's in the top five, which is what an LLM prompt would get) and **MRR@10** (the mean of 1/rank of the first right answer, 0 if it isn't in the top 10).

## Results

The first run downloads both models (about 90 MB each). Then it printed:

```text
348 chunks
BM25                         hit@1=0.55  hit@5=0.80  MRR@10=0.65     0.8 ms/query
bi-encoder                   hit@1=0.70  hit@5=0.80  MRR@10=0.76     7.5 ms/query
hybrid (RRF)                 hit@1=0.70  hit@5=0.90  MRR@10=0.78     8.0 ms/query
bi-encoder top 50 + rerank   hit@1=0.80  hit@5=0.90  MRR@10=0.83  1288.9 ms/query
hybrid top 50 + rerank       hit@1=0.80  hit@5=0.85  MRR@10=0.82  1461.0 ms/query
```

Reading it:

- **BM25 alone is the weakest** on these natural-language questions, as expected: "why doesn't rust have null" doesn't share many words with the section about `Option`.
- **The bi-encoder** gets the right section first for 14 of 20 questions.
- **Hybrid retrieval** doesn't improve the top result here, but it raises hit@5 from 0.80 to 0.90: BM25 rescues a couple of questions that the embedding model ranked low.
- **Reranking** raises hit@1 from 0.70 to 0.80 for both first stages, and MRR from 0.76 to 0.83 (0.82 after the hybrid stage). It isn't free of mistakes, though: after the hybrid stage it pushed one correct answer out of the top five, so hit@5 dropped from 0.90 to 0.85.

With 20 questions, one question is 0.05, so these are differences of two or three questions. That's typical for a small evaluation set, and the right reaction is to build a bigger one before making decisions, not to read too much into the second decimal place.

Swapping in the larger `cross-encoder/ms-marco-MiniLM-L12-v2` (12 layers instead of 6) with `RERANKER=cross-encoder/ms-marco-MiniLM-L12-v2` gave:

```text
bi-encoder top 50 + rerank   hit@1=0.80  hit@5=0.90  MRR@10=0.83  2244.0 ms/query
hybrid top 50 + rerank       hit@1=0.80  hit@5=0.85  MRR@10=0.83  2641.8 ms/query
```

The same quality on this set, for roughly 1.7 times the time per query. A bigger reranker isn't automatically better for your data; measure it.

## What it costs: latency

The ms/query column above is the real cost. The bi-encoder search takes a few milliseconds per query; reranking 50 candidates takes around a second on this CPU (8 PyTorch threads). The time grows with the number of candidates. Appending this loop to the script measures it, as the median over the 20 questions:

```python
import statistics

for n in (10, 20, 50, 100):
    times = []
    for query, _ in EVAL:
        candidates = dense_search(query, n)
        start = time.perf_counter()
        rerank(query, candidates, 5)
        times.append((time.perf_counter() - start) * 1000)
    print(f"rerank {n:>3} candidates: median {statistics.median(times):6.0f} ms")
```

```text
rerank  10 candidates: median    140 ms
rerank  20 candidates: median    286 ms
rerank  50 candidates: median    915 ms
rerank 100 candidates: median   2839 ms
```

Timings vary from run to run with machine load (the 100-candidate figure is probably inflated by it), but the shape doesn't. Ways to bring the number down:

- **Rerank fewer candidates.** Going from 50 to 20 cuts the time by more than half. Check your first-stage recall at 20 first: if the right answer is almost always in the top 20, the extra 30 candidates buy nothing.
- **Shorter inputs.** Cross-encoder cost grows with input length. `CrossEncoder(..., max_length=256)` truncates each pair; with 200-token chunks that loses little.
- **A GPU.** Scoring 50 short pairs is one small batch for a GPU, typically tens of milliseconds.
- **ONNX or OpenVINO backends.** sentence-transformers can load cross-encoders with `backend="onnx"` or `backend="openvino"` (extra packages needed), which usually speeds up CPU inference.
- **Cache** reranked results for repeated queries, if your traffic has them.

In a RAG pipeline, a second of reranking is often acceptable next to several seconds of LLM generation. In a search-as-you-type box it isn't.

## Gotchas

- **Use the reranker its training data suits.** The `ms-marco` cross-encoders were trained on English web search queries and passages. They do well on question-like queries over prose, less well on code, tables or other languages. For multilingual text, look at a multilingual reranker such as `BAAI/bge-reranker-v2-m3`.
- **Scores are for ranking, not thresholds.** A cross-encoder score says "this document is more relevant than that one for this query". Comparing scores across queries, or using a fixed cut-off for "relevant enough", needs calibration on your own data.
- **Clean the text before indexing.** Markup, include directives and boilerplate end up in both the embeddings and the reranker's input. The `clean()` function above strips the mdBook and HTML noise from the book's source.
- **The first stage sets the ceiling.** Measure recall at your candidate count (does the right answer appear anywhere in the top 50?) before tuning the reranker.
- **Hosted rerankers exist.** If you'd rather not run a model, several embedding providers offer reranking APIs. The same funnel applies: retrieve cheaply, rerank a short list.

## Further reading

- [sentence-transformers: Cross-Encoder usage](https://www.sbert.net/docs/cross_encoder/usage/usage.html)
- [cross-encoder/ms-marco-MiniLM-L6-v2 model card](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2)
- [rank_bm25 on GitHub](https://github.com/dorianbrown/rank_bm25)
