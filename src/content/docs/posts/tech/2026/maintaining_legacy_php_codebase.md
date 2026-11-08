---
title: "Maintaining a Legacy PHP Codebase"
description: "What it takes to keep the YellowSheet PHP site running, including upgrade attempts, Stripe, crons, tests and migrations."
tags: ["PHP", "Legacy Code", "Stripe", "MySQL", "Testing"]
pubDate: "2026-11-07T16:30:00.000Z"
---

I work on the YellowSheet site. It is a construction data subscription, and the site is a large legacy PHP app: hundreds of generated add/list/edit pages, `mysql_*` calls throughout, and a cron script that sends the email campaigns. When I started I took a backup from cPanel and put it in GitHub, and I thought it was PHP 5.3. The Docker image I built for it ran PHP 5.2. Production later moved to PHP 5.6, in an upgrade led by a colleague.

## What the codebase looked like

- Password storage needed modernizing, and running the site locally needed MySQL 5.7.
- Making API calls from PHP 5.2 is painful. I was surprised `json_encode` and `json_decode` were available at all.
- After an attempted attack I removed unused legacy helper functions and tightened login input handling.
- A huge PHP error log had been committed to the repo.
- I later found and fixed a SQL injection in one of the generated pages by casting the id parameter to an integer. Old credit card numbers had to be purged from the customer tables with a migration.
- Eventually we deleted 553 files (about 190k lines) of dead PHP pages, old Stripe helpers and an in-repo Python scraper.

## Upgrade attempts

- **Rector.** I ran Rector with Docker and a mysql-to-mysqli shim on two branches (5.3 to 7.0, then 7.0 to 8.2), an automated pass over about 920 files. It was never merged.
- **PHP 8.3.** I wrote Dockerfiles for PHP 8.x and kept a legacy PHP 5.2 Dockerfile beside them. I added a compatibility shim for the old `mysql_*` functions, converted login and many list pages, and test-deployed on Railway. Then forgot password, the database connection code and one of the notification emails all had to be restored. I also vendored PHPMailer for 8.3. The upgrade branch was never merged.
- **PHP 5.6.** My colleague took a smaller step: 5.6 to match the production host, with Composer pinned to that PHP version and Rector kept as isolated dev tooling. I worked on the logging phase with them, which added a shared logger to replace ad-hoc `file_put_contents` logging. I also did the dead-file removal and the test work below. Given how old the email-sending integration is, staying on 5.6 turned out to be the right call.
- One rule still holds: before upgrading a legacy PHP app, remove any custom error handlers first.

## Stripe

- Subscriptions were painful from the start.
- Renewals moved to SetupIntents to collect a payment method. A Python script finds customers who have purchases but no Stripe record.
- Quarterly plans and custom `price_data` in CAD cents, a double-billing fix in the rate calculation, and card-expiry checks on renewal.
- The payment webhook handler was the recurring trouble spot. I rewrote customer matching on id, name, email or normalized phone. It got a short delay so it stopped racing the other subscription calls. Later I found a customer-balance update that was written but never executed.

## Crons and email

- A copy of the cron script runs behind a testing flag, so I can test without emailing customers.
- Prospect emails got per-recipient unsubscribe tokens. Simpler nested tables in the email markup fixed rendering.
- A weekly cron moves tenders to the next issue at Monday midnight.
- A hotfix moved an email helper above its first use in the cron script and added logging around the prospect emails, so the cron jobs stopped erroring out.

## Tests, flags and migrations

- I wrote Playwright E2E smoke tests for the subscribe/payment flow on 5.6, including a bad-card negative test. I also added a CA-bundle check for outbound TLS that runs on an isolated Docker network.
- I added PHPUnit and JS tests for map points and counts alongside the map view work.
- The leads feature went live by turning on a feature flag. The flag let me ship code dark and switch it on later.
- Schema changes are numbered SQL migration files. One of them soft-drops about 30 dead tables (~776 MB) by renaming them with a prefix instead of dropping them. I have since installed phinx locally, but I still need MySQL to run migrations on the test grid.

## Lessons

- Smaller upgrades ship. My two big jumps to PHP 8 never merged, and the step to 5.6 did.
- Rename before you drop, and preview before you redact. Legacy data always has a surprise in it.
- The parts that touch money and email (webhooks, crons) need logging more than anything else, because their failures are silent.
