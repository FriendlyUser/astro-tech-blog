---
title: "A small data pipeline with Dagster assets"
description: "Build a three-step Dagster pipeline from @asset functions: dependencies, Definitions, the dagster dev UI, a daily schedule and asset checks, all in one file."
tags: ["Python", "Dagster", "Data Engineering", "Orchestration", "Data Quality"]
pubDate: "2026-12-06T16:00:00.000Z"
imgSrc: "/imgs/2026/dagster_assets_pipeline.webp"
imgAlt: "An asset graph of three connected nodes, raw_orders to cleaned_orders to daily_revenue, with green check badges and a clock for the schedule"
---

Dagster is a Python orchestrator built around *assets*: the tables, files and models your pipeline produces. You write a function per asset, name its inputs after the assets it depends on, and Dagster works out the graph, runs it, records each materialisation, and shows the lineage in a web UI.

That model fits small pipelines well. Most "jobs" are really "keep these three tables up to date", and with assets you describe the tables, not the order of steps. This post builds one in a single file: three assets, two data-quality checks and a daily schedule. The examples were run with Dagster 1.13 and pandas on Python 3.12, and they only use APIs that have been stable across recent 1.x releases.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate        # .venv\Scripts\activate on Windows
pip install dagster dagster-webserver pandas tabulate
```

`dagster-webserver` provides the UI. `tabulate` is only there because one asset renders a Markdown preview with `DataFrame.to_markdown()`.

The input is a small CSV export, `data/orders.csv`, with a missing amount and a duplicated order, the kind of thing a real export contains:

```text
order_id,customer,amount,ordered_at
1001,acme,120.00,2026-12-01T09:12:00
1002,globex,75.50,2026-12-01T11:40:00
1003,initech,,2026-12-01T15:05:00
1004,acme,42.00,2026-12-02T08:30:00
1004,acme,42.00,2026-12-02T08:30:00
1005,umbrella,310.00,2026-12-02T17:55:00
1006,globex,18.25,2026-12-03T10:15:00
```

## Three assets

Save this as `defs.py` next to the `data` folder:

```python
from pathlib import Path

import dagster as dg
import pandas as pd

DATA = Path(__file__).parent / "data"


@dg.asset(group_name="sales")
def raw_orders(context: dg.AssetExecutionContext) -> pd.DataFrame:
    """Orders as exported by the shop, unmodified."""
    df = pd.read_csv(DATA / "orders.csv", parse_dates=["ordered_at"])
    context.add_output_metadata({"rows": len(df)})
    return df


@dg.asset(group_name="sales")
def cleaned_orders(context: dg.AssetExecutionContext, raw_orders: pd.DataFrame) -> pd.DataFrame:
    """One row per order, no missing amounts."""
    df = raw_orders.drop_duplicates(subset="order_id").dropna(subset=["amount"])
    context.add_output_metadata({
        "rows": len(df),
        "dropped": len(raw_orders) - len(df),
    })
    return df


@dg.asset(group_name="sales")
def daily_revenue(context: dg.AssetExecutionContext, cleaned_orders: pd.DataFrame) -> pd.DataFrame:
    """Revenue per calendar day, also written to data/daily_revenue.csv."""
    df = (
        cleaned_orders.assign(day=cleaned_orders["ordered_at"].dt.date)
        .groupby("day", as_index=False)["amount"].sum()
        .rename(columns={"amount": "revenue"})
    )
    df.to_csv(DATA / "daily_revenue.csv", index=False)
    context.add_output_metadata({
        "days": len(df),
        "preview": dg.MetadataValue.md(df.to_markdown(index=False)),
    })
    return df
```

The dependency graph comes from the parameter names. `cleaned_orders` has a parameter called `raw_orders`, so Dagster knows it depends on the `raw_orders` asset and passes in its value. There is no separate "wire step A to step B" code to keep in sync.

How the value gets from one asset to the next is the job of an **I/O manager**. The default one pickles each return value to Dagster's storage directory and loads it for the downstream asset, which is fine for a demo and for small frames. For real tables you would swap in an I/O manager for your warehouse (Dagster has integration packages for DuckDB, Snowflake, BigQuery and others), or have the asset write the table itself and return nothing.

`context.add_output_metadata` attaches values to the materialisation. They show up in the UI next to each run, and numeric values are plotted over time, so a row count that suddenly halves is visible without writing a dashboard.

## Asset checks

An asset check is a function that inspects an asset after it is materialised and reports pass or fail. Add these below the assets:

```python
@dg.asset_check(asset=cleaned_orders)
def order_ids_unique(cleaned_orders: pd.DataFrame) -> dg.AssetCheckResult:
    dupes = int(cleaned_orders["order_id"].duplicated().sum())
    return dg.AssetCheckResult(passed=dupes == 0, metadata={"duplicates": dupes})


@dg.asset_check(asset=daily_revenue)
def revenue_not_negative(daily_revenue: pd.DataFrame) -> dg.AssetCheckResult:
    negative = int((daily_revenue["revenue"] < 0).sum())
    return dg.AssetCheckResult(
        passed=negative == 0,
        severity=dg.AssetCheckSeverity.WARN,
        metadata={"negative_days": negative},
    )
