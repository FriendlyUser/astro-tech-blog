---
title: "Building an Excel add-in that calls OpenAI and Alpha Vantage"
pubDate: "2024-03-30T00:00:00.000Z"
lastUpdated: 2026-11-14
description: "Scaffold an Excel task pane add-in with yo office, then make it ask OpenAI for a stock ticker and show the company overview from Alpha Vantage."
tags: ["GPT", "Excel", "AI Integration", "Software Development", "JavaScript", "TypeScript", "Excel Add-in", "OpenAI", "Automation", "Productivity"]
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/3292707171.webp"
---

:::caution
The original version of this add-in used `gpt-3.5-turbo`, which OpenAI shut down on 23 October 2026. The code below takes the model name from a constant; set it to a model listed on [OpenAI's models page](https://developers.openai.com/api/docs/models).
:::

An Excel add-in is a small web app (HTML and JavaScript) that Excel loads into a task pane. Because it's just a web page, it can call any HTTP API, including OpenAI's. This post builds a basic add-in first, then a stock lookup add-in: you type a description of a company, GPT suggests a ticker, and the add-in fetches the company overview from Alpha Vantage.

## Scaffold an add-in

You need Node.js (an active LTS release) and Excel, either desktop with a Microsoft 365 subscription or Excel on the web.

Install Yeoman and Microsoft's Office generator, then run it:

```bash
npm install -g yo generator-office
yo office
```

For a project with the classic XML manifest, answer the prompts with:

- **Project type**: Office Add-in Task Pane project
- **Script type**: JavaScript or TypeScript
- **Office client application**: Excel

The generator creates a project folder and runs `npm install`. The files you'll edit:

- `manifest.xml`: describes the add-in to Excel (name, icons, the URL of the task pane).
- `src/taskpane/taskpane.html`: the task pane markup.
- `src/taskpane/taskpane.js` (or `.ts`): the code that talks to Excel.

## A first add-in: write to a cell

Excel code goes inside `Excel.run`. You queue operations on proxy objects, then `context.sync()` sends them to Excel in one batch:

```javascript
Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    document.getElementById("run").onclick = run;
  }
});

async function run() {
  try {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange("A1");
      range.values = [["Hello, Excel!"]];
      await context.sync();
    });
  } catch (error) {
    console.error(error);
  }
}
```

The TypeScript version is the same code; the types (`Excel.RequestContext`, `Excel.Range`) come from `@types/office-js`, which the generator installs.

## Run it

From the project folder:

```bash
npm start
```

This starts a local HTTPS dev server, installs a development certificate if needed, and opens Excel desktop with the add-in sideloaded. Open it from **Home** > **Show Task Pane**. To test in Excel on the web instead, pass the URL of a workbook in your OneDrive or SharePoint:

```bash
npm run start -- web --document <workbook-url>
```

`npm stop` stops the server and removes the sideloaded add-in.

To share the add-in beyond your machine, see Microsoft's guide to [deploying and publishing Office Add-ins](https://learn.microsoft.com/en-us/office/dev/add-ins/publish/publish).

## The stock lookup add-in

The flow:

1. Read the description the user typed into the task pane.
2. Send it to OpenAI's Chat Completions API and ask for a single ticker symbol.
3. Call Alpha Vantage's `OVERVIEW` endpoint with that ticker.
4. Show the company description in the task pane.

### Task pane HTML

This is the generator's template with the body replaced by a text box, a button and an output area:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Stock lookup</title>
    <script src="https://officeapis.public.onecdn.static.microsoft/1/office.js"></script>
    <link rel="stylesheet" href="https://res-1.cdn.office.net/files/fabric-cdn-prod_20230815.002/office-ui-fabric-core/11.1.0/css/fabric.min.css"/>
    <link href="taskpane.css" rel="stylesheet" type="text/css" />
</head>
<body class="ms-font-m ms-welcome ms-Fabric">
    <section id="sideload-msg" class="ms-welcome__main">
        <h2 class="ms-font-xl">Please sideload your add-in to see the app body.</h2>
    </section>
    <main id="app-body" class="ms-welcome__main" style="display: none;">
        <p class="ms-font-l">Describe a company and select <b>Search</b>.</p>
        <textarea id="prompt" placeholder="e.g. the company that makes the iPhone"></textarea>
        <div role="button" id="run" class="ms-welcome__action ms-Button">
            <span class="ms-Button-label">Search</span>
        </div>
        <div id="description"></div>
    </main>
</body>
</html>
```

### Task pane script

```javascript
import { OPENAI_KEY, ALPHAVANTAGE_KEY } from "./env";

// gpt-3.5-turbo was retired; use a current model from OpenAI's models page.
const MODEL = "gpt-6-luna";

Office.onReady((info) => {
  if (info.host === Office.HostType.Excel) {
    document.getElementById("sideload-msg").style.display = "none";
    document.getElementById("app-body").style.display = "flex";
    document.getElementById("run").onclick = run;
  }
});

async function suggestTicker(description) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            "Reply with only the stock ticker symbol of the publicly listed company " +
            "that best matches the user's description. No other text.",
        },
        { role: "user", content: description },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim().toUpperCase();
}

async function companyOverview(symbol) {
  const url =
    "https://www.alphavantage.co/query?function=OVERVIEW" +
    `&symbol=${encodeURIComponent(symbol)}&apikey=${ALPHAVANTAGE_KEY}`;
  const response = await fetch(url);
  return response.json();
}

async function run() {
  const output = document.getElementById("description");
  try {
    const description = document.getElementById("prompt").value;
    const ticker = await suggestTicker(description);
    const overview = await companyOverview(ticker);
    // Alpha Vantage returns {} for unknown symbols and an "Information" or "Note"
    // field when the key is invalid or rate limited.
    output.textContent = overview.Description
      ? `${ticker}: ${overview.Description}`
      : `No overview found for ${ticker}.`;
  } catch (error) {
    console.error(error);
    output.textContent = "Lookup failed. See the console for details.";
  }
}
```

The `env.js` module just exports the two keys as strings. The task pane runs in the browser engine Excel embeds, so the built-in `fetch` is all you need. Nothing here touches the workbook, so the script doesn't need `Excel.run`. A natural next step is to write the ticker and overview fields into the active sheet with the pattern from the first example.

## Things to fix before anyone else uses this

- **The API keys ship to every user.** Anything imported into the task pane script is bundled into JavaScript that the user's machine downloads, so anyone with the add-in can read your OpenAI key. Put the OpenAI and Alpha Vantage calls behind a small server or serverless function that holds the keys, and have the add-in call that instead.
- **The model can be wrong.** GPT may return a ticker for the wrong company, a delisted company, or text that isn't a ticker at all. Show the ticker next to the result (as above) so the user can see what it picked, and treat the output as a lookup aid, not investment advice.
- **Alpha Vantage limits free keys.** Expect the "Information" message instead of data once you hit the limit.
- **Use `textContent`, not `innerHTML`,** for text that comes from an API, so a response can't inject markup into the task pane.

## Further reading

- [Build your first Excel task pane add-in](https://learn.microsoft.com/en-us/office/dev/add-ins/quickstarts/excel-quickstart-jquery) (Microsoft Learn)
- [Excel JavaScript API overview](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/excel-add-ins-reference-overview)
- [OpenAI Chat Completions API reference](https://developers.openai.com/api/reference/resources/chat)
- [Alpha Vantage API documentation](https://www.alphavantage.co/documentation/)
