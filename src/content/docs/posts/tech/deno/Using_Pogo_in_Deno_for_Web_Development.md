---
title: Using Pogo in Deno for Web Development
pubDate: "2023-05-03T14:16:45.081Z"
description: "In this article, we will explore the core features of Pogo and demonstrate how to build a simple web application using this framework."
tags: ["pogo"]
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/30672838870.png
---
# Using Pogo in Deno for Web Development

Deno is a modern, secure runtime for JavaScript and TypeScript that aims to provide a better developer experience than its predecessor, Node.js. One of the powerful tools available for Deno is Pogo, a minimalist web framework inspired by Hapi.js. In this article, we will explore the core features of Pogo and demonstrate how to build a simple web application using this framework.

## Prerequisites

Before we begin, make sure you have the following installed:

1. [Deno](https://deno.land/#installation): Follow the official installation guide to install Deno on your system.
2. A code editor: We recommend using [Visual Studio Code](https://code.visualstudio.com/) with the [Deno extension](https://marketplace.visualstudio.com/items?itemName=denoland.vscode-deno) for a better development experience.

## Getting Started with Pogo

To begin, create a new directory for your project and navigate to it in your terminal:

```bash
$ mkdir deno-pogo-example
$ cd deno-pogo-example
```

Create a new file called `app.ts` inside the project directory. This file will serve as the entry point for our web application. Now, let's import the Pogo library and create a basic web server:

```typescript
// app.ts
import { Pogo } from 'https://deno.land/x/pogo/main.ts';

const server = new Pogo({ port: 3000 });

server.router.get('/', () => {
    return 'Hello, Pogo!';
});

server.start();
```

In this example, we're importing the `Po class from the Deno package registry and creating a new instance with a specified port. We then define a route for the root path `/` using the `server.router.get()` method, which returns a simple "Hello, Pogo!" message. Finally, we start the server using the `server.start()` method.

To run the application, execute the following command in your terminal:

```bash
$ deno run --allow-net app.ts
```

This command tells Deno to run the `app.ts` file with network access permissions. Open your browser and navigate to `http://localhost:3000` to see the "Hello, Pogo!" message.

## Serving Static Files

Pogo makes it easy to serve static files, such as images or stylesheets, using the `server.static()` method. First, create a new directory called `public` in your project folder, and add an example file named `style.:

```css
/* public/style.css */
body {
  font-family: Arial, sans-serif;
  text-align: center;
  background-color: #f0f0f0;
}
```

Next, update your `app.ts` file to serve static files from the `public` directory:

```typescript
// app.ts
// ...
server.static('/', 'public');
// ...
```

Now, any file inside the `public` directory will be accessible via the root path `/`. For example, you can access the `style. file at `http://localhost:3000/style..

## Templating and Rendering

Pogo supports a variety of templating engines, but for this example, we'll use the built-in `EJS` (Embedded JavaScript) engine. First, let's create a new directory called `views` in your project folder and add an example template named `index.ejs`:

```ejs
<!-- views/index.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pogo Example</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <h1><%= message %></h1>
</body>
</html>
```

In this template, we use the `<%= %>` syntax to output the value of a variable named `message`.

Next, update your `app.ts` file to use the EJS engine and render the `index.ejs` template:

```typescript
// app.ts
import { Pogo, renderFile } from 'https://deno.land/x/pogo/main.ts';
// ...

server.router.get('/', async () => {
    const message = 'Hello, Pogo!';
    const content = await renderFile('views/index.ejs', { message });
    return content;
});
```

Here, we import the `renderFile` function from Pogo and use it to render the `index.ejs` template with the `message` variable. Restart your server and visit `http://localhost:3000` to see the rendered template.

## Conclusion

POCO is a powerful and versatile C++ library that provides a comprehensive set of features for developing portable, network-centric applications. By leveraging POCO's intuitive API, you can easily implement advanced functionality such as network communication, multithreading, and file system access in your C++ projects. The examples provided in this article offer a starting point for using POCO in your own applications, but the library's extensive documentation and vibrant community can provide further guidance and support as you explore its full potential.