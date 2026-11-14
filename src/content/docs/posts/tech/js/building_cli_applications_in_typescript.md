---
tags: ['js', 'typescript', 'nodejs']
title: Building a command-line app in TypeScript with Commander.js
description: Set up a TypeScript project, define commands, arguments and options with Commander.js, compile with tsc, and install the result as a runnable CLI.
pubDate: Fri, 4 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897_blank_card_on_brown_table.png
---

Command-line tools are a quick way to automate repetitive tasks, and Node.js is a good runtime
for them: it's already installed on most developer machines, and npm can install your tool
globally with one command. Writing the tool in TypeScript gets you type checking on arguments and
options, which is where most CLI bugs live.

This post builds a small `greet` CLI using [Commander.js](https://github.com/tj/commander.js),
the most widely used argument parser for Node.js. (Yargs is a popular alternative with a similar
feature set.) The example was written against Commander 15, which is ESM-only and requires
Node.js 22.12 or later.

## Set up the project

```bash
mkdir greet && cd greet
npm init -y
npm pkg set type=module
npm install commander
npm install --save-dev typescript @types/node
```

`"type": "module"` in `package.json` makes Node treat the compiled `.js` files as ES modules.

Add a `tsconfig.json`. Setting the options explicitly avoids depending on compiler defaults,
which have changed between TypeScript versions:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

## Define the commands

Create `src/index.ts`:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';

const program = new Command();

program
  .name('greet')
  .description('A small example CLI')
  .version('1.0.0');

program
  .command('say-hello')
  .description('Say hello to someone')
  .argument('<name>', 'who to greet')
  .option('-s, --shout', 'print the greeting in capitals')
  .action((name: string, options: { shout?: boolean }) => {
    const greeting = `Hello, ${name}!`;
    console.log(options.shout ? greeting.toUpperCase() : greeting);
  });

program.parse();
```

- `<name>` in angle brackets is a required argument; square brackets (`[name]`) make it optional.
  If a required argument is missing, Commander prints an error and exits with a non-zero code.
- `.option('-s, --shout')` declares a boolean flag. Options are passed to the action handler
  after the positional arguments.
- `.version()` adds `-V, --version`, and Commander generates `-h, --help` for the program and
  each command from the descriptions you provide.
- `program.parse()` with no arguments reads `process.argv`.
- The `#!/usr/bin/env node` line is kept in the compiled output and lets the file run as an
  executable once it's installed.

## Compile and run

Add a build script and a `bin` entry to `package.json`:

```json
{
  "bin": {
    "greet": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc"
  }
}
```

Then build and run it:

```bash
npm run build
node dist/index.js say-hello John
# Hello, John!

node dist/index.js say-hello John --shout
# HELLO, JOHN!

node dist/index.js --help
```

Run `tsc` through the build script rather than as `tsc src/index.ts`: when you pass a file name
on the command line, `tsc` ignores `tsconfig.json`.

While developing, you can skip the build step with [tsx](https://www.npmjs.com/package/tsx),
which runs TypeScript files directly: `npx tsx src/index.ts say-hello John`.

## Install it as a command

`npm link` (run in the project folder) symlinks the package globally, so the `bin` entry becomes a
`greet` command on your `PATH`:

```bash
npm link
greet say-hello John
```

Run `npm unlink -g greet` to remove it. Once the package is published to npm, users can install it
with `npm install -g` or run it without installing via `npx`.

## Gotchas

- **Typing options.** Commander doesn't infer types from the option strings, so the
  `{ shout?: boolean }` annotation is a promise you make by hand. If you want inferred types, the
  [`@commander-js/extra-typings`](https://www.npmjs.com/package/@commander-js/extra-typings)
  package wraps Commander and infers argument and option types from the definitions.
- **Exit codes.** Scripts and CI pipelines rely on a non-zero exit code to detect failure. Set
  `process.exitCode = 1` (or call `program.error('message')`) when a command fails, instead of only
  logging the error.
- **Async actions.** If an action handler is `async`, call `await program.parseAsync()` instead
  of `program.parse()` so errors thrown inside it aren't lost.

## Further reading

- [Commander.js README](https://github.com/tj/commander.js#readme)
- [TypeScript tsconfig reference](https://www.typescriptlang.org/tsconfig/)
- [package.json `bin` field (npm docs)](https://docs.npmjs.com/cli/configuring-npm/package-json#bin)
