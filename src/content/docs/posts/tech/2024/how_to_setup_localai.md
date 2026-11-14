---
title: "On-device chat in the browser with Chrome's Prompt API and nlux"
pubDate: "2024-07-06T12:00:00.000Z"
lastUpdated: 2026-11-14
description: "Why running an LLM on the user's device helps privacy, and how to build a React chat UI with nlux that streams replies from Gemini Nano in Chrome."
tags: ["AI", "On-Device AI", "Large Language Models", "Privacy", "nlux", "Google Gemini Nano", "Web Development", "Machine Learning", "Data Security", "Local AI"]
layout: "@/templates/BasePost.astro"
imgSrc: "https://images.unsplash.com/photo-1525338078858-d762b5e32f2c"
---

:::caution
When this post was first written, Chrome's built-in model was only reachable through an experimental `window.ai` API (`window.ai.createTextSession()`) in Chrome Dev. That API is gone. Its replacement is the Prompt API's `LanguageModel` global, which the code below uses.
:::

Most LLM features send the user's text to a server. That's fine for many apps, but not when the text is private (medical notes, internal documents, messages), when the user is offline, or when you don't want to pay per token. An on-device model avoids all three: the prompt never leaves the machine, it works without a network once the model is downloaded, and inference is free to you.

The trade-off is model size. Gemini Nano, the model Chrome ships, is far smaller than hosted models like GPT-4-class or Gemini Pro. It handles summarising, rewriting, classification and short chat well, and it's weaker at long reasoning and factual recall.

This post wires Chrome's Prompt API into [nlux](https://docs.nlkit.com/nlux), a React chat UI library, so you get a streaming chat window where every token is generated locally.

## Chrome's built-in AI APIs

Chrome downloads Gemini Nano once and shares it across sites, so each web app doesn't have to ship its own model. Several task APIs sit on top of it. As of this update:

- **Translator, Language Detector and Summarizer APIs**: stable since Chrome 138, for web pages and extensions.
- **Prompt API** (free-form prompts, which is what a chat needs): available to web pages from Chrome 148 and to extensions from Chrome 138.
- **Writer, Rewriter and Proofreader APIs**: developer trial.

The model has hardware requirements: desktop Chrome on Windows 10/11, macOS 13+, Linux or a Chromebook Plus. You also need at least 22 GB free disk space, and either a GPU with more than 4 GB of VRAM or a CPU with 16 GB of RAM and 4 cores. Chrome on Android and iOS isn't supported yet, so plan a fallback.

## Install nlux

```bash
npm install @nlux/react @nlux/themes
```

These examples use nlux 2.17.1. Its React package declares a peer dependency on React 18. For TypeScript types for `LanguageModel`, also install `@types/dom-chromium-ai` as a dev dependency.

## A streaming adapter for Gemini Nano

nlux talks to any backend through an adapter. For streaming, the adapter receives the user's message and an observer. You call `observer.next()` for each chunk of text, then `observer.complete()` or `observer.error()`.

```ts
// geminiNano.ts
import type { StreamingAdapterObserver } from '@nlux/react';

let session: LanguageModel | undefined;

export async function streamFromGeminiNano(
  message: string,
  observer: StreamingAdapterObserver<string>,
) {
  try {
    if (!('LanguageModel' in self)) {
      throw new Error('This browser does not support the Prompt API.');
    }
    if ((await LanguageModel.availability()) === 'unavailable') {
      throw new Error('Gemini Nano is not available on this device.');
    }

    // One session for the whole conversation, so the model keeps context
    // between messages. The first create() may trigger the model download.
    session ??= await LanguageModel.create();

    for await (const chunk of session.promptStreaming(message)) {
      observer.next(chunk);
    }
    observer.complete();
  } catch (err) {
    observer.error(err instanceof Error ? err : new Error(String(err)));
  }
}
```

`LanguageModel.availability()` returns `"unavailable"`, `"downloadable"`, `"downloading"` or `"available"`. If it's `"downloadable"`, the first `create()` call starts a multi-gigabyte download. Chrome requires a user gesture for that, which a click on the chat's send button provides. `create()` also accepts a `monitor` callback for showing download progress.

## The chat component

`useAsStreamAdapter` turns that function into an nlux adapter:

```tsx
// Chat.tsx
import { AiChat, useAsStreamAdapter } from '@nlux/react';
import '@nlux/themes/nova.css';
import { streamFromGeminiNano } from './geminiNano';

export default function Chat() {
  const adapter = useAsStreamAdapter(streamFromGeminiNano, []);

  return (
    <AiChat
      adapter={adapter}
      personaOptions={{
        assistant: {
          name: 'Gemini Nano',
          avatar: 'https://example.com/assistant-avatar.png',
          tagline: 'Runs entirely on your device',
        },
      }}
      displayOptions={{ colorScheme: 'dark' }}
    />
  );
}
```

My demo of this used to live at localai.space; that site is no longer online.

## Gotchas

- **Feature-detect and fall back.** Most visitors won't have a supported browser and device. Decide up front whether the fallback is a server-side model (and tell the user their text will leave the device) or simply hiding the feature.
- **"Local" is only as private as the rest of your app.** The prompt stays on the device, but if you log conversations to your analytics or sync chat history to a server, you've undone the benefit.
- **The context window is small.** A long conversation in one session will eventually exceed it. Call `session.destroy()` and start a new session when that happens, or when the user starts a new chat.
- **Expect different output from hosted models.** Prompts tuned for a large hosted model often need rewriting for a small one. Keep requests short and specific.

## Further reading

- [Built-in AI APIs and their status](https://developer.chrome.com/docs/ai/built-in-apis) (Chrome for Developers)
- [The Prompt API](https://developer.chrome.com/docs/ai/prompt-api)
- [nlux documentation](https://docs.nlkit.com/nlux)
- [Chrome AI developer public announcements group](https://groups.google.com/a/chromium.org/g/chrome-ai-developer-public)
