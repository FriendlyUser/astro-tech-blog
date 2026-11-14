---
description: 'Write and run tests in Deno with Deno.test and @std/assert: async tests, test steps, permissions, filtering, parallel runs and coverage.'
imgSrc: /imgs/2023/3702590653.webp
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-04T20:56:50.000Z'
lastUpdated: 2026-11-14
tags: ["deno", "typescript", "testing"]
title: 'Testing in Deno with Deno.test and @std/assert'
---

:::caution[Updated in November 2026]
The first version of this post imported assertions from `https://deno.land/std@0.114.0/testing/asserts.ts`. The standard library is no longer published to `deno.land/std`; assertions now live in [`@std/assert`](https://jsr.io/@std/assert) on JSR. It also listed a `--serial` flag that doesn't exist and the `--unstable` flag, which Deno 2 replaced with granular `--unstable-*` flags. The examples below were run with Deno 2.9.
:::

Deno has a test runner built into the CLI. You register tests with `Deno.test`, run them with `deno test`, and get type-checking, filtering and coverage without installing anything. The runner is part of the runtime; assertion helpers come from the standard library package `@std/assert`.

## A first test

Put the code under test in `math.ts`:

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new RangeError("Division by zero");
  return a / b;
}
```

And the tests in `math_test.ts`:

```typescript
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { add, divide } from "./math.ts";

Deno.test("add sums two numbers", () => {
  assertEquals(add(2, 3), 5);
});

Deno.test("divide throws on zero", () => {
  assertThrows(() => divide(1, 0), RangeError, "Division by zero");
});
```

In a project with a `deno.json`, run `deno add jsr:@std/assert` once and import from `"@std/assert"` instead of the full `jsr:` specifier.

`assertEquals` compares deeply, so it works for objects and arrays as well as primitives. Other common ones are `assert`, `assertStrictEquals`, `assertRejects` (for promises), `assertMatch` and `assertObjectMatch`. If you prefer Jest-style syntax, [`@std/expect`](https://jsr.io/@std/expect) provides `expect(x).toBe(y)`.

## Running tests

```bash
deno test
```

With no arguments, `deno test` finds files in the current directory tree whose names end in `_test` or `.test`, or are named `test`, with a `.ts`, `.tsx`, `.mts`, `.js`, `.mjs` or `.jsx` extension. You can also pass files or directories explicitly. Test files are type-checked before they run.

```text
running 2 tests from ./math_test.ts
add sums two numbers ... ok (542µs)
divide throws on zero ... ok (735µs)

ok | 2 passed | 0 failed (77ms)
```

## Async tests and permissions

If the test function returns a promise, the runner awaits it. Tests get the same sandbox as `deno run`, so a test that makes a network request needs `--allow-net`:

```typescript
import { assert, assertEquals } from "jsr:@std/assert@1";

Deno.test("fetches a post", async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");
  assert(response.ok);
  const post = await response.json();
  assertEquals(post.id, 1);
});
```

```bash
deno test --allow-net=jsonplaceholder.typicode.com
```

Without the flag the test fails with a `NotCapable` error rather than hanging on a prompt. Tests that hit real services are slow and flaky; for unit tests, stub `fetch` or use the mocking helpers in [`@std/testing`](https://jsr.io/@std/testing).

## Grouping with steps, and skipping tests

The test function receives a context object, `t`. `t.step` creates nested sub-tests that are reported separately. Await each step.

```typescript
import { assertEquals } from "jsr:@std/assert@1";

Deno.test("string helpers", async (t) => {
  await t.step("upper-cases", () => {
    assertEquals("deno".toUpperCase(), "DENO");
  });
  await t.step("trims", () => {
    assertEquals("  deno ".trim(), "deno");
  });
});

Deno.test({
  name: "only runs on Windows",
  ignore: Deno.build.os !== "windows",
  fn() {
    assertEquals(Deno.build.os, "windows");
  },
});
```

The object form of `Deno.test` also takes `only: true` (run just this test; the run is reported as failed so you don't commit it by accident) and per-test `permissions`.

## Useful flags

| Flag | Effect |
| --- | --- |
| `--filter "divide"` | Run only tests whose name contains the string; `--filter "/regex/"` for a pattern |
| `--parallel` | Run test files in parallel (one worker per CPU by default). Without it, files run one after another |
| `--fail-fast` | Stop after the first failure |
| `--watch` | Re-run when files change |
| `--coverage[=dir]` | Collect coverage (default `coverage/`) and print a summary; `deno coverage` produces more reports |
| `--reporter=dot\|junit\|tap` | Change the output format, e.g. JUnit XML for CI |
| `--doc` | Also type-check and run code blocks in JSDoc and Markdown |

`deno test --help` lists the rest.

## Further reading

- [Testing in the Deno manual](https://docs.deno.com/runtime/fundamentals/testing/)
- [`deno test` CLI reference](https://docs.deno.com/runtime/reference/cli/test/)
- [`@std/assert`](https://jsr.io/@std/assert) and [`@std/testing`](https://jsr.io/@std/testing) on JSR
