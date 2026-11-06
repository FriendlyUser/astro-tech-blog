---
tags: ['phaser', 'nodejs', 'js']
title: Creating a networked game with phaser and nodejs
description: In this post I will show you how to create a simple networked game with phaser and nodejs.
pubDate: Fri, 14 May 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2776175216.png
---
A networked game is a type of video game that allows multiple players to interact and play the game together over a network, such as the internet or a local area network (LAN). Networked games can be played by players who are physically located in different places, and they often involve real-time gameplay where players can communicate and collaborate with each other in order to achieve game objectives. Networked games can take many forms, including multiplayer online games, co-operative games, and competitive games. Some popular examples of networked games include massively multiplayer online role-playing games (MMORPGs), first-person shooters, and real-time strategy games.


In a multiplayer game, the server-side code is responsible for managing various aspects of the game to ensure that all players have a consistent and fair gameplay experience. Here are some of the key responsibilities of server-side code in a multiplayer game:

1. Game state management: The server-side code is responsible for maintaining the current state of the game, including player positions, game objects, and other relevant data.
2. Network communication: The server-side code manages communication between the game clients and the server. This includes receiving input from clients, updating the game state, and sending updates back to clients.
3. Anti-cheat measures: The server-side code is responsible for preventing cheating and ensuring that all players are playing the game fairly. This can include things like detecting and preventing aimbots, wallhacks, and other types of cheating.
4. Load balancing: In games with a large number of players, the server-side code may need to manage load balancing to ensure that the game can handle the traffic from all players.
5. Authentication and authorization: The server-side code may need to manage authentication and authorization to ensure that only authorized players are able to access the game.
6. Persistence: The server-side code may need to persist data, such as player scores or game state, so that it can be used later, for example, to keep track of high scores.

Overall, the server-side code is critical to the success of a multiplayer game, as it helps to ensure a smooth and fair gameplay experience for all players.


```js 
 var express = require('express'); // Express contains some boilerplate to for routing and such
var app = express();
var http = require('http').Server(app);
// var io = require('socket.io')(http); // Here's where we include socket.io as a node module 
var io = require('socket.io').listen(http);
const https = require('https');

// Serve the index page 
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html'); 
});

// Serve the icon
app.get("/favicon.ico", function (request, response) {
  response.sendFile(__dirname + '/favicon.ico'); 
});


// Serve the assets directory
app.use('/assets',express.static('assets'))
app.use('/assets/sound',express.static('/sound'))
// load css and js folders
app.use('/js',express.static(__dirname + '/js'));
app.use('/css',express.static(__dirname + '/css'));

// Listen on port 8000
app.set('port', (process.env.PORT || 8000));
http.listen(app.get('port'), function(){
  console.log('listening on port',app.get('port'));
  https.get('https://table-scrapper.herokuapp.com/');
});

// Hit the simple bot "server"
// app.listen(process.env.PORT || 8000);


var players = {}; //Keeps a table of all players, the key is the socket id
var bullet_array = []; // Keeps track of all the bullets to update them on the server 
// Tell Socket.io to start accepting connections

var spawnObjectsAllowed = false; // check if the server is allowed to spawn health packs and driftwood
var maxHealthPacks = 5;	//there will up to 5 health packs scattered across the map at any given time
var numHealthPacks = 0;	// number of health packs current on the server
var healthPack_array = [];

var maxDriftWood = 15;	//there will only be 15 drift wood (obstacles) scattered across the map at any given time
var numDriftWood = 0; // number of drift wood in the server
var driftWood_array = [];

var WORLD_SIZE = {w:1500,h:1000}; //same as the client-side world size

io.on('connection', function(socket){
	// Listen for a new player trying to connect
	socket.on('new-player',function(state){
		console.log("New player joined with state:",state);
		players[socket.id] = state;
		// Broadcast a signal to everyone containing the updated players list
		io.emit('update-players',players);
		spawnObjectsAllowed = true; // now that a player has connected, allow the server to spawn healthpacks
	})
  
  // Listen for a disconnection and update our player table 
  socket.on('disconnect',function(state){
    delete players[socket.id];
	console.log("Player disconnected with state: ",state);
    io.emit('update-players',players);
  }) 
  
  // Listen for move events and tell all other clients that something has moved 
  socket.on('move-player',function(position_data){
    if(players[socket.id] == undefined) return; // Happens if the server restarts and a client is still connected 
    players[socket.id].x = position_data.x;  
    players[socket.id].y = position_data.y; 
    players[socket.id].angle = position_data.angle; 
	players[socket.id].health = position_data.health; // change sprites based on health
    io.emit('update-players',players);
  })
 
  // Listen for shoot-bullet events and add it to our bullet array
  socket.on('shoot-bullet',function(data){
    if(players[socket.id] == undefined) return;
    var new_bullet = data;
    data.owner_id = socket.id; // Attach id of the player to the bullet 
    if(Math.abs(data.speed_x) > 20 || Math.abs(data.speed_y) > 20){
      // console.log("Player",socket.id,"is cheating!");
    }
    bullet_array.push(new_bullet);
  });
})
 
 ```

