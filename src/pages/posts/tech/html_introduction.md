---
tags: ['csharp', 'dotnet', 'openbb']
title: Introduction to csharp
description: Explaining the history of csharp and how it is used
pubDate: Fri, 10 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/760955596.png"
---
The World Wide Web (WWW or Web) is a system of interlinked hypertext documents that are accessed through the Internet. It was created by British computer scientist Sir Tim Berners-Lee in 1989 while he was working at CERN, the European Organization for Nuclear Research, in Switzerland.

Berners-Lee envisioned the Web as a way to share and access information globally and easily. He developed the first web browser, called WorldWideWeb, and the first Web server, and wrote the first Web page. He also proposed and developed the foundational technologies that make the Web possible, including HTML (Hypertext Markup Language), URL (Uniform Resource Locator), and HTTP (Hypertext Transfer Protocol).

In 1991, the first website was launched and the Web started to gain traction as a platform for information sharing. During the 1990s, the Web grew rapidly, with the development of graphical web browsers such as Mosaic and Netscape Navigator, and the introduction of new technologies such as JavaScript, Cascading Style Sheets (CSS), and Flash.

The growth of the Web was accompanied by the dot-com boom of the late 1990s, which saw a surge in investment in Internet-based companies and the development of e-commerce and online businesses. After the dot-com crash in 2000, the Web continued to evolve and mature, with the rise of social media, mobile devices, and cloud computing.

Today, the Web is an integral part of daily life for billions of people around the world, and it continues to evolve and change as new technologies are developed and adopted.


HTML (Hypertext Markup Language) is a standard markup language used to create web pages. It provides a way to structure text, images, videos, and other content on a web page by using a set of markup tags and attributes.

Here's an example of a simple HTML document:


```html
php`<!DOCTYPE html>
<html>
 <head>
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
The first line, `<!DOCTYPE html>`, declares the document type and the version of HTML being used.

The `<html>` tag marks the beginning and end of the HTML document, and contains two main parts: the `<head>` and the `<body>`.

The `<head>` section contains information about the document, such as the title of the page, which is displayed in the browser's tab.

The `<body>` section contains the content of the page, such as headings, paragraphs, lists, and more. In this example, there's an `<h1>` heading that says "Hello, World!", and a `<p>` paragraph that says "This is my first web page." There's also an unordered list (`<ul>`) with three items (`<li>`).


CSS (Cascading Style Sheets) is a stylesheet language used to describe the look and formatting of a document written in HTML or XML. CSS is used to separate the presentation of a document from its content, making it easier to maintain and update the look of a website.

With CSS, you can control the appearance of text, fonts, colors, backgrounds, layout, and other visual elements on a web page. You can also use CSS to create responsive designs that adapt to different screen sizes, from desktop computers to smartphones.

Here's an example of a simple CSS stylesheet:


```html
css`body {
 background-color: lightblue;
}

h1 {
 color: white;
 text-align: center;
}

p {
 font-family: Arial;
 font-size: 18px;
}
```
In this example, the CSS stylesheet specifies that the background color of the body should be light blue, the text color of `<h1>` headings should be white, and the text should be centered. The font family and font size of `<p>` paragraphs are set to Arial and 18 pixels, respectively.

CSS styles can be applied to a web page by linking to an external stylesheet, or by including the styles within the HTML document using the `<style>` tag. The styles defined in a CSS stylesheet are applied to the corresponding elements in the HTML document, allowing you to control the look and feel of your website in a modular and flexible way.


There are three ways to use CSS in HTML:

1. External Stylesheet: This is the most common and recommended way to use CSS in HTML. An external stylesheet is a separate file with a `.css` extension that contains all of your CSS styles. You can link to the external stylesheet from your HTML document using the `<link>` tag, like this:


```html
php`<!DOCTYPE html>
<html>
 <head>
 <link rel="stylesheet" type="text/css" href="styles.css">
 </head>
 <body>
 <!-- Your HTML content goes here -->
 </body>
</html>
```
2. Internal Stylesheet: An internal stylesheet is a section of CSS styles that you include within the `<head>` section of your HTML document, using the `<style>` tag. This is useful for small projects or for testing purposes, but for larger projects, it's generally better to use an external stylesheet. Here's an example:


```html
php`<!DOCTYPE html>
<html>
 <head>
 <style>
 /\* Your CSS styles go here \*/
 </style>
 </head>
 <body>
 <!-- Your HTML content goes here -->
 </body>
</html>
```
3. Inline Styles: Inline styles are styles that you apply directly to individual HTML elements using the `style` attribute. This is not recommended, as it can make your HTML code messy and difficult to maintain. Here's an example:


```html
php`<!DOCTYPE html>
<html>
 <body>
 <h1 style="color: red;">Hello, World!</h1>
 <p style="font-size: 18px;">This is my first web page.</p>
 </body>
</html>
```
In general, it's best to use an external stylesheet for your CSS styles, as it makes your code easier to maintain and reuse. Internal stylesheets and inline styles should be used sparingly, if at all.


