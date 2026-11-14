---
tags: ['go', 'wails', 'vue']
title: A basic Wails app that fetches quotes from the Tronald Dump API
description: Build a small Wails desktop app with a Vue frontend that fetches a random quote, either from the frontend with fetch or from a bound Go method.
pubDate: Fri, 10 January 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1246994641.webp"
---

:::caution
The first version of this post used Wails v1 (`wails.CreateApp`, `mewn`, `window.backend`), which is no longer supported. The code below uses the Wails v2 API. Wails v3 is now the latest major version and changes the binding API again; see the [Wails docs](https://wails.io/) if you're starting fresh.

The Tronald Dump API (`api.tronalddump.io`) also appears to be offline. The code works the same against any JSON API; swap in another URL to try it.
:::

[Wails](https://wails.io/) builds desktop apps with a Go backend and a web frontend rendered in the OS webview. This app has one button that fetches a random quote and shows it. There are two places you can make the HTTP call: in the frontend JavaScript, or in Go with the result passed to the frontend. I'll show both.

## Create the project

Install the Wails CLI and check your system has what it needs (Go, Node.js and, on Linux, the WebKitGTK libraries):

```sh
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor
```

Then create a project from the Vue template:

```sh
wails init -n quoteapp -t vue
cd quoteapp
```

## Option 1: call the API from the frontend

Replace `frontend/src/components/HelloWorld.vue` with:

```vue
<script setup>
import { ref } from 'vue'

const quote = ref('')

async function getQuote() {
  const response = await fetch('https://api.tronalddump.io/random/quote')
  const data = await response.json()
  quote.value = data.value
}
</script>

<template>
  <div>
    <button @click="getQuote">Get quote</button>
    <p>{{ quote }}</p>
  </div>
</template>
```

This request comes from the webview, so the API has to allow cross-origin requests. If it doesn't, the browser blocks the response and you need option 2.

## Option 2: call the API from Go

Wails exposes the public methods of any struct you pass to `Bind`. The Vue template already binds an `App` struct in `app.go`; add a `GetQuote` method to it:

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// GetQuote is callable from the frontend because it is exported.
func (a *App) GetQuote() (string, error) {
	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, "https://api.tronalddump.io/random/quote", nil)
	if err != nil {
		return "", err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("quote API returned %s", resp.Status)
	}

	var body struct {
		Value string `json:"value"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return "", err
	}
	return body.Value, nil
}
```

`main.go` from the template stays as it is. The part that matters is the `Bind` option:

```go
err := wails.Run(&options.App{
	Title:  "quoteapp",
	Width:  1024,
	Height: 768,
	AssetServer: &assetserver.Options{
		Assets: assets,
	},
	OnStartup: app.startup,
	Bind: []interface{}{
		app,
	},
})
```

When you run `wails dev`, Wails generates JavaScript wrappers for bound methods under `frontend/wailsjs/go/main/App.js`. Each wrapper returns a promise; if the Go method returns a non-nil error, the promise rejects. Use it from the component:

```vue
<script setup>
import { ref } from 'vue'
import { GetQuote } from '../../wailsjs/go/main/App'

const quote = ref('')
const error = ref('')

async function getQuote() {
  try {
    quote.value = await GetQuote()
    error.value = ''
  } catch (err) {
    error.value = String(err)
  }
}
</script>

<template>
  <div>
    <button @click="getQuote">Get quote</button>
    <p>{{ quote }}</p>
    <p v-if="error">{{ error }}</p>
  </div>
</template>
```

Going through Go avoids CORS entirely and keeps any API keys out of the frontend bundle.

## Run and build

```sh
wails dev    # live-reloading development build
wails build  # production build
```

`wails build` writes the executable to `build/bin`. On Linux run `./build/bin/quoteapp`; on macOS it's an app bundle (`quoteapp.app`); on Windows, double-click `quoteapp.exe`.
