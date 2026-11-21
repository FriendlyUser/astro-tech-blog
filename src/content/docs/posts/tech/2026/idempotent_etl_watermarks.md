---
title: "Idempotent ETL jobs: watermarks, upserts and safe reruns"
description: "Build an incremental extract-and-load job that can run twice without harm: high-watermarks, an overlap window for late rows, SQLite upserts and run ids."
tags: ["Python", "SQLite", "ETL", "Data Engineering", "SQL"]
pubDate: "2026-10-11T16:00:00.000Z"
imgSrc: "/imgs/2026/idempotent_etl_watermarks.webp"
imgAlt: "A timeline of source rows with a watermark line, a shaded overlap window before it, and arrows merging rows into a target table"
---

An ETL job is idempotent when running it twice with the same input leaves the target in the same state as running it once. That property is what lets you retry a failed job, rerun last night's load after a fix, or have two schedulers fire at once without double-counting revenue.

This post builds a small incremental loader that has that property. It copies changed rows from a source table to a warehouse table using a high-watermark, re-reads a short overlap window to catch late rows, and writes with `INSERT ... ON CONFLICT DO UPDATE` so re-reading is harmless. It uses only Python's standard library and SQLite, so you can run every line of it. The code was run on Python 3.12 with the SQLite bundled in the CPython Windows build; any SQLite from 3.24 onward supports the upsert syntax.

## The three ideas

**A watermark** is the highest change timestamp (or sequence number) the job has already loaded. Each run extracts rows newer than it, so you don't copy the whole table every time. The watermark is stored in the target, not in a file next to the script, and it is advanced in the same transaction as the data.

**An overlap window** handles rows that show up late. A row's `updated_at` is usually set when the writing transaction starts, but it only becomes visible when that transaction commits. A long transaction can commit a row stamped 09:15 after your job has already read up to 09:20. If the next run asks only for `updated_at > 09:20`, that row is skipped forever. Re-reading the last few minutes before the watermark catches it.

**Upserts** make the overlap safe. The overlap deliberately extracts rows you already have, so the load step must be able to receive the same row twice. An upsert keyed on the business key (here the order `id`) inserts new rows and updates existing ones. A plain `INSERT` would either fail on the primary key or, without a key, create duplicates.

Together these give you at-least-once extraction with exactly-once results in the target.

## The warehouse schema

The target holds three tables: the data, the per-job watermark, and a log of runs.

```sql
CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY,
    customer    TEXT NOT NULL,
    amount      REAL NOT NULL,
    status      TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    loaded_by   TEXT NOT NULL          -- run id that last wrote the row
);
CREATE TABLE IF NOT EXISTS etl_state (
    job        TEXT PRIMARY KEY,
    watermark  TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS etl_runs (
    run_id      TEXT PRIMARY KEY,
    job         TEXT NOT NULL,
    started_at  TEXT NOT NULL,
    finished_at TEXT,
    status      TEXT NOT NULL,
    extracted   INTEGER,
    written     INTEGER,
    watermark   TEXT
);
```

SQLite has no timestamp type, so timestamps are stored as fixed-width ISO 8601 strings in UTC (`2026-10-01T09:20:00.000000Z`). With a fixed width and a single time zone, comparing the strings gives the same answer as comparing the times. Mixing formats, such as some rows with microseconds and some without, or local times, breaks that silently.

## The job

Save this as `etl.py`:

