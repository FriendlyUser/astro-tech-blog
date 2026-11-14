---
tags: ['phaser', 'nodejs', 'js']
title: "Networked Phaser game, part II: the browser client"
description: "The Phaser 2 browser client for a multiplayer pirate ship game: input, Socket.IO sync with the Node server, interpolation, collisions and health."
pubDate: Fri, 15 May 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2515566937.png
---
:::caution
This client is written against **Phaser 2.6.2** (loaded from cdnjs) and **Socket.IO 2.x**. Phaser 3 and Phaser 4 replaced the `new Phaser.Game(width, height, renderer, parent, state)` constructor and global `game` object with a config object and `Phaser.Scene` classes, so this code won't run on them unchanged. The community-maintained Phaser CE fork keeps the v2 API. For a new game, start from current [Phaser](https://phaser.io/).
:::

[Part I](/posts/tech/js/phaser_networked_game/) covered the Node.js server: it keeps the list of players, moves cannonballs, health packs and driftwood, and broadcasts their positions over Socket.IO. This part is the browser side. The client has three jobs:

- read keyboard and mouse input, move the local ship, and tell the server where it is;
- keep sprites for everything the server reports (other ships, cannonballs, health packs, driftwood);
- draw it all, with sounds, a health bar and a small HTML log for messages.

The split of authority is simple: each client owns its own ship's position and health and reports them with `move-player`; the server owns the projectiles and pickups and tells clients when a ship is hit or healed.

The page loads three scripts: `phaser.min.js` from cdnjs, `/socket.io/socket.io.js` (served by the Socket.IO server), and `js/client.js`, which is the code below. It also needs a `<ul id="log">` element for the message log.

## Globals and the player object

```js
var ASSET_URL = "assets/";
var WINDOW_WIDTH = 750;
var WINDOW_HEIGHT = 500;
var HEALTH_MAX = 100;
var WORLD_SIZE = { w: 1500, h: 1000 }; // must match the server

// Phaser 2: width, height, renderer, parent element id, state functions
var game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, 'phaser-example',
  { preload: preload, create: create, update: GameLoop });

var numofEnemyPlayers = 0;
var water_tiles = [];
var bullet_array = [];      // cannonball sprites, mirrored from the server
var healthPack_array = [];
var driftWood_array = [];
var other_players = {};     // socket id -> sprite
var bulletSpeed = 17.5;

// Created in preload/create
var shotsLeft, numOfEnemiesText, playersConnectingText, loadText;
var connectingTextFading = false;
var music, hitSound, healSound, fireSound, loadSound;
var meters, healthMeter;
var socket;

var player = {
  sprite: null,
  speed_x: 0,       // current velocity
  speed_y: 0,
  speed: 0.5,       // acceleration per frame while W/Up is held
  friction: 0.95,
  health: 100,
  cannonBalls: 15,
  alive: true,
  shot: false,      // true until the mouse button is released, so one click = one shot
  update: function () {
    if (!this.alive) return;

    // Turn towards the mouse. Wrapping the difference into [-PI, PI] avoids
    // spinning the long way round when the angle crosses +/-PI.
    var dx = (game.input.mousePointer.x + game.camera.x) - this.sprite.x;
    var dy = (game.input.mousePointer.y + game.camera.y) - this.sprite.y;
    var angle = Math.atan2(dy, dx) - Math.PI / 2;
    var dir = (angle - this.sprite.rotation) / (Math.PI * 2);
    dir -= Math.round(dir);
    dir = dir * Math.PI * 2;
    this.sprite.rotation += dir * 0.1;

    // Accelerate forward; a damaged ship accelerates more slowly
    if (game.input.keyboard.isDown(Phaser.Keyboard.W) || game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
      this.speed_x += Math.cos(this.sprite.rotation + Math.PI / 2) * this.speed * this.health / 100;
      this.speed_y += Math.sin(this.sprite.rotation + Math.PI / 2) * this.speed * this.health / 100;
    }
    this.sprite.x += this.speed_x;
    this.sprite.y += this.speed_y;
    this.speed_x *= this.friction;
    this.speed_y *= this.friction;

    changeSpriteBasedOnHealth(this.sprite, this.health);

    // Shoot on left click, or reload with Space/Enter when out of cannonballs
    if (game.input.activePointer.leftButton.isDown && !this.shot) {
      if (this.cannonBalls <= 0) {
        writeToHTMLLog('Press spacebar or enter to reload cannonballs.');
        loadSound.play();
      } else {
        var speed_x = Math.cos(this.sprite.rotation + Math.PI / 2) * bulletSpeed;
        var speed_y = Math.sin(this.sprite.rotation + Math.PI / 2) * bulletSpeed;
        this.cannonBalls -= 1;
        updateCannonballs(this.cannonBalls);
        // The server owns cannonballs: it moves them and checks for hits
        socket.emit('shoot-bullet', { x: this.sprite.x, y: this.sprite.y, angle: this.sprite.rotation, speed_x: speed_x, speed_y: speed_y });
        fireSound.play();
      }
      this.shot = true;
    } else if ((game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) || game.input.keyboard.isDown(Phaser.Keyboard.ENTER)) && this.cannonBalls <= 0) {
      this.cannonBalls += 5;
      updateCannonballs(this.cannonBalls);
      writeToHTMLLog('Cannonballs: (' + this.cannonBalls + ')  Player Health: (' + this.health + ')');
    }
    if (!game.input.activePointer.leftButton.isDown) this.shot = false;

    updateHealthBar(HEALTH_MAX - this.health);

    // A hit sets alpha to 0; ease it back to 1 so the ship flashes
    if (this.sprite.alpha < 1) {
      this.sprite.alpha += (1 - this.sprite.alpha) * 0.16;
    } else {
      this.sprite.alpha = 1;
    }

    // Report position and health every frame
    socket.emit('move-player', { x: this.sprite.x, y: this.sprite.y, angle: this.sprite.rotation, health: this.health });
  }
};
```