```

By default a failed check is recorded and shown in red, but the run carries on and downstream assets still materialise. That is often what you want for warnings. For checks that should stop bad data from spreading, pass `blocking=True` to `@dg.asset_check`. A failed blocking check fails the run and skips the assets downstream of the checked one. `severity` (`ERROR` by default, or `WARN`) controls how the failure is displayed and alerted on; it does not block anything by itself.

## Definitions, a job and a schedule

Dagster loads everything from one `Definitions` object. A schedule needs a job to run, and `define_asset_job` builds one from an asset selection:

```python
daily_refresh = dg.define_asset_job("daily_refresh", selection=dg.AssetSelection.groups("sales"))

defs = dg.Definitions(
    assets=[raw_orders, cleaned_orders, daily_revenue],
    asset_checks=[order_ids_unique, revenue_not_negative],
    jobs=[daily_refresh],
    schedules=[
        dg.ScheduleDefinition(
            job=daily_refresh,
            cron_schedule="0 6 * * *",
            execution_timezone="Europe/London",
        )
    ],
)
```

Without `execution_timezone`, cron expressions are evaluated in UTC. Asset checks on selected assets run as part of the job, so the schedule also runs the checks.

Before starting anything, ask Dagster to load the file:

```bash
dagster definitions validate -f defs.py
```

In Dagster 1.13 this prints `Validation successful for code location defs.py.` along with a notice that the command is superseded by `dg check defs`. The `dg` CLI is the tool Dagster now recommends for projects scaffolded with `create-dagster`, but the `dagster` commands used here still work for a single file.

## The UI

```bash
dagster dev -f defs.py
```

This starts the webserver on `http://localhost:3000` and the daemon that runs schedules. Without the `DAGSTER_HOME` environment variable, `dagster dev` stores runs in a temporary directory that is deleted when it exits. Set `DAGSTER_HOME` to a folder if you want history to survive a restart.

In the UI:

- The **asset lineage graph** shows `raw_orders → cleaned_orders → daily_revenue`, with each asset's check status.
- **Materialize all** runs the graph. Clicking an asset shows its metadata, including the Markdown preview of the revenue table and the `dropped: 2` count from cleaning.
- **Automation** lists the `daily_refresh_schedule`. New schedules start **stopped**; switch it on there, or pass `default_status=dg.DefaultScheduleStatus.RUNNING` to `ScheduleDefinition` if it should be on as soon as the code loads.

You can also materialise from the command line, which is handy in CI or a cron job on a box without the UI:

```bash
dagster asset materialize -f defs.py --select raw_orders,cleaned_orders,daily_revenue
```

After a run, `data/daily_revenue.csv` contains:

```text
day,revenue
2026-12-01,195.5
2026-12-02,352.0
2026-12-03,18.25
```

Order 1003 was dropped for its missing amount and the second 1004 for being a duplicate.

## Testing assets without the UI

`dg.materialize` runs assets in-process with a temporary instance, which makes the pipeline testable with pytest:

```python
# test_defs.py
import dagster as dg

from defs import cleaned_orders, daily_revenue, order_ids_unique, raw_orders, revenue_not_negative


def test_pipeline():
    result = dg.materialize(
        [raw_orders, cleaned_orders, daily_revenue, order_ids_unique, revenue_not_negative]
    )
    assert result.success
    revenue = result.output_for_node("daily_revenue")
    assert revenue["revenue"].round(2).tolist() == [195.5, 352.0, 18.25]
    checks = result.get_asset_check_evaluations()
    assert all(c.passed for c in checks)
```

Because assets are plain decorated functions, you can also call one directly with a DataFrame, such as `cleaned_orders(dg.build_asset_context(), some_df)`, to unit-test the transformation alone.

## Gotchas and when not to use it

- **Parameter names are the wiring.** Renaming an asset function renames the asset and breaks every downstream parameter that referred to it. Use `ins={"orders": dg.AssetIn("raw_orders")}` if you want a different local name.
- **The default I/O manager pickles.** Fine locally, but pickles are tied to library versions and are not something other tools can read. Pick a real storage layer before the pipeline has users.
- **Schedules need the daemon.** `dagster dev` runs one. In production you run `dagster-daemon` alongside the webserver, or use Dagster's hosted offering.
- **Memory.** Passing DataFrames between assets means each one is loaded in full. For large data, let the asset run SQL in the warehouse and pass nothing in memory.
- **It may be more than you need.** For one script that runs nightly, cron plus good logging is simpler. Dagster earns its place once you have several datasets with dependencies, need to know which ones are stale, or want checks and lineage that other people can look at.

## Further reading

- [Dagster docs: assets](https://dagster.io/docs/guides/build/assets)
- [Dagster docs: asset checks](https://dagster.io/docs/guides/test/asset-checks)
- [Dagster docs: I/O managers](https://dagster.io/docs/guides/build/io-managers)
- [Dagster docs: schedules](https://dagster.io/docs/guides/automate/schedules)
- [Dagster on GitHub](https://github.com/dagster-io/dagster)
