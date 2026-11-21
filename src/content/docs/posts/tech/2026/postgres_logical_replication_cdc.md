---
title: "Change data capture in Postgres with logical replication slots"
description: "Stream inserts, updates and deletes out of Postgres: wal_level=logical, slots with test_decoding and pgoutput, REPLICA IDENTITY, publications, and a Python consumer."
tags: ["PostgreSQL", "Change Data Capture", "Logical Replication", "Python", "psycopg", "Docker"]
pubDate: "2026-09-05T16:00:00.000Z"
imgSrc: "/imgs/2026/postgres_logical_replication_cdc.webp"
imgAlt: "A strip of WAL segments with a yellow slot restart_lsn marker and a green current marker bracketing the retained WAL, above insert, update and delete events"
---

Change data capture (CDC) means getting every insert, update and delete from a database as a stream of events, in commit order, without polling tables or adding triggers. In Postgres the built-in way to do that is **logical decoding**: Postgres reads its own write-ahead log (WAL), turns the physical changes back into row-level events, and hands them to a consumer through a **replication slot** that remembers how far the consumer has read.

This is what Debezium and most managed CDC services use underneath. Knowing how the pieces fit, and how a slot can fill your disk, is worth it even if you never write your own consumer. This post walks through it with SQL you can run in a local container and a small Python consumer. The Docker commands use the `postgres:18` image; the SQL and Python were run against PostgreSQL 16, and everything used here has been available since PostgreSQL 13.

## A local Postgres with logical decoding

Logical decoding needs `wal_level = logical`, which makes Postgres write enough information into the WAL to reconstruct rows. The default, `replica`, isn't enough, and changing it needs a restart. With Docker you can pass it on the command line:

```bash
docker run -d --name pg-cdc \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 \
  postgres:18 -c wal_level=logical -c max_slot_wal_keep_size=10GB

docker exec -it pg-cdc psql -U postgres
```

`max_slot_wal_keep_size` is explained in the section on disk usage below; set it from day one. On an existing server, use `ALTER SYSTEM SET wal_level = logical;` and restart. Check with `SHOW wal_level;`.

Create a table to watch:

```sql
CREATE TABLE accounts (
    id      int PRIMARY KEY,
    owner   text NOT NULL,
    balance numeric(12,2) NOT NULL
);
```

## Slots and the `test_decoding` plugin

A **logical replication slot** is a named, persistent cursor into the WAL. It has two jobs: it records the position the consumer has confirmed, and it **stops Postgres from deleting WAL** the consumer hasn't read yet. Each slot uses an **output plugin** that decides what the decoded changes look like.