Movement is hand-rolled: velocity, friction, and position updates on the sprite, not Arcade Physics bodies. Health scales acceleration, so a damaged ship is slower. The `shot` flag makes each click fire once instead of once per frame.

## Loading assets

Each of the six ship types has four images, `shipN_1.png` (undamaged) to `shipN_4.png` (nearly sunk). The loader's progress signal drives a "waiting" message, and the load-complete callback plays a sound and prints the controls.

```js
function preload() {
  game.load.crossOrigin = "anonymous";
  game.stage.backgroundColor = "#3399DA";
  game.load.onFileComplete.add(fileComplete, this);
  game.load.onLoadComplete.add(loadComplete, this);

  for (var i = 1; i <= 6; i++) {
    for (var state = 1; state <= 4; state++) {
      var key = 'ship' + i + '_' + state;
      game.load.image(key, ASSET_URL + key + '.png');
    }
  }
  game.load.image('bullet', ASSET_URL + 'cannon_ball.png');
  game.load.image('water', ASSET_URL + 'water_tile.png');
  game.load.image('healthPack', ASSET_URL + 'heart.png');
  game.load.image('driftWood', ASSET_URL + 'dinghyLarge3.png');
  game.load.audio('loaded', ASSET_URL + 'sound/ready.wav');
  game.load.audio('hit', ASSET_URL + 'sound/thud1.wav');
  game.load.audio('fireCannonball', ASSET_URL + 'sound/cannonball.wav');
  game.load.audio('soundtrack', ASSET_URL + 'sound/pirates.wav');
  game.load.audio('healing', ASSET_URL + 'sound/healing.wav');

  // Centred loading text with a canvas gradient fill
  loadText = game.add.text(game.world.centerX, game.world.centerY, ' Connected to Server,\nWaiting for the game to load');
  loadText.anchor.set(0.5);
  loadText.align = 'center';
  loadText.font = 'Arial';
  loadText.fontWeight = 'bold';
  loadText.fontSize = 35;
  var grd = loadText.context.createLinearGradient(0, 0, 0, loadText.height);
  grd.addColorStop(0, '#00008B');
  grd.addColorStop(1, '#006400');
  loadText.fill = grd;
}

function fileComplete(progress, cacheKey, success, totalLoaded, totalFiles) {
  loadText.setText(' Connected to Server,\nWaiting for the game to load.\n' +
    progress + '% (' + totalLoaded + ' of ' + totalFiles + ' files)');
}

function loadComplete() {
  loadSound = game.add.audio('loaded');
  loadSound.play();
  loadText.setText('');
  writeToHTMLLog('Player Ship Created and ready to go.');
  writeToHTMLLog('Controls: left click to shoot, W or Up to move.');
  writeToHTMLLog('Controls: the ship turns towards the mouse cursor.');
}
```

