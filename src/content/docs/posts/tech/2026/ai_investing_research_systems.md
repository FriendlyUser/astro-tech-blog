---
title: "AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett"
description: "How ai-berkshire turns Claude Code into a four-analyst value investing team, how it compares with TradingAgents, and what research says about LLM stock picking."
tags: ["AI Agents", "Investing", "Claude Code", "Value Investing", "LLM", "Open Source"]
pubDate: "2026-11-12T16:00:00.000Z"
imgSrc: "/imgs/2026/ai_investing_research_systems.webp"
imgAlt: "A candlestick chart with four connected agent nodes labelled Buffett, Munger, Duan and Li Lu"
---

I have been using LLMs to double-check stock ideas for a few years, from role-playing analyst crews with CrewAI to a [fork of ai-hedge-fund](https://github.com/FriendlyUser/ai-hedge-fund). The project that took off in 2026 is different from both. [ai-berkshire](https://github.com/xbtlin/ai-berkshire) is not a trading bot. It is a set of Claude Code (and Codex) skills that make a coding agent act like a research team, and it had about 17,000 GitHub stars by mid-November.

This post looks at how it actually works, compares it with the other big open-source projects, and covers what the research says about LLMs picking stocks. None of this is investment advice. The projects themselves say the same.

## What ai-berkshire is

The README describes it as "AI-era Berkshire": a value-investing research framework built for Claude Code and Codex. It combines the methods of four investors — Warren Buffett, Charlie Munger, Duan Yongping and Li Lu — with multi-agent analysis. It was created in April 2026, it is MIT-licensed, and most of its output is in Chinese, because it mainly covers Hong Kong, A-share and Taiwanese companies alongside US stocks.

Most of the repository is Markdown, not code:

- **`skills/*.md`**, about 20 slash commands. The install script copies them into `~/.claude/commands/`. A sync script generates matching `SKILL.md` files for Codex.
- **`tools/`**, a few Python helpers for the parts an LLM should not do in its head.
- **`reports/`**, about 250 generated research reports, which you can also browse on the [project's site](https://xbtlin.github.io/ai-berkshire/).
- **A trading-record folder** (`实盘记录`), which logs the author's own trades and sell rules.

### The skills

You run them like any Claude Code command, for example `/investment-research Tencent` or `/investment-team Meituan`. They group roughly like this:

| Group | Skills |
|---|---|
| Deep research | `investment-research`, `investment-team`, `management-deep-dive`, `private-company-research`, `deep-company-series` |
| Earnings | `earnings-review`, `earnings-team` |
| Screening | `industry-research`, `industry-funnel`, `quality-screen`, `bottleneck-hunter`, `era-alpha`, `investment-checklist` |
| Portfolio | `portfolio-review`, `thesis-tracker`, `thesis-drift`, `news-pulse`, `income-investment` |
| Tools | `financial-data`, `dyp-ask`, `wechat-article` |

`thesis-drift` and `thesis-tracker` are the ones I find most interesting. They check whether the reasons you bought something still hold, which is where most individual investors go wrong.

### How the "team" works

`/investment-team` is the flagship. It uses Claude Code's agent tools directly:

1. The main session acts as a team lead and creates one task per analyst.
2. It launches four background subagents in parallel, each with one lens:
   - **Duan Yongping:** the business model, and whether this is "the right business".
   - **Buffett:** financials and valuation.
   - **Munger:** industry structure and competition, including inversion ("how could this company die?").
   - **Li Lu:** risk and management.
3. Each subagent runs its own web searches and sends its findings back to the lead.
4. The lead writes the final report: a bull case and a bear case, a Buffett-style checklist, star ratings, a pass/fail/"gray" verdict, and tiered price bands.

The project calls this adversarial analysis. In practice the agents don't debate each other: they research independently, and the lead combines the results. The opposition is built into the prompts instead. Every section must include a counter-argument, Munger's lens is explicitly about how the investment fails, and there is a "why are smart people shorting this?" check.

One detail is a good lesson for anyone building on agents. Before launching the team, the skill checks that web search is allowed. Background subagents can't stop to ask for permission, and without search they quietly fall back to what the model remembers from training. For a stock report, that means stale numbers presented as current ones.

### Where it uses code instead of the model

The Python tools cover the parts LLMs are bad at:

- **`financial_rigor.py`** does exact decimal arithmetic for market cap and valuation, three-scenario valuations, and cross-checks between sources. It also runs a Benford's-law check that can flag suspicious reported numbers.
- **`report_audit.py`** samples about 15% of the figures in a finished report, re-checks them, and passes or rejects the report.
- **Market-data helpers** for Taiwan (FinMind) and mainland China, plus a scraper for the Xueqiu community.
- **A two-source rule:** every key figure has to come from two sources, such as macrotrends and stockanalysis for US stocks.

That combination — the model writes the reasoning, deterministic code checks the numbers — is the main thing I would copy from this project.

### Running it

Installing is a clone and a script:

```bash
git clone https://github.com/xbtlin/ai-berkshire.git
cd ai-berkshire
./scripts/install-claude-commands.sh   # copies skills/*.md into ~/.claude/commands/
```

The README suggests running Claude Code with `--dangerously-skip-permissions` so the agents never stop for approval, and it does warn about that. I would not. A session that searches the web and writes files with every safety check off is exactly where a prompt injection on some financial page does damage. Allow web search and file writes inside the project folder instead, and keep the rest of the prompts on.

### About the performance claims

The README claims returns of +69.29% in 2024 and +66.38% in 2025, with screenshots from a Futu brokerage account, and calls the portfolio "audited". Those figures are self-reported, and I found no independent audit. The trading log is more useful than the headline numbers:

- **It is concentrated.** In September 2026 it showed about 93% exposure to Chinese platform companies.
- **It records the author breaking their own rules,** such as one position above its size cap and one purchase that failed the framework's own gross-margin test.

That honesty is good. It also shows that a disciplined process on paper doesn't make the person running it disciplined.

## How it compares with the other big projects

Star counts are from the GitHub API on November 14, 2026:

| Project | Stars | What it is |
|---|---|---|
| [TradingAgents](https://github.com/TauricResearch/TradingAgents) | ~122k | A simulated trading firm: analyst agents, bull/bear researchers who actually debate, a trader and a risk team. Apache-2.0. |
| [ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) | ~65k | Agents named after famous investors plus valuation, sentiment and technical agents, feeding a portfolio manager. Educational, no real trading. MIT. |
| [Qlib](https://github.com/microsoft/qlib) | ~50k | Microsoft's quant research platform: data, factor models and backtesting. Not LLM-first, but many LLM projects use it underneath. |
| [FinGPT](https://github.com/AI4Finance-Foundation/FinGPT) / [FinRobot](https://github.com/AI4Finance-Foundation/FinRobot) | ~22k / ~8k | Finance-tuned models, and an agent platform for analyst-style reports. |
| [ai-berkshire](https://github.com/xbtlin/ai-berkshire) | ~17k | Skills for a coding agent you already use; long-form fundamental research rather than trade signals. |

The main difference is the runtime:

- **TradingAgents and ai-hedge-fund are applications.** You run their Python code, which calls an LLM API.
- **ai-berkshire is a set of instructions for an agent harness.** Claude Code or Codex does the orchestration, web search, file writing and subagents. Most of the repository is prompts, so the project is small, and it improves whenever the agent and the models do.

The trade-off is reproducibility. A Python pipeline with fixed prompts and a backtest is easier to evaluate than an agent that decides how to research each time.

## What the research says about LLM stock picking

The evidence through 2026 is consistent: LLM agents produce plausible analysis, but there is little proof they beat the market.

- **[StockBench](https://arxiv.org/abs/2510.02209)** tested LLM agents on realistic multi-month trading. Most failed to beat a simple equal-weight buy-and-hold baseline.
- **A May 2026 [study of ten frontier LLM agents](https://arxiv.org/abs/2605.28359)** trading China's CSI 300 from 2024 to 2026 hid tickers and dates so the models couldn't use what they remembered. Their returns were "largely explained by passive market and style exposure", with "limited evidence of persistent stock-selection alpha".
- **Live competitions** like nof1's Alpha Arena in late 2025 got a lot of attention. Most models lost money in the crypto season, and I couldn't find an official results page to verify the winners, so I wouldn't read much into them.

That second study points at the main trap when judging these tools. If a model has read about a company's last three years, a backtest over those years is partly a memory test. Hiding names and dates is the minimum control. A real record has to be forward-looking, and long enough to cover a bad year.

## How I would use these tools

- **Use them to research, not to decide.** The value is breadth: four lenses, a bear case you would not write yourself, and a checklist that makes you look at the balance sheet.
- **Check every number that matters.** Check it yourself, or with code, the way ai-berkshire's audit script does. LLMs still mix up fiscal years, units and share classes.
- **Track the thesis, not the price.** Write down why you bought, and re-run something like `thesis-drift` after each earnings report.
- **Keep the agent's permissions narrow.** A research agent needs web search and somewhere to write files, not your whole machine.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests](/posts/tech/2026/recording_api_traffic_in_chrome/)
- [Vue 3 Six Years On: What Changed from 3.0 to 3.6](/posts/tech/2026/vue_3_since_launch/)
- [Vue 3 Frameworks in 2026, and What Changed in Astro](/posts/tech/2026/vue_frameworks_and_astro_in_2026/)
- [Static Recompilation: How Old Games (and Old Software) Become Native Apps](/posts/tech/2026/static_recompilation_games_and_software/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
- [What Changed in Claude Code in 2026](/posts/tech/2026/claude_code_changes_2026/)
