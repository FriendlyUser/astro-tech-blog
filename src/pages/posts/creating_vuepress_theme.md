---
title: "Updating Vuepress Theme Cool"
subtitle: "Fixing issues in theme :rocket:"
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
date: 2018-11-12T00:00:00
lastmod: 2018-11-12T00:00:00
draft: false

# Authors. Comma separated list, e.g. `["Bob Smith", "David Jones"]`.
authors: ["David Li"]

tags: ["vuepress"]
categories: []

description: "Vuepress-theme-cool 1.7"

# Projects (optional).
#   Associate this post with one or more of your projects.
#   Simply enter your project's folder or file name without extension.
#   E.g. `projects = ["deep-learning"]` references 
#   `content/project/deep-learning/index.md`.
#   Otherwise, set `projects = []`.
projects: ["vuepress-theme-cool"]

# Featured image
# To use, add an image named `featured.jpg/png` to your project's folder. 
image:
  # Caption (optional)
  caption: "Image credit: [**Vuepress**](https://github.com/vuejs/vuepress)"

  # Focal point (optional)
  # Options: Smart, Center, TopLeft, Top, TopRight, Left, Right, BottomLeft, Bottom, BottomRight
  focal_point: "Smart"

  # Show image only in page previews?
  preview_only: false

type: "post"
---


# Summary of Changes
When updating the vuepress theme, I decided to add in markdown-it-admonitions which were partly inspired by the Boostnote admonitions.

In addition, I created the `vuepress-theme-cool-starter` repo in order for users to more easily interact with my vuepress-theme.

Overall, I believe that vuepress is a fantastic tool and look forward to continuing to update this theme for vuepress version 1.00

This will require overhaulling and renaming quite a few existing files.

While examining what other components are available for vue. In addition, instead of relying on storybook, vuepress may be a better alterative.

After getting a number of issues on my github repo, I realised that working on open source is a thankless task, heck I probably made more money with ads than I did with open source. At the time of writing I haven't made any money with the ads.

Changing my code to extend the default vuepress-theme made maintaining my code base significantly easier.