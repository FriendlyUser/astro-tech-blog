---
title: "Removing carrier-deactivated numbers with Twilio's Deactivations API and BullMQ"
pubDate: Fri, 30 September 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/3054188082.png
tags: ["Node", "BullMQ", "Twilio"]
description: "A daily BullMQ job in Node.js that downloads Twilio's list of carrier-deactivated US numbers and removes them from your subscriber list."
---

US mobile carriers deactivate numbers every day, and those numbers are eventually reassigned to someone else. If you keep texting them, you are messaging a stranger who never opted in. Twilio publishes a daily list of deactivated US numbers through the [Deactivations API](https://www.twilio.com/docs/messaging/api/deactivations-resource), and Twilio recommends using it periodically to clean your opted-in subscriber list.

Note that this does not remove anything *from Twilio*. The list tells you which numbers to remove from your own database.

This post wires it up as a scheduled BullMQ job:

1. A function that fetches one day's list from Twilio.
2. A BullMQ worker that runs it and removes each number.
3. A job scheduler that enqueues the job once a day.

## Setup

You need Node.js 18 or later (for the built-in `fetch`), a Redis instance for BullMQ, and Twilio credentials.

```bash
npm install bullmq twilio
```

Set `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` in the environment. The examples use ES modules and top-level `await`, so run them with something like `tsx` or compile with `"module": "nodenext"`.

## Fetching the list

```typescript
// twilioClient.ts
import twilio from 'twilio';

export const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);
```

The Deactivations resource takes a single `date` and returns a `redirectTo` URL that points at a text file of the numbers deactivated that day. The URL is only valid for about two minutes, so download it straight away rather than storing it.

```typescript
// fetchDeactivatedNumbers.ts
import { client } from './twilioClient';

export async function fetchDeactivatedNumbers(date: Date): Promise<string[]> {
  const deactivation = await client.messaging.v1.deactivations().fetch({ date });

  if (!deactivation.redirectTo) {
    return [];
  }

  const res = await fetch(deactivation.redirectTo);
  if (!res.ok) {
    throw new Error(`Downloading deactivation list failed: ${res.status}`);
  }

  const text = await res.text();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
```

There is no need to write the file to disk first; the lists are small enough to read into memory.

## The worker

In BullMQ, jobs are processed by a `Worker`, not by the `Queue`. (`queue.process()` was the API of the older Bull library and does not exist in BullMQ.)

```typescript
// worker.ts
import { Worker } from 'bullmq';
import { fetchDeactivatedNumbers } from './fetchDeactivatedNumbers';

const connection = { host: 'localhost', port: 6379 };

function yesterdayUtc(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function removeSubscriber(phoneNumber: string): Promise<void> {
  // Replace with your own database call, e.g. mark the subscriber as opted out
  console.log(`Removing deactivated number ${phoneNumber}`);
}

const worker = new Worker(
  'phone-cleanup',
  async (job) => {
    // Allow a specific day to be passed for backfills, default to yesterday
    const date = job.data?.date ? new Date(job.data.date) : yesterdayUtc();
    const numbers = await fetchDeactivatedNumbers(date);

    for (const phoneNumber of numbers) {
      await removeSubscriber(phoneNumber);
    }

    return { date: date.toISOString().slice(0, 10), removed: numbers.length };
  },
  { connection },
);

worker.on('completed', (job, result) => {
  console.log(`Job ${job.id} done`, result);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

Let errors propagate out of the processor. If you wrap everything in `try/catch` and only log, BullMQ marks the job as completed and never retries it.

Run the worker as a long-lived process (`npx tsx worker.ts`, or under your process manager). BullMQ has no `bullmq worker` CLI; a worker is just your own script that constructs a `Worker`.

## Scheduling it daily

BullMQ's Job Schedulers create jobs on a cron pattern. `upsertJobScheduler` is idempotent, so it is safe to call on every deploy.

```typescript
// schedule.ts
import { Queue } from 'bullmq';

const queue = new Queue('phone-cleanup', {
  connection: { host: 'localhost', port: 6379 },
});

// Every day at 09:00 UTC (BullMQ cron patterns can include a seconds field)
await queue.upsertJobScheduler(
  'daily-deactivations',
  { pattern: '0 0 9 * * *', tz: 'UTC' },
  {
    name: 'clear-deactivated',
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 60_000 } },
  },
);

// Optional one-off backfill for a specific day
await queue.add('clear-deactivated', { date: '2024-09-01' });

await queue.close();
```

On older BullMQ versions without Job Schedulers, the equivalent is `queue.add(name, data, { repeat: { pattern } })`.

## Gotchas

- The Deactivations list only covers US numbers.
- Twilio updates the reports daily. Running for the previous day, with retries, avoids asking for a file that is not ready yet.
- If the job is down for a few days, enqueue backfill jobs for the missed dates; each run only covers one day.

## Further reading

- [Twilio Deactivations resource](https://www.twilio.com/docs/messaging/api/deactivations-resource)
- [BullMQ Workers](https://docs.bullmq.io/guide/workers)
- [BullMQ Job Schedulers](https://docs.bullmq.io/guide/job-schedulers)
