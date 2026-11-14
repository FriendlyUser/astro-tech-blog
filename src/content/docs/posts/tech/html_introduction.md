---
tags: ['csharp', 'dotnet', 'openbb', 'html', 'css']
title: "HTML and CSS basics: page structure and three ways to add styles"
description: A short history of the Web, the structure of a minimal HTML document, and how to apply CSS with external stylesheets, style elements and inline styles.
pubDate: Fri, 25 July 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/760955596.png"
---

HTML describes the structure and content of a web page; CSS describes how it looks. Every page you load in a browser is some mix of the two (plus JavaScript for behaviour). This post covers where they came from, what a minimal HTML document contains, and the three ways to attach CSS to it.

## A short history

Tim Berners-Lee proposed the World Wide Web in 1989 while working at CERN, near Geneva. By the end of 1990 he had written the three pieces it still rests on: HTML for documents, URLs for addressing them, and HTTP for fetching them, along with the first browser (called WorldWideWeb) and the first web server. The first website, at `info.cern.ch`, was opened to the public in 1991.

Graphical browsers such as Mosaic (1993) and Netscape Navigator (1994) brought the Web to a general audience. JavaScript arrived in 1995 and CSS in 1996. HTML is now maintained by WHATWG as a "living standard" rather than numbered versions, and CSS by the W3C.

## A minimal HTML document

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>My First Web Page</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <p>This is my first web page.</p>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  </body>
</html>
```

- `<!DOCTYPE html>` tells the browser to render in standards mode. It doesn't declare a version number; without it, browsers fall back to "quirks mode", which emulates old rendering bugs.
- `<html lang="en">` wraps the whole document. The `lang` attribute helps screen readers and translation tools.
- `<head>` holds metadata. `<meta charset="utf-8">` sets the text encoding, the viewport tag makes the page scale properly on phones, and `<title>` is the text shown in the browser tab.
- `<body>` holds the visible content: here an `<h1>` heading, a `<p>` paragraph and an unordered list (`<ul>`) of list items (`<li>`).

Save it as `index.html` and open it in a browser; no server is needed.

## Styling with CSS

A CSS rule is a selector followed by declarations:

```css
body {
  background-color: lightblue;
}

h1 {
  color: white;
  text-align: center;
}

p {
  font-family: Arial, sans-serif;
  font-size: 18px;
}
```

This gives the page a light blue background, centres the `<h1>` in white, and sets paragraphs to 18px Arial. The `sans-serif` fallback is used if Arial isn't installed.

"Cascading" refers to how the browser resolves conflicts when several rules target the same element: more specific selectors win over less specific ones, and among equally specific rules the one that comes last wins.

## Three ways to add CSS to a page

### External stylesheet

Put the rules in a separate `.css` file and link it from `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Styled page</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

This is the usual choice: one stylesheet can be shared by every page, and the browser caches it. The `type="text/css"` attribute you'll see in older examples is optional in HTML5.

### `<style>` element

Put the rules directly in the document's `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Styled page</title>
    <style>
      h1 {
        color: red;
      }
    </style>
  </head>
  <body>
    <h1>Hello, World!</h1>
  </body>
</html>
```

Useful for single-page demos, or for small amounts of critical CSS you want available before an external file loads.

### Inline styles

Set the `style` attribute on an individual element:

```html
<h1 style="color: red;">Hello, World!</h1>
<p style="font-size: 18px;">This is my first web page.</p>
```

Inline styles override rules from stylesheets (unless those use `!important`), can't be reused, and can't express things like `:hover` or media queries. Keep them for one-off cases or styles set from JavaScript.

## Further reading

- [MDN: HTML basics](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Your_first_website/Creating_the_content)
- [MDN: CSS first steps](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics)
- [HTML Living Standard (WHATWG)](https://html.spec.whatwg.org/)
