---
title: "Discriminated unions and exhaustive checks in TypeScript"
description: "Model request states and webhook events as discriminated unions, narrow them by a tag field, catch missing cases with never, and parse unknown JSON into a union."
tags: ["TypeScript", "Type Safety", "Narrowing", "JavaScript", "Web Development"]
pubDate: "2026-02-09T16:00:00.000Z"
imgSrc: "/imgs/2026/typescript_discriminated_unions.webp"
imgAlt: "A state machine of four request states, idle, loading, success and error, each a coloured node joined by arrows"
---

A discriminated union is a union of object types that all share one property, the tag, whose type is a different literal in each member. When you check the tag, TypeScript narrows the value to the matching member, so each branch of your code sees exactly the fields that exist in that case. Add a `never` check at the end and the compiler also tells you every place that needs updating when you add a new case.

This is the pattern I reach for whenever a value can be in one of several shapes: request states, parsed events, reducer actions, results that are either a value or an error. Examples were checked with TypeScript 5.9 in `strict` mode and run with Node 24.

## Impossible states with optional fields

The usual first attempt at modelling a fetch looks like this:

```ts
type RequestState = {
  isLoading: boolean;
  data?: User[];
  error?: string;
};
```

Nothing stops `isLoading: true` and `error: "timeout"` at the same time, or `data` and `error` both being set. Every reader has to guess which combinations are real, and every read of `data` needs a `?.` or a non-null assertion.

## A union with a tag

List the states that can actually happen, and give each one a literal `status`:

```ts
type User = { id: string; name: string };

type RequestState =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "success"; data: User[] }
  | { status: "error"; error: string; retryable: boolean };
```

`data` only exists on the `success` member, and `error` only on `error`. There is no way to build a value that is both.

### Narrowing by the tag

Any check on `status` narrows the type. A `switch` is the most common form:

```ts
function render(state: RequestState): string {
  switch (state.status) {
    case "idle":
      return "Nothing loaded yet";
    case "loading":
      return `Loading for ${Date.now() - state.startedAt} ms`;
    case "success":
      return state.data.map((u) => u.name).join(", "); // data: User[], no "?."
    case "error":
      return state.retryable ? `${state.error} (retrying)` : state.error;
  }
}
```

`if (state.status === "success")`, early returns (`if (state.status !== "success") return 0;`) and the `in` operator (`"data" in state`) narrow the same way. Since TypeScript 4.4 and 4.6, narrowing also works through a destructured or aliased tag:

```ts
type Action = { kind: "add"; payload: number } | { kind: "rename"; payload: string };

function apply(action: Action) {
  const { kind, payload } = action;
  if (kind === "add") return payload + 1; // payload: number
  return payload.toUpperCase();           // payload: string
}
```

That only works with `const` bindings and a destructured object that isn't reassigned. If narrowing seems to stop working, check for a `let`.

The tag doesn't have to be a string. Any literal type works, which is why the common `Result` type uses a boolean:

```ts
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };
```

## Exhaustiveness checks with never

In the `render` function above, the `switch` covers all four statuses, and the declared `string` return type already gives a weak check: remove a case and TypeScript reports "Function lacks ending return statement". That check disappears as soon as the function returns `void` or has code after the `switch`, so I prefer an explicit one.

After every case has been handled, the type of `state` in the `default` branch is `never`. A helper that only accepts `never` turns "forgot a case" into a compile error:

```ts
function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

function render(state: RequestState): string {
  switch (state.status) {
    // ...the four cases from above...
    default:
      return assertNever(state, "Unhandled request state");
  }
}
```

Now add `| { status: "cancelled" }` to `RequestState`. Every `switch` that uses `assertNever` fails to compile, with an error that names the missing member:

```text
error TS2345: Argument of type '{ status: "cancelled"; }' is not assignable to parameter of type 'never'.
```

The helper also throws at runtime, which matters because types are erased. If a server sends a status your code has never heard of, you get a clear error instead of a function that silently returns `undefined`.

If you don't want a helper, `satisfies never` (TypeScript 4.9+) gives the same compile-time check inline:

```ts
default:
  throw new Error(`Unhandled status: ${state satisfies never}`);
```

Linters can do this too. typescript-eslint's `switch-exhaustiveness-check` rule reports a `switch` over a union that misses a member, which is useful in code that doesn't follow the `default` convention.

## Parsing unknown JSON into a union

