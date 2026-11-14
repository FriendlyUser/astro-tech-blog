---
description: How to parse, edit and write YAML in Deno with @std/yaml from JSR, including typing the parsed result and a couple of YAML gotchas.
imgSrc: /imgs/2023/248665811.webp
layout: '@/templates/BasePost.astro'
pubDate: '2023-07-24T22:28:00.000Z'
lastUpdated: 2026-11-14
tags:
  - deno
  - typescript
title: Parsing and writing YAML in Deno with @std/yaml
---

:::caution
The original version of this post imported from `https://deno.land/std@0.115.0/yaml/mod.ts`. The Deno standard library is now published on JSR as separate packages, and the YAML module is `@std/yaml`. The examples below use the JSR package.
:::

YAML is a common format for configuration files. Deno's standard library ships a YAML module, `@std/yaml`, with two main functions: `parse` turns YAML text into JavaScript values, and `stringify` turns values back into YAML. The examples were checked against `@std/yaml` 1.3.0 on Deno 2.

## Importing the module

Either import it directly with a `jsr:` specifier:

```typescript
import { parse, stringify } from "jsr:@std/yaml@^1";
```

or add it to your project's `deno.json` and import it by name:

```bash
deno add jsr:@std/yaml
```

```typescript
import { parse, stringify } from "@std/yaml";
```

## Parsing YAML

`parse` returns `unknown`, because the module can't know the shape of your file. Cast (or, better, validate) the result into a type before using it:

```typescript
import { parse } from "jsr:@std/yaml@^1";

interface Person {
  name: string;
  age: number;
  hobbies: string[];
}

const yamlText = `
name: John Doe
age: 30
hobbies:
  - programming
  - reading
`;

const person = parse(yamlText) as Person;
console.log(person);
// { name: "John Doe", age: 30, hobbies: [ "programming", "reading" ] }
```

Without the cast, `person.hobbies` is a type error under `deno check`. A cast doesn't check anything at runtime, so for files you don't control, validate the shape with a schema library such as Zod before trusting it.

For a file on disk, read it first:

```typescript
const config = parse(await Deno.readTextFile("config.yaml"));
```

This needs `--allow-read`. If the YAML is invalid, `parse` throws an error with the line and column of the problem, so wrap it in `try`/`catch` when the input comes from users.

A file with several documents separated by `---` needs `parseAll`, which returns an array:

```typescript
import { parseAll } from "jsr:@std/yaml@^1";

console.log(parseAll("a: 1\n---\na: 2\n")); // [ { a: 1 }, { a: 2 } ]
```

## Editing and writing YAML

Once parsed, the data is a plain object, so you change it like any other object and pass it to `stringify`:

```typescript
import { parse, stringify } from "jsr:@std/yaml@^1";

interface Person {
  name: string;
  age: number;
  hobbies: string[];
}

const person = parse(`
name: John Doe
age: 30
hobbies:
  - programming
  - reading
`) as Person;

person.hobbies.push("traveling");
person.age += 1;

console.log(stringify(person));
```

Output:

```yaml
name: John Doe
age: 31
hobbies:
  - programming
  - reading
  - traveling
```

To write it back to disk, use `await Deno.writeTextFile("person.yaml", stringify(person))` with `--allow-write`. Comments and the original formatting are not preserved: `stringify` writes the data, not the source text you read.

## Gotchas

- **Unquoted numbers lose formatting.** `version: 1.10` parses as the number `1.1`. Quote version strings in your YAML (`version: "1.10"`).
- **`yes`/`no` stay strings.** `@std/yaml` uses the YAML 1.2 core schema, so `enabled: yes` parses as the string `"yes"`, not `true`. When writing, `stringify` quotes such strings (`note: 'yes'`) so YAML 1.1 parsers don't read them as booleans.
- **No round-tripping of comments.** If you need to edit a config file and keep its comments, `@std/yaml` isn't the right tool; you'd need a library that works on the document AST, such as the `yaml` package on npm.

## Further reading

- [`@std/yaml` on JSR](https://jsr.io/@std/yaml)
- [Deno standard library overview](https://docs.deno.com/runtime/fundamentals/standard_library/)
