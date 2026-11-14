---
description: Set up a PyCharm project with a virtual environment, then use its code completion, refactoring shortcuts, debugger and Git tools in daily Python work.
imgSrc: /imgs/2023/1028024527.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-11T09:44:06.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "PyCharm for Python: project setup, refactoring, debugging and Git"
---

PyCharm is JetBrains' IDE for Python. Its main advantage over a plain editor is that it indexes your whole project and its installed packages, so completion, navigation and refactoring understand your code rather than matching text.

## Editions

PyCharm used to ship as two products: a free Community edition and a paid Professional edition. Starting with 2025.1, JetBrains merged them into a single PyCharm download, and 2025.2 was the last standalone Community release. The core Python features (editor, debugger, testing, Git) stay free; web frameworks, database tools, remote interpreters and similar features need a Pro subscription. New installs start with a 30-day Pro trial.

## Setting up a project

Download PyCharm from the [JetBrains website](https://www.jetbrains.com/pycharm/download/) and create a new project. The new-project dialog asks which interpreter to use and can create a fresh environment for the project (a virtualenv, uv or conda environment) so its dependencies stay separate from your system Python. You can change it later under **Settings | Python | Interpreter**.

For an existing project, open the folder. If it has a `requirements.txt` or `pyproject.toml`, PyCharm offers to install the dependencies into the selected interpreter.

## Shortcuts worth learning

All shortcuts below are for the default Windows/Linux keymap. macOS uses different bindings; look them up under **Settings | Keymap**, or press `Shift` twice and search for the action by name, which works on every platform.

### Code completion and docs

Completion suggestions appear as you type. Press `Enter` to insert the suggestion or `Tab` to replace the word under the caret. Press `Ctrl+Q` on a function or class to see its documentation without leaving the file, and `Ctrl+B` (or `Ctrl`+click) to jump to its definition.

### Refactoring

- **Rename** (`Shift+F6`): renames a variable, function, class or module and updates every reference, including imports in other files.
- **Extract method** (`Ctrl+Alt+M`): turns the selected code into a new function. PyCharm works out the parameters and return values from the variables the code uses.
- **Inline** (`Ctrl+Alt+N`): the reverse. Replaces calls to a function or uses of a variable with its body or value.

Refactorings show a preview when they touch several files. Review it before applying, especially for dynamic code PyCharm can't analyse, such as `getattr` with a string name.

### Debugging

Click in the gutter next to a line to set a breakpoint, then start the debugger with `Shift+F9` (debugs the current run configuration). When execution stops:

| Key | Action |
| --- | --- |
| `F8` | Step over: run the current line |
| `F7` | Step into the function called on this line |
| `Shift+F8` | Step out to the caller |
| `Alt+F9` | Run to the caret position |
| `F9` | Resume until the next breakpoint |
| `Alt+F8` | Evaluate an arbitrary expression in the current frame |

Right-click a breakpoint to add a condition (for example `i == 500`) so it only stops when it matters. That saves a lot of `F9` presses in loops.

## Git

PyCharm detects a Git repository when you open the project. The **Commit** tool window (`Alt+0`) lists changed files, lets you choose which files or individual changes to include, and shows a diff for each. The **Git** tool window (`Alt+9`) shows the log and branches. Merge conflicts open in a three-pane editor with your version, the incoming version and the result side by side.

## When not to use it

PyCharm is heavy: indexing a large project with many dependencies takes time and memory. For quick scripts or a slow machine, a lighter editor with a Python language server may suit you better.

## Further reading

- [PyCharm documentation](https://www.jetbrains.com/help/pycharm/getting-started.html)
- [Unified PyCharm: what changed](https://www.jetbrains.com/help/pycharm/unified-pycharm.html)