```python
"""Incremental, idempotent load from source.db into warehouse.db."""
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone

JOB = "orders"
OVERLAP = timedelta(minutes=10)   # re-read this much before the watermark
EPOCH = "1970-01-01T00:00:00.000000Z"
FMT = "%Y-%m-%dT%H:%M:%S.%fZ"     # fixed width, so text comparison == time comparison


def utcnow() -> str:
    return datetime.now(timezone.utc).strftime(FMT)


def setup_warehouse(wh: sqlite3.Connection) -> None:
    wh.executescript("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY, customer TEXT NOT NULL, amount REAL NOT NULL,
            status TEXT NOT NULL, updated_at TEXT NOT NULL, loaded_by TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS etl_state (job TEXT PRIMARY KEY, watermark TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS etl_runs (
            run_id TEXT PRIMARY KEY, job TEXT NOT NULL, started_at TEXT NOT NULL,
            finished_at TEXT, status TEXT NOT NULL, extracted INTEGER, written INTEGER,
            watermark TEXT);
    """)


def get_watermark(wh: sqlite3.Connection) -> str:
    row = wh.execute("SELECT watermark FROM etl_state WHERE job = ?", (JOB,)).fetchone()
    return row[0] if row else EPOCH


def extract(src: sqlite3.Connection, since: str) -> list[tuple]:
    return src.execute(
        """SELECT id, customer, amount, status, updated_at
           FROM orders WHERE updated_at >= ? ORDER BY updated_at""",
        (since,),
    ).fetchall()


UPSERT = """
INSERT INTO orders (id, customer, amount, status, updated_at, loaded_by)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    customer   = excluded.customer,
    amount     = excluded.amount,
    status     = excluded.status,
    updated_at = excluded.updated_at,
    loaded_by  = excluded.loaded_by
WHERE excluded.updated_at > orders.updated_at
"""


def run(source_path: str, warehouse_path: str) -> dict:
    run_id = uuid.uuid4().hex[:12]
    src = sqlite3.connect(source_path)
    wh = sqlite3.connect(warehouse_path)
    setup_warehouse(wh)

    with wh:  # the run record survives even if the load fails
        wh.execute(
            "INSERT INTO etl_runs (run_id, job, started_at, status) VALUES (?, ?, ?, 'running')",
            (run_id, JOB, utcnow()),
        )

    try:
        old_wm = get_watermark(wh)
        since = old_wm
        if old_wm != EPOCH:
            since = (datetime.strptime(old_wm, FMT) - OVERLAP).strftime(FMT)
        rows = extract(src, since)

        with wh:  # one transaction: rows, watermark and run record commit together
            before = wh.total_changes
            wh.executemany(UPSERT, [(*r, run_id) for r in rows])
            written = wh.total_changes - before
            new_wm = max([old_wm, *(r[4] for r in rows)])
            wh.execute(
                """INSERT INTO etl_state (job, watermark) VALUES (?, ?)
                   ON CONFLICT(job) DO UPDATE SET watermark = excluded.watermark""",
                (JOB, new_wm),
            )
            wh.execute(
                """UPDATE etl_runs SET status = 'ok', finished_at = ?, extracted = ?,
                   written = ?, watermark = ? WHERE run_id = ?""",
                (utcnow(), len(rows), written, new_wm, run_id),
            )
        return {"run_id": run_id, "since": since, "extracted": len(rows),
                "written": written, "watermark": new_wm}
    except Exception:
        with wh:
            wh.execute("UPDATE etl_runs SET status = 'failed', finished_at = ? WHERE run_id = ?",
                       (utcnow(), run_id))
        raise
    finally:
        src.close()
        wh.close()
```

A few details carry most of the weight:

- **The new watermark comes from the data**, as `max(updated_at)` of the rows just read, not from the wall clock at the end of the run. Using "now" would skip any row stamped between the extract query and the end of the run.
- **`max([old_wm, ...])`** keeps the watermark from moving backwards when a run extracts nothing newer than what it already had.
- **One transaction** (the `with wh:` block) writes the rows, the watermark and the run's status. If the process dies halfway, none of it is committed and the next run starts from the old watermark. A watermark committed before the data is how incremental jobs lose rows.
- **The `WHERE` on the `DO UPDATE`** skips the write when the incoming row is not newer than the stored one. Rows re-read by the overlap become no-ops, and an out-of-order replay can't overwrite fresh data with stale data. It also makes the `written` count meaningful.
- **`loaded_by`** records which run last touched each row. When a load goes wrong, `SELECT * FROM orders WHERE loaded_by = ?` tells you exactly what that run changed.

## Running it twice, then catching a late row

This script creates a source database, runs the job, reruns it with nothing new, then adds an update, a new row and a late row with a timestamp before the current watermark:

```python
# demo.py
import os
import sqlite3
from etl import run

for f in ("source.db", "warehouse.db"):
    if os.path.exists(f):
        os.remove(f)

src = sqlite3.connect("source.db")
src.execute("""CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, amount REAL,
               status TEXT, updated_at TEXT)""")
src.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?)", [
    (1, "acme",    120.0, "new",     "2026-10-01T09:00:00.000000Z"),
    (2, "globex",   75.5, "new",     "2026-10-01T09:05:00.000000Z"),
    (3, "initech", 310.0, "shipped", "2026-10-01T09:20:00.000000Z"),
])
src.commit()

print("1st run:", run("source.db", "warehouse.db"))
print("rerun:  ", run("source.db", "warehouse.db"))

# An update, a new row, and a late row whose timestamp is *before* the watermark
src.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET "
                "status = excluded.status, updated_at = excluded.updated_at", [
    (2, "globex",   75.5, "paid", "2026-10-01T09:30:00.000000Z"),
    (4, "umbrella", 42.0, "new",  "2026-10-01T09:31:00.000000Z"),
    (5, "hooli",    99.0, "new",  "2026-10-01T09:15:00.000000Z"),   # committed late
])
src.commit()
print("3rd run:", run("source.db", "warehouse.db"))

wh = sqlite3.connect("warehouse.db")
for row in wh.execute("SELECT id, status, updated_at, loaded_by FROM orders ORDER BY id"):
    print(row)
for row in wh.execute("SELECT run_id, status, extracted, written FROM etl_runs ORDER BY started_at"):
    print(row)
```