The code block you have provided is the server-side code for a networked game implemented using Phaser and Node.js. The server is built using the Express framework and socket.io for real-time communication. The server has several endpoints for serving the client-side assets such as HTML, CSS, and JS files.

The `io.on('connection', function(socket){})` block is where the server listens for incoming connections from clients. The `socket` parameter represents the client's socket, which is used to communicate with the client. The server handles several events such as `new-player`, `disconnect`, `move-player`, and `shoot-bullet`.

When a new player connects to the server, the `new-player` event is triggered. The player's state is added to the `players` object with the `socket.id` as the key. The server then sends an `update-players` event to all connected clients, which includes the updated `players` object.

When a player disconnects from the server, the `disconnect` event is triggered. The player is removed from the `players` object, and the server sends an `update-players` event to all connected clients.

The `move-player` event is triggered when a player moves their character. The player's position, angle, and health are updated in the `players` object. The server then sends an `update-players` event to all connected clients.

The `shoot-bullet` event is triggered when a player shoots a bullet. The bullet's data, such as position and speed, are added to the `bullet_array`. The `owner_id` property of the bullet is set to the `socket.id` of the player who shot it. This property is used to identify which player's bullet hit another player.

The server also has some variables to keep track of the health packs and driftwood objects in the game. The `maxHealthPacks` and `maxDriftWood` variables represent the maximum number of health packs and driftwood objects that can exist in the game. The `numHealthPacks` and `numDriftWood` variables represent the current number of health packs and driftwood objects in the game. The `healthPack_array` and `driftWood_array` arrays are used to store the health packs and driftwood objects' position data.

Finally, the server sets up a listener on the specified port number and listens for incoming requests. When the server starts up, it sends a GET request to another URL using the `https.get()` method. This is useful for keeping the server alive on a platform like Heroku, which puts apps to sleep after a certain amount of inactivity.


