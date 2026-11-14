---
title: Building a command-line app in Deno with cac
pubDate: "2023-05-03T14:16:45.022Z"
lastUpdated: 2026-11-14
description: "Use the cac CLI library from npm in Deno to define commands and options, print help and version output, and reject unknown commands."
tags: ["deno", "typescript"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2679960937.webp
---

[cac](https://github.com/cacjs/cac) ("Command And Conquer") is a small JavaScript library for building command-line apps. You declare commands, arguments and options, and it parses `argv`, dispatches to the matching command and generates `--help` output. It's published to npm, and Deno can import it directly with an `npm:` specifier, so there's nothing to install up front.

The examples below were tested with cac 7.1.0 on Deno 2.

## Setup

Install Deno by following the [official installation instructions](https://docs.deno.com/runtime/getting_started/installation/), then check it works:

```bash
deno --version
```

Import cac with an `npm:` specifier. Deno downloads and caches the package on first run:

```typescript
import { cac } from "npm:cac@^7.1.0";
```

If you'd rather keep versions in `deno.json`, run `deno add npm:cac` and import it as `"cac"` instead.

:::note
Older versions of this post imported cac from `https://deno.land/x/cac/mod.ts`. That module no longer exists on deno.land/x; use the npm package.
:::

## A command with an argument and an option

Create `cli.ts`:

```typescript
import { cac } from "npm:cac@^7.1.0";

const cli = cac("my-cli");

cli
  .command("greet [name]", "Greet a user by name")
  .option("-u, --uppercase", "Greet in uppercase")
  .action((name: string = "stranger", options: { uppercase?: boolean }) => {
    const greeting = `Hello, ${name}!`;
    console.log(options.uppercase ? greeting.toUpperCase() : greeting);
  });

cli.help();
cli.version("0.1.0");

cli.parse(["deno", "cli.ts", ...Deno.args]);
```

A few things that are easy to get wrong:

- **Argument order in `action`.** cac passes positional arguments first and the options object last. `[name]` in square brackets is optional; `<name>` would make it required.
- **`cli.help()` doesn't print anything by itself.** It registers `-h, --help` and prints help when that flag is passed. `cli.version()` does the same for `-v, --version`.
- **`parse` expects a Node-style `argv`.** It skips the first two entries (runtime and script path), so `Deno.args` on its own would lose the command name. Prepending two placeholders fixes that. In Deno 2, calling `cli.parse()` with no arguments also works, because Deno provides `process.argv`.

Run it:

```bash
deno run cli.ts greet
# Hello, stranger!
deno run cli.ts greet John
# Hello, John!
deno run cli.ts greet Jane --uppercase
# HELLO, JANE!
```

`deno run cli.ts --help` lists the commands and global options, and `deno run cli.ts greet --help` shows the options for `greet`. Running with no arguments prints nothing, because no command matched. To run something in that case, register a default command with `cli.command("[...args]", "...")`.

## Handling unknown commands

When the first argument doesn't match any command and there's no default command, cac fires a `command:*` event. Use it to print an error and the help text:

```typescript
import { cac } from "npm:cac@^7.1.0";

const cli = cac("my-cli");

cli.addEventListener("command:*", () => {
  console.error(`Invalid command: ${cli.args.join(" ")}`);
  cli.outputHelp();
  Deno.exit(1);
});

cli
  .command("greet [name]", "Greet a user by name")
  .option("-u, --uppercase", "Greet in uppercase")
  .action((name: string = "stranger", options: { uppercase?: boolean }) => {
    const greeting = `Hello, ${name}!`;
    console.log(options.uppercase ? greeting.toUpperCase() : greeting);
  });

cli.help();
cli.version("0.1.0");

cli.parse(["deno", "cli.ts", ...Deno.args]);
```

```bash
deno run cli.ts invalid-command
# Invalid command: invalid-command
# (help text follows; exit code 1)
```

In cac 7 the CLI object is an `EventTarget`, so listeners are added with `addEventListener`. Examples written for cac 6 use `cli.on("command:*", ...)`, which won't work with 7.x.

## Next steps

- Add more commands with `cli.command(...)`; each gets its own `--help` page.
- Ship the CLI as a single binary with `deno compile cli.ts`.
- The [cac README](https://github.com/cacjs/cac) covers variadic arguments (`[...files]`), negated options (`--no-color`), dot-nested options and option defaults.
