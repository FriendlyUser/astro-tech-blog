---
tags: ['jira', 'jql']
title: "JQL basics: finding the Jira issues you created recently"
description: Two short JQL queries for finding Jira issues you created in the last 15 days, and how to narrow them down to open bugs.
pubDate: Fri, 14 July 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2466346852.png
---

Jira is Atlassian's issue and project tracker. JQL (Jira Query Language) is its search syntax: you combine fields, operators, and functions (`project = WEB AND assignee = currentUser()`) to filter issues. It looks a bit like a SQL `WHERE` clause, but it only filters and sorts issues; there are no joins or `SELECT`. You can type JQL in the advanced search view, and save a query as a filter to reuse it on boards and dashboards or share it with your team.

## Issues you created in the last 15 days

```sql
created >= -15d AND creator = currentUser()
```

- `created >= -15d` matches issues created in the last 15 days. Relative dates use units such as `m` (minutes), `h`, `d`, and `w`.
- `creator = currentUser()` matches issues created by whoever runs the query, so the same saved filter works for everyone on the team.

## Open bugs you created in the last 15 days

Add more clauses to narrow the results:

```sql
type = Bug AND status != Closed AND created >= -15d AND creator = currentUser()
```

`type` is an alias for `issuetype`. `status != Closed` only works if your workflow has a status called `Closed`; many projects use `Done` or `Resolved` instead. A query that works across workflows is `statusCategory != Done`, or `resolution = Unresolved` if your project sets resolutions.

Add `ORDER BY created DESC` to the end to see the newest issues first.

## Further reading

- [JQL: the most flexible way to search Jira](https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14) (Atlassian blog)
- [Use advanced search with Jira Query Language (JQL)](https://support.atlassian.com/jira-software-cloud/docs/use-advanced-search-with-jira-query-language-jql/)