## Creating the world and wiring up Socket.IO

`create()` builds the water, the HUD and the local ship, then connects. Calling `io()` with no URL connects back to the server that served the page, which fires `connection` on the server; the client immediately sends `new-player` with its starting state.

```js
function create() {
  game.physics.startSystem(Phaser.Physics.ARCADE);

  music = game.add.audio('soundtrack');
  music.loopFull(0.25); // loop at 25% volume
  hitSound = game.add.audio('hit');
  healSound = game.add.audio('healing');
  fireSound = game.add.audio('fireCannonball');

  // Tile the world with semi-transparent water
  for (var i = 0; i <= WORLD_SIZE.w / 64 + 1; i++) {
    for (var j = 0; j <= WORLD_SIZE.h / 64 + 1; j++) {
      var tile_sprite = game.add.sprite(i * 64, j * 64, 'water');
      tile_sprite.anchor.setTo(0.5, 0.5);
      tile_sprite.alpha = 0.5;
      water_tiles.push(tile_sprite);
    }
  }

  game.stage.disableVisibilityChange = true; // keep running when the tab loses focus
  game.world.setBounds(0, 0, WORLD_SIZE.w, WORLD_SIZE.h);
  createHealthBar();

  // Random ship type (1-6), spawned in the bottom-right quarter of the world
  var player_ship_type = String(Math.floor(6 * Math.random()) + 1);
  player.sprite = game.add.sprite(
    Math.random() * WORLD_SIZE.w / 2 + WORLD_SIZE.w / 2,
    Math.random() * WORLD_SIZE.h / 2 + WORLD_SIZE.h / 2,
    'ship' + player_ship_type + '_1');
  player.sprite.anchor.setTo(0.5, 0.5);

  var hudStyle = { font: "bold 16px Arial", fill: "#ffffff", align: "center" };
  shotsLeft = game.add.text(625, 475, "Shots Left: " + player.cannonBalls, hudStyle);
  shotsLeft.fixedToCamera = true;
  numOfEnemiesText = game.add.text(5, 475, "Enemy Ships: 0", hudStyle);
  numOfEnemiesText.fixedToCamera = true;
  playersConnectingText = game.add.text(250, 10, "Waiting for other players to join", hudStyle);
  playersConnectingText.fixedToCamera = true;
  writeToHTMLLog('Waiting for players to join');

  game.camera.x = player.sprite.x - WINDOW_WIDTH / 2;
  game.camera.y = player.sprite.y - WINDOW_HEIGHT / 2;

  socket = io();
  socket.emit('new-player', { x: player.sprite.x, y: player.sprite.y, angle: player.sprite.rotation, type: player_ship_type, health: player.health });

  // Full player table from the server, sent whenever anyone joins, leaves or moves
  socket.on('update-players', function (players_data) {
    var players_found = {};
    for (var id in players_data) {
      players_found[id] = true;
      if (id === socket.id) continue; // our own ship is drawn locally

      var data = players_data[id];
      if (other_players[id] === undefined) {
        other_players[id] = CreateShip(data.type, data.x, data.y, data.angle);
        writeToHTMLLog('Player [' + id + '] Joined the Game.');
        if (playersConnectingText.text === '') {
          playersConnectingText.setText('Player Joined');
          playersConnectingText.alpha = 1;
        }
        numofEnemyPlayers++;
      }

      // Set a target rather than the position, so GameLoop can interpolate
      var p = other_players[id];
      p.target_x = data.x;
      p.target_y = data.y;
      p.target_rotation = data.angle;
      p.health = data.health;
      changeSpriteBasedOnHealth(p, p.health);
    }

    // Remove ships that are no longer in the server's table
    for (var id in other_players) {
      if (!players_found[id]) {
        numofEnemyPlayers--;
        writeToHTMLLog('Player [' + id + '] Disconnected from the Game.');
        if (playersConnectingText.text === '') {
          playersConnectingText.setText('Player Destroyed');
          playersConnectingText.alpha = 1;
        }
        other_players[id].destroy();
        delete other_players[id];
      }
    }

    numOfEnemiesText.setText("Enemy Ships: " + numofEnemyPlayers);

    // Fade the status text out after 3 seconds. This event arrives many times a
    // second, so only start one tween at a time.
    if (numofEnemyPlayers > 0 && playersConnectingText.text !== '' && !connectingTextFading) {
      connectingTextFading = true;
      game.add.tween(playersConnectingText)
        .to({ alpha: 0 }, 1000, Phaser.Easing.Default, true, 3000)
        .onComplete.add(function () {
          playersConnectingText.setText('');
          connectingTextFading = false;
        });
    }
  });

  // The server sends the whole array of each object type every tick
  socket.on('bullets-update', function (server_bullets) {
    syncSprites(bullet_array, server_bullets, 'bullet');
  });

  socket.on('healthPack-update', function (server_healthpacks) {
    syncSprites(healthPack_array, server_healthpacks, 'healthPack');
  });

  socket.on('driftWood-update', function (server_driftwood) {
    syncSprites(driftWood_array, server_driftwood, 'driftWood');

    // Driftwood damage is checked on the client: 1 HP per frame of contact
    for (var i = 0; i < driftWood_array.length; i++) {
      var dx = driftWood_array[i].x - player.sprite.x;
      var dy = driftWood_array[i].y - player.sprite.y;
      if (Math.sqrt(dx * dx + dy * dy) < 45 && checkOverlap(driftWood_array[i], player.sprite)) {
        hitSound.volume = 0.5;
        hitSound.play();
        player.health -= 1;
        player.sprite.x -= dx * 0.15; // push the ship away from the wood
        player.sprite.y -= dy * 0.15;
      }
    }
  });

  // The server detected a cannonball hit on ship `id`
  socket.on('player-hit', function (id) {
    if (id === socket.id) {
      player.sprite.alpha = 0; // flash; player.update() fades it back in
      player.health -= 1;
      hitSound.volume = 0.5;
      hitSound.play();
      writeToHTMLLog('Ouch, hit by cannon ball. Health: ' + player.health);
      // Send the new health straight away so other clients switch the damaged sprite
      socket.emit('move-player', { x: player.sprite.x, y: player.sprite.y, angle: player.sprite.rotation, health: player.health });
    } else if (other_players[id]) {
      other_players[id].alpha = 0;
    }
  });

  socket.on('player-heal', function (id) {
    if (id !== socket.id) return;
    healSound.volume = 0.5;
    healSound.play();
    player.health = Math.min(player.health + 10, HEALTH_MAX);
    writeToHTMLLog('You healed because of the heart: Health(' + player.health + ')');
  });
}
```

