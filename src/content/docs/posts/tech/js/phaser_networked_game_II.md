---
tags: ['phaser', 'nodejs', 'js']
title: Creating a networked game with phaser and nodejs part II
description: In this post I will show you how to create a simple networked game with phaser and nodejs.
pubDate: Fri, 15 May 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/2515566937.png
---
In a multiplayer game, client-side code is responsible for managing various tasks that are essential to the game's functioning. These tasks can be broadly categorized into three types:

1. User input: The client-side code is responsible for capturing user input, such as keyboard or mouse events. It needs to send this information to the server to update the game state.
2. Game state: The client-side code needs to maintain a local copy of the game state, including the position and status of all game objects. It also needs to keep track of the game's rules and ensure that the game state remains consistent with these rules.
3. Rendering: The client-side code is responsible for rendering the game state on the player's screen. This involves updating the screen with the latest game state and displaying visual feedback to the player, such as animations, sound effects, and score updates.

In summary, the client-side code needs to manage user input, game state, and rendering to ensure that the game runs smoothly for all players.


```js 
 var ASSET_URL = "assets/"
//We first initialize the phaser game object
var WINDOW_WIDTH = 750;
var WINDOW_HEIGHT = 500;
var HEALTH_MAX = 100;
var game = new Phaser.Game(WINDOW_WIDTH, WINDOW_HEIGHT, Phaser.AUTO, 'phaser-example', {preload:preload, create:create, update:GameLoop} );
var WORLD_SIZE = {w:1500,h:1000};
var numofEnemyPlayers = 0;
var water_tiles = [];
// arrays of objects that the player will interact with 
var bullet_array = [];
var healthPack_array = [];
var driftWood_array = [];
var shotsLeft; // text field containing number of cannonballs the player has remaining before reloading
var numOfEnemiesText;
var playersConnectingText;
var loadText;
var socket; //Declare it in this scope, initialize in the `create` function
var other_players = {};
var bulletSpeed = 17.5; // speed of the bullet
var player = {
	sprite:null,//Will hold the sprite when it's created 
	speed_x:0,// This is the speed it's currently moving at
	speed_y:0,
	speed:0.5, // This is the parameter for how fast it should move 
	friction:0.95,
	health:100,
	cannonBalls:15,
	//shipType:null,
	alive: true,
	shot:false,
	update: function(){
		// Lerp rotation towards mouse
		var dx = (game.input.mousePointer.x + game.camera.x) - this.sprite.x;
		var dy = (game.input.mousePointer.y + game.camera.y) - this.sprite.y;
		var angle = Math.atan2(dy,dx) - Math.PI/2;
		var dir = (angle - this.sprite.rotation) / (Math.PI * 2);
		dir -= Math.round(dir);
		dir = dir * Math.PI * 2;
		this.sprite.rotation += dir * 0.1;

		// Move forward
		if(game.input.keyboard.isDown(Phaser.Keyboard.W) || game.input.keyboard.isDown(Phaser.Keyboard.UP)){
			// used to decrease speed of player as health decreases
			var healthLeft = this.health - HEALTH_MAX; 
			this.speed_x += Math.cos(this.sprite.rotation + Math.PI/2)*this.speed*this.health/100;
			this.speed_y += Math.sin(this.sprite.rotation + Math.PI/2) * this.speed*this.health/100;
		}
		this.sprite.x += this.speed_x;
		this.sprite.y += this.speed_y;
		// change player sprite based on health.
		this.sprite = changeSpriteBasedOnHealth(this.sprite, this.health)
		
		this.speed_x *= this.friction;
		this.speed_y *= this.friction;
	
		//inform the player that they can reload

		// Shoot bullet 
		if(game.input.activePointer.leftButton.isDown && !this.shot){
			if (this.cannonBalls <= 0) {
				writeToHTMLLog('Press spacebar or enter to reload cannonballs.');
				loadSound.play();
				this.shot = true;
			}
			else {
				var speed_x = Math.cos(this.sprite.rotation + Math.PI/2) * bulletSpeed;
				var speed_y = Math.sin(this.sprite.rotation + Math.PI/2) * bulletSpeed;
				//var cannonBalls = this.cannonBalls -1;
				this.cannonBalls = this.cannonBalls -1 ;
				//console.log(this.cannonBalls)
				updateCannonballs(this.cannonBalls);

				this.shot = true;
				// Tell the server we shot a bullet 
				socket.emit('shoot-bullet',{x:this.sprite.x,y:this.sprite.y,angle:this.sprite.rotation,speed_x:speed_x,speed_y:speed_y})
				fireSound.play();
			}
		}
		else if ((game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR) || game.input.keyboard.isDown(Phaser.Keyboard.ENTER)) && this.cannonBalls <= 0) {
			this.cannonBalls = this.cannonBalls +5;
			updateCannonballs(this.cannonBalls);
			writeToHTMLLog("Cannonballs: ("+ this.cannonBalls + ') \t \t' + "Player Health: ("+ this.health + ')')
			//console.log('Loading cannonballs: ' + this.cannonBalls)
		
			//console.log('List Items: ' +document.getElementById("log").getElementsByTagName("li").length)
			this.shot = true;
		}
		if(!game.input.activePointer.leftButton.isDown) this.shot = false;
	
		updateHealthBar(HEALTH_MAX-player.health)

		// To make player flash when they are hit, set player.spite.alpha = 0
		if(this.sprite.alpha < 1){
			this.sprite.alpha += (1 - this.sprite.alpha) * 0.16;
		} else {
			this.sprite.alpha = 1;
		}
	  
		// Tell the server we've moved 
		socket.emit('move-player',{x:this.sprite.x,y:this.sprite.y,angle:this.sprite.rotation,health:this.health})
		
	}
};

			
function CreateShip(type,x,y,angle){
	// type is an int that can be between 1 and 6 inclusive 
	// returns the sprite just created 
	var sprite = game.add.sprite(x,y,'ship' + String(type) + '_1');
	game.physics.enable([sprite], Phaser.Physics.ARCADE);
	sprite.rotation = angle;
	sprite.anchor.setTo(0.5,0.5);
	sprite.body.collideWorldBounds = true;
	sprite.body.bounce.setTo(1, 1);
	return sprite;
}


function preload(){
	game.load.crossOrigin = "Anonymous";
	game.stage.backgroundColor = "#3399DA";
	game.load.onFileComplete.add(fileComplete, this);
	// Load all the ships
	for(var i=1;i<=6;i++){
		game.load.image('ship'+String(i) +'_1', ASSET_URL + 'ship'+String(i)+'_1.png');
		game.load.image('ship'+String(i) +'_2', ASSET_URL + 'ship'+String(i)+'_2.png');
		game.load.image('ship'+String(i) +'_3', ASSET_URL + 'ship'+String(i)+'_3.png');
		game.load.image('ship'+String(i) +'_4', ASSET_URL + 'ship'+String(i)+'_4.png');
	}
	game.load.image('bullet', ASSET_URL + 'cannon_ball.png');
	game.load.image('water', ASSET_URL + 'water_tile.png');
	game.load.image('healthPack', ASSET_URL + 'heart.png');
	game.load.image('driftWood', ASSET_URL + 'dinghyLarge3.png')
	// play ready sound once game is loaded
	game.load.audio('loaded', ASSET_URL + 'sound/' + 'ready.wav');
	game.load.audio('hit', ASSET_URL + 'sound/' + 'thud1.wav');
	game.load.audio('fireCannonball', ASSET_URL + 'sound/' + 'cannonball.wav');
	game.load.audio('soundtrack', ASSET_URL + 'sound/' + 'pirates.wav');
	game.load.audio('healing', ASSET_URL + 'sound/' + 'healing.wav');
	loadText = game.add.text(game.world.centerX, game.world.centerY, ' Connected to Server,' + '\n' + 'Waiting for the game to load');
	//text = game.add.text(, "- phaser gradient text -");

    //  Centers the text
    loadText.anchor.set(0.5);
    loadText.align = 'center';

    //  Our font + size
    loadText.font = 'Arial';
    loadText.fontWeight = 'bold';
    loadText.fontSize = 35;

    //  Here we create a linear gradient on the Text context.
    //  This uses the exact same method of creating a gradient as you do on a normal Canvas context.
    var grd = loadText.context.createLinearGradient(0, 0, 0, loadText.height);

    //  Add in 2 color stops
    grd.addColorStop(0, '#00008B');   
    grd.addColorStop(1, '#006400');

    //  And apply to the Text
    loadText.fill = grd;

	game.load.onLoadComplete.add(loadComplete, this);
} 
 ```

