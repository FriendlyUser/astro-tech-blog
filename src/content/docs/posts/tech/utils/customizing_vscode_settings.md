---
tags: ['vscode']
title: Customizing VS Code with settings.json
description: How VS Code user, workspace and language-specific settings work, where settings.json lives, and how to share settings and extension recommendations with a team.
pubDate: Fri, 22 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1834084038_A_dream_of_a_distant_galaxy__concept_art__matte_painting__HQ__4k.png
---

Everything you change in VS Code's Settings screen ends up as a key in a JSON file. Knowing where those files are and how they override each other lets you keep per-project settings in git, set different rules for different languages, and copy your setup between machines.

## Opening settings

- **Settings UI:** `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS). Search for a setting by name and change it. There's no save button; changes apply immediately. (When you edit `settings.json` directly, changes apply when you save the file.)
- **settings.json:** open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Preferences: Open User Settings (JSON)**. You can also click the "Open Settings (JSON)" icon at the top right of the Settings UI.

## User vs workspace settings

VS Code has two main scopes:

| Scope | File | Applies to |
| --- | --- | --- |
| User | `%APPDATA%\Code\User\settings.json` (Windows), `~/Library/Application Support/Code/User/settings.json` (macOS), `~/.config/Code/User/settings.json` (Linux) | Every folder you open |
| Workspace | `.vscode/settings.json` in the project | Only that project |

Workspace settings override user settings. That makes `.vscode/settings.json` the place for project rules you want everyone to share, such as formatter and tab size, and the user file the place for personal taste like font and theme.

A user `settings.json` might look like this:

```json
{
  "editor.fontSize": 14,
  "editor.rulers": [80, 120],
  "files.autoSave": "onFocusChange",
  "workbench.colorTheme": "Default Dark Modern"
}
```

And a project's `.vscode/settings.json`:

```json
{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

The file is JSON with comments (JSONC), so `//` comments are allowed.

## Language-specific settings

Wrap settings in a `"[languageId]"` key to apply them to one language only:

```json
{
  "[python]": {
    "editor.tabSize": 4,
    "editor.formatOnSave": true
  },
  "[markdown]": {
    "editor.wordWrap": "on"
  }
}
```

The language ID is shown in the status bar's language picker. You can also run **Preferences: Configure Language Specific Settings...** from the Command Palette.

## Extensions

Open the Extensions view with `Ctrl+Shift+X` (`Cmd+Shift+X` on macOS), search, and click **Install**. Most extensions add their own settings, which show up in the Settings UI under the extension's name.

To suggest extensions to everyone working on a repository, add `.vscode/extensions.json`:

```json
{
  "recommendations": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
}
```

VS Code prompts people to install these when they open the folder. The ID is shown on each extension's Marketplace page.

## Debugging

Click in the gutter left of a line number to set a breakpoint, then open **Run and Debug** (`Ctrl+Shift+D` / `Cmd+Shift+D`) and press `F5`. For anything beyond running the current file, click "create a launch.json file"; the debug configurations are stored in `.vscode/launch.json`, which can be committed alongside `settings.json`.

## Syncing between machines

**Settings Sync** (the account icon in the bottom left, or **Settings Sync: Turn On...** in the Command Palette) syncs your user settings, keybindings, snippets and extensions through a GitHub or Microsoft account. Workspace settings aren't synced, since they live in the project.

## Further reading

- [User and workspace settings](https://code.visualstudio.com/docs/configure/settings)
- [Debugging in VS Code](https://code.visualstudio.com/docs/debugtest/debugging)
- [Settings Sync](https://code.visualstudio.com/docs/configure/settings-sync)
