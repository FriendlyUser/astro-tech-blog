---
title: "What Changed in Claude Code in 2026"
description: "Claude Code's 2026 releases, from Opus 4.6 to Fable 5.2: agent teams, background sessions, workflows, plugins and skills, auto mode and new usage limits."
tags: ["Claude Code", "AI Agents", "Developer Tools", "Claude", "MCP", "Anthropic"]
pubDate: "2026-11-14T08:00:00.000Z"
imgSrc: "/imgs/2026/claude_code_changes_2026.webp"
imgAlt: "A terminal window showing Claude Code commands for agents, plugins and workflows"
---

Claude Code shipped more than 250 releases between January and mid-November 2026, from v2.1.x in January to v2.1.325 on November 13. Most were small. Taken together, the tool I use now works very differently from the one I used last December: back then it was one assistant in one terminal, and now one session can coordinate dozens of agents running in the background.

This post groups the year's changes by theme rather than by release. The version numbers are there in case you want to find the [release notes](https://github.com/anthropics/claude-code/releases) for a specific change.

## Models

Claude Code got each new Claude model on launch day, so its release notes double as a timeline of the year's models:

| Claude Code version | Date | Model added |
|---|---|---|
| v2.1.32 | Feb 5 | Opus 4.6, plus fast mode two days later |
| v2.1.45 | Feb 17 | Sonnet 4.6, with 1M context on Max from Feb 19 |
| v2.1.111 | Apr 16 | Opus 4.7, with a new `xhigh` effort level |
| v2.1.170 | Jun 9 | Fable 5, described as a Mythos-class model made safe for general use |
| v2.1.197 | Jun 30 | Sonnet 5, which became the default model, with 1M context |
| v2.1.219 | Jul 24 | Opus 5 |
| v2.1.257 | Sep 1 | Fable 5.1 |
| v2.1.280 | Sep 22 | Opus 5.5 ($4/$20 per million tokens) |
| v2.1.284 | Sep 28 | Sonnet 5.5 ($2/$10) |
| v2.1.293 | Oct 7 | Haiku 5.5 ($0.10/$0.50) |
| v2.1.321 | Nov 9 | Fable 5.2: the new default Fable model, 1M context, $8/$40 |

The practical takeaway is that the model you pick matters less than it did a year ago, while effort level and workload size matter more. Opus 5.5 and Sonnet 5.5 handle most coding work. Fable is for the long, hard sessions.

## From one agent to many

This is the biggest change of the year, and it arrived in stages.

