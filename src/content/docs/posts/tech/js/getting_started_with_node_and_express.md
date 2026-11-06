---
title: Getting started with express in nodejs
description: Using resolutions in package.json
alt: my first blog post
tags: ["js","introToJs", "node", "express"]
layout: '@/templates/BasePost.astro'
pubDate: Monday, 13 Feb 2023 13:00:00 GMT
imgSrc: '/imgs/2023/3383398588_Ship_on_the_ocean.png'
---

JavaScript's global scope is like a public toilet. You can't avoid going
in there, but try to limit your contact with surfaces when you do. --- Dmitry Baranovskiy

To install Node.js on Windows, follow these steps:

-   Go to the Node.js website: https://nodejs.org/

-   Click the \"Download\" button to download the latest version of
    Node.js for Windows.

-   Once the download is complete, run the installer and follow the
    on-screen instructions to install Node.js on your computer.

-   Once the installation is complete, open a command prompt or terminal
    and type node -v to verify that Node.js was installed correctly and
    to see which version you have installed.

You can also use the following instructions to install Node.js using the
Chocolatey package manager:

-   Open a command prompt or terminal and run the following command:

        choco install nodejs

-   Once the installation is complete, type node -v to verify that
    Node.js was installed correctly and to see which version you have
    installed.

Alternatively, you can use the Windows Subsystem for Linux (WSL) to
install and run Node.js on Windows. To do this, follow these steps:

-   Enable the Windows Subsystem for Linux (WSL) feature on your
    computer. You can do this by opening the \"Turn Windows features on
    or off\" settings, scrolling down to the \"Windows Subsystem for
    Linux\" option, and checking the box next to it. Click \"OK\" to
    save the changes and enable WSL.

-   Once WSL is enabled, open the Microsoft Store and search for
    \"Linux\". Select a Linux distribution, such as Ubuntu, and click
    \"Get\" to install it on your computer.

-   Once the Linux distribution is installed, open a command prompt or
    terminal and type wsl to launch the Linux environment.

-   In the Linux environment, follow the instructions for your specific
    distribution to install Node.js. For example, on Ubuntu, you can use
    the following command to install the latest version of Node.js:

```
    sudo apt-get install nodejs
```

Once the installation is complete, you can use the node command to run
Node.js in the Linux environment.

Alternatively, you can also use a package manager like apt on Ubuntu or
brew on macOS to install Node.js. For example, on Ubuntu, you can use
the following commands:
```
    sudo apt update
    sudo apt install nodejs
```

On macOS, you can use the following commands:
```
    brew update
    brew install node
```


## Express

Express is a popular web application framework for building back-end
applications with Node.js. It provides a simple and flexible way to
create web servers and web applications, and includes a variety of
features and tools that make it easier to develop and maintain back-end
applications.

Some of the key features of Express include:

-   A simple, lightweight, and flexible core that makes it easy to build
    web applications A routing system that allows you to define
    different routes for different HTTP methods and URLs

-   Middleware support, which allows you to define functions that are
    executed before or after a request is handled by a route Built-in
    support for rendering HTML templates using popular template engines
    like Pug and EJS

-   A large ecosystem of third-party libraries and plugins that can be
    easily integrated into Express applications.

-   Express is widely used for building back-end applications because of
    its simplicity, flexibility, and rich feature set. It provides a
    solid foundation for building scalable and maintainable back-end
    applications with Node.js.

Here is an example of a simple Express server:

-   In order to test save the file to app.js

-   use yarn add express or npm install express, this should create a
    package.json file to track dependencies.

-   run node app.js

```javascript
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, world!");
});

app.listen(3000, () => {
  console.log("Server listening on port 3000");
});
```

In this example, the Express app is created using the express function,
and a route is defined for the / path that sends the string \"Hello,
world!\" as a response. The app is then set to listen for incoming
requests on port 3000. When a request is received on the / path, the
specified response will be sent back to the client.

To add a start command to the package.json file that will run the app.js
file, you can add a scripts property to the package.json file, and
specify the start command as follows:

```javascript
{
  "name": "my-node-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js"
  },
  "dependencies": {
    // Dependencies go here
    "express": "^5.0.0"
  }
}
```

In this example, the scripts property is added to the package.json file,
and the start command is defined as node app.js. This means that when
the start script is run (for example, by running npm start or yarn
start), the app.js file will be executed using the node command.

Once the scripts property has been added to the package.json file, you
can run the start script by using the npm run or yarn run command,
followed by the name of the script. For example, to run the start script
with npm, you can run the following command:

    npm run start

To create an Express server that hosts static files, you can use the
express.static middleware function. This function is part of the Express
framework, which is a popular web application framework for Node.js.

Here is an example of how to use the express.static middleware to host
static files:

```javascript
const express = require('express');
const app = express();

app.use(express.static('public'));

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

In this example, the express.static middleware is used to serve all
files in the public directory. This means that any file in the public
directory can be accessed by a client by requesting the file's path
relative to the public directory. For example, if there is a file named
index.html in the public directory, a client can access it by making a
request to http://your-server-domain/index.html.

You can also specify a different directory to serve static files from by
passing the directory path as an argument to the express.static
function. For example:

```javascript
app.use(express.static('my-static-files'));
```

This will serve all files in the my-static-files directory.

It's important to note that the express.static middleware only serves
static files. It does not handle dynamic requests, such as those made
with a form or an AJAX request. To handle dynamic requests, you will
need to use additional middleware or route handlers.

## References

This content came from a book I generated using chatGPT and a lot of editing.

View on the source material see amazon https://www.amazon.com/dp/B0BSL14M71

For a free copy, please view https://friendlyuser.github.io/assets/pdfs/introToJs.pdf
