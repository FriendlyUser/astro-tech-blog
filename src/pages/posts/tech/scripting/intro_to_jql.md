---
tags: ['jira', 'jql']
title: Introduction to JIRA query languages.
description: In this post I will show you how to use jql to find jira issues.
pubDate: Fri, 14 July 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2466346852.png
---
JIRA is a project management tool that helps software development teams plan, track, and release software. It is developed by Atlassian and is widely used by software development teams to manage tasks, bugs, and other issues related to software development. JIRA offers a wide range of features and integrations, making it a versatile tool for software project management.


JIRA Query Language (JQL) is a powerful tool for searching and reporting on issues in JIRA. It is a SQL-like language that allows users to construct complex queries to search for issues based on various criteria, such as issue type, status, priority, assignee, and more. JQL is used to create custom filters, which can be saved and shared with other team members to simplify issue tracking and management. With JQL, users can quickly and easily retrieve the information they need, making it an essential tool for any team using JIRA.


To filter for issues in JIRA that you have created in the last 15 days, you can use the following JQL query:


```sql
created >= -15d and creator = currentUser()
```
This query will return all issues that were created in the last 15 days (`created >= -15d`) and were created by the current user (`creator = currentUser()`).

You can further customize this query by adding other criteria, such as issue type, project, or status, to narrow down your search results. For example, to search for all open bugs that you created in the last 15 days, you can use the following query:


```sql
type = Bug and status != Closed and created >= -15d and creator = currentUser()
```

This query will return all open bugs (`type = Bug` and `status != Closed`) that were created in the last 15 days (`created >= -15d`) and were created by the current user (`creator = currentUser()`).

To learn jql in details refer to the atlassian docs

https://www.atlassian.com/blog/jira-software/jql-the-most-flexible-way-to-search-jira-14

