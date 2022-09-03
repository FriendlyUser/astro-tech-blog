---
title: Heroku shutdown how to migrate to koyeb
description: Basic explaination of how I migrating my discord rss bot to koyeb
layout: '@/templates/BasePost.astro'
pubDate: Friday, 2 September 2022 13:00:00 GMT
tags: ["openapi"]
imgSrc: '/imgs/2022/dall-e/DALL·E 2022-09-02 19.10.17 - apartment collapsing while corgi watches.png'
imgAlt: 'Corgi Apartment Collapsing'
---

Unfortunately, due to corporate greed, heroku is shutting down, the community has already rallied against this change. There are many other alternatives listed, for one of my personal projects I have chosen koyeb.

To track various light novel updates and manga updates, I use a discord rss bot. This bot is written in javascript and uses the monitorss library. The bot is hosted on heroku and uses a free dyno. The bot is also connected to a mongodb database which is external from mongodb free tier.

Having two instances run at once causing a few issues, but overall with some adapation you can move your stuff from heroku to koyeb. A lot of the koyeb build steps are similar to heroku, but there are some differences. For server side applications, I think koyeb is a great alternative to heroku. For bots, you may need to hack a server together along with the bot.

```js
const fs = require('fs')
const path = require('path')
const MonitoRSS = require('monitorss')
const schedulesPath = path.join(__dirname, 'settings', 'schedules.json')
const configPath = path.join(__dirname, 'settings', 'config.bot.json')
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {}
const schedules = fs.existsSync(schedulesPath) ? JSON.parse(fs.readFileSync(schedulesPath)) : {}

const clientManager = new MonitoRSS.ClientManager({
  setPresence: true,
  schedules,
  config
})

const http = require('http');

// Create an instance of the http server to handle HTTP requests

// Start the server on port 3000
// delay start by 5 seconds
setTimeout(() => {
  let app = http.createServer((req, res) => {
    // Set a response type of plain text for the response
    res.writeHead(200, {'Content-Type': 'text/plain'});

    // Send back a response and end the connection
    res.end('Hello World!\n');
});
  app.listen(8080, '0.0.0.0');
}, 5000)
clientManager.start()
```

Previously heroku, had a very way to run bots on their server, with koyeb, we need a port to listen to, and a way to keep the bot alive. I have chosen to use the standard http server, and that starts 5 seconds after monitorrss is initialized.

Alternatively a basic terraform setup can be made, koyeb was recently added to terraform.

```terraform {
  required_providers {
    koyeb = {
      source = "koyeb/koyeb"
    }
  }
}
provider "koyeb" {
  #
  # Use the KOYEB_TOKEN env variable to set your Koyeb API token.
  #
}

resource "koyeb_app" "my-app" {
  name = "my_tf_app"
}
```

Overall porting content from heroku can be done with koyeb or other listed alternatives.

## References
* https://github.com/synzen/MonitoRSS
* https://blog.heroku.com/next-chapter