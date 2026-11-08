---
title: "Generating email templates with Claude Code"
description: "How the YellowSheet free-demo email campaign was rebuilt as email-safe HTML with an AI coding agent, and what it took to ship it on a legacy PHP stack."
tags: ["Claude Code", "Email", "HTML", "PHP", "AI", "Mailpit"]
pubDate: "2023-11-01T16:00:00.000Z"
---

I rebuilt the YellowSheet free-demo email campaign. The old emails were plain, the schedule had a step nobody needed, and the sending code dates from the `mysql_*` era of PHP. I used Claude Code to turn the new email designs into HTML that survives real email clients, then wired the result into the existing cron and signup code myself.

## The campaign

A visitor who signs up for the free demo gets three emails, each stored as an HTML template in the database and linked from a campaign schedule:

| Step | Day | Email | Call to action |
| --- | --- | --- | --- |
| 1 | Day 1 | Vancouver Island Construction Leads | See live leads |
| 2 | Day 3 | Building Permit Analytics | Book a complimentary demo |
| 3 | Day 5 | What's happening this week (project, tender and permit counts) | A discount code |

The old flow had a fourth step, a Day 7 discount email. I cut it, so the discount now goes out on Day 5 as step 3. If the customer has already booked a tutorial, the cron skips the discount email and writes a customer note instead.

## What the AI did well: email-safe HTML

Email HTML follows different rules from web HTML. Gmail, Outlook and Apple Mail each strip or ignore different CSS, so the safe subset is old-fashioned: nested tables, inline styles and no external stylesheets. This is where the agent saved the most time. I gave it the design for each day and asked for email-client-safe HTML, and it produced markup that follows those rules consistently:

- **Tables for layout.** Every row and column is a `<table>` with `border="0" cellpadding="0" cellspacing="0"`. The Day 1 email has 10 tables, Days 3 and 5 have 9 each.
- **A 600px column.** The content sits in a `max-width:600px; width:100%` table centred inside a full-width background table, so it works on desktop and phones without media queries.
- **Colours set twice.** Backgrounds are set both as the `bgcolor` attribute and as inline `background-color`, because some clients only honour one of them.
- **Decoration made from table cells.** The short orange rule before the "CONSTRUCTION INTELLIGENCE" eyebrow is a 26px-wide table cell with a background colour, not a CSS border or an image:

  ```html
  <td height="2" bgcolor="#d85d34"
      style="height:3px;line-height:2px;font-size:2px;background-color:#d85d34;">&nbsp;</td>
  ```

- **Entities instead of icon fonts.** Bullets and icons are HTML entities (`&#9679;`, `&#8599;`, `&#10022;`, `&rarr;`), so nothing depends on a web font loading.
- **Merge tokens left intact.** Links keep the existing merge placeholders that the sending code replaces at send time, plus UTM tags for each day.

Each template ended up between 5,700 and 6,400 characters of HTML. That is far too much to hand-write and check three times, but easy to review once it's generated.

## What still needed a human

It took a couple of revisions, and the HTML was the easy part. The work was in fitting it into a codebase the agent had never seen:

- **Storage is SQL, not files.** The templates live in a database table, so they shipped as a SQL migration that updates the three template rows, adds step titles for the admin view, and points the campaign schedule at the new rows. I went back and forth on the subject lines and ended up leaving them out of the migration.
- **Signup used a fragile lookup.** The signup handler found the Day 1 email by matching its subject line. I first widened the query to also match the template name, then switched it to look the template up by its id.
- **Images.** The send calls now attach the logo and a hero image for each day as inline content-ID images, with a fallback path for cron runs where the web root isn't set.
- **The step mapping in the cron.** The cron maps steps to days 1, 3 and 5 (it used to include day 7), and the "skip the discount if a tutorial is booked" check moved from step 4 to step 3.
- **Logging.** Signup now logs whether it found the template, so a missing template shows up in the logs instead of failing silently.

## Testing locally without sending real email

To look at the emails without mailing real customers, I set up local mail capture and documented it in the README: install `mhsendmail` in the PHP container and point PHP's `sendmail_path` at a Mailpit container.

```bash
curl -sSL -o /usr/local/bin/mhsendmail https://github.com/mailhog/mhsendmail/releases/download/v0.2.0/mhsendmail_linux_amd64
chmod +x /usr/local/bin/mhsendmail
echo 'sendmail_path = "/usr/local/bin/mhsendmail --smtp-addr=mailpit:1025"' >> /usr/local/etc/php/conf.d/local.ini
```

Every email the app sends then shows up in Mailpit's web inbox, where I could check the layout before anything went out.

## Follow-ups

- **Cron hotfix.** Once the cron ran on the new schedule it errored, because an email helper was defined below its first use in the cron script. I moved it up and added logging around the prospect emails (run started, send attempt, cannot-send cases).
- **Unsubscribe page.** I restyled its button to match the new emails and added a "return to YellowSheet" button.

## Takeaways

- **Use the agent for the tedious, rule-bound parts.** Table-based email HTML with inline styles is exactly that kind of work, and it applied the rules more consistently than I would by hand.
- **Integration is still your job.** How templates are stored, how the code looks them up, merge tokens, cron step numbers and attachments were all specific to this codebase, and that's where most of the time went.
- **Test with captured mail.** Mailpit catches problems a browser preview won't show, such as missing attachments and unreplaced merge tokens.