```js 
 function ServerGameLoop(){
  for(var i=0;i<bullet_array.length;i++){
    var bullet = bullet_array[i];
    bullet.x += bullet.speed_x; 
    bullet.y += bullet.speed_y; 
    
    // Check if this bullet is close enough to hit any player 
    for(var id in players){
      if(bullet.owner_id != id){
        // And your own bullet shouldn't kill you
        var dx = players[id].x - bullet.x; 
        var dy = players[id].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 70){
          io.emit('player-hit',id); // Tell everyone this player got hit
		  console.log("Player: [" + id + "], hit by bullet \n" + players[id]);
        }
      }
	  // Check if a player is colliding with another player
    }

	// check if a bullet collides with a heart if so destroy it
	for(var j=0;j<healthPack_array.length;j++){
        var dx = healthPack_array[j].x - bullet.x; 
        var dy = healthPack_array[j].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
		  healthPack_array.splice(j,1);
		  j--;
		  console.log('Heart number [' + j + '] destroyed by bullet');
		  numHealthPacks--;
        }
	}
	// Check if a bullet is colliding with driftwood
	for(var j=0;j<driftWood_array.length;j++){
        // And your own bullet shouldn't kill you
        var dx = driftWood_array[j].x - bullet.x; 
        var dy = driftWood_array[j].y - bullet.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
		  driftWood_array.splice(j,1);
		  j--;
		  console.log('DriftWood number [' + j + '] destroyed by bullet [' + i + ']');
		  numDriftWood--;
        }
	}
    
	// consider allowing the player to destroy driftwood, maybe if this doesn't take too long
	
    // Remove the bullet if goes too far off screen 
    if(bullet.x < -10 || bullet.x > 1500 || bullet.y < -10 || bullet.y > 1000){
        bullet_array.splice(i,1);
		console.log('Bullet [' + i + '] destroyed because it went offscreen (' + bullet.x + ',' + bullet.y + ')' );
        i--;
    }
  }
  
  // check if players collide with hearts
  for(var i=0;i<healthPack_array.length;i++){
    var healthPack = healthPack_array[i];
    healthPack.x += healthPack.speed_x; 
    healthPack.y += healthPack.speed_y; 
    
    // Check if this bullet is close enough to hit any player 
	// consider spawning "dead" ships that are shipwrecked later.
    for(var id in players){
        // And your own bullet shouldn't kill you
        var dx = players[id].x - healthPack.x; 
        var dy = players[id].y - healthPack.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
		// adjust distance based on what will be the final distance between player and ships
        if(dist < 40){
          //io.emit('player-hit',id); // Tell everyone this player got hit
		  console.log('Collision between player[' + id + '], healthPack[' + i + ']')
		  healthPack_array.splice(i,1);
		  i--;
		  numHealthPacks--;
		  // inform player that health is restored
		  io.emit('player-heal',id); // Tell everyone this player got hit
        }
	  // Check if a player is colliding with another player
    }
    
    // Remove if it goes too far off screen
    if(healthPack.x < -10 || healthPack.x > 1500 || healthPack.y < -10 || healthPack.y > 1000){
        healthPack_array.splice(i,1);
		console.log('HealthPack(' + i + ') destroyed, out of bounds. (' + healthPack.x + ',' + healthPack.y + ')' );
        i--;
		numHealthPacks--;
    }
        
  }
  
  // update the driftwood locations on the server 
  for(var i=0;i<driftWood_array.length;i++){
    var driftWood = driftWood_array[i];
    driftWood.x += driftWood.speed_x; 
    driftWood.y += driftWood.speed_y; 
	driftWood.rotation += driftWood.rotateDirection*Math.PI / 200;
	if(driftWood.rotation > 2*Math.PI) {
		driftWood.rotation = 0;
	}
	//console.log(driftWood.rotation)
	// Remove the driftwood if goes too far off screen 
    if(driftWood.x < -10 || driftWood.x > 1500 || driftWood.y < -10 || driftWood.y > 1000){
		numDriftWood--;
        driftWood_array.splice(i,1);
		console.log('driftWood(' + i + ') destroyed, out of bounds. (' + driftWood.x + ',' + driftWood.y + ')' );
        i--;
    }
  }
  // Tell everyone where the driftwood is:
  io.emit("driftWood-update",driftWood_array);
  // Tell everyone where all the health packs are by sending the whole array
  io.emit("healthPack-update",healthPack_array);
  // Tell everyone where all the bullets are by sending the whole array
  io.emit("bullets-update",bullet_array);
} 
 ```

This is a game loop function that implements the game logic for a multi-player game. The game involves players controlling a ship, and they can shoot bullets and collide with other players' ships. The game also has hearts that players can collide with to heal themselves and drifting wood that they can collide with or destroy.

The function updates the position of bullets, checks if they collide with any players, hearts, or drifting wood, and removes them if they go off-screen. The function also updates the position of hearts and removes them if they go off-screen. It updates the position and rotation of drifting wood, removes them if they go off-screen, and sends the current positions to all the players.

The following are the changes that can be made to the game:

1. Add a limit to the number of bullets a player can shoot at a time to prevent spamming.
2. Add a timer that delays the player's shooting after firing a bullet to prevent rapid firing.
3. Modify the collision distance between a player and a heart or drifting wood to prevent the player from colliding when the objects are far away.
4. Add a feature to allow players to destroy drifting wood.
5. Add a limit to the number of hearts on the screen at a time to prevent spamming.
6. Add a limit to the number of drifting wood on the screen at a time to prevent spamming.
7. Add a timer that spawns a new heart or drifting wood after a fixed time interval.
8. Add a score system to the game to keep track of the player's progress. The score can be increased when a player hits another player or destroys drifting wood. The score can be decreased when a player collides with another player or a drifting wood.
9. Add a feature that allows players to upgrade their ship's speed, bullet speed, or health by colliding with special objects.
10. Add a feature that allows players to select their ship's type, each with different stats such as speed, bullet speed, and health.

