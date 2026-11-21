---
title: "Template literal types in TypeScript: typed routes and event names"
description: "Use template literal types and infer to pull params out of route strings like /users/:id, build typed event names, and know where the type checker gives up."
tags: ["TypeScript", "Template Literal Types", "Type-Level Programming", "Web Development"]
pubDate: "2026-04-26T16:00:00.000Z"
imgSrc: "/imgs/2026/typescript_template_literal_types.webp"
imgAlt: "A route string /users/:userId/orders/:orderId with its two parameters lifted out into a typed object"
---

Template literal types are string types built with the same backtick syntax as JavaScript template strings: `` `${Method} ${Path}` `` is the type of every string made by combining a method and a path. Combined with conditional types and `infer`, they let the compiler read structure out of string literals, so a route like `"/users/:userId"` can produce a params type with a `userId` key, and an event name like `"user:created"` can be tied to its payload type.

This post builds a typed path builder, a small router and a typed event emitter, then covers where the approach breaks down. The code was checked with TypeScript 5.9 and 6.0 and runs on Node 24.

## The basics

A template literal type interpolates other types into a string pattern. When the interpolated types are unions, the result is every combination:

```ts
type Method = "GET" | "POST";
type Resource = "/users" | "/orders";
type Endpoint = `${Method} ${Resource}`;
// "GET /users" | "GET /orders" | "POST /users" | "POST /orders"

const ok: Endpoint = "POST /orders";
const bad: Endpoint = "PUT /users"; // error
```

You can also interpolate `string`, `number`, `bigint` and `boolean` to describe open-ended patterns:

```ts
type CssLength = `${number}px` | `${number}rem`;
const a: CssLength = "1.5rem"; // ok
const b: CssLength = "12em";   // error
```

TypeScript ships four intrinsic string helpers: `Uppercase`, `Lowercase`, `Capitalize` and `Uncapitalize`. They are what make naming conventions expressible:

```ts
type Handler = `on${Capitalize<"click" | "keyDown">}`; // "onClick" | "onKeyDown"
```

## Pulling params out of a route with infer

Inside a conditional type, `infer` in a template literal pattern captures part of the string. This is the whole trick behind typed routes:

```ts
type ParamNames<Path extends string> =
  Path extends `${string}:${infer Name}/${infer Rest}`
    ? Name | ParamNames<Rest>
    : Path extends `${string}:${infer Name}`
      ? Name
      : never;

type Params<Path extends string> = { [K in ParamNames<Path>]: string };

type A = ParamNames<"/users/:userId/orders/:orderId">; // "userId" | "orderId"
type B = Params<"/users/:userId/orders/:orderId">;     // { userId: string; orderId: string }
type C = Params<"/health">;                            // {}
```

Read `ParamNames` as a recursive function over the string:

1. If the path contains `:something/` followed by more path, capture `something` as `Name`, then recurse on the rest.
2. Otherwise, if it contains `:something` at the end, that's the last param.
3. Otherwise there are no params left, which is `never` (the empty union).

When a pattern starts with `${string}`, TypeScript matches it lazily, so `${string}:` skips to the *first* colon. `infer Name` followed by `/` captures up to the first slash after it. Those two rules are why the recursion walks the params left to right.

## A typed path builder

With `Params` in hand, a function can require exactly the right keys for whatever pattern you pass:

```ts
function buildPath<Path extends string>(pattern: Path, params: Params<Path>): string {
  return pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) =>
    encodeURIComponent((params as Record<string, string>)[name]),
  );
}

buildPath("/users/:userId/orders/:orderId", { userId: "42", orderId: "a b" });
// "/users/42/orders/a%20b"

buildPath("/health", {}); // "/health"

buildPath("/users/:userId/orders/:orderId", { userId: "42" });
// error: Property 'orderId' is missing

buildPath("/users/:userId", { userID: "42" });
// error: 'userID' does not exist in type 'Params<"/users/:userId">'. Did you mean to write 'userId'?
```

The generic parameter `Path` is inferred from the literal you pass, and `Params<Path>` is computed from it. The cast inside the function body is normal for this kind of code: the implementation works with plain strings, and the types are there to check the callers.

## A small router

The same type gives route handlers typed params. Here is a complete, runnable router; save it as `router.ts`, type-check it with `npx tsc --noEmit --strict --target es2022 router.ts` and run it with `node router.ts`:

```ts
type ParamNames<Path extends string> =
  Path extends `${string}:${infer Name}/${infer Rest}`
    ? Name | ParamNames<Rest>
    : Path extends `${string}:${infer Name}`
      ? Name
      : never;

type Params<Path extends string> = { [K in ParamNames<Path>]: string };
type RouteHandler<Path extends string> = (params: Params<Path>) => string;

type Route = {
  regex: RegExp;
  names: string[];
  handler: (params: Record<string, string>) => string;
};

class Router {
  private routes: Route[] = [];

  get<Path extends string>(path: Path, handler: RouteHandler<Path>): this {
    const names: string[] = [];
    const source = path.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
      names.push(name);
      return "([^/]+)";
    });
    this.routes.push({
      regex: new RegExp(`^${source}$`),
      names,
      handler: handler as Route["handler"],
    });
    return this;
  }

  handle(url: string): string {
    for (const route of this.routes) {
      const match = route.regex.exec(url);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.names.forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1]!)));
      return route.handler(params);
    }
    return "404";
  }
}

const router = new Router()
  .get("/users/:userId", ({ userId }) => `user ${userId}`)
  .get("/users/:userId/orders/:orderId", (p) => `order ${p.orderId} of ${p.userId}`);

// new Router().get("/users/:userId", (p) => p.id);
// error: Property 'id' does not exist on type 'Params<"/users/:userId">'

console.log(router.handle("/users/42"));
console.log(router.handle("/users/42/orders/a%20b"));
console.log(router.handle("/nope"));
```

