---
title: "LinkedIn's suggested replies just repeat the conversation"
description: "A chat with a stranger on LinkedIn shows how the suggested-reply buttons echo back whatever was already said instead of offering a useful response."
alt: my first blog post
tags: ["linkedin"]
layout: '@/templates/BasePost.astro'
pubDate: Sunday, 13 Feburary 2023 13:00:00 GMT
lastUpdated: 2026-11-14
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-12-12 19.18.38 - funny story.png'
---

LinkedIn messaging shows a row of suggested replies under each conversation, generated from the recent messages, so you can answer with one click. I was talking to a stranger on LinkedIn and noticed how poor those suggestions were. I've left the stranger unnamed and hidden my own name in the screenshots.

![LinkedIn chat where "How are you?" and "Where are you?" repeat over and over, with suggested replies "What are you doing?", "How are you?" and "From?"](/imgs/2022/linkedin.png)

The conversation had turned into "How are you?" and "Where are you?" repeated over and over. The suggestions offered were "What are you doing?", "How are you?" and "From?", so two of the three were just more questions of the same kind.

![The same chat a few messages later, with suggested replies "Where are you?" and "You're welcome"](/imgs/2022/linkedin_2.png)

A few messages later the suggestions were "Where are you?", which is the message just above it, and "You're welcome", which doesn't answer anything that was said.

The problem is that the suggestions are circular. When a conversation is repetitive, the model echoes the input back instead of adding anything, and clicking a suggestion would only keep the loop going. Suggested replies work for "Thanks!" or "Sounds good" on a normal message. Once a conversation goes off the rails, they're no help at all.