Types say nothing about data that comes from outside the program. `JSON.parse` returns `any`, and casting it straight to a union (`as WebhookEvent`) means the narrowing in the rest of the code is built on a guess. The fix is to parse `unknown` into the union once, at the edge, and return a `Result` so the caller has to deal with bad input.

Here is a complete example. Save it as `events.ts`:

```ts
type User = { id: string; name: string };

type WebhookEvent =
  | { type: "user.created"; user: User }
  | { type: "user.deleted"; userId: string }
  | { type: "ping" };

type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseUser(v: unknown): User | undefined {
  if (isRecord(v) && typeof v.id === "string" && typeof v.name === "string") {
    return { id: v.id, name: v.name };
  }
  return undefined;
}

function parseEvent(input: unknown): Result<WebhookEvent> {
  if (!isRecord(input)) return { ok: false, error: "event is not an object" };
  switch (input.type) {
    case "user.created": {
      const user = parseUser(input.user);
      return user
        ? { ok: true, value: { type: "user.created", user } }
        : { ok: false, error: "user.created without a valid user" };
    }
    case "user.deleted":
      return typeof input.userId === "string"
        ? { ok: true, value: { type: "user.deleted", userId: input.userId } }
        : { ok: false, error: "user.deleted without userId" };
    case "ping":
      return { ok: true, value: { type: "ping" } };
    default:
      return { ok: false, error: `unknown event type ${JSON.stringify(input.type)}` };
  }
}

function handle(event: WebhookEvent): string {
  switch (event.type) {
    case "user.created":
      return `welcome ${event.user.name}`;
    case "user.deleted":
      return `goodbye ${event.userId}`;
    case "ping":
      return "pong";
    default:
      return assertNever(event);
  }
}

const bodies = [
  '{"type":"user.created","user":{"id":"u1","name":"Ada"}}',
  '{"type":"user.deleted","userId":"u1"}',
  '{"type":"ping"}',
  '{"type":"user.created","user":{"id":42}}',
  '{"type":"invoice.paid"}',
  "[1,2,3]",
];

for (const body of bodies) {
  const result = parseEvent(JSON.parse(body));
  console.log(result.ok ? handle(result.value) : `rejected: ${result.error}`);
}
```

Type-check it with `npx tsc --noEmit --strict events.ts`, then run it with `node events.ts` (Node 22.18+ strips the types):

```text
welcome Ada
goodbye u1
pong
rejected: user.created without a valid user
rejected: unknown event type "invoice.paid"
rejected: event is not an object
```

A few choices in `parseEvent` are deliberate:

- **It builds new objects** instead of returning `input` after checking it. Extra fields from the payload don't leak into your types, and the return statements are checked against `WebhookEvent`, so a typo in a field name is a compile error.
- **Unknown types are an error result, not an exception.** Webhook senders add event types all the time, and the caller can decide to log and ignore them.
- **`handle` has its own exhaustiveness check.** Add a `user.updated` member and both functions need a change, and the compiler finds them for you.

For more than a handful of event types, hand-written guards get tedious. A schema library such as Zod or Valibot can describe the same union (Zod has `z.discriminatedUnion("type", [...])`) and infer the TypeScript type from it, so the parser and the type can't drift apart.

## Gotchas

**The tag must be a literal type in every member.** If one member declares `status: string`, then `status === "ok"` no longer narrows to the `"ok"` member, because the `string` member could also hold `"ok"`. Give every member its own literal.

**Narrowing doesn't survive callbacks on mutable variables.** If `state` is a `let` or a property that might be reassigned, TypeScript can't assume a narrowing from outside still holds inside `arr.map(() => ...)`. Copy the narrowed value into a `const` first.

**Don't spread unions carelessly.** `return { ...state, status: "loading", startedAt: Date.now() }` compiles as a `RequestState`, because excess property checks don't apply to spread properties. If `state` was a `success`, the new `loading` value still carries `data` at runtime. Build each state from scratch when you transition.

**Keep the tag name consistent.** Using `type` in one union and `kind` in another is fine, but mixing tags inside one union defeats narrowing. Pick one name per union.

## Further reading

- [TypeScript handbook: Narrowing, including discriminated unions and exhaustiveness checking](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript 4.6 release notes: control flow analysis for destructured discriminated unions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-6.html)
- [typescript-eslint: switch-exhaustiveness-check](https://typescript-eslint.io/rules/switch-exhaustiveness-check/)
