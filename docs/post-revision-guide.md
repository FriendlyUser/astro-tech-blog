# Post revision guide (2023–2025 posts)

Many posts dated 2023–2025 were drafted with an LLM and read like it: padded intros,
feature lists with no evidence, "In conclusion" endings, and code that was never run.
This guide is the standard each revision should meet.

## Hard rules

- **Never rename, move, or delete a post file.** The URL is the file path
  (see `src/content.config.ts`), so the filename must not change.
- **Keep `pubDate` exactly as it is.** Add `lastUpdated: 2026-11-14` (the revision date,
  unquoted YAML date) to the frontmatter so readers can see the post was revised.
- **Keep every other frontmatter key** (`layout`, `imgSrc`, `imgAlt`, `alt`, `tags`) and its value.
  You may *add* tags if `tags` is empty or missing obvious ones; don't remove existing tags,
  because each tag has its own page URL. New tags are lowercase and reuse existing tag names
  (`go`, `java`, `android`, `python`, `rust`, `testing`) rather than inventing variants.
- **Keep the topic.** A post about library X stays a post about library X, even if X is now
  deprecated. In that case say so near the top and point to the replacement.
- **Keep the author's opinions.** For opinion or personal posts (e.g. `stonks/thoughts`),
  tighten the prose and fix facts, but don't change what the author believes or decided.
  Don't add new statements about the author (disclosures, affiliations, experience).

## Title and description

- Rewrite `title` to be plain and specific: say what the reader will learn or do.
  Drop "A Comprehensive Guide to", "A Deep Dive into", "Unleashing the Power of",
  "Powerful and Versatile", and similar.
  - Bad: `Apache Lucene A Comprehensive Guide to the World-class Search Library`
  - Good: `Apache Lucene basics: indexing and searching text in Java`
- Rewrite `description` as one or two sentences (roughly 120–160 characters) stating what
  the post covers. No "In this article, we will delve into…".
- Remove the leading `#` H1 from the body if it repeats the title. Starlight already renders
  the title as the page H1 (and `remarkDropLeadingH1` drops it anyway).

## Prose

Write like an engineer explaining something to a colleague.

- Open with what the thing is and why you'd use it, in two or three sentences. No history
  lesson unless it matters.
- Cut filler. Words and phrases to remove on sight: *delve, dive into, comprehensive,
  powerful, robust, seamless, leverage, harness, unleash, elevate, game-changer, plethora,
  myriad, landscape, crucial, in today's fast-paced world, whether you're a beginner or an
  expert, in this article we will, happy coding*.
- Replace vague claims with specifics. "Lucene is fast" → say what makes it fast or drop it.
  "Highly scalable" → only keep it if you can say how (sharding, segment merging, etc.).
- Don't end with a "Conclusion" that summarises the post. End with something useful:
  gotchas, when *not* to use the tool, next steps, or links to the official docs.
  A short "Further reading" list of official links is fine.
- Prefer one worked example the reader can run over five bullet-point "key features".
- Bullet lists are fine for genuinely list-shaped things (options, flags, steps).
  Don't turn every paragraph into bold-label bullets.
- Keep it about the same length or shorter. Length is not a goal; accuracy is.

## Accuracy

This matters more than style.

- **Check every code sample.** It must compile or run as written against a current version
  of the library, including imports. Fix wrong error handling, missing imports, removed APIs,
  and invented functions. If you can't make a sample correct, cut it.
- **Check every factual claim** (defaults, algorithms, version numbers, licence, who maintains
  it). Use official docs, release notes, or the package registry. Examples of errors found:
  - Lucene's default similarity has been BM25 since Lucene 6, not TF-IDF.
  - `CreateFileW` returns `INVALID_HANDLE_VALUE` on failure, not null.
- **Update versions** in dependency snippets to the current stable release, or say which
  version the example was written against. Don't leave "the version might have changed".
- **Flag deprecations.** If the library or API is deprecated, archived, or merged into
  something else (e.g. ButterKnife → View Binding, ExoPlayer → AndroidX Media3,
  Remix → React Router v7, Deno `std/http` `serve` → `Deno.serve`), add a short note
  near the top and either update the example or show the modern equivalent.
- Don't invent benchmarks, statistics, quotes, or features.

## Formatting

- Fenced code blocks with a language tag.
- Use `##` for sections and `###` for subsections; don't skip levels.
- Keep existing images and their paths, unless the file doesn't exist under `public/`
  (a broken image); remove broken image references.
- For deprecation warnings, use a Starlight aside (`:::caution` … `:::`) at the top of the post.