```js 
 // spawn hearts that restore 10 hp when player collides
function spawnHealthPacks(){
  // Spawn Health Packs for players
  if (numHealthPacks < maxHealthPacks && spawnObjectsAllowed == true) {
	  // spawn health pack
	  var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
	  var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
	  var new_healthPack = {x:Math.random() * 0.75*WORLD_SIZE.w+50,y:Math.random()*0.75*WORLD_SIZE.h+25,speed_x:Math.random()*0.5*plusOrMinusx,speed_y:Math.random()*0.5*plusOrMinusy};
	  healthPack_array.push(new_healthPack);
	  numHealthPacks++;
	  console.log('Spawning Health Pack (' + new_healthPack.x + ',' + new_healthPack.y +')' + numHealthPacks);
  }
}

function spawnDriftWood(){
  // Spawn DriftWood as obstacles players
  if (numDriftWood < maxDriftWood && spawnObjectsAllowed == true) {
	  // spawn health pack
	  var plusOrMinusx = Math.random() < 0.5 ? -1 : 1;
	  var plusOrMinusy = Math.random() < 0.5 ? -1 : 1;
	  var rotateDir = Math.random() < 0.5 ? -1 : 1;
	  var new_driftWood = {x:Math.random() * 0.75*WORLD_SIZE.w+50,y:Math.random()*0.75*WORLD_SIZE.h+25,speed_x:Math.random()*0.5*plusOrMinusx,speed_y:Math.random()*0.5*plusOrMinusy,rotation:Math.random()*2*Math.PI,rotateDirection:rotateDir};
	  driftWood_array.push(new_driftWood);
	  numDriftWood++;
	  
	  console.log('Spawning DriftWood (' + new_driftWood.x + ',' + new_driftWood.y +')' + new_driftWood.rotation);
  }
}

// spawn health packs every 3 seconds
setInterval(spawnDriftWood, 3000); 

// spawn health packs every 5 seconds
setInterval(spawnHealthPacks, 5000); 
// 0.064 seconds update
setInterval(ServerGameLoop, 16); 

// spawn bots
 setInterval(() => {
		https.get('https://table-scrapper.herokuapp.com/');
		console.log('Attempting to ping other server'); 
 ```

This code seems to be part of a game server that spawns health packs, driftwood obstacles, and bots. The `spawnHealthPacks` function spawns a heart-shaped health pack that restores 10 health points to a player when they collide with it. The `spawnDriftWood` function spawns driftwood obstacles that players must avoid. Both of these functions use a `setInterval` function to spawn the objects at regular intervals.

The code also includes a `ServerGameLoop` function that updates the game state every 0.064 seconds, and a `setInterval` function that calls this function at that interval.

Finally, the code includes another `setInterval` function that pings another server every 5 seconds. This may be used to keep the game server alive or to communicate with other game servers.


In a multiplayer game, client-side code is responsible for managing many aspects of the game experience for the individual player. Some of the things that client-side code has to manage include:

1. Displaying graphics and game elements: Client-side code must handle the rendering of game graphics, animations, and other visual elements on the player's device.
2. User input: Client-side code is responsible for handling user input, such as mouse clicks, keyboard presses, and other actions that the player takes in the game.
3. Local game state: The client-side code maintains a local version of the game state, which includes information such as the player's position, health, inventory, and other game data.
4. Network communication: The client-side code communicates with the game server to send and receive data about the game state, other players' positions, and other relevant information.
5. Predictive movement: The client-side code may also use predictive movement algorithms to anticipate the movements of other players and provide a smoother, more seamless game experience for the player.
6. Game logic: The client-side code may also perform some game logic, such as collision detection, physics calculations, and other game mechanics. However, the server ultimately has the final say in these matters, as it is responsible for enforcing the game rules and resolving any conflicts that arise.


Socket.IO is a JavaScript library that enables real-time, bidirectional and event-based communication between the browser and the server. It uses websockets, a protocol that provides a persistent connection between a client and server, allowing for real-time data transfer. With Socket.IO, developers can build applications that allow for real-time chat, gaming, or other collaborative experiences.

Socket.IO provides both a client-side and server-side API, making it easy to build real-time web applications with Node.js. The library is designed to work with any web framework, and it has a number of features that make it ideal for building multiplayer games or applications that require real-time communication. For example, Socket.IO supports broadcasting messages to multiple clients, room-based communication, and reconnection in case of lost connections.


Socket.IO is a JavaScript library that enables real-time, bidirectional and event-based communication between the browser and the server. It uses websockets, a protocol that provides a persistent connection between a client and server, allowing for real-time data transfer. With Socket.IO, developers can build applications that allow for real-time chat, gaming, or other collaborative experiences.

Socket.IO provides both a client-side and server-side API, making it easy to build real-time web applications with Node.js. The library is designed to work with any web framework, and it has a number of features that make it ideal for building multiplayer games or applications that require real-time communication. For example, Socket.IO supports broadcasting messages to multiple clients, room-based communication, and reconnection in case of lost connections.


In the next part will we cover the front-end portion of the app, it leverages socket.io
## References
- https://github.com/FriendlyUser/Pirates-Game/tree/master