Output from `python demo.py` (run ids are random):

```text
1st run: {'run_id': '905880d1ce3a', 'since': '1970-01-01T00:00:00.000000Z', 'extracted': 3, 'written': 3, 'watermark': '2026-10-01T09:20:00.000000Z'}
rerun:   {'run_id': '915693e2490c', 'since': '2026-10-01T09:10:00.000000Z', 'extracted': 1, 'written': 0, 'watermark': '2026-10-01T09:20:00.000000Z'}
3rd run: {'run_id': '948b6d123590', 'since': '2026-10-01T09:10:00.000000Z', 'extracted': 4, 'written': 3, 'watermark': '2026-10-01T09:31:00.000000Z'}
(1, 'new', '2026-10-01T09:00:00.000000Z', '905880d1ce3a')
(2, 'paid', '2026-10-01T09:30:00.000000Z', '948b6d123590')
(3, 'shipped', '2026-10-01T09:20:00.000000Z', '905880d1ce3a')
(4, 'new', '2026-10-01T09:31:00.000000Z', '948b6d123590')
(5, 'new', '2026-10-01T09:15:00.000000Z', '948b6d123590')
('905880d1ce3a', 'ok', 3, 3)
('915693e2490c', 'ok', 1, 0)
('948b6d123590', 'ok', 4, 3)
```

The rerun re-read order 3 because it fell inside the 10-minute overlap, and wrote nothing. The third run picked up order 5 even though its timestamp (09:15) was older than the watermark (09:20). Without the overlap, that row would never have reached the warehouse. Order 3 was re-read again and skipped again.

## Choosing the overlap

The overlap must be longer than the longest time between a row being stamped and that row becoming visible to your query. That is usually the longest write transaction on the source, plus any replication lag if you read from a replica, plus clock skew if several application servers set `updated_at` from their own clocks. Minutes are typical. Too long only costs re-read work; too short loses data with no error.

If the source has a monotonically increasing change sequence that is assigned at commit time, such as a log sequence number from change data capture, use that as the watermark instead. It removes most of the late-row problem. An auto-increment `id` does not: ids are allocated when the insert runs, not when it commits, and it never changes on update.

## Upserts outside SQLite

The same statement works almost unchanged in PostgreSQL, which is where the `ON CONFLICT ... DO UPDATE` syntax came from, and the `excluded` pseudo-table means the same thing. In PostgreSQL the target table in the `WHERE` clause can be aliased (`INSERT INTO orders AS o ... WHERE excluded.updated_at > o.updated_at`). MySQL uses `INSERT ... ON DUPLICATE KEY UPDATE`, and most warehouses (Snowflake, BigQuery, SQL Server) use `MERGE`. The shape of the job doesn't change.

## Gotchas

- **SQLite's `INSERT ... SELECT ... ON CONFLICT` parsing ambiguity.** If you upsert from a `SELECT` rather than `VALUES`, SQLite can mistake `ON CONFLICT` for a join constraint. Add `WHERE true` to the `SELECT` to fix it, as the SQLite upsert docs describe.
- **Hard deletes are invisible.** A watermark query only sees rows that still exist. Use soft deletes (`deleted_at`, which also bumps `updated_at`), a CDC feed, or a periodic full reconciliation of keys.
- **Indexes.** The extract filters on `updated_at`; without an index on it, every run scans the source table.
- **Equal timestamps.** Using `>=` plus the overlap means rows sharing the watermark's exact timestamp are always re-read, which the upsert absorbs. With a strict `>` and no overlap, a batch of rows with the same timestamp split across two runs would lose its second half.
- **Transforms must be deterministic.** If the load computes a column from `now()` or a random value, a rerun produces different rows, and the job is no longer idempotent even with upserts.
- **Appending to a fact table is different.** Event tables without a natural key need a stable event id from the source, or a delete-then-insert of a whole partition (for example "replace all rows for 2026-10-01") inside one transaction.

## Further reading

- [SQLite: UPSERT](https://sqlite.org/lang_upsert.html)
- [PostgreSQL: INSERT, the ON CONFLICT clause](https://www.postgresql.org/docs/current/sql-insert.html)
- [Python: the sqlite3 module](https://docs.python.org/3/library/sqlite3.html)
