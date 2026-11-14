---
tags: ['php', 'css', 'react', 'chatgpt']
title: Six ChatGPT prompts I use for code review, commit messages and blog drafts
description: Copy-paste ChatGPT prompts for rewriting code to a style guide, writing tests, explaining code, writing commit messages and test notes, and drafting blog posts.
pubDate: Fri, 7 October 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2692497695.png
---

Prompt engineering is just writing the instruction carefully: say what the output should be, what format it should take, and what to leave out. It doesn't change the model (that's fine-tuning); it only changes how much of the answer you have to fix afterwards. These are the prompts I keep reusing. Replace the bracketed parts and paste your code or diff after the prompt.

## Code review

Rewrite code to a style guide (Google publishes its [JavaScript style guide](https://google.github.io/styleguide/jsguide.html); swap in whichever guide your project follows):

```text
Rewrite the code below following the Google style guidelines for JavaScript.
```

Write tests, asking for the list of cases first so you can check the plan before it writes code:

```text
Write test cases for the main edge cases that could happen to the below code snippet. First outline the test cases you'll write. Second, write the test cases in [language] using the [framework] framework.
```

Explain unfamiliar code:

```text
Explain this code to me: [code snippet]
```

## Git commits

Turn a list of commit messages into notes for whoever tests the feature:

```text
Given the following git commit messages create dev testing notes, do not reference the commits themselves, explain what should be tested when [feature name goes here]
```

Write a commit message from a diff (`git diff --staged` gives you what's about to be committed):

```text
Write an insightful but concise Git commit message in a complete sentence in imperative present tense for the following diff without prefacing it with anything: [git diff goes here]
```

"Without prefacing it with anything" stops the reply from starting with "Sure, here's a commit message:", so the output can be pasted straight in.

## Blog generation

Set up a multi-turn conversation where later messages ask for each section:

```text
Topic: [Blog Topic]
For the above topic, use future prompts to write for a technical audience for a blog post and give concise explanations for code. Optimize the post for Medium and Google SEO. Ensure this content is original. Respond with 'confirm' to acknowledge that you understand the prompt.
```

## Things to watch for

- Generated tests and code examples still need to be run. Models confidently call functions that don't exist or use APIs from an older version of a library.
- Don't paste code, diffs or commit messages you aren't allowed to share with a third-party service.
- Asking a model to "ensure this content is original" doesn't make it check anything; it can't verify originality or facts, so review the draft yourself.

## References

- https://github.com/FriendlyUser/bluey-wordpress-theme