This is a client-side code for a game developed using Phaser, a game framework for JavaScript. It defines a game object, initializes its properties, and defines various functions to update the game's state. Here is a brief overview of the code:

* The code defines some constants like the window width and height, maximum health, and world size.
* The game object is created using the Phaser framework by providing the canvas dimensions, rendering mode, and specifying the functions to be called for preloading, creating, and updating the game.
* The game's state is updated in the `update` function of the `player` object, which is called on each frame. It updates the player's position and rotation based on user input, checks if the player has fired a bullet, and emits events to the server.
* A function `CreateShip` is defined to create a new player sprite and add physics to it.
* The code also defines arrays for `bullet_array`, `healthPack_array`, and `driftWood_array` to hold game objects that the player can interact with.
* The `socket` variable is used to connect to the game server and emit events to it.

```js 
 function create(){
	// turn on game physics
	game.physics.startSystem(Phaser.Physics.ARCADE);
	// play music see https://phaser.io/examples/v2/audio/loop
	music = game.add.audio('soundtrack');
	hitSound =  game.add.audio('hit');
	healSound = game.add.audio('healing');
	music.loopFull(0.25);
	//music.volume = 0.25;
	//music.onLoop.add(this);
	fireSound = game.add.audio('fireCannonball');
	// Create water tiles 
	for(var i=0;i<=WORLD_SIZE.w/64+1;i++){
		for(var j=0;j<=WORLD_SIZE.h/64+1;j++){
			var tile_sprite = game.add.sprite(i * 64, j * 64, 'water');
			tile_sprite.anchor.setTo(0.5,0.5);
			tile_sprite.alpha = 0.5;
			water_tiles.push(tile_sprite);
		}
	}

	game.stage.disableVisibilityChange = true;
	game.world.setBounds(0, 1500, 0, 1200); 
	createHealthBar()
	// Create player
	//var player_ship_type = String(1);
	// Range of Math.random is [0,1), not inclusive
	var player_ship_type = String(Math.floor(6*Math.random())+1);
	// randomly spawn player sprite
	player.sprite = game.add.sprite(Math.random() * WORLD_SIZE.w/2 + WORLD_SIZE.w/2,Math.random() * WORLD_SIZE.h/2 + WORLD_SIZE.h/2,'ship'+player_ship_type+'_1');
	game.physics.enable([player], Phaser.Physics.ARCADE);
	player.sprite.anchor.setTo(0.5,0.5);
   
	shotsLeft = game.add.text(625, 475, "Shots Left: " + player.cannonBalls, { font: "bold 16px Arial", fill: "#ffffff", align: "center" });
	shotsLeft.fixedToCamera = true;
	numOfEnemiesText = game.add.text(5, 475, "Player ID: ", { font: "bold 16px Arial", fill: "#ffffff", align: "center" });
	numOfEnemiesText.fixedToCamera = true;
	game.world.setBounds(0, 0, WORLD_SIZE.w, WORLD_SIZE.h);
	//if (numofEnemyPlayers <= 0 && playersConnectingText == '') {
	if (numofEnemyPlayers <= 0) {
		writeToHTMLLog('Waiting for players to join');
		playersConnectingText = game.add.text(250,10, "Waiting for other players to join", { font: "bold 16px Arial", fill: "#ffffff", align: "center" });
		playersConnectingText.fixedToCamera = true;
		//console.log(playersConnectingText)
	}
	game.camera.x = player.sprite.x - WINDOW_WIDTH/2;
	game.camera.y = player.sprite.y - WINDOW_HEIGHT/2;

	socket = io(); // This triggers the 'connection' event on the server
	socket.emit('new-player',{x:player.sprite.x,y:player.sprite.y,angle:player.sprite.rotation,type:player_ship_type,health:player.health})
	// Listen for other players connecting
	socket.on('update-players',function(players_data){
		var players_found = {};
		// Loop over all the player data received
		for(var id in players_data){
			// If the player hasn't been created yet
			if(other_players[id] == undefined && id != socket.id){ // Make sure you don't create yourself
				var data = players_data[id];
				var p = CreateShip(data.type,data.x,data.y,data.angle);
				p.health = data.health; // set up the health?
				////console.log(p.health)
				other_players[id] = p;
				//console.log("Created new player at (" + data.x + ", " + data.y + ")");
				writeToHTMLLog('Player [' + id + ']' + ' Joined the Game.');
				if(playersConnectingText.text == '') {
					playersConnectingText.setText('Player Joined');
					playersConnectingText.alpha = 1;
					//console.log('Messages goes here?')
				}
				numofEnemyPlayers ++;			
			}
			players_found[id] = true;
			
			// Update positions of other players 
			if(id != socket.id){
			  other_players[id].target_x  = players_data[id].x; // Update target, not actual position, so we can interpolate
			  other_players[id].target_y  = players_data[id].y;
			  other_players[id].target_rotation  = players_data[id].angle;
			  other_players[id].type = players_data[id].type;
			  other_players[id].health = players_data[id].health;
			  ////console.log( other_players[id])
			  // change player sprite based on health.
			  // move this to other function afterwards.
			  //console.log(other_players[id].health)
			  other_players[id] = changeSpriteBasedOnHealth(other_players[id], other_players[id].health)
			
			}
			
		}
		// Check if a player is missing and delete them 
		for(var id in other_players){
			if(!players_found[id]){
				numofEnemyPlayers --;
				writeToHTMLLog('Player [' + id + ']' + ' Disconnected from the Game.');
				if(playersConnectingText.text == '') {
					playersConnectingText.setText('Player Destroyed');
					playersConnectingText.alpha = 1;
				}
				other_players[id].destroy();
				delete other_players[id];
			}
		}
		// print list of players in game screen
		numOfEnemiesText.setText("Enemy Ships: " + numofEnemyPlayers );
		// print waiting for players to connect message
		if (numofEnemyPlayers > 0 & playersConnectingText.text != '' & playersConnectingText.alpha != 0) {
			game.add.tween(playersConnectingText)
                .to({alpha: 0}, 1000, Phaser.Easing.Default, true, 3000).onComplete.add(function () {
						if (playersConnectingText.text != '') {
							//console.log('Other Players have joined');
							//console.log("This is called when the tween is done.");
							playersConnectingText.setText(''); // destroy game text? consider after adding collision objects.
							//game.world.remove(playersConnectingText);

						}
                    }, this	
                );
		}
		
		// helpful awaiting for players to connect
	})
  
	// Listen for bullet update events 
	socket.on('bullets-update',function(server_bullet_array){
	  // If there's not enough bullets on the client, create them
	 for(var i=0;i<server_bullet_array.length;i++){
		  if(bullet_array[i] == undefined){
			  bullet_array[i] = game.add.sprite(server_bullet_array[i].x,server_bullet_array[i].y,'bullet');
		  } else {
			  //Otherwise, just update it! 
			  bullet_array[i].x = server_bullet_array[i].x; 
			  bullet_array[i].y = server_bullet_array[i].y;
		  }
	  }
	  // Otherwise if there's too many, delete the extra 
	  for(var i=server_bullet_array.length;i<bullet_array.length;i++){
		   bullet_array[i].destroy();
		   bullet_array.splice(i,1);
		   i--;
	   }
	 

	  
	})
	
	// Listen for healthPack update events 
	socket.on('healthPack-update',function(server_healthpack_array){
	  // If there's not enough health packs on the client, create them
	  // could do the moving client side, but hmm
	 for(var i=0;i<server_healthpack_array.length;i++){
		 // add driftwood to game if it doesn't already exist
		  if(healthPack_array[i] == undefined){
			  healthPack_array[i] = game.add.sprite(server_healthpack_array[i].x,server_healthpack_array[i].y,'healthPack');
			  ////console.log(healthPack_array[i])
		  } else {
			  //Otherwise, just update it! 
			  healthPack_array[i].x = server_healthpack_array[i].x; 
			  healthPack_array[i].y = server_healthpack_array[i].y;
			  ////console.log(healthPack_array[i])
		  }
	  }
	  // Otherwise if there's too many, delete the extra 
	  for(var i=server_healthpack_array.length;i<healthPack_array.length;i++){
		   healthPack_array[i].destroy();
		   healthPack_array.splice(i,1);
		   i--;
	   } 

	})
	
	// Listen for driftWood update events 
	socket.on('driftWood-update',function(server_driftWood_array){
	 for(var i=0;i<server_driftWood_array.length;i++){
		  // add driftWood to game if it doesn't already exist
		  if(driftWood_array[i] == undefined){
			  driftWood_array[i] = game.add.sprite(server_driftWood_array[i].x,server_driftWood_array[i].y,'driftWood');
			  driftWood_array[i].rotation = server_driftWood_array[i].rotation;
		  } else {
			  //Otherwise, just update it! 
			  driftWood_array[i].x = server_driftWood_array[i].x; 
			  driftWood_array[i].y = server_driftWood_array[i].y;
			  driftWood_array[i].rotation = server_driftWood_array[i].rotation;
			  ////console.log(healthPack_array[i])
		  }
			var dx = driftWood_array[i].x - player.sprite.x; 
			var dy = driftWood_array[i].y - player.sprite.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			////console.log(dist);
			// If the players get close enough to collide
			if(dist < 45){
				// check if the player collided with driftwood
				game.physics.arcade.collide(driftWood_array[i], player.sprite);
				//console.log('Big collision happened:');	
				// check if players are colliding
				hitDriftWood = checkOverlap(driftWood_array[i],player.sprite)
				if(hitDriftWood) {
					hitSound.volume = 0.5;
					hitSound.play();
					player.health = player.health -1;
					// push player back far enough to avoid collision
					player.sprite.x -= dx*0.15;
					player.sprite.y -= dy*0.15;
					//player.update();
					//socket.emit('move-player',{x:player.sprite.x,y:player.sprite.y,angle:player.sprite.rotation,health:player.health})
				}
			}
	  }
	  // Otherwise if there's too many, delete the extra 
	  for(var i=server_driftWood_array.length;i<driftWood_array.length;i++){
		   driftWood_array[i].destroy();
		   driftWood_array.splice(i,1);
		   i--;
	   } 
	})
	// Listen for any player hit events and make that player flash 
	socket.on('player-hit',function(id){
		if(id == socket.id){
			//If this is you
			player.sprite.alpha = 0;
			player.health = player.health - 1; // why not use a fraction lol.
			hitSound.volume = 0.5;
			hitSound.play();
			writeToHTMLLog('Ouch, hit by cannon ball. Health: ' + player.health);
			// send information containing the player health so that the sprites updates.
			socket.emit('move-player',{x:player.sprite.x,y:player.sprite.y,angle:player.sprite.rotation,health:player.health});
			if(player.health <= 0) {
				socket.emit('disconnect',{});
				socket.disconnect();
				//console.log('Game Over: player is disconnected from the server');
				writeToHTMLLog('Game Over: player is disconnected from the server')
				delete player;
			}
		} else {
			// Find the right player 
			other_players[id].alpha = 0;
		}
	})
	
	socket.on('player-heal',function(id){
		if(id == socket.id){
			//console.log('You healed:' + id)
			healSound.volume = 0.5;
			healSound.play();
			if (player.health + 10 >= HEALTH_MAX) {
				player.health = HEALTH_MAX;
			}
			else {
				player.health += 10;
				writeToHTMLLog('You healed because of the heart: Health(' + player.health + ')');
			}
			
		}
		else {
			// Find the right player 
			//console.log('Other player got the heart: ' + id)
		}
	})
} 
 ```

