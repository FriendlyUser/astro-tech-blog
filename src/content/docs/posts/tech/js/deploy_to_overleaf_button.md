---
tags: ['next', 'latex', 'nextra']
title: Add an "Open in Overleaf" button in HTML or React
description: Build a link that opens a public .tex file as a new Overleaf project, as a plain HTML anchor, a Python helper, and a reusable React component.
pubDate: Fri, 7 June 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1738634340-a-dream-of-a-distant-galaxy-concept-art-matte-painting-hq-4k.webp
---

Overleaf is a browser-based LaTeX editor, so readers can compile and edit a document without installing a TeX distribution. If you publish LaTeX examples, a button that opens the file straight in Overleaf saves readers from copying and pasting.

## How it works

Overleaf accepts files at `https://www.overleaf.com/docs`. There is no API key or authentication step on your side: you pass the location of the file in the `snip_uri` parameter, and Overleaf downloads it and creates a new project in the reader's account (prompting them to log in if needed).

```text
https://www.overleaf.com/docs?snip_uri=<url-encoded URL of a .tex or .zip file>
```

Things to know:

- The file must be publicly reachable over HTTP or HTTPS, for example a `raw.githubusercontent.com` URL. A GitHub page URL (`github.com/.../blob/...`) returns HTML, not the `.tex` file.
- `snip_uri` can also point to a `.zip`, which is how you open a multi-file project (e.g. a `.tex` file plus images).
- URL-encode the value. A file URL that contains its own `?` or `&` will otherwise be cut off.
- Optional parameters include `engine` (`pdflatex`, `xelatex`, `lualatex`, `latex_dvipdf`) and `main_document` for zips with more than one `.tex` file.

## Plain HTML

```html
<a
  href="https://www.overleaf.com/docs?snip_uri=https%3A%2F%2Fraw.githubusercontent.com%2FFriendlyUser%2FLatexDiagrams%2Fmaster%2FBlogDiagrams%2FbuildingDapp.tex"
  target="_blank"
  rel="noopener noreferrer"
  style="display: inline-block; background-color: green; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 16px;"
>
  Open in Overleaf
</a>
```

Overleaf's developer page also shows the same thing as a `<form method="post">` with a `snip_uri` field, which avoids encoding the URL by hand.

## From Python

Handy for opening a generated file during development. `quote(..., safe='')` encodes the `:` and `/` in the file URL.

```python
import webbrowser
from urllib.parse import quote

file_url = "https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/BlogDiagrams/buildingDapp.tex"
webbrowser.open(f"https://www.overleaf.com/docs?snip_uri={quote(file_url, safe='')}")
```

## React component

```jsx
const defaultStyle = {
  display: "inline-block",
  backgroundColor: "green",
  color: "white",
  padding: "8px 16px",
  borderRadius: "4px",
  textDecoration: "none",
  fontSize: "16px",
};

export function OverleafButton({ texUrl, engine, children = "Open in Overleaf", style = defaultStyle }) {
  const params = new URLSearchParams({ snip_uri: texUrl });
  if (engine) params.set("engine", engine);

  return (
    <a
      href={`https://www.overleaf.com/docs?${params}`}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
    >
      {children}
    </a>
  );
}
```

`URLSearchParams` does the encoding, so you can pass the raw file URL. In an MDX page (Next.js or Nextra) it is used like this:

```jsx
<OverleafButton texUrl="https://raw.githubusercontent.com/FriendlyUser/LatexDiagrams/master/BlogDiagrams/buildingDapp.tex" />
```

The earlier version of this component built the URL without encoding, appended `.tex` to whatever was passed in, and set `target="\_blank"` (with a stray backslash), which opened a window named `\_blank` instead of a new tab.

## References

- [Overleaf: Open in Overleaf API](https://www.overleaf.com/devs)
- https://github.com/FriendlyUser/dli-vue-docs
- https://github.com/FriendlyUser/latex-diagrams-docs
- https://latex-diagrams-docs.vercel.app/