**Agent teams (February).** v2.1.32 added agent teams as a research preview, behind `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. A lead agent can create tasks, start teammates and message them. Hooks for `TeammateIdle` and `TaskCompleted` followed in the next release.

**Background sessions (May to August).** `claude agents` became a list of every running session (v2.1.139, May 11). `/resume` started working with background sessions (May 19). By late August, `claude attach`, `logs` and `stop` (v2.1.251) let you treat sessions like long-running processes.

**Dynamic workflows (May 28).** v2.1.154 introduced workflows: "ask Claude to create a workflow and it orchestrates work across tens to hundreds of agents in the background". `/workflows` shows the runs. Later releases added:

- a setting that caps how large a workflow may get (July);
- support for up to 256 agents at once (September);
- a separate, cheaper model for workflow subagents (October).

**Sensible limits.** In July a session got a cap of 200 subagents, with 20 running at once. In October, subagents in the desktop app and VS Code started running in the background by default, so the main conversation keeps going while they work.

The smaller additions in this area are useful on their own:

- **`/loop`** (March) repeats a prompt on an interval.
- **The Monitor tool** (April) waits for a condition instead of polling.
- **`/goal`** (May) keeps a long-running objective in view.
- **Idle compaction** (October) shrinks a long conversation's context while it is idle.

When I [built a JRPG overnight](/posts/tech/2026/building_afterlight_jrpg_with_claude_code/) in one session with eleven helper agents, this is the machinery I was using without thinking about it.

## Plugins, skills and mods

Claude Code's extension system grew from "a folder of slash commands" into a package ecosystem.

**Plugin features:**
- **Pinning to a commit SHA** (January): plugins can be pinned so a marketplace update can't change them under you.
- **`/reload-plugins`** (March) and **`claude plugin init`** (May) made writing your own plugin practical.
- **More sources** (August): zip and archive sources, and GitLab-hosted marketplaces.
- **`claude plugin eval`** (September) runs test suites against a plugin, so you can tell whether a skill change made it better or worse.

**Skills follow you everywhere.** Since v2.1.275 (September 17), skills and plugins set up on claude.ai sync to the terminal.

**Other agents' instructions are read.** Since September 18, `AGENTS.md` (the instructions file Codex and other agents use) is read when a project has no `CLAUDE.md`. That matters for repos shared between tools. The [ai-berkshire](/posts/tech/2026/ai_investing_research_systems/) investing framework ships both files for exactly this reason.

**Mods** (v2.1.287, October 1) go a step further. A plugin can change Claude Code's own interface and behaviour, for example by adding a panel that stays next to the chat.

## Hooks

Hooks run your scripts at fixed points in a session. They gained many new events this year:

- **Config and files:** `ConfigChange`, `InstructionsLoaded`, `CwdChanged` and `FileChanged`.
- **Worktrees:** `WorktreeCreate` and `WorktreeRemove`.
- **Failures and permissions:** `StopFailure` and `PermissionDenied`.
- **Display and models:** `MessageDisplay`, plus `PreModelSwitch` and `PostModelSwitch`.

In October, command and HTTP hooks gained `onFailure: "block"`. A failing hook can now stop the action instead of only logging a warning. If you use hooks as guardrails, that is the setting you want.

## Permissions and auto mode

Auto mode replaces most permission prompts with a classifier that approves routine actions and stops risky ones. It was in use by late March. It reached Max subscribers on Opus 4.7 in April, and Bedrock, Vertex and Foundry users in May. `/permissions` got an Auto mode tab in August.

Two things to know about it:

- **It is not "skip permissions".** Some actions are still refused unless you approve them, in particular ones that reach outside the task, such as publishing, merging or deleting.
- **Many releases fix permission edge cases.** The Fable 5.2 release alone fixed cases where a read-only Bash command ran outside the sandbox without a prompt, and where a `cp` or `mv` into a protected directory escaped the deny rules. Keep Claude Code updated if you rely on auto mode.

## Where Claude Code runs

- **Desktop app.** A startup prompt for it appeared in March, and `claude --desktop` arrived in September. The app's Code tab adds a built-in browser pane, split views and a task list next to the conversation.
- **Remote and cloud sessions.**
  - Remote Control lets you drive a session from another device, now including VS Code (March).
  - Team and Enterprise plans can use self-hosted runners for web, mobile and desktop sessions (August).
  - In November, `claude remote-control` gained `--settings` to apply a settings file to every session it starts.
- **Browsers.** Claude in Chrome works from VS Code (January). The desktop app's built-in browser gives sessions their own isolated browser for previews and testing.

## MCP

- **Tool search on by default** (January), so large MCP setups don't fill the context with tool definitions.
- **Elicitation support** (March): MCP servers can ask the user questions mid-task.
- **`--channels`** (March, research preview): MCP servers can push messages into a session.
- **The 2026-07-28 spec is the default** for cloud and Remote Control connectors (October). This is the stateless version of MCP covered in [this week's AI post](/posts/tech/2026/ai_advancements_fall_2026/).
- **MCP tasks run in the background** (November).

## Usage limits

Anthropic raised weekly limits by 50% from May 13 to September 13. From [September 14](https://support.claude.com/en/articles/15910845-claude-code-may-july-2026-weekly), limits settled permanently 25% above the levels before the promotion for Pro, Max, Ultra, Team and seat-based Enterprise plans. That is less than during the promotion but more than at the start of the year. Expect to hit limits with workflows that start dozens of agents; that is what the workflow size setting and the separate workflow-subagent model are for.

## What I would change in my own setup

If you configured Claude Code early in the year and haven't revisited it:

1. **Let subagents and workflows do the fan-out.** Large refactors, reviews across many files and research tasks are faster and use less context in the main session.
2. **Move repeated prompts into skills,** and test them with `claude plugin eval` before sharing them.
3. **Use hooks with `onFailure: "block"`** for the checks that must never be skipped.
4. **Pick the model per job.** Sonnet 5.5 or Opus 5.5 by default, Haiku 5.5 for workflow subagents doing simple work, and Fable 5.2 for the hard problems.
5. **Update often.** A surprising share of each release is permission and sandbox fixes.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests](/posts/tech/2026/recording_api_traffic_in_chrome/)
- [Vue 3 Six Years On: What Changed from 3.0 to 3.6](/posts/tech/2026/vue_3_since_launch/)
- [Vue 3 Frameworks in 2026, and What Changed in Astro](/posts/tech/2026/vue_frameworks_and_astro_in_2026/)
- [Static Recompilation: How Old Games (and Old Software) Become Native Apps](/posts/tech/2026/static_recompilation_games_and_software/)
- [AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett](/posts/tech/2026/ai_investing_research_systems/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
