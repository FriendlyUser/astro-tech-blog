---
title: "Chunking documents for retrieval: fixed size, recursive splits and headings"
description: "Four ways to chunk documents for RAG, from fixed windows to heading-aware splits, plus a small recall test that shows which one works for your embedding model."
tags: ["RAG", "LLM", "Embeddings", "Python", "Sentence Transformers"]
pubDate: "2026-06-22T16:00:00.000Z"
imgSrc: "/imgs/2026/rag_chunking_strategies.webp"
imgAlt: "A Markdown page split along its headings into four chunks, each labelled with its token count"
---

Retrieval-augmented generation (RAG) answers questions by finding relevant passages in your documents and putting them in the model's prompt. Before you can find passages, you have to decide what a passage is. Chunking is that decision, and it affects retrieval quality more than most of the knobs people spend time on.

This post builds four chunkers in plain Python (fixed characters, fixed tokens, recursive splitting and Markdown-heading sections), then compares them with a small recall test. Examples use Python 3.12, sentence-transformers 5.6 and the `all-MiniLM-L6-v2` embedding model, which runs on a CPU.

## What a chunk has to do

A chunk is embedded as one vector, so it should be about one thing. Too large, and the vector is an average of several topics that matches none of them well. Too small, and the chunk loses the context that made it findable: "it's known as a move" means nothing without the sentence before it.

There is also a hard limit people miss: **embedding models truncate their input.** `all-MiniLM-L6-v2` reads at most 256 tokens. Anything after that is silently dropped, so a 1,000-token chunk is embedded from its first quarter. Check `model.max_seq_length` (sentence-transformers) or the model card before choosing a chunk size. Many newer embedding models accept much longer inputs, but a long input still blurs the vector.

## Characters or tokens

