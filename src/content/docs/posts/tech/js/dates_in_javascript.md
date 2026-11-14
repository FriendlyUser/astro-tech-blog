---
tags: ['jsx', 'js']
title: "Why JavaScript's Date is painful, and what to use instead"
description: Where the built-in Date object trips you up with time zones and parsing, and how Intl, Temporal, Moment Timezone and date-fns-tz handle the same conversions.
pubDate: Fri, 4 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897_blank_card_on_brown_table.png
---

:::caution
Moment.js is a legacy project in maintenance mode, and its maintainers advise against using it in new projects. The Moment examples below still work, but for new code prefer `Intl`, Temporal, or a maintained library such as date-fns or Luxon.
:::

Working with dates in JavaScript is frustrating. The `Date` object looks simple, but it is easy to get wrong, especially once time zones are involved.

## What Date actually is

A `Date` is a single instant: a number of milliseconds since the Unix epoch (1970-01-01T00:00:00Z). It has no time zone attached. Two `Date` objects for the same instant are the same value no matter where they were created.

The confusion comes from the methods around it:

- `getHours()`, `getDate()`, `toString()` and friends read that instant in the **runtime's local time zone**.
- `getUTCHours()` and `toISOString()` read it in **UTC**. `toISOString()` always ends in `Z`.
- There is no way to say "this `Date` is in `Europe/London`". Any zone other than local or UTC has to be handled outside the object.

So the problem is not that `Date` lacks a time zone; it is that it silently uses the machine's zone in half of its API.

## Common traps

```js
// Date-only ISO strings are parsed as UTC...
new Date('2022-04-01').toISOString();          // '2022-04-01T00:00:00.000Z'

// ...but date-time strings without an offset are parsed as local time
new Date('2022-04-01T00:00:00').toISOString(); // depends on the machine's zone

// Months are zero-based
new Date(2022, 3, 1); // 1 April 2022, local time

// Setters mutate the object in place
const d = new Date('2022-04-01T12:00:00Z');
d.setUTCDate(d.getUTCDate() + 1); // d itself is now 2 April
```

A timestamp from a server like `"2022-04-01 12:00:00"` with no offset is ambiguous: you have to know, out of band, which zone it was written in.

## Displaying a Date in another zone: Intl

For *display*, the platform has had a built-in answer for years. `Intl.DateTimeFormat` (and `toLocaleString`, which uses it) accepts a `timeZone` option and handles daylight saving time for you:

```js
const d = new Date('2022-04-01T16:00:00Z');

d.toLocaleString('en-GB', { timeZone: 'Europe/London' });
// '01/04/2022, 17:00:00'  (London was on BST, UTC+1)

new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  dateStyle: 'medium',
  timeStyle: 'long',
}).format(d);
// 'Apr 1, 2022, 12:00:00 PM EDT'
```

What `Intl` does not give you is the reverse: turning "12:00 wall-clock time in New York" into an instant, or doing arithmetic in a zone. That is where Temporal or a library comes in.

## Temporal

Temporal is the replacement for `Date`. It has separate types for instants, plain dates, and zoned date-times, and it is immutable. It has shipped in Firefox 139 and Chrome/Edge 144; check [MDN's compatibility table](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal) before relying on it in Safari, and use a polyfill such as `@js-temporal/polyfill` where it is missing.

```js
const ny = Temporal.ZonedDateTime.from('2022-04-01T12:00:00[America/New_York]');

ny.toInstant().toString();                       // '2022-04-01T16:00:00Z'
ny.withTimeZone('Europe/London').toString();     // '2022-04-01T17:00:00+01:00[Europe/London]'
ny.add({ days: 1 }).toString();                  // ny is unchanged; a new value is returned
```

## Libraries: Moment Timezone and date-fns-tz

Moment and date-fns both format, parse, and manipulate dates. The practical differences:

- **Mutability.** Moment objects are mutable: calling a manipulation method changes the original. date-fns functions take a `Date` and return a new one.
- **Bundle size.** date-fns is a collection of individual functions, so bundlers only include the ones you import. Moment is a single object with everything attached and does not tree-shake.
- **Maintenance.** Moment is in maintenance mode; date-fns is actively developed.

Time zone support is a separate package for both: `moment-timezone` and `date-fns-tz`.

### Moment Timezone

```js
const moment = require('moment-timezone');

const date = moment.tz('2022-04-01 12:00:00', 'America/New_York');
console.log(date.format()); // 2022-04-01T12:00:00-04:00

const london = date.clone().tz('Europe/London');
console.log(london.format()); // 2022-04-01T17:00:00+01:00
```

The `clone()` matters: without it, `.tz()` changes `date` as well.

### date-fns-tz

In date-fns-tz 3.0.0 `zonedTimeToUtc` was renamed to `fromZonedTime` and `utcToZonedTime` to `toZonedTime`. Code using the old names fails with the current version.

```js
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

// Interpret a wall-clock time as New York time and get the instant
const instant = fromZonedTime('2022-04-01T12:00:00', 'America/New_York');
console.log(instant.toISOString()); // 2022-04-01T16:00:00.000Z

// Format an instant in another zone
formatInTimeZone(instant, 'Europe/London', 'yyyy-MM-dd HH:mm:ssXXX');
// '2022-04-01 17:00:00+01:00'
```

Use `formatInTimeZone` to *show* a `Date` in a zone. A common mistake is passing a UTC `Date` to `fromZonedTime` to "convert" it; that function reads the date's wall-clock fields as if they were in the given zone, so the result depends on the machine's local zone.

## Further reading

- [MDN: Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
- [MDN: Temporal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Temporal)
- [Moment.js project status](https://momentjs.com/docs/#/-project-status/)
- [date-fns-tz](https://github.com/marnusw/date-fns-tz)
