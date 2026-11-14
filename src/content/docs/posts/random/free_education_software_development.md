---
tags: ['life', 'education']
title: "Learning software development for free: trade-offs, topics and resources"
description: "The pros and cons of teaching yourself software development with free resources, what to learn first, and which free courses and sites are worth your time."
pubDate: Fri, 22 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2463860355.png
---

You can learn enough to get hired as a software developer without paying for a degree or a bootcamp. The material is out there for free. What free resources don't give you is structure, feedback and a credential, so you have to supply those yourself.

## Pros and cons of learning for free

What you get:

- **No tuition.** You pay with time instead of money.
- **Your own schedule.** You can learn around a job or other commitments.
- **Access from anywhere** with an internet connection.
- **Different teaching styles.** If one course doesn't click, another explanation of the same topic is a search away.

What you give up:

- **Structure.** Nobody sets deadlines or tells you what to learn next, so it's easy to stall or jump between tutorials without finishing anything.
- **Quality control.** Free material ranges from excellent to outdated or wrong. Check the date and prefer official documentation.
- **Credentials.** A free certificate carries less weight with employers than a degree. A portfolio of projects you can explain does more.
- **People.** You don't get classmates or professors by default. Online communities, meetups and open-source projects fill some of that gap.

## What to learn

1. **One programming language, properly.** Python or JavaScript are good first choices. Pick one and stick with it until you can build small programs without a tutorial open.
2. **Computer science fundamentals.** Data structures, algorithms and basic complexity. These are what technical interviews test, and they help you reason about why code is slow.
3. **Git.** Every team uses version control. Learn to commit, branch, merge and open a pull request.
4. **The web.** HTML, CSS and JavaScript, plus how HTTP requests and responses work.
5. **Databases and SQL.** Learn to model data and write queries against PostgreSQL or MySQL.
6. **Working with people.** Writing clear messages, asking good questions and estimating your own work matter as much as code once you're on a team.

## Free resources worth using

- **[CS50x](https://cs50.harvard.edu/x/)** (Harvard): an introduction to computer science with lectures, problem sets and a free certificate from CS50.
- **[freeCodeCamp](https://www.freecodecamp.org/)**: an interactive curriculum with projects and free certifications, plus a large YouTube channel.
- **[The Odin Project](https://www.theodinproject.com/)**: a project-based full-stack web development curriculum.
- **[Full Stack Open](https://fullstackopen.com/en/)** (University of Helsinki): modern web development with React, Node.js and TypeScript.
- **[MIT OpenCourseWare](https://ocw.mit.edu/)**: lecture videos and notes from real MIT courses, including the algorithms classes.
- **[MDN Web Docs](https://developer.mozilla.org/)** and each tool's official documentation: the most accurate reference for whatever you're using.
- **Practice sites** such as LeetCode, HackerRank and Codewars for interview-style problems.
- **Open-source projects on GitHub or GitLab**: reading and contributing to real code teaches things tutorials don't.

Coursera, edX and Udemy are mostly paid. Some courses on Coursera and edX can be audited for free, but graded work and certificates usually cost money.

To choose between them, start from what you already know, use the format you'll actually finish (video or text), and check what other learners say about a course before committing weeks to it.

## Front-end focus

If you want to build user interfaces:

- Get solid with HTML, CSS and JavaScript before picking up a framework. Then learn one of React, Vue or Angular well.
- Learn enough design to make things usable: layout, typography, colour and accessibility.
- Build personal projects and put them online. They become your portfolio.
- Tools: a code editor such as VS Code, your browser's developer tools (Chrome DevTools, Firefox DevTools, Safari Web Inspector), Git, and a design tool such as Figma.

## Back-end focus

If you want to build the server side:

- Pick a language (Python, Java, C#, Go, JavaScript/TypeScript, PHP, Ruby) and a framework that goes with it, such as Django, Flask, Spring Boot, ASP.NET Core, Express or Rails.
- Get comfortable with relational databases, and learn when a document store like MongoDB makes sense.
- Learn to design, build and test HTTP APIs.
- Tools: Git, a test framework for your language (pytest, JUnit, RSpec), and Docker for packaging and running services. Kubernetes comes later, if at all.

## Learning to work with AI tools

When I first wrote this, prompt engineering looked like a skill worth learning in its own right, and I still think working well with AI tools is. The output of a language model depends heavily on what you give it: a precise task, the relevant context and clear constraints get much better results than a vague request.

Careful prompting can also reduce problems like biased or made-up answers, but it can't remove them. You still need to know enough about the subject to check what the model gives you, which is one more reason to learn the fundamentals above rather than skip them.
