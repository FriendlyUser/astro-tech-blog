---
tags: ['phaser', 'nodejs', 'js']
title: "Multiplayer Phaser game, part I: the Node.js and Socket.IO server"
description: How the server for my Phaser pirate-ship game tracks players, bullets, health packs and driftwood, and broadcasts state with Express and Socket.IO.
pubDate: Fri, 14 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2776175216.webp
---
:::caution
The original [Pirates-Game](https://github.com/FriendlyUser/Pirates-Game/tree/master) repo was written against Socket.IO 2 and Express 4. Its `require('socket.io').listen(http)` setup was removed in Socket.IO 3, so the code below uses the current `new Server(httpServer)` form. I also dropped the keep-alive pings to a `herokuapp.com` URL: Heroku removed free dynos in November 2022, so there is nothing left to keep awake.
:::

This is the server half of a small multiplayer game: each player steers a ship, shoots at other ships, picks up health packs, and dodges drifting wood. The browser client is built with Phaser; the server is Node.js with Express for static files and Socket.IO for real-time messages.

The server is authoritative for everything that isn't a player's own ship. Clients report their position, angle and health and ask to fire bullets; the server moves bullets, health packs and driftwood, does the collision checks, and broadcasts the results to every client.

## Setting up Express and Socket.IO

```js
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the index page and icon
app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/favicon.ico', function (request, response) {
  response.sendFile(path.join(__dirname, 'favicon.ico'));
});

// Static assets, scripts and styles
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/css', express.static(path.join(__dirname, 'css')));

const port = process.env.PORT || 8000;
server.listen(port, function () {
  console.log('listening on port', port);
});
```

Socket.IO has to share the same HTTP server as Express, so the server is created with `http.createServer(app)` and `server.listen()` is called on it. Calling `app.listen()` instead would start a second server without Socket.IO attached.

## Game state

All state lives in plain objects and arrays on the server:

```js
var players = {};       // keyed by socket id
var bullet_array = [];  // every bullet in flight

var spawnObjectsAllowed = false; // only spawn pickups once someone has joined
var maxHealthPacks = 5;
var numHealthPacks = 0;
var healthPack_array = [];

var maxDriftWood = 15;
var numDriftWood = 0;
var driftWood_array = [];

var WORLD_SIZE = { w: 1500, h: 1000 }; // must match the client-side world size
```

## Handling client events

```js
io.on('connection', function (socket) {
  // A new player sends its initial state
  socket.on('new-player', function (state) {
    console.log('New player joined with state:', state);
    players[socket.id] = state;
    io.emit('update-players', players);
    spawnObjectsAllowed = true;
  });

  // The disconnect handler receives a reason string, not player state
  socket.on('disconnect', function (reason) {
    delete players[socket.id];
    console.log('Player', socket.id, 'disconnected:', reason);
    io.emit('update-players', players);
  });

  // Clients report their own position, angle and health
  socket.on('move-player', function (position_data) {
    if (players[socket.id] == undefined) return; // client still connected after a server restart
    players[socket.id].x = position_data.x;
    players[socket.id].y = position_data.y;
    players[socket.id].angle = position_data.angle;
    players[socket.id].health = position_data.health; // the client changes sprites based on health
    io.emit('update-players', players);
  });

  // Bullets are simulated on the server
  socket.on('shoot-bullet', function (data) {
    if (players[socket.id] == undefined) return;
    data.owner_id = socket.id; // used so your own bullet can't hit you
    if (Math.abs(data.speed_x) > 20 || Math.abs(data.speed_y) > 20) {
      // console.log("Player", socket.id, "is cheating!");
    }
    bullet_array.push(data);
  });
});
```

Every state change is sent to everyone with `io.emit('update-players', players)`, which sends the whole player table. That is simple and fine for a handful of players; with more players you would send only the change, or batch updates into the game loop tick.

## The server game loop

`ServerGameLoop` runs on a timer and does four things: moves bullets and checks them against players, health packs and driftwood; moves health packs and checks whether a player picked one up; moves and rotates driftwood; and broadcasts the positions of all three.

```js
function ServerGameLoop() {
  for (var i = 0; i < bullet_array.length; i++) {
    var bullet = bullet_array[i];
    bullet.x += bullet.speed_x;
    bullet.y += bullet.speed_y;

    // Did the bullet hit another player?
    for (var id in players) {
      if (bullet.owner_id != id) {
        var dx = players[id].x - bullet.x;
        var dy = players[id].y - bullet.y;
        if (Math.sqrt(dx * dx + dy * dy) < 70) {
          io.emit('player-hit', id);
          console.log('Player [' + id + '] hit by bullet');
        }
      }
    }

    // Bullets destroy health packs...
    for (var j = 0; j < healthPack_array.length; j++) {
      var dx = healthPack_array[j].x - bullet.x;
      var dy = healthPack_array[j].y - bullet.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        console.log('Heart [' + j + '] destroyed by bullet');
        healthPack_array.splice(j, 1);
        j--;
        numHealthPacks--;
      }
    }

    // ...and driftwood
    for (var j = 0; j < driftWood_array.length; j++) {
      var dx = driftWood_array[j].x - bullet.x;
      var dy = driftWood_array[j].y - bullet.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        console.log('DriftWood [' + j + '] destroyed by bullet [' + i + ']');
        driftWood_array.splice(j, 1);
        j--;
        numDriftWood--;
      }
    }

    // Remove the bullet once it leaves the world
    if (bullet.x < -10 || bullet.x > WORLD_SIZE.w || bullet.y < -10 || bullet.y > WORLD_SIZE.h) {
      bullet_array.splice(i, 1);
      i--;
    }
  }

  // Move health packs and check for pickups
  for (var i = 0; i < healthPack_array.length; i++) {
    var healthPack = healthPack_array[i];
    healthPack.x += healthPack.speed_x;
    healthPack.y += healthPack.speed_y;

    var pickedUp = false;
    for (var id in players) {
      var dx = players[id].x - healthPack.x;
      var dy = players[id].y - healthPack.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        console.log('Collision between player [' + id + '] and healthPack [' + i + ']');
        io.emit('player-heal', id); // the client restores the player's health
        pickedUp = true;
        break; // only one player can pick up a given pack
      }
    }

    var outOfBounds = healthPack.x < -10 || healthPack.x > WORLD_SIZE.w ||
                      healthPack.y < -10 || healthPack.y > WORLD_SIZE.h;
    if (pickedUp || outOfBounds) {
      healthPack_array.splice(i, 1);
      i--;
      numHealthPacks--;
    }
  }

  // Move and rotate driftwood
  for (var i = 0; i < driftWood_array.length; i++) {
    var driftWood = driftWood_array[i];
    driftWood.x += driftWood.speed_x;
    driftWood.y += driftWood.speed_y;
    driftWood.rotation += driftWood.rotateDirection * Math.PI / 200;
    if (driftWood.rotation > 2 * Math.PI) {
      driftWood.rotation = 0;
    }
    if (driftWood.x < -10 || driftWood.x > WORLD_SIZE.w || driftWood.y < -10 || driftWood.y > WORLD_SIZE.h) {
      driftWood_array.splice(i, 1);
      i--;
      numDriftWood--;
    }
  }

  // Send everything to every client
  io.emit('driftWood-update', driftWood_array);
  io.emit('healthPack-update', healthPack_array);
  io.emit('bullets-update', bullet_array);
}
```

The loops iterate forward and call `splice(i, 1)` followed by `i--` so that removing an element doesn't skip the next one. In the original version the health-pack pickup loop kept checking other players after a pack had already been removed, which could remove a second pack and decrement the counter twice; the `pickedUp` flag and `break` above fix that.

## Spawning pickups and obstacles

```js
// Spawn a heart; the client heals the player on 'player-heal'
function spawnHealthPacks() {
  if (numHealthPacks < maxHealthPacks && spawnObjectsAllowed) {
    var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
    var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
    var new_healthPack = {
      x: Math.random() * 0.75 * WORLD_SIZE.w + 50,
      y: Math.random() * 0.75 * WORLD_SIZE.h + 25,
      speed_x: Math.random() * 0.5 * plusOrMinusx,
      speed_y: Math.random() * 0.5 * plusOrMinusy,
    };
    healthPack_array.push(new_healthPack);
    numHealthPacks++;
  }
}

// Spawn driftwood as moving obstacles
function spawnDriftWood() {
  if (numDriftWood < maxDriftWood && spawnObjectsAllowed) {
    var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
    var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
    var new_driftWood = {
      x: Math.random() * 0.75 * WORLD_SIZE.w + 50,
      y: Math.random() * 0.75 * WORLD_SIZE.h + 25,
      speed_x: Math.random() * 0.5 * plusOrMinusx,
      speed_y: Math.random() * 0.5 * plusOrMinusy,
      rotation: Math.random() * 2 * Math.PI,
      rotateDirection: Math.random() < 0.5 ? -1 : 1,
    };
    driftWood_array.push(new_driftWood);
    numDriftWood++;
  }
}

setInterval(spawnDriftWood, 3000);   // driftwood every 3 seconds
setInterval(spawnHealthPacks, 5000); // health packs every 5 seconds
setInterval(ServerGameLoop, 16);     // game loop roughly 60 times a second
```

`setInterval` with 16 ms gives roughly 60 ticks per second, but Node's timers are not precise, and every tick broadcasts three full arrays to every client. That is a lot of traffic for a game this size; a 20–30 Hz tick with interpolation on the client would cut it substantially.

## Gotchas

- **Hits fire every tick.** A bullet isn't removed when it hits a player, so `player-hit` is emitted on every tick while the bullet stays within 70 px. Remove the bullet on hit (`bullet_array.splice(i, 1); i--; break;`) if one bullet should count once.
- **The client is trusted.** Players send their own position and health, so a modified client can teleport or never die. The bullet-speed check in `shoot-bullet` only detects fast bullets; it doesn't reject them. Add a `return` there to drop them.
- **Collision is distance-only.** Every check is a circle-vs-point distance, with radii (70 px for ships, 40 px for pickups) hard-coded to match the sprite sizes.

[Part II](/posts/tech/js/phaser_networked_game_II/) covers the Phaser client.

## Further reading

- [Pirates-Game source on GitHub](https://github.com/FriendlyUser/Pirates-Game/tree/master)
- [Socket.IO server initialization](https://socket.io/docs/v4/server-initialization/)
- [Socket.IO emit cheatsheet](https://socket.io/docs/v4/emit-cheatsheet/)
- [Phaser documentation](https://docs.phaser.io/)
