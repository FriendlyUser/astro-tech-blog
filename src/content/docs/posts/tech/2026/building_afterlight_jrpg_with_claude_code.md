---
title: "Building Afterlight, a 2D-HD JRPG, with Claude Code"
description: "One long-running Claude Code session, eleven helper agents and a usage limit or two. How a three.js JRPG went from a one-paragraph prompt to a public repo overnight."
tags: ["Claude Code", "Three.js", "Game Development", "JRPG", "AI Agents", "Vite"]
pubDate: "2026-11-07T16:10:00.000Z"
---

**Afterlight** is a 2D-HD JRPG (pixel-art sprites in lit 3D dioramas) that runs in the browser on three.js. Claude Code (Opus 5.5) built nearly all of it in one session, running over SSH on my WSL machine from the afternoon of November 6, 2026 to the next morning. I wrote the prompt, answered a handful of questions and restarted it when it hit limits.

- **Play:** [friendlyuser.github.io/afterlight](https://friendlyuser.github.io/afterlight/)
- **Source:** [github.com/FriendlyUser/afterlight](https://github.com/FriendlyUser/afterlight)

## The prompt

The whole brief was one paragraph:

> Create a 2D-HD JRPG style game with three js, write a compelling plot about a coming to age story where the [world] is destroyed, do not stop until the weekly reset limit, if around 11/7/2026 11am pause existing work, but allow for it to continue. Do not stop until the deadline, make the clean code and clear, we want at least a 50 hour game with many class customization options, we are seeking to make a 10/10 jrpg

After that, my messages were mostly "continue", "try again" and, once the game existed, short requests about packaging and publishing it.

## What came out

- **No assets, no build step (at first).** three.js r170 was copied into `vendor/three` and loaded with an import map. Every character, monster, tile and prop is pixel art drawn in code. The music and sound effects are synthesized with WebAudio: about 29 songs share a leitmotif, with the melodies written by hand and the accompaniment generated from chord progressions.
- **The 2D-HD look.** The render stack is bloom → tilt-shift depth of field → colour grade and vignette → tone mapping, plus weather, god-ray light shafts, lightning on storm maps, and a light the party carries in dark places.
- **Story.** A story bible (`docs/STORY.md`) came first. Wren, the 16-year-old daughter of a lighthouse Keeper, gives the stone that powers her island's lighthouse to the man she idolizes, which breaks the sun and ends the world. The rest of the game is about growing up after that. The theme is built into the class system: the world's rule is "One Crest, one life", and the party breaks it.
- **Classes ("Crests").** 24 Crests with 10 ranks each and over 300 skills. You equip a primary and a secondary Crest, plus support passives with a point budget. Each Crest has its own battle costume, and mastering one gives a permanent stat bonus.
- **Battles.** A visible turn-order timeline, weakness "Break" bars, a shared gauge spent on Surge or two-character Link Arts, scripted bosses with telegraphed wind-ups, mid-battle Swap, auto-battle, three difficulties and a battle-speed setting.
- **Size.** By the end the validator counted 166 maps, 355 enemies and 409 enemy groups across 12 chapters, a post-game and optional content: bounty hunts, four optional dungeons, two hidden superbosses and fishing. Around that sit New Game+, autosave, a minimap, fast travel, a bestiary, a quest log and accessibility settings.

Whether it really reaches the 50 hours I asked for is unproven; the session's own estimates were per chapter, not measured playtime.

## How the session was structured

1. **Engine first, by one agent.** In about an hour and a half the main session wrote the engine core, renderer, sprite and monster generators, battle system, audio, menus, title screen, Prologue and Chapter 1. It checked itself the whole way by screenshotting the game in headless Chrome (Windows Chrome driven from WSL) and reading the images back.
2. **Contracts before parallelism.** Before handing out work, it wrote `docs/AUTHORING.md` (map formats, script API, and a table of chapter entry and exit points) and `docs/AGENT_BRIEF.md`. The brief set strict file ownership: each author creates only its own pack, story, map and test files, prefixes its ids (`c4a_`, `c7_`, and so on), and never edits the engine. If it needs an engine change, it describes it in its report instead.
3. **Ten chapter authors in parallel, then an eleventh.** Each subagent owned a block of chapters (2, 3, 4a, 4b, 5–6, 7–8, 9–10, 11, 12 and the ending, post-game), and a later one took the optional content. Content loads as independent packs, so a broken chapter logs an error and is skipped instead of crashing the game.
4. **Main agent as engine owner and reviewer.** While the authors wrote, the main session hardened shared systems (save/load, a systems smoke test, a content validator, a balance simulator) and fixed engine bugs the authors reported.
5. **Regression, balance, then shipping.** A sequential suite of 46 headless tests, a balance pass where a level-matched auto-party fought every enemy group, then a Vite build, self-hosted fonts, a GitHub Pages workflow and the public repo.

## Bugs worth remembering

- **Dark scenes were pure black.** The colour grade applied contrast in linear space, which crushed caves to black. Grading in gamma space fixed it.
- **Guard did nothing.** Effects a character applied to itself expired at the end of the same turn. That made Guard useless and meant boss "charge" wind-ups never landed. The Chapter 4a author found it, and the main agent fixed it with a `skipTick` flag and added a regression test. Fixing it made every charged boss attack work for the first time, which then needed a balance pass.
- **Tests that never finished.** In test mode a lost battle auto-confirmed "Try again" forever, and the auto-press of Z kept talking to whatever NPC stood in front of the player. Both made tests hang instead of fail. Lost battles now log the winning enemy group and fail the test, and the auto-press only fires while dialogue is open.
- **Balance numbers.** After the fixes, 441 of 447 fights were won every time by a level-matched auto party. Several bosses were softened, including one, Sister Mercy, that had never been won. All 24 Crests won 89–100% of fights with Wren as the lead.

## What went wrong in the process

- **Usage limits.** The session hit its 5-hour limit twice. All ten authors died mid-file with HTTP 429s. They could be resumed with `SendMessage` once the limit reset, but the work in between was simply lost time.
- **Too much parallelism for one machine.** Eleven agents each running headless Chrome tests pushed the load average to about 14. Tests ran into timeouts, screenshots came back blank, WSL interop failed (`accept4 failed 110`) until a restart, and memory ran out. I cancelled the background agents, and the main session finished their remaining work itself, one test at a time. Before that, parallel runs also overwrote each other's screenshots through a shared Chrome profile, which was fixed with a per-run profile directory.
- **Faster tests.** Headless rendering is slow, so the harness gained `sim=N` (render every Nth frame), `dtmax`, and a timer-driven loop. Later, `SIM=240` made the suite about three times faster.
- **Context compaction.** The session ran out of context once. The compaction summary, together with `docs/PROGRESS.md` and a memory file the agent kept updated, was enough for it to carry on without help.

## Shipping it

Once the game worked, I asked a few short questions and Claude Code handled the rest:

- **"Investigate if we have any build files."** There were none. It compared Electron, Tauri and a static web upload, and recommended a Vite web build for the web release.
- **Vite build.** Vite 6 is the only dependency. Each chapter loads as its own chunk and three.js is a separate cached chunk, about 3 MB in total (under 1 MB gzipped). The test harness is kept out of production builds.
- **Self-hosted fonts.** The three Google Fonts and their OFL licence files are now in the project, verified by blocking Google's domains in Chrome.
- **`.gitignore` and a GitHub Pages workflow.** It also found and worked around a WSL quirk: Windows npm can't delete `node_modules` on the WSL share.
- **Commit and publish.** It made one initial commit of 466 files. Before pushing to a public repo it swapped my personal email for the GitHub no-reply address, then rewrote the README with a controls table and screenshots.
- **Save files.** Saves live in `localStorage` (6 slots plus an autosave), so they're tied to the site address. It then started on an export/import option.

## Takeaways

- **A story bible and authoring contracts made the parallel agents work.** Without file ownership and id prefixes, ten writers would have overwritten each other.
- **Self-verification has to be built in.** Screenshots, a validator, smoke tests per chapter and a balance simulator caught real bugs that reading the code wouldn't have.
- **Parallelism is limited by the machine, not the model.** Every agent's headless Chrome competes for the same CPU and memory. Fewer agents with sequential tests would have finished sooner overall.
- **Write state to disk.** A progress file and memory notes made it possible to resume after usage limits and context compaction.
- **"At least 50 hours, 10/10" isn't a testable spec.** The agent took it seriously and produced a huge amount of content, but only playing it will show how much of it holds up.

## Related

- [Generating email templates with Claude Code](/posts/tech/2023/email_templates_with_claude_code/)
