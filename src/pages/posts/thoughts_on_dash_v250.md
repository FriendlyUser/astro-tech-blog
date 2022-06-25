---
title: Thoughts on dash v2.5.0
description: After updating a project to dash v2.5.0
alt: Thoughts on dash v2.5.0
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
pubDate: Friday, 24 June 2022 13:00:00 GMT
tags: ["python", "dash"]
---

Your job as an engineer is to find the data and put it in a way that makes sense to understand your students' brains. Data science is based around how much you would like to understand those brain processes. You could even use a computer's cognitive function as an indicator.

Your job as an engineer is to find the data and put it in a way that makes sense to understand their brains.

The steps in the migration guide [Dash 2.0 Migration](https://dash.plotly.com/dash-2-0-migration) very helpful, for the most part I could just replace the imports and the app would work as expected.

However, migrating to the new dash page system was far too difficult and I left it out for the initial release.

![Upgrading to Dash v2.5.0](/imgs/2022/dashv250_upgrade.png)

Upgrade from Dash v2.5.0 is simple for moderately complex apps, but for creating new multipage apps, I would recommend starting from a fresh project.

Dash v2.0.0 combines the other standard dash packages into the main dash library, I thought this was a great way to simplify development.

Unsurprising dash .net is still in alpha release which should surprise no one.


Overall, dash is a powerful framework and migration from v1.2.0 was easy for me, for a new project I would just make a new project and import it piecewise.