Other players' ships are never moved directly by network messages. Each `update-players` sets `target_x`, `target_y` and `target_rotation`, and the game loop eases the sprite towards them, which hides the jitter of irregular network updates.

## The game loop

`GameLoop` is Phaser's `update` callback and runs once per frame.

```js
function GameLoop() {
  player.update();

  if (player.health <= 0 && player.alive) {
    player.alive = false;
    player.speed_x = 0;
    player.speed_y = 0;
    updateHealthBar(HEALTH_MAX);
    writeToHTMLLog('Game Over: Disconnecting from game server.');
    socket.disconnect(); // the server's 'disconnect' handler drops us from the player table
    var t = game.add.text(250, 250, "Game Over", { font: "bold 32px Arial", fill: "#ffffff", align: "center" });
    t.fixedToCamera = true;
    var t2 = game.add.text(250, 400, "No more Cannonballs", { font: "bold 32px Arial", fill: "#ffffff", align: "center" });
    t2.fixedToCamera = true;
  }

  // Ease the camera towards the player
  var camera_x = player.sprite.x - WINDOW_WIDTH / 2;
  var camera_y = player.sprite.y - WINDOW_HEIGHT / 2;
  game.camera.x += (camera_x - game.camera.x) * 0.08;
  game.camera.y += (camera_y - game.camera.y) * 0.08;

  for (var id in other_players) {
    var p = other_players[id];

    // Fade back in after a hit flash
    if (p.alpha < 1) {
      p.alpha += (1 - p.alpha) * 0.16;
    } else {
      p.alpha = 1;
    }

    // Interpolate towards the last position the server reported
    if (p.target_x !== undefined) {
      p.x += (p.target_x - p.x) * 0.16;
      p.y += (p.target_y - p.y) * 0.16;
      var dir = (p.target_rotation - p.rotation) / (Math.PI * 2);
      dir -= Math.round(dir);
      dir = dir * Math.PI * 2;
      p.rotation += dir * 0.16;
    }

    // Ship-to-ship collision: bounding-box overlap, then push our ship back
    var dx = p.x - player.sprite.x;
    var dy = p.y - player.sprite.y;
    if (Math.sqrt(dx * dx + dy * dy) < 80 && checkOverlap(p, player.sprite)) {
      hitSound.volume = 0.5;
      hitSound.play();
      player.sprite.x -= dx * 0.45;
      player.sprite.y -= dy * 0.45;
    }
  }
}
```

Collisions are deliberately simple: a cheap distance check first, then `Phaser.Rectangle.intersects` on the two sprites' bounds, then the local ship is moved away along the line between them. Each client only moves its own ship; the other client does the same on its side.

## Helpers

```js
// Ship sprite for another player; type is 1-6
function CreateShip(type, x, y, angle) {
  var sprite = game.add.sprite(x, y, 'ship' + String(type) + '_1');
  game.physics.enable(sprite, Phaser.Physics.ARCADE);
  sprite.rotation = angle;
  sprite.anchor.setTo(0.5, 0.5);
  sprite.body.collideWorldBounds = true;
  sprite.body.bounce.setTo(1, 1);
  return sprite;
}

// Make a local sprite array match the server's array: create missing sprites,
// update positions (and rotation, if sent), and destroy extras
function syncSprites(local, server, key) {
  for (var i = 0; i < server.length; i++) {
    if (local[i] === undefined) {
      local[i] = game.add.sprite(server[i].x, server[i].y, key);
    } else {
      local[i].x = server[i].x;
      local[i].y = server[i].y;
    }
    if (server[i].rotation !== undefined) local[i].rotation = server[i].rotation;
  }
  while (local.length > server.length) {
    local.pop().destroy();
  }
}

// Ship textures are shipN_1 (healthy) to shipN_4 (nearly sunk): swap the last digit
function changeSpriteBasedOnHealth(sprite, health) {
  var state;
  if (health >= 70) state = '1';
  else if (health > 35) state = '2';
  else if (health > 5) state = '3';
  else state = '4';
  var key = sprite.key.replace(/.$/, state);
  if (key !== sprite.key) sprite.loadTexture(key);
  return sprite;
}

function checkOverlap(spriteA, spriteB) {
  return Phaser.Rectangle.intersects(spriteA.getBounds(), spriteB.getBounds());
}

// Health bar: a black background with a red bar drawn into a BitmapData
function createHealthBar() {
  meters = game.add.group();

  var meterBackgroundBitmap = game.add.bitmapData(20, 100);
  meterBackgroundBitmap.ctx.beginPath();
  meterBackgroundBitmap.ctx.rect(0, 0, meterBackgroundBitmap.width, meterBackgroundBitmap.height);
  meterBackgroundBitmap.ctx.fillStyle = '#000000';
  meterBackgroundBitmap.ctx.fill();
  var healthMeterBG = game.add.sprite(10, 10, meterBackgroundBitmap);
  healthMeterBG.fixedToCamera = true;
  meters.add(healthMeterBG);

  var healthBitmap = game.add.bitmapData(12, 92);
  healthBitmap.ctx.beginPath();
  healthBitmap.ctx.rect(0, 0, healthBitmap.width, healthBitmap.height);
  healthBitmap.ctx.fillStyle = '#FF0000';
  healthBitmap.ctx.fill();
  healthMeter = game.add.sprite(14, 14, healthBitmap);
  healthMeter.fixedToCamera = true;
  meters.add(healthMeter);
}

// damage is HEALTH_MAX - health; the red bar shrinks from the top
function updateHealthBar(damage) {
  var barHeight = Math.max(0, 92 - 92 * damage / 100);
  var bmd = healthMeter.key; // the BitmapData the sprite was created from
  bmd.context.clearRect(0, 0, healthMeter.width, healthMeter.height);
  bmd.context.fillRect(0, 92 - barHeight, 12, barHeight);
  bmd.dirty = true;
}

function updateCannonballs(cannonBalls) {
  shotsLeft.setText("Shots Left: " + cannonBalls);
}

// Messages go to a <ul id="log"> under the canvas; clear it after 7 lines
function writeToHTMLLog(message) {
  var log = document.getElementById("log");
  if (log.getElementsByTagName("li").length > 6) {
    log.innerHTML = '';
  }
  var li = document.createElement("li");
  li.textContent = message;
  log.appendChild(li);
}
```

## Gotchas

- **The server trusts the client.** Each client reports its own position and health in `move-player`, so a modified client can teleport or never die. Fixing that means moving movement and damage onto the server and sending only inputs from the client.
- **One cannonball takes several HP.** The server loop in part I emits `player-hit` every 16 ms tick while a cannonball is within 70 px of a ship and doesn't remove the ball on a hit, so a passing shot usually costs more than 1 HP.
- **Don't emit `disconnect` yourself.** An earlier version of this client called `socket.emit('disconnect')` before `socket.disconnect()`. `disconnect` is a reserved event name: in Socket.IO 2.x emitting it only triggers local listeners, and the current 4.x client throws `"disconnect" is a reserved event name`. `socket.disconnect()` is enough.
- **`game.physics.arcade.collide` needs bodies on both sprites.** An earlier version called it with the local ship and driftwood sprites, neither of which had an Arcade body, so it did nothing; the overlap check and push-back above are what actually handle collisions.
- **Sending state every frame is wasteful.** `move-player` goes out 60 times a second and the server rebroadcasts the full player table each time. Throttling updates to 10–20 per second and relying on the interpolation already in `GameLoop` would cut traffic a lot.

## Further reading

- Source code: [FriendlyUser/Pirates-Game](https://github.com/FriendlyUser/Pirates-Game/tree/master)
- [Phaser 2.6.2 API docs (archived)](https://phaser.io/docs)
- [Phaser](https://phaser.io/) for the current, scene-based version
- [Socket.IO client API](https://socket.io/docs/v4/client-api/)