This is a piece of code written in JavaScript using the Phaser game engine. It creates the game world and initializes game objects such as the player, enemies, and game physics.

The code is part of a function named `create()` which initializes the game world by creating a physics system, creating the player object, adding music and sound effects, creating water tiles, and setting up the camera. It also initializes a socket to allow multiple players to connect and interact with each other.

The code is not self-contained, and it relies on other functions such as `CreateShip()` and `changeSpriteBasedOnHealth()` which are not provided in this snippet.

Overall, this code creates a basic game world and sets up the necessary components for multi-player interaction.


```js 
 function GameLoop(){
	player.update();
	
	// check if the player has been destroyed
	if(player.health <= 0 && player.alive == true) {
		writeToHTMLLog('Game Over: Disconnecting from game server.')
		player.alive = false; // the player is now dead
		player.speed_x = 0;
		player.speed_y = 0;
		socket.emit('disconnect',{});
		socket.disconnect();
		//var style = { font: "bold 32px Arial", fill: "#fff", boundsAlignH: "center", boundsAlignV: "middle" };
		//  The Text is positioned at 0, 100
		//text = game.add.text(player.sprite.x, player.sprite.y+50, "Game Over", style);
		//	text.fixedToCamera = true;
		var t = game.add.text(250, 250, "Game Over", { font: "bold 32px Arial", fill: "#ffffff", align: "center" });
		t.fixedToCamera = true;
		var t2 = game.add.text(250, 400, "No more Cannonballs", { font: "bold 32px Arial", fill: "#ffffff", align: "center" });
		t2.fixedToCamera = true;
		//t.cameraOffset.setTo(player.x, player.y);
	}
	
	// Move camera with player 
	var camera_x = player.sprite.x - WINDOW_WIDTH/2;
	var camera_y = player.sprite.y - WINDOW_HEIGHT/2;
	game.camera.x += (camera_x - game.camera.x) * 0.08;
	game.camera.y += (camera_y - game.camera.y) * 0.08;
  
	// Each player is responsible for bringing their alpha back up on their own client 
	// Make sure other players flash back to alpha = 1 when they're hit 
	for(var id in other_players){
		if(other_players[id].alpha < 1){
			other_players[id].alpha += (1 - other_players[id].alpha) * 0.16;
		} else {
			other_players[id].alpha = 1;
		}
	}
  
	// Interpolate all players to where they should be 
	for(var id in other_players){
		var p = other_players[id];
		if(p.target_x != undefined){
			p.x += (p.target_x - p.x) * 0.16;
			p.y += (p.target_y - p.y) * 0.16;
			// Intepolate angle while avoiding the positive/negative issue 
			var angle = p.target_rotation;
			var dir = (angle - p.rotation) / (Math.PI * 2);
			dir -= Math.round(dir);
			dir = dir * Math.PI * 2;
			p.rotation += dir * 0.16;
		}
		// check for collisions between players
		if(numofEnemyPlayers  > 0) {
			var dx = p.x - player.sprite.x; 
			var dy = p.y - player.sprite.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			////console.log(dist);
			// If the players get close enough to collide
			if(dist < 80){
				game.physics.arcade.collide(p, player.sprite);
				//console.log('Big collision happened:');	
				// check if players are colliding
				playersCollide = checkOverlap(p,player.sprite)
				if(playersCollide ) {
					//console.log('Playing Collision Sound')
					hitSound.volume = 0.5;
					hitSound.play();
					player.update();
					// push player back far enough to avoid collision
					player.sprite.x -= dx*0.45;
					player.sprite.y -= dy*0.45;
				}
				else {
					//console.log('No Collision');
				}
			}
			//io.emit('player-hit',id); // Tell everyone this player got hit
        }
	}

	/* We're updating the bullets on the server, so we don't need to do this on the client anymore 
	// Update bullets 
	for(var i=0;i<bullet_array.length;i++){
		var bullet = bullet_array[i];
		bullet.sprite.x += bullet.speed_x; 
		bullet.sprite.y += bullet.speed_y; 
		// Remove if it goes too far off screen 
		if(bullet.sprite.x < -10 || bullet.sprite.x > WORLD_SIZE.w || bullet.sprite.y < -10 || bullet.sprite.y > WORLD_SIZE.h){
			bullet.sprite.destroy();
			bullet_array.splice(i,1);
			i--;
		}
	} 
	*/

}

// HealthBar Logic
function createHealthBar() {

	meters = game.add.group();
 
	// create a plain black rectangle to use as the background of a health meter
	var meterBackgroundBitmap = game.add.bitmapData(20, 100);
	meterBackgroundBitmap.ctx.beginPath();
	meterBackgroundBitmap.ctx.rect(0, 0, meterBackgroundBitmap.width, meterBackgroundBitmap.height);
	meterBackgroundBitmap.ctx.fillStyle = '#000000';
	meterBackgroundBitmap.ctx.fill();
 
	// create a Sprite using the background bitmap data
	var healthMeterBG = game.add.sprite(10, 10, meterBackgroundBitmap);
	healthMeterBG.fixedToCamera = true;
	meters.add(healthMeterBG);
 
	// create a red rectangle to use as the health meter itself
	var healthBitmap = game.add.bitmapData(12, 92);
	healthBitmap.ctx.beginPath();
	healthBitmap.ctx.rect(0, 0, healthBitmap.width, healthBitmap.height);
	healthBitmap.ctx.fillStyle = '#FF0000';
	healthBitmap.ctx.fill();
 
	// create the health Sprite using the red rectangle bitmap data
	health = game.add.sprite(14, 14, healthBitmap);
	meters.add(health);
	health.fixedToCamera = true;
 
}

function updateHealthBar(healthRemain) {

	var m = (healthRemain) / 100;
	var bh = 92 - (92 * m);
	var offset = 92 - bh;
 
	health.key.context.clearRect(0, 0, health.width, health.height);
	health.key.context.fillRect(0, offset, 12, bh);
	health.key.dirty = true;
 
}

// Displays text that should be shown to the user
function writeToHTMLLog(message) {
	if ((document.getElementById("log").getElementsByTagName("li").length) > 6) {
		document.getElementById("log").innerHTML= '';// reset 'Game text'
	}
	document.getElementById("log").innerHTML+="<li>" + message+ "</li> \n";
}
function updateCannonballs(cannonBalls) {
	shotsLeft.setText("Shots Left: " + cannonBalls);
	//console.log(cannonBalls)
}
// Disconnect the player and display unhelpful messages
function gameOver(player) {
	//console.log('Is it going here?');
	var style = { font: "bold 32px Arial", fill: "#fff", boundsAlignH: "center", boundsAlignV: "middle" };
	//  The Text is positioned at 0, 100
	text = game.add.text(player.sprite.x, player.sprite.y+50, "Game Over", style);
	//	text.fixedToCamera = true;
	text2 = game.add.text(player.sprite.x, player.sprite.y-50, "Can't Shoot no more", style);
	text.setShadow(3, 3, 'rgba(0,0,0,0.5)', 2);
	//text2.fixedToCamera = true;
	player.sprite.addChild(text);
	player.sprite.addChild(text2);

	//  We'll set the bounds to be from x0, y100 and be 800px wide by 100px high
	text.setTextBounds(0, 100, 800, 100);

}

function checkOverlap(spriteA, spriteB) {

    var boundsA = spriteA.getBounds();
    var boundsB = spriteB.getBounds();

    return Phaser.Rectangle.intersects(boundsA, boundsB);
}

// if the player fall below certain amount of hp, change the current, likewise if the player regains enough health, show them in a healthy state
function changeSpriteBasedOnHealth(sprite, health) {
	if (health >= 70 ) {
		var checkThisOut = sprite.key;
		var shipSprite = checkThisOut.replace(/.$/,"1")
	}
	else if (health < 70 & health > 35) {
		var checkThisOut = sprite.key;
		var shipSprite = checkThisOut.replace(/.$/,"2")
	}
	else if (health <= 35 & health > 5) {
		var checkThisOut = sprite.key;
		var shipSprite = checkThisOut.replace(/.$/,"3")
	}
	else {
		var checkThisOut = sprite.key;
		var shipSprite = checkThisOut.replace(/.$/,"4")
	}
	if (shipSprite != sprite.key) {
		console.log('garbo message')
		sprite.loadTexture(shipSprite);
	}
	return sprite 
 ```

This code is an implementation of a game loop and health bar logic for a game that appears to have a player-controlled character that can move around, shoot, and collide with other players in the game. There are also health bars that are created and updated for each player in the game.

The `GameLoop` function is responsible for updating the game state each frame. It begins by updating the player's position, and then checks if the player's health is less than or equal to zero. If this is the case and the player is still alive, the game over screen is displayed and the player is disconnected from the game server.

Next, the camera is moved to follow the player's position. After that, each player's alpha is interpolated back to 1, and then all players are interpolated to their correct positions. The function then checks for collisions between players, and if two players are close enough to collide, they will collide and the collision sound will play. Finally, the function updates the health bars for each player.

The `createHealthBar` function creates and initializes the health bar for the player. A black rectangle is created to serve as the background for the health bar, and a red rectangle is created to serve as the health meter itself. The health meter is then positioned within the black rectangle.



## References
- https://github.com/FriendlyUser/Pirates-Game/tree/master
