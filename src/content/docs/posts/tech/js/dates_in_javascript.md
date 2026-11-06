---
tags: ['jsx', 'js']
title: Why working with native JavaScript dates is painful
description: Working with dates in JavaScript can be frustratingly difficult. The Date object seems simple enough at first glance, but it has some major shortcomings, especially when it comes to handling timezones. 
pubDate: Fri, 4 April 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897_blank_card_on_brown_table.png
---

Working with dates in JavaScript can be frustratingly difficult. The Date object seems simple enough at first glance, but it has some major shortcomings, especially when it comes to handling timezones. 

First, the Date object represents a single moment in time, but it does not have any timezone information associated with it. All dates are represented as timestamp values relative to the Unix epoch, so they are timezone agnostic. This means if you construct two Date objects representing the same moment in time but in different timezones, they will be exactly equal, even though they represent different points in time once timezone offsets are accounted for.

This lack of timezone support causes all sorts of issues. If you get a timestamp from a server, you have no idea what timezone it is relative to. When formatting a Date, the toString() and toISOString() methods will format the date in the local timezone of the system, which may not match the intended timezone of the date. 

Timezone manipulation in JavaScript requires manually offsetting the timestamp value and is very unintuitive. There is no built-in way to convert a Date to a different timezone or to account for daylight savings time transitions. You have to do all of the timezone logic manually.

Newer APIs like the Internationalization API and Temporal provide some relief, with full timezone support and more intuitive methods of manipulating dates. However, the Date object is still very commonly used due to its ubiquity. Unless and until it is improved, handling dates in JavaScript will remain an ongoing challenge.

In summary, working with the JavaScript Date object is difficult for several reasons:

- It lacks timezone information, representing only a single moment in time. 
- It provides no methods for converting to different timezones or accounting for DST. 
- Formatting methods format in the local timezone, which can be unintuitive. 
- Timestamps from external sources have unknown timezones, leading to ambiguity. 
- Timezone math requires manual logic and is very complex.

Newer APIs provide solutions to some of these issues, but the Date object remains widely used in JavaScript development, warts and all. With some extra effort and consideration of timezones, the Date object can be worked with, but it will likely remain an ongoing source of difficulty.

Moment and date-fns are both JavaScript libraries for dealing with dates. Some of the main things they let you do:

Format dates - convert a Date into a string in a specific format (e.g. "MM/DD/YYYY")
Parse dates - convert a string into a Date
Get parts of a date - get the year, month, day, hours, minutes, seconds, etc. from a Date
Manipulate dates - add days/months/years, get start/end of month/week/year, etc.
Locale awareness - format/parse dates with locale-specific options
Relative time - get the time since some date (e.g. "2 days ago")

The main differences between moment and date-fns are:

date-fns has a smaller footprint (fewer methods/features) and is designed to be tree-shakeable
moment supports older browsers/environments and has more features
date-fns aims to have immutable/pure functions and avoid side effects
moment has some convenient chaining APIs

So it basically depends on your use case and preferences. Both are popular choices and have their pros and cons.

Both Moment.js and date-fns are JavaScript libraries that provide functionality to work with dates, times, and timezones. Here are some examples on how to use timezones in both libraries:

Moment.js:

1. To create a moment object with a specific timezone, you can use the `.tz()` method:

```js
const moment = require('moment-timezone');

const date = moment.tz('2022-04-01 12:00:00', 'America/New_York');

console.log(date.format()); // 2022-04-01T12:00:00-04:00
```

2. To convert a moment object to a different timezone, you can use the `.tz()` method again:

```js
const moment = require('moment-timezone');

const date = moment.tz('2022-04-01 12:00:00', 'America/New_York');

const convertedDate = date.tz('Europe/London');

console.log(convertedDate.format()); // 2022-04-01T16:00:00+01:00
```

date-fns:

1. To create a date object with a specific timezone, you can use the `zonedTimeToUtc()` function:

```js
const { zonedTimeToUtc } = require('date-fns-tz');

const date = zonedTimeToUtc('2022-04-01 12:00:00', 'America/New_York');

console.log(date.toISOString()); // 2022-04-01T16:00:00.000Z
```

Note that the `zonedTimeToUtc()` function returns a `Date` object in UTC timezone.

2. To convert a `Date` object to a different timezone, you can use the `zonedTimeToUtc()` function again:

```js
const { zonedTimeToUtc } = require('date-fns-tz');

const date = new Date('2022-04-01T12:00:00Z');

const convertedDate = zonedTimeToUtc(date, 'Europe/London');

console.log(convertedDate.toISOString()); // 2022-04-01T13:00:00.000Z
```

Note that the `zonedTimeToUtc()` function expects a `Date` object in UTC timezone.