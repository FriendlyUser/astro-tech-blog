---
title: "My esports betting tools: odds scrapers, LLM pickers and a live LoL win model"
description: "How my esports betting repos work: a PlayNow odds scraper, LLM match pickers, and esports-odds-live, which prices live LoL games from op.gg data."
tags: ["python", "web scraping", "esports", "League of Legends", "LLM", "Gemini"]
pubDate: "2026-11-15T16:00:00.000Z"
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2026/esports_betting_libraries.webp"
imgAlt: "A live win-probability line for a League of Legends game, crossing 50% and climbing toward one team"
---

Over the last two years I've written a series of small tools for betting on esports, mostly League of Legends. The early ones scraped bookmaker odds or asked an LLM who would win. The latest, `esports-odds-live`, follows a pro game while it's being played. It reads the live data feed on esports.op.gg, turns each update into a win probability, and says in plain words why the number moved.

This post walks through what each tool does, then spends most of its time on `esports-odds-live`, because it's the only one that's a real package with a CLI and an API you can import.

## The earlier tools

These are scripts and experiments rather than libraries, but they explain why the current tool looks the way it does.

- **[esports_scrapping_dpm](https://github.com/FriendlyUser/esports_scrapping_dpm)** drives Chrome with [pydoll](https://github.com/autoscrape-labs/pydoll), opens the League of Legends page on PlayNow (BCLC's sportsbook), and parses each match card with BeautifulSoup into a DataFrame: date, region, both teams, both prices. It keeps matches from the major leagues (LCK, LEC, LCS, LCP, MSI, Worlds) and flags lopsided lines, where either price is at or below 1.33 or at or above 3.0. A GitHub Actions workflow runs it on Ubuntu under Xvfb behind a proxy.
- **[league_agents](https://github.com/FriendlyUser/league_agents)** is a [CrewAI](https://crewai.com) crew. A team-performance analyst, a meta analyst and a lead analyst read 2025 match data from [Oracle's Elixir](https://oracleselixir.com/), patch notes and caster transcripts, then write a prediction for an upcoming LCK match. `leaguegambling` was an earlier version of the same idea with Gemini and a 2024 LCK CSV.
- **esports_betting_app** is a small React and Vite app built in Google AI Studio. You give it two teams, a game and optional decimal odds. Gemini 2.5 Flash, with Google Search grounding, returns recent results, roster news, a win probability and a bookmaker-implied probability. The app shows that next to a full-Kelly stake for a bankroll you enter. Search grounding can't be combined with a response schema in the Gemini API, so the app asks for JSON in the prompt and then pulls out the outermost braces from the reply.
- **live_betting** (Python) and **live-betting** (C#) were first attempts at following a game while it was live: find the lolesports YouTube stream, take screenshots or run Whisper on the audio, and act on what came out.

The common problem: an LLM reading news or transcripts gives you an opinion, not a price that updates as the game goes on. That's what `esports-odds-live` is for.

## esports-odds-live

The package is `esports-odds-live` (import name `esports_odds`, CLI `esports-odds`, version 0.2.0). It needs Python 3.10 or newer. It isn't on PyPI, so install it from a checkout:

```bash
python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"
esports-odds setup-chrome    # only if there's no Chrome or Chromium on the machine
```

### Where the data comes from

esports.op.gg serves its schedule, team stats and live game frames through a GraphQL endpoint (`https://esports.op.gg/matches/graphql/__query__<Operation>`). The client sends the same queries the site's own pages send, asking only for the fields it uses: upcoming matches by series, match details, the community prediction, a tournament preview with team and player stats, and `currentLiveGame` for live frames.

There are two transports:

- **browser** (the default) uses pydoll to open a real, visible Chrome window and runs each request as a `fetch()` inside an esports.op.gg tab. op.gg's CDN refuses headless browsers, which is why the window has to be visible. On WSL it appears through WSLg.
- **http** sends plain HTTPS with httpx and the user agent `esports-odds-live/0.2 (+personal match analysis)`. Use `--transport http` when there's no display.

op.gg's robots.txt only disallows `/summoners`, which the tool never requests. It polls the live game every 5 seconds, the same interval the site uses.

### Following a match

```bash
esports-odds schedule                                       # upcoming Worlds matches, local times
esports-odds preview "IG GEN"                               # team preview, plus an LLM read if a key is set
esports-odds follow "IG GEN" --wincon --log ig_gen.jsonl    # wait for the start, then price every frame
esports-odds report --live-log ig_gen.jsonl --out ig_gen.html
```

A match can be an op.gg match id, an esports.op.gg URL, two team tags or `next`. `--league` changes the league (the default is `Worlds`).

`follow` runs a whole series. It prints the preview, sleeps until op.gg opens the live view (15 minutes before the scheduled start, re-checking the schedule every 10 minutes for delays), then prices every frame. Each update names who is dead or low on health and which lanes are ahead on gold. A game ends when op.gg marks it finished or no frames arrive for 90 seconds. The winner comes from op.gg's official game record, and the series odds carry over to the next game.

The live frames have team gold, kills, towers, inhibitors, drakes, barons and every player's champion, level, gold, K/D/A, items and health. They don't have map coordinates, so the tool can't tell you where anyone is standing.

The pre-match prior is either your bookmaker prices (`--odds-a 2.20 --odds-b 1.58`, with the vig removed) or, by default, op.gg's community prediction. The tool labels that one as a fan vote, not a market.

### The model

`esports_odds/lol/model.py` is a logistic model in which gold difference does most of the work. It's the best single real-time signal in pro LoL, because kills, CS, plates, towers and most objectives all turn into gold. A 1k lead is worth 0.30 logit at 20:00, and more per 1k before that (`0.30 * (20 / t) ** 0.4`, flat below 10:00 so tiny early leads don't swing the number). With an even prior, a 5k lead at 20 minutes comes out at about 82%.

The other terms add only what gold misses:

- inhibitors (0.30 logit each) and towers (0.10)
- drakes (0.10 each), soul point (0.15) and soul (0.55)
- baron buff (0.70 for 180 s) and elder buff (1.00 for 150 s)
- average level difference (0.15 per level), kills (0.02 each)
- players alive, from 10 minutes on, scaled up as respawn timers get longer
- the pre-match prior, which fades as the game goes on (to 47% of its weight at 20 minutes) but never drops below 35%

These coefficients are hand-set defaults in `LolCoefs`, not fitted to a dataset.

Every term is added in logit space, and the change in probability from each one is recorded as a `Factor`. That's what makes the explanations possible: the output says how many points came from gold, how many from towers, and so on. You can use the model without the CLI or op.gg:

```python
from esports_odds.odds import MarketLine, parse_odds
from esports_odds.models import build_model
from esports_odds.state import GameState

line = MarketLine(parse_odds("2.20"), parse_odds("1.58"))   # DK / BLG, best of 5
model = build_model("lol", line.fair_prob_a, best_of=5)     # series prior -> per-game prior

state = GameState(game="lol", team_a="DK", team_b="BLG", clock_s=20 * 60,
                  gold_a=38_000, gold_b=33_000, towers_a=3, towers_b=1,
                  dragons_a=2, dragons_b=1)
est = model.estimate(state)

print(f"DK wins this game {est.p_map:.1%}, the series {est.p_series:.1%}")
for f in est.factors:
    print(f"  {f.name:<16} {f.delta_p * 100:+5.1f} pts  {f.description}")
for name, p in est.scenarios.items():
    print(f"  if {name}: {p:.1%}")
```

```text
DK wins this game 84.8%, the series 56.3%
  gold             +31.8 pts  DK +5.0k (14% of team gold); 1k is worth 0.30 logit at 20 min
  pre-match prior   -1.3 pts  pre-match 46% for DK, 47% weight at 20 min
  towers            +3.0 pts  towers 3-1
  dragons           +1.3 pts  drakes 2-1
  if DK +2k gold: 91.0%
  if BLG +2k gold: 75.3%
  if Baron to DK: 94.6%
  if Baron to BLG: 63.8%
```

`build_model` treats the prior as a series probability by default. It inverts the best-of-5 series formula to get a per-game probability (41.8% for the series becomes 45.6% per game), and `series_win_prob` folds the current game back into the series using the maps already won. The Baron scenarios only appear from 20:00 on.

### The LLM win-condition analyst

With `--wincon`, an LLM reads the draft at lock-in and re-checks it every 5 game minutes and after barons, elders, inhibitors or soul. The default is Gemini (`gemini-3.5-flash`, with `GEMINI_API_KEY`). `--wincon-provider claude` uses Claude with `ANTHROPIC_API_KEY`. It returns a fixed schema that includes a late-game edge and an early-game edge, each between -1 and 1. The model applies these as bounded terms. The late-game edge ramps in from 18 to 35 minutes and is capped at ±0.6 logit. The early-game edge fades out by 20 minutes and is capped at ±0.3. A real gold lead always outweighs the LLM's opinion.

Two checks keep it honest. The prompt includes Riot's own description of each pick from Data Dragon, so the LLM doesn't guess at new champions. And if it names a champion that isn't in the draft, its confidence drops to low. The same roster check applies to the match preview, which drops any player it names who isn't on either team.

Without an API key, the LLM steps are skipped with a note, and everything else works.

### Odds helpers

`esports_odds/odds.py` covers the bookmaker side. `parse_odds` accepts decimal (`1.85`), American (`+150`, `-120`) and fractional (`5/4`) prices. `MarketLine` gives you the overround and vig-free probabilities by proportional normalisation. The CLI wraps it:

```bash
esports-odds odds 2.20 1.58
```

```text
Decimal: 2.200 / 1.580
Raw implied: 45.5% / 63.3% (book margin 8.75%)
Vig-free: 41.8% / 58.2%
```

`best_edge` compares a model probability with a line and returns the side with the higher expected value, along with the full-Kelly fraction:

```python
from esports_odds.odds import MarketLine, best_edge

e = best_edge(0.50, MarketLine(2.20, 1.58))
print(e.side, f"{e.edge_points:+.1f} pts", f"EV {e.expected_value:+.1%}", f"Kelly {e.kelly_fraction:.1%}")
# A +8.2 pts EV +10.0% Kelly 8.3%
```

During a live game, the explainer won't call anything "value" against pre-match prices, because those are stale once play starts. It only reports how far the model has moved. To compare with live prices, point `--live-odds-file` at a JSON file like `{"team_a": 1.9, "team_b": 1.95}`. The tool re-reads it on every update. It only mentions a gap when the edge is at least 4 points and the expected value is positive, and even then it notes that the model can't see form, side or map-pool edges.

### CS2, Valorant and Dota 2

`esports-odds demo --game cs2 --team-a NAVI --team-b FaZe --odds-a 1.70 --odds-b 2.15` runs a simulated match with no stream or key. For CS2 and Valorant, `RoundModel` is an exact Markov chain over rounds with each game's overtime rules: MR3 overtimes in CS2, win-by-two in Valorant. It solves for the per-round win rate that matches the pre-match price, then shrinks it toward what's happening on the map, with the prior worth 60 rounds of evidence. Dota 2 uses a generic logistic model on gold, towers and kills, with gold worth about half as much as in LoL because of Dota's comeback mechanics. There's no live feed for these games yet; they run on the demo or the legacy readers.

### The legacy YouTube tools

Before the op.gg feed, the tool read the broadcast itself. That code is in `esports_odds/legacy/` and needs `pip install -e ".[youtube]"` (yt-dlp, OpenCV, NumPy, RapidOCR). It OCRs the Worlds 2026 scoreboard every 10 seconds and sorts each frame into game, draft or something else (desk, ads, replays). It reads the draft by matching scoreboard portraits to Data Dragon champion icons. It can also follow YouTube live chat and line it up with the game clock, and it never quotes messages with slurs or insults. `esports-odds backtest` replays a VOD through the same pipeline, and `esports-odds report` turns the results into an HTML report for the series.

The README has one worked example: the DK vs BLG Worlds 2026 quarterfinal, which BLG won 3-0. Across 459 updates, the live model's Brier score was 0.128, against 0.208 for the pre-match odds alone. Three games is a demonstration, not a calibration.

## Gotchas

- **The browser has to be visible.** op.gg rejects headless Chrome, so a server run needs a display (Xvfb, WSLg) or `--transport http`. Run `esports-odds preflight <match>` before a session to check the browser, feed and keys.
- **op.gg's GraphQL isn't a public API.** Field names were copied from the site's own requests, and they can change without notice. The lolesports live-stats feed used by the legacy `--source lolesports` mode is also unofficial and undocumented.
- **The coefficients are guesses.** They're reasonable defaults, not a model fitted to past games. One three-game backtest doesn't show the probabilities are calibrated. Logging sessions with `--log` and checking them later is the way to find out.
- **`__version__` is out of date.** `esports_odds.__version__` still says 0.1.0, while `pyproject.toml` and the user agent say 0.2.0.
- **The Gemini free tier runs out.** In the DK vs BLG backtest, the daily quota ran out during game 3. `--wincon-recheck-min` spaces out the re-checks, and `--wincon-replay` re-runs a backtest with its recorded LLM answers instead of calling the API.
- **Kelly is aggressive.** Both `best_edge` and the betting app report full Kelly. With a model this rough, a fraction of that, or no bet at all, is the safer reading.

- **No live feed outside LoL.** The CS2 and Valorant round model is exact, but today it only runs on the simulated demo or the legacy stream readers.

None of these tools makes betting profitable, and the model's probabilities are estimates, not a guarantee. If you bet, set a limit you can afford to lose before you start. Provincial lottery corporations run responsible-gambling programs, such as BCLC's GameSense, with information and support contacts.