Output:

```text
user 42
order a b of 42
404
```

Rename `:userId` to `:id` in the route string and the handler stops compiling until you update it. That is the payoff: the route string is the single source of truth, and you don't maintain a separate params interface.

## Typed event names

Event emitters are the other common use. Start with a map from event name to payload type:

```ts
type Events = {
  "user:created": { id: string; email: string };
  "user:deleted": { id: string };
  "order:paid": { orderId: string; cents: number };
};
```

A generic `on`/`emit` pair keyed by that map already gives you checked names and payloads. Template literal types add derived names. This one builds wildcard events like `"user:*"` whose payload is the union of every `user:` event:

```ts
type Namespace<K> = K extends `${infer NS}:${string}` ? NS : never;
// Namespace<keyof Events> is "user" | "order"

type WithWildcards<E> = E & {
  [NS in Namespace<keyof E> as `${NS}:*`]: E[Extract<keyof E, `${NS}:${string}`>];
};

class Emitter<E extends Record<string, object>> {
  private listeners = new Map<string, Set<(payload: never) => void>>();

  on<K extends keyof E & string>(name: K, fn: (payload: E[K]) => void): () => void {
    const set = this.listeners.get(name) ?? new Set();
    set.add(fn as (payload: never) => void);
    this.listeners.set(name, set);
    return () => set.delete(fn as (payload: never) => void);
  }

  emit<K extends keyof E & string>(name: K, payload: E[K]): void {
    for (const key of [name, `${name.split(":")[0]}:*`]) {
      this.listeners.get(key)?.forEach((fn) => (fn as (p: E[K]) => void)(payload));
    }
  }
}

const bus = new Emitter<WithWildcards<Events>>();
bus.on("user:created", (u) => console.log("created", u.email));
bus.on("user:*", (u) => console.log("any user event", u.id)); // u: created | deleted payload
bus.on("order:paid", (o) => console.log("paid", o.cents));

bus.emit("user:created", { id: "u1", email: "ada@example.com" });
bus.emit("user:deleted", { id: "u1" });

bus.emit("order:paid", { orderId: "o1" }); // error: 'cents' is missing
bus.on("user:updated", () => {});           // error: not an event name
```

The `as` clause in the mapped type (key remapping) is what renames keys. The same pattern turns an event map into React-style handler props:

```ts
type HandlerProps<E> = {
  [K in keyof E & string as `on${Capitalize<K>}`]?: (payload: E[K]) => void;
};

type FormEvents = { submit: { values: Record<string, string> }; reset: {} };
type FormProps = HandlerProps<FormEvents>;
// { onSubmit?: (payload: { values: ... }) => void; onReset?: (payload: {}) => void }
```

## Limits

Template literal types run on the type checker, which was not designed as a string-processing engine. Some limits are worth knowing before you build an API on them.

**They only work on literals.** `ParamNames<string>` is `never`, so `buildPath(somePathFromConfig, {})` compiles without checking anything. Typed routes need the route strings written in the source.

**Unions multiply.** Each interpolated union multiplies the size of the result. Six slots of ten digits is a million members, and TypeScript refuses:

```text
error TS2590: Expression produces a union type that is too complex to represent.
```

The limit is 100,000 members. You won't hit it with routes, but generating every combination of, say, CSS properties and values gets there fast.

**Recursion depth.** Recursive conditional types like `ParamNames` are limited in depth. Tail-recursive forms get a much higher limit (1,000 levels since TypeScript 4.5) than ones that do work after the recursive call, and either way the error you hit is the unhelpful "Type instantiation is excessively deep and possibly infinite". Route strings are short, so this only matters for parsers of longer strings.

**`${number}` is looser than it looks.** It accepts any string that TypeScript considers numeric, which includes `"1e3"`. In TypeScript 5.9 it also accepted `"12 px"` for `` `${number}px` ``. Use these patterns for editor hints, and still validate real input at runtime.

**Readability and compile time.** Each clever type is code that someone has to maintain, and deeply nested conditional types slow down the editor in large projects. Error messages print the expanded types, which can be long. I keep this to a few well-named utility types (`ParamNames`, `Params`, `WithWildcards`) with tests, rather than sprinkling ad hoc string manipulation across the codebase.

**The parser doesn't cover every route syntax.** Optional params (`:id?`), regex constraints (`:id(\\d+)`) and wildcards (`*`) need extra branches. Routing libraries that offer typed params handle these for you; if you use one, prefer its types to rolling your own.

## Further reading

- [TypeScript handbook: Template literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)
- [TypeScript handbook: Conditional types, including infer](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)
- [TypeScript handbook: Key remapping in mapped types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html)
