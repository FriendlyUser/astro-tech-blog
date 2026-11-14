---
title: Dumb bug fixes that shouldn't have worked
pubDate: "2023-08-31T19:17:25.000Z"
lastUpdated: 2026-11-14
description: "A running list of bug fixes that shouldn't have worked but did, starting with a PHP 5.2 session bug fixed by re-uploading the same file to cPanel."
tags: ["bugfixes", "php"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/14447351.png
---

Here I list the dumb things that were done to fix bugs, and the likely reasons they worked.

## Re-uploading the same file to cPanel

A `$_SESSION["variable"]` was undefined on a PHP 5.2 site. Re-uploading the file to cPanel, unchanged, fixed it. Is there a cache for PHP 5.2?

Not a built-in one: OPcache only ships with PHP 5.5 and later. (PHP 5.2 itself reached end of life in January 2011.) The likelier explanations:

- **Invisible bytes before `<?php`.** `session_start()` has to send a cookie header, so any output before it, such as a UTF-8 byte order mark or stray whitespace at the top of the file, causes a "headers already sent" warning and the session never starts. Uploading again from a different editor, or in a different FTP transfer mode (ASCII vs binary), can strip those bytes. Turning on error reporting or reading the PHP error log would show the warning.
- **A bad first upload.** If the first transfer was truncated or corrupted, the second one simply replaced it with a working file.
- **A stale copy somewhere.** Shared hosts running PHP 5.2 often had an opcode cache extension such as APC or eAccelerator installed, and some sat behind a caching proxy. Either could keep serving an old version of the script until the file changed.
- **A stale session, not stale code.** Session data lives on the server (files under `session.save_path` by default). An expired or mismatched session cookie gives you an undefined index no matter what the code does, and retesting after the upload may just have started a fresh session.

Which one it was depends on the host's PHP and cPanel setup.

## Adding a space

Adding a space to the code fixed the bug. The usual suspect for this one is that saving the file forced a rebuild or invalidated a cache that was holding an old version, rather than the space itself doing anything.