Chunk sizes are quoted in characters or in tokens, and the two don't convert cleanly. English prose averages roughly four characters per token, but code, URLs and non-English text tokenize very differently. Measure in the **embedding model's own tokens** when you can, because that is what the truncation limit counts. Counting with a different tokenizer (OpenAI's `tiktoken`, for example) gives you a number that is close, but not the one that matters.

## Overlap

Overlap repeats the end of one chunk at the start of the next, so a sentence cut by a boundary still appears whole in one of them. It costs storage and embedding calls, and it has a less obvious cost: neighbouring chunks become near-duplicates, and they can fill the top-k results with the same passage twice. 10-20% overlap is a common starting point; the test below shows it doesn't always help.

## The chunkers

All four return `Chunk` objects with text and a metadata dict. The `length` parameter lets the recursive and heading-based chunkers measure in characters (`len`) or in tokens (a function you pass in).

```python
# chunkers.py: four ways to split a document into chunks
import re
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class Chunk:
    text: str
    meta: dict = field(default_factory=dict)


def fixed_chars(text: str, size: int = 1000, overlap: int = 200) -> list[Chunk]:
    """Cut every `size` characters; consecutive chunks share `overlap` characters."""
    step = size - overlap
    return [Chunk(text[i:i + size], {"start": i}) for i in range(0, len(text), step)]


def fixed_tokens(text: str, tokenizer, size: int = 200, overlap: int = 40) -> list[Chunk]:
    """Same idea, but measured in the embedding model's tokens."""
    enc = tokenizer(text, add_special_tokens=False, return_offsets_mapping=True)
    offsets = enc["offset_mapping"]
    chunks, step = [], size - overlap
    for i in range(0, len(offsets), step):
        window = offsets[i:i + size]
        start, end = window[0][0], window[-1][1]
        chunks.append(Chunk(text[start:end], {"start": start}))
    return chunks


def recursive_split(text: str, max_len: int, length: Callable[[str], int] = len,
                    separators=("\n\n", "\n", ". ", " ")) -> list[str]:
    """Split on the coarsest separator first, then recurse into pieces that are still too long,
    and merge small neighbours back together up to max_len."""
    if length(text) <= max_len:
        return [text]
    if not separators:  # nothing left to split on: hard cut by characters
        return [text[i:i + max_len] for i in range(0, len(text), max_len)]
    sep, rest = separators[0], separators[1:]
    pieces = [p for p in text.split(sep) if p.strip()]
    out, current = [], ""
    for piece in pieces:
        candidate = f"{current}{sep}{piece}" if current else piece
        if length(candidate) <= max_len:
            current = candidate
            continue
        if current:
            out.append(current)
        if length(piece) <= max_len:
            current = piece
        else:  # this piece alone is too big: split it with finer separators
            out.extend(recursive_split(piece, max_len, length, rest))
            current = ""
    if current:
        out.append(current)
    return out


HEADING = re.compile(r"^(#{1,6})\s+(.*)$")


def markdown_sections(text: str, source: str, max_len: int,
                      length: Callable[[str], int] = len) -> list[Chunk]:
    """One chunk per heading section, carrying the heading path as metadata.
    Long sections are split further with recursive_split. Ignores '#' inside code fences."""
    chunks, path, levels, buf, in_fence = [], [], [], [], False

    def flush():
        body = "\n".join(buf).strip()
        if body:
            title = " > ".join(path)
            for part in recursive_split(body, max_len, length):
                # Prefix the heading path so the embedding sees the context.
                chunks.append(Chunk(f"{title}\n\n{part}", {"source": source, "headings": list(path)}))
        buf.clear()

    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        m = None if in_fence else HEADING.match(line)
        if m:
            flush()
            level = len(m.group(1))
            while levels and levels[-1] >= level:  # close sections at this level or deeper
                levels.pop()
                path.pop()
            levels.append(level)
            path.append(m.group(2).strip())
        else:
            buf.append(line)
    flush()
    return chunks
```

`fixed_chars` and `fixed_tokens` are sliding windows. They ignore structure, so they cut mid-sentence, but they are predictable and fast.

`recursive_split` is the idea behind LangChain's `RecursiveCharacterTextSplitter`: try paragraph breaks first, then line breaks, then sentences, then words, and only fall back to finer separators for the pieces that are still too long. Small neighbouring pieces are merged back up to the limit, so chunks end at natural boundaries and stay close to the target size.

`markdown_sections` follows the document's own structure. Each heading starts a new chunk, the heading path (`References and Borrowing > Mutable References`) is kept as metadata and prefixed to the text, and sections that are too long are split recursively. The `levels` stack handles documents that start at `##` instead of `#`, and the fence check stops `# comment` lines inside code blocks from being read as headings.

## A small recall test

To compare chunkers you need questions with known answers. You don't need hundreds: a dozen questions written by reading the documents is enough to catch a broken setup. Each question below comes with a phrase from the source text, and a retrieved chunk counts as a hit if the phrase is in the part of the chunk the model actually embedded.

The corpus is three chapters of [The Rust Programming Language](https://doc.rust-lang.org/book/) on ownership, borrowing and slices. They are Markdown with real heading structure, and the book is open source:

```bash
mkdir data
for f in ch04-01-what-is-ownership ch04-02-references-and-borrowing ch04-03-slices; do
  curl -sSo "data/$f.md" "https://raw.githubusercontent.com/rust-lang/book/main/src/$f.md"
done
```

```python
# eval_chunking.py: compare chunkers with a small retrieval recall test
import re
from pathlib import Path

from sentence_transformers import SentenceTransformer

from chunkers import Chunk, fixed_chars, fixed_tokens, markdown_sections, recursive_split

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
tok = model.tokenizer
ntokens = lambda s: len(tok(s, add_special_tokens=False)["input_ids"])

docs = {p.name: p.read_text(encoding="utf-8") for p in sorted(Path("data").glob("*.md"))}

# (question, phrases: a chunk that contains any of them answers the question)
EVAL = [
    ("What happens if two variables try to free the same heap memory?", "double free"),
    ("When is the memory for a String given back?", "Rust calls `drop` automatically"),
    ("In what order does the stack remove values?", "last in, first out"),
    ("Which annotation lets integers be copied instead of moved?", "special annotation called the `Copy` trait"),
    ("Why is let s2 = s1 called a move and not a shallow copy?", "it's known as a _move_"),
    ("Can I have two mutable references to the same value?",
     ("you can have no other references to that value", "you can have _either_ one mutable reference")),
    ("What conditions cause a data race?", "Two or more pointers access the same data at the same time"),
    ("What is a dangling pointer?", "a pointer that references a location in memory"),
    ("What is a string slice?", "is a reference to a contiguous sequence of the elements"),
    ("Why are string literals immutable?", "This is also why string literals are immutable"),
    ("What is the type of a slice of an i32 array?", "This slice has the type `&[i32]`"),
    ("Why should first_word take &str instead of &String?", "use the same function on both `&String` values and `&str` values"),
    ("Why is returning ownership from every function annoying?", "returning ownership with every function is a bit tedious"),
]

norm = lambda s: re.sub(r"\s+", " ", s.replace("\u2019", "'"))


def seen(text: str) -> str:
    """The part of a chunk the model actually embeds: it truncates at max_seq_length
    tokens, including the [CLS] and [SEP] special tokens."""
    offsets = tok(text, add_special_tokens=False, return_offsets_mapping=True)["offset_mapping"]
    keep = model.max_seq_length - 2
    return text if len(offsets) <= keep else text[: offsets[keep - 1][1]]


def run(name: str, chunks: list[Chunk], ks=(1, 3, 5)) -> None:
    emb = model.encode([c.text for c in chunks], normalize_embeddings=True)
    q = model.encode([question for question, _ in EVAL], normalize_embeddings=True)
    scores = q @ emb.T
    visible = [norm(seen(c.text)) for c in chunks]
    hits = {k: 0 for k in ks}
    for row, (_, answer) in zip(scores, EVAL):
        ranked = row.argsort()[::-1]
        for k in ks:
            phrases = (answer,) if isinstance(answer, str) else answer
            if any(norm(p) in visible[i] for i in ranked[:k] for p in phrases):
                hits[k] += 1
    lens = [ntokens(c.text) for c in chunks]
    over = sum(n > model.max_seq_length for n in lens)
    recall = "  ".join(f"R@{k}={hits[k] / len(EVAL):.2f}" for k in ks)
    print(f"{name:<28} chunks={len(chunks):>3}  mean_tokens={sum(lens) / len(lens):>5.0f}  "
          f"truncated={over:>2}  {recall}")


def per_doc(fn):
    return [c for text in docs.values() for c in fn(text)]


print(f"model max_seq_length = {model.max_seq_length} tokens")
run("fixed 1000 chars, 0 overlap", per_doc(lambda t: fixed_chars(t, 1000, 0)))
run("fixed 1000 chars, 200 overlap", per_doc(lambda t: fixed_chars(t, 1000, 200)))
run("fixed 200 tokens, 40 overlap", per_doc(lambda t: fixed_tokens(t, tok, 200, 40)))
run("recursive 200 tokens", per_doc(lambda t: [Chunk(s) for s in recursive_split(t, 200, ntokens)]))
run("recursive 500 tokens", per_doc(lambda t: [Chunk(s) for s in recursive_split(t, 500, ntokens)]))
run("markdown headings, 200 tok", [c for name, t in docs.items() for c in markdown_sections(t, name, 200, ntokens)])
```

Run it with `uv run --with sentence-transformers eval_chunking.py` next to `chunkers.py`. The first run downloads the model (about 90 MB). With the chapters as downloaded for this post, it printed (the book is edited from time to time, so your numbers may differ slightly):

```text
model max_seq_length = 256 tokens
fixed 1000 chars, 0 overlap  chunks= 51  mean_tokens=  258  truncated=32  R@1=0.46  R@3=0.92  R@5=0.92
fixed 1000 chars, 200 overlap chunks= 63  mean_tokens=  259  truncated=42  R@1=0.46  R@3=0.85  R@5=0.85
fixed 200 tokens, 40 overlap chunks= 83  mean_tokens=  196  truncated= 0  R@1=0.54  R@3=0.92  R@5=0.92
recursive 200 tokens         chunks= 80  mean_tokens=  164  truncated= 0  R@1=0.46  R@3=0.77  R@5=0.85
recursive 500 tokens         chunks= 30  mean_tokens=  436  truncated=27  R@1=0.54  R@3=0.69  R@5=0.69
markdown headings, 200 tok   chunks= 86  mean_tokens=  159  truncated= 0  R@1=0.54  R@3=0.77  R@5=0.92
```

## Reading the results

With 13 questions, one question is worth 0.08, so differences of one or two questions are noise. What the numbers do show:

- **Truncation costs recall.** The 500-token recursive chunks have the cleanest boundaries and the worst R@3, because 27 of the 30 chunks are longer than the model reads. The answer phrase is in the chunk but never made it into the vector. The `seen()` check makes the test honest about that: an earlier version that matched against the full chunk text gave the 1,000-character chunks a perfect R@3, which was wrong.
- **Overlap didn't help here.** Adding 200 characters of overlap made more chunks, more truncation and more near-duplicates in the top results. That won't hold for every corpus, but it is a reason to measure before turning it on.
- **Heading-aware chunks are not magic for recall,** but they tie for the best R@1 and R@5 here, and the metadata pays off elsewhere: you can show the reader where an answer came from, filter by section or source, and give the LLM the heading path so it knows what a short chunk is about.
- **Small token-sized chunks are a solid default** for a model with a short input limit. Plain 200-token windows did as well as anything here.

The value of the script isn't this particular table. When you change the chunker, the model or the corpus, you can re-run it in a minute and see whether recall moved, instead of guessing from a few manual queries.

## Gotchas

- **Write questions the way users ask them,** not by copying sentences from the document. A question that shares exact words with the answer is too easy for any chunker.
- **Count tokens with the right tokenizer.** The `Token indices sequence length is longer than the specified maximum sequence length` warning that transformers prints during this test is the tokenizer telling you a chunk is over the limit.
- **Keep the source and position.** Store the file, heading path and offset with every chunk. You need them for citations, for deleting a document's chunks when it changes, and for debugging bad answers.
- **Tables and code need care.** Recursive splitting on `"\n"` cuts a Markdown table or a long code block into rows that mean nothing on their own. Keep them whole, or split them by groups of rows and repeat the header.
- **Re-chunking means re-embedding.** Changing the chunker invalidates every stored vector, so settle it on a sample with a test like this one before embedding the whole corpus.

## Further reading

- [Sentence Transformers documentation](https://www.sbert.net/)
- [all-MiniLM-L6-v2 model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
- [LangChain text splitters](https://python.langchain.com/docs/concepts/text_splitters/)
