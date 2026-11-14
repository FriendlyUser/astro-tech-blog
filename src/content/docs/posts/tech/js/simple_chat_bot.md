---
title: Building a scripted chat bot in React with react-simple-chatbot
description: A small scripted "about me" chat bot built with react-simple-chatbot, where each step shows a message or a set of options that decide the next step.
pubDate: Saturday, 18 August 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["js", "chatbot", "react"]
layout: '@/templates/BasePost.astro'
imgSrc: '/imgs/2023/3793215953.webp'
---

[react-simple-chatbot](https://github.com/LucasBassetti/react-simple-chatbot) renders a chat window from a list of steps. There's no language model behind it: each step is either a bot message or a set of buttons, and its `trigger` names the step to show next. That's enough for a guided tour like this one, which walks through a short summary of my background.

## Install

```bash
npm install react-simple-chatbot styled-components
```

styled-components is a peer dependency, so install it alongside. Version 1.0.1 of react-simple-chatbot supports React 18 and 19 and styled-components 5.1 or newer. Older 0.6.x releases expected React 16, so if you see peer dependency errors, check which version you installed.

## The steps

```jsx
import React from 'react';
import ChatBot from 'react-simple-chatbot';

const steps = [
  {
    id: '1',
    message: 'Hi, I am David, an inspired programmer eager to learn more about the latest technologies.',
    trigger: '2',
  },
  {
    id: '2',
    options: [
      { value: 1, label: 'Want to learn more about me?', trigger: '3' },
      { value: 2, label: 'Close this Menu', trigger: '100' },
    ],
  },
  {
    id: '3',
    message: 'In high school I was interested in computers and technologies, so I took information technologies classes that focused on game development.',
    trigger: '4',
  },
  {
    id: '4',
    options: [
      { value: 1, label: 'Want to learn even more about me?', trigger: '5' },
      { value: 2, label: 'Close this Menu', trigger: '100' },
    ],
  },
  {
    id: '5',
    message: 'In University I learned about the underlying hardware and software that comprise computers. However, in my spare time, I learnt web development, typography (latex), and general programming knowledge.',
    trigger: '6',
  },
  {
    id: '6',
    options: [
      { value: 1, label: 'Continue?', trigger: '7' },
      { value: 2, label: 'Close this Menu', trigger: '100' },
    ],
  },
  {
    id: '7',
    message: 'On my 1st and 2nd co-op terms, I learnt about the software development lifecycle, commonly used agile tools (JIRA and Confluence), as well as scripting and data analysis. My third co-op term covered BlockChain Technologies.',
    trigger: '100',
  },
  {
    id: '100',
    message: 'Awesome! You finished my summary.',
    end: true,
  },
];

export default function App() {
  return (
    <div className="app">
      <h4>Simple Chat App</h4>
      <div>
        <ChatBot steps={steps} />
      </div>
    </div>
  );
}
```

How the steps fit together:

- A message step (`id`, `message`, `trigger`) shows a bot bubble and moves straight on to the `trigger` step.
- An options step shows buttons. Each option's `trigger` decides where the conversation goes, so "Close this Menu" can jump to the last step from anywhere.
- The step with `end: true` finishes the conversation. Every path through the steps should end at a step like this.
- Step ids are strings and only need to be unique. Using `'100'` for the final step leaves room to add steps in between without renumbering.

## Demo

I couldn't get the bot to render inside this MDX page directly, so the demo is embedded in an iframe:

<iframe src="https://friendlyuser.github.io/Simple-Chat-Bot-in-React"  width="100%" height="500px">
</iframe>

You can also open it on its own at <https://friendlyuser.github.io/Simple-Chat-Bot-in-React/>.

## Where to go next

Scripted steps work for menus, FAQs and guided tours like this one. They can't answer questions the script doesn't anticipate. For other step types and options, see the [project README](https://github.com/LucasBassetti/react-simple-chatbot) and the examples it links to.