`test_decoding` ships with Postgres as a contrib module (it's in the Docker image) and produces human-readable text. It's meant for testing, which makes it perfect for seeing what's going on:

```sql
SELECT * FROM pg_create_logical_replication_slot('demo_slot', 'test_decoding');

INSERT INTO accounts VALUES (1, 'ada', 100.00), (2, 'grace', 250.00);
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
DELETE FROM accounts WHERE id = 2;
```

The slot only sees changes made after it was created. Now read them. There are two functions, and the difference matters:

- `pg_logical_slot_peek_changes(slot, upto_lsn, upto_nchanges)` returns changes **without consuming** them. Call it twice and you get the same rows.
- `pg_logical_slot_get_changes(...)` returns changes **and advances the slot**, so they're gone.

```sql
SELECT lsn, xid, data FROM pg_logical_slot_peek_changes('demo_slot', NULL, NULL);
```

The output looks like this (illustrative: the LSNs and transaction IDs will differ on your machine):

```text
    lsn    | xid |                                   data
-----------+-----+---------------------------------------------------------------------------
 0/1A3C2D0 | 750 | BEGIN 750
 0/1A3C2D0 | 750 | table public.accounts: INSERT: id[integer]:1 owner[text]:'ada' balance[numeric]:100.00
 0/1A3C3B8 | 750 | table public.accounts: INSERT: id[integer]:2 owner[text]:'grace' balance[numeric]:250.00
 0/1A3C470 | 750 | COMMIT 750
 0/1A3C470 | 751 | BEGIN 751
 0/1A3C470 | 751 | table public.accounts: UPDATE: id[integer]:1 owner[text]:'ada' balance[numeric]:70.00
 0/1A3C4F0 | 751 | COMMIT 751
 0/1A3C4F0 | 752 | BEGIN 752
 0/1A3C4F0 | 752 | table public.accounts: DELETE: id[integer]:2
 0/1A3C560 | 752 | COMMIT 752
```

Each row has the **LSN** (log sequence number, a position in the WAL), the transaction ID, and the change. Changes arrive grouped by transaction, in commit order, and only for committed transactions; a rolled-back transaction never appears.

Notice what's missing: the `UPDATE` shows only the new row, and the `DELETE` shows only the primary key. That's controlled by the table's replica identity.

## REPLICA IDENTITY: what the old row contains

`REPLICA IDENTITY` decides which columns of the **old** row are written to the WAL for updates and deletes:

| Setting | Old row in the WAL |
|---|---|
| `DEFAULT` | primary key columns only, and only on update if the key changed |
| `USING INDEX idx` | the columns of a unique, non-null index |
| `FULL` | every column |
| `NOTHING` | nothing |

`DEFAULT` is enough to identify the row. If your consumer needs the previous values (for an audit log, or to compute "balance changed from 100 to 70"), switch to `FULL`:

```sql
ALTER TABLE accounts REPLICA IDENTITY FULL;
```

`FULL` writes the entire old row into the WAL for every update and delete, so it increases WAL volume on write-heavy tables. Use it where you need it, not everywhere.

There's a trap with tables that have **no primary key**. Once such a table is in a publication that publishes updates (next section), Postgres refuses to update it at all:

```text
ERROR:  cannot update table "notes" because it does not have a replica identity and publishes updates
HINT:  To enable updating the table, set REPLICA IDENTITY using ALTER TABLE.
```

That error shows up in the application, not in the CDC pipeline, so add primary keys (or set `REPLICA IDENTITY FULL`) before you add tables to a publication.

## Publications and `pgoutput` for real consumers

`test_decoding` reports every table and its text format isn't a stable interface. Real consumers use **`pgoutput`**, the plugin built into Postgres for native logical replication, together with a **publication** that lists which tables (and which operations) to publish:

```sql
CREATE PUBLICATION cdc_pub FOR TABLE accounts;
-- or: FOR ALL TABLES, or FOR TABLES IN SCHEMA app
-- optionally: WITH (publish = 'insert, update, delete')

SELECT * FROM pg_create_logical_replication_slot('cdc_slot', 'pgoutput');
```

`pgoutput` emits a documented binary protocol: a `Relation` message describing a table's columns, then `Begin`, `Insert`/`Update`/`Delete`, and `Commit` messages. Tools such as Debezium, Postgres's own subscriptions (`CREATE SUBSCRIPTION`), and most managed CDC services consume it over the streaming replication protocol. You can also read it with SQL, using the `_binary_` variants of the peek and get functions and passing the protocol version and publication names as options:

```sql
SELECT lsn, xid, length(data)
FROM pg_logical_slot_peek_binary_changes(
    'cdc_slot', NULL, NULL, 'proto_version', '1', 'publication_names', 'cdc_pub');
```

## A small Python consumer

To see the whole loop, here's a consumer that polls a `pgoutput` slot with psycopg 3, decodes the messages, and only then advances the slot. First, a minimal decoder for the protocol version 1 messages it needs, following the [message format docs](https://www.postgresql.org/docs/current/protocol-logicalrep-message-formats.html):

```python
# pgoutput.py
"""Minimal decoder for pgoutput protocol version 1 messages."""
import struct
from dataclasses import dataclass, field


@dataclass
class Relation:
    schema: str
    name: str
    columns: list[str] = field(default_factory=list)


class Reader:
    def __init__(self, data: bytes):
        self.data, self.pos = data, 0

    def take(self, fmt: str):
        values = struct.unpack_from("!" + fmt, self.data, self.pos)
        self.pos += struct.calcsize("!" + fmt)
        return values[0] if len(values) == 1 else values

    def string(self) -> str:
        end = self.data.index(b"\0", self.pos)
        s = self.data[self.pos:end].decode()
        self.pos = end + 1
        return s

    def tuple_data(self) -> list[str | None]:
        values = []
        for _ in range(self.take("h")):
            kind = self.take("c")
            if kind == b"t":                      # text value
                n = self.take("i")
                values.append(self.data[self.pos:self.pos + n].decode())
                self.pos += n
            else:                                 # b"n" null, b"u" unchanged TOAST
                values.append(None)
        return values


class Decoder:
    def __init__(self):
        self.relations: dict[int, Relation] = {}

    def decode(self, data: bytes) -> dict | None:
        r = Reader(data)
        kind = r.take("c")
        if kind == b"B":
            final_lsn, ts, xid = r.take("qqi")
            return {"op": "begin", "xid": xid}
        if kind == b"C":
            return {"op": "commit"}
        if kind == b"R":
            oid = r.take("i")
            rel = Relation(r.string(), r.string())
            r.take("c")                           # replica identity setting
            for _ in range(r.take("h")):
                r.take("c")                       # flags (1 = part of the key)
                rel.columns.append(r.string())
                r.take("ii")                      # type oid, type modifier
            self.relations[oid] = rel
            return None
        if kind in (b"I", b"U", b"D"):
            rel = self.relations[r.take("i")]
            row = lambda vals: dict(zip(rel.columns, vals))
            event = {"table": f"{rel.schema}.{rel.name}"}
            if kind == b"I":
                r.take("c")                       # b"N"
                return {"op": "insert", **event, "new": row(r.tuple_data())}
            marker = r.take("c")
            old = None
            if marker in (b"K", b"O"):            # key only, or full old row
                old = row(r.tuple_data())
                if kind == b"U":
                    marker = r.take("c")          # now b"N"
            if kind == b"D":
                return {"op": "delete", **event, "old": old}
            return {"op": "update", **event, "old": old, "new": row(r.tuple_data())}
        return None                               # origin, type, truncate, ...
```

Values arrive as text, exactly as Postgres would print them; converting them to Python types by column type is left out to keep this short. Then the polling loop:

```python
# consumer.py
import json
import os
import time

import psycopg

from pgoutput import Decoder

DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/postgres")
SLOT, PUBLICATION = "cdc_slot", "cdc_pub"

PEEK = """
    SELECT lsn, data
    FROM pg_logical_slot_peek_binary_changes(
        %s, %s, %s, 'proto_version', '1', 'publication_names', %s)
"""


def poll_once(conn: psycopg.Connection, decoder: Decoder, batch: int = 1000) -> int:
    upto = conn.execute("SELECT pg_current_wal_lsn()").fetchone()[0]
    rows = conn.execute(PEEK, (SLOT, upto, batch, PUBLICATION)).fetchall()
    for lsn, data in rows:
        event = decoder.decode(bytes(data))
        if event and event["op"] not in ("begin", "commit"):
            print(lsn, json.dumps(event))  # deliver it somewhere real here
    # Only after handling the batch, let Postgres discard the WAL behind it.
    # If the batch limit cut us short, stop at the last change we saw;
    # otherwise everything up to `upto` has been seen, even with no rows.
    done_to = rows[-1][0] if len(rows) >= batch else upto
    conn.execute("SELECT pg_replication_slot_advance(%s, %s)", (SLOT, done_to))
    return len(rows)


def main() -> None:
    decoder = Decoder()
    with psycopg.connect(DSN, autocommit=True) as conn:
        while True:
            if poll_once(conn, decoder) == 0:
                time.sleep(1)


if __name__ == "__main__":
    main()
```

```bash
pip install "psycopg[binary]"
python consumer.py
```

After `ALTER TABLE accounts REPLICA IDENTITY FULL`, inserting, updating and deleting a third account printed:

```text
0/14EE5C8 {"op": "insert", "table": "public.accounts", "new": {"id": "3", "owner": "linus", "balance": "40.00"}}
0/14EE680 {"op": "update", "table": "public.accounts", "old": {"id": "3", "owner": "linus", "balance": "40.00"}, "new": {"id": "3", "owner": "linus", "balance": "55.00"}}
0/14EE718 {"op": "delete", "table": "public.accounts", "old": {"id": "3", "owner": "linus", "balance": "55.00"}}
```

Before that change, with `REPLICA IDENTITY DEFAULT`, the consumer printed `"old": null` for the update of account 1 and only the key for the delete of account 2: `{"id": "2", "owner": null, "balance": null}`.

The design choices that matter:

- **Peek, process, then advance.** If the process crashes after delivering events but before advancing, the next run sees them again. That's at-least-once delivery; make the downstream idempotent (upsert by primary key and LSN). Using `get_changes` instead would advance first and lose events on a crash.
- **Advance even when nothing matched.** The slot holds back WAL for *all* tables, not just the published ones. After a bulk insert of 500,000 rows into an unrelated table, a slot for the quiet `accounts` table still held 46 MB of WAL when its consumer only advanced on receiving rows, because no rows ever arrived. Capturing `pg_current_wal_lsn()` before peeking and advancing to it when the batch wasn't cut short fixes that.
- **Batches end on transaction boundaries.** `upto_nchanges` stops after the transaction that crosses the limit, so a batch never contains half a transaction.

Polling through SQL is fine for low volumes and for understanding the mechanics. For production, use the streaming replication protocol (Debezium, `pg_recvlogical`, or psycopg2's `LogicalReplicationConnection`), which pushes changes as they commit and lets the consumer confirm positions with feedback messages.

## Slot retention can fill the disk

This is the operational risk of CDC. A slot guarantees that Postgres keeps every WAL segment from the slot's `restart_lsn` onwards. If the consumer stops (crashed, paused, decommissioned, or someone created a slot to try something and forgot it), WAL keeps accumulating on the primary until the disk is full and the database stops accepting writes.

Watch your slots:

```sql
SELECT slot_name, plugin, active, wal_status,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal,
       pg_size_pretty(safe_wal_size) AS safe_wal_size
FROM pg_replication_slots;
```

After creating an unused slot and writing 500,000 rows into another table:

```text
   slot_name    | active | wal_status | retained_wal | safe_wal_size
----------------+--------+------------+--------------+---------------
 cdc_slot       | f      | reserved   | 46 MB        | 989 MB
 forgotten_slot | f      | reserved   | 46 MB        | 989 MB
```

(That server had `max_slot_wal_keep_size = 1GB`.) Defences, roughly in order of importance:

- **Set `max_slot_wal_keep_size`.** It caps how much WAL a slot may hold. A slot that falls further behind is invalidated (`wal_status` becomes `lost`) instead of taking the database down. The consumer then has to resynchronize from a snapshot, which is painful but recoverable; a full disk on the primary is worse. The default is `-1`, unlimited.
- **Alert on `retained_wal`** and on slots with `active = false` for longer than you expect.
- **Drop slots you don't need**: `SELECT pg_drop_replication_slot('forgotten_slot');`. Slots survive restarts and aren't tied to any connection, so they're easy to forget.
- On PostgreSQL 18 and later, `idle_replication_slot_timeout` can also invalidate slots that have been inactive for too long.

Slots also prevent `VACUUM` from removing rows that the slot might still need to decode (the slot's `catalog_xmin` holds back cleanup of the system catalogs), which is another reason not to leave idle slots around.

## Gotchas

- **DDL isn't replicated.** Logical decoding emits row changes, not `ALTER TABLE`. Consumers see a new `Relation` message with the new columns after a schema change, but have to handle it themselves.
- **TRUNCATE** is published by `pgoutput` as its own message type (if the publication includes it), not as one delete per row.
- **Sequences aren't decoded.** If a downstream copy needs sequence values, copy them separately.
- **Slots don't follow failover by default.** On older versions a logical slot exists only on the primary. PostgreSQL 17 added failover slots that can be synchronized to standbys; check what your managed provider supports before relying on CDC across a failover.
- **Initial load.** A slot only captures changes from the moment it's created. For a full copy plus changes, take a snapshot consistent with the slot's starting point. `CREATE_REPLICATION_SLOT ... EXPORT_SNAPSHOT` on a replication connection is how Debezium and native subscriptions do it.

## Further reading

- [Logical decoding](https://www.postgresql.org/docs/current/logicaldecoding.html) and its [examples](https://www.postgresql.org/docs/current/logicaldecoding-example.html)
- [test_decoding](https://www.postgresql.org/docs/current/test-decoding.html)
- [CREATE PUBLICATION](https://www.postgresql.org/docs/current/sql-createpublication.html) and [REPLICA IDENTITY in ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Logical replication message formats](https://www.postgresql.org/docs/current/protocol-logicalrep-message-formats.html)
- [Replication settings](https://www.postgresql.org/docs/current/runtime-config-replication.html), including `max_slot_wal_keep_size`
- [Debezium PostgreSQL connector](https://debezium.io/documentation/reference/stable/connectors/postgresql.html)
