---
title: Spaceshooter in Go
description: This covers how to take make a space shooter game in go using the ebiten library.
alt: Screenshot utilty for mobile apps
layout: '@/templates/BasePost.astro'
pubDate: Wed, 13 March 2023 13:00:00 GMT
tags: ["ebiten", "golang"]
imgSrc: '/imgs/2022/android_emulator_pixel_3.png'
imgAlt: 'Image post 6'
---

This code initializes the audio context and players for the game. The audio context is created with a sample rate of 22050 Hz, which is a common sample rate used in audio production. The audio context is then used to create players for the laser and music sounds.

The laser sound is loaded using the wav package, which is part of the ebiten library. The laser sound is then decoded and a player is created for it using the NewPlayer function. The volume of the laser player is set to 0.25.

The music sound is loaded using the vorbis package, which is also part of the ebiten library. The music sound is then decoded and an infinite loop stream is created from the decoded bytes. This stream is used to create a player for the music using the NewPlayer function. The volume of the music player is set to 0.5 and the player is started using the Play function.

```go
package main

// imported packages, most of them are for the golang game engine
import (
    "image/color"
    "bytes"
    "image"
    "fmt"
    _ "image/png"
    "log"
    "github.com/hajimehoshi/ebiten"
    "github.com/hajimehoshi/ebiten/ebitenutil"
    "time"
    "math/rand"
    utils "github.com/FriendlyUser/spaceshooter/utils"
    resources "github.com/FriendlyUser/spaceshooter/resources"
    // "github.com/hajimehoshi/go-inovation/ino/internal/input"
    // "github.com/hajimehoshi/ebiten/inpututil"
    "github.com/hajimehoshi/ebiten/audio"
    "github.com/hajimehoshi/ebiten/audio/wav"
	"github.com/hajimehoshi/ebiten/audio/vorbis"
    "github.com/golang/freetype/truetype"
    "golang.org/x/image/font"
    "github.com/hajimehoshi/ebiten/examples/resources/fonts"
    "github.com/hajimehoshi/ebiten/inpututil"
	"github.com/hajimehoshi/ebiten/text"
)

// hardcoded animation and sprite numbers from resources/sheet.xml
const (
  playerSpriteStartNum = 207
  playerSpriteEndNum = 215
  ScreenWidth = 1920
  ScreenHeight = 1440
  ScaleFactor = 0.5
  fontSize         = 64
  smallFontSize    = fontSize / 2
)

// game images
var (
  // global metadata for images from sheet.xml
  images, _ = utils.ReadImageData()
  // delay beginning on ticker until actually game mode
  // collision checker 
  gameImages *ebiten.Image
  bgImage *ebiten.Image
  count = 0
)

const (
    loopLengthInSecond  = 17
)
// sounds 
var (
	audioContext *audio.Context
	laserPlayer  *audio.Player
	musicPlayer  *audio.Player
)

func init() {
    // sampling := 
	audioContext, _ = audio.NewContext(22050)

	laser, err := wav.Decode(audioContext, audio.BytesReadSeekCloser(resources.Laser_wav))
	if err != nil {
		log.Fatal(err)
	}
    laserPlayer, err = audio.NewPlayer(audioContext, laser)
	if err != nil {
		log.Fatal(err)
    }
    laserPlayer.SetVolume(0.25)


    oggS, err := vorbis.Decode(audioContext, audio.BytesReadSeekCloser(resources.OST_ogg))
    if err != nil {
        log.Fatal(err)
    }

    // Create an infinite loop stream from the decoded bytes.
    // s is still an io.ReadCloser and io.Seeker.
    s := audio.NewInfiniteLoop(oggS, loopLengthInSecond*600*22050)

    musicPlayer, err = audio.NewPlayer(audioContext, s)
    if err != nil {
        log.Fatal(err)
    }
    musicPlayer.SetVolume(0.5)
    // Play the infinite-length stream. This never ends.
    musicPlayer.Play()
}
```


This code defines several types and variables for the game.

The Body type represents a basic object in the game with a position, velocity, and dimensions. The Enemy and Laser types both embed a Body and have additional fields specific to their roles in the game. The Enemy type has an additional field for its sprite number and health, while the Laser type has an additional field for its sprite number.

The Mode type is an enumeration of the different modes that the game can be in, such as the title screen, the main game, and the game over screen.

The Game type represents the state of the game and includes information about the player, the player's lasers, the enemies, the enemy lasers, and the current game mode.

The viewport type represents the portion of the background image that is currently being displayed. It has fields for the horizontal and vertical positions of the viewport in 16th pixels. The Move method updates the viewport's position by a small amount each frame.

Finally, the init function loads the sprite and background images into memory and initializes the fonts used in the game.



```go
// consider having a laser type to deal with orientation, etc
// basic information to draw sprites, track position and update position
type Body struct {
    // positions
    x float64 
    y float64
    // velocities
    vx float64 
    vy float64
    // get height and width from sheet.xml using sp
    width int 
    height int 
}

type Enemy struct {
    Body 
    sp int
    health int
}

type Laser struct {
    Body
    sp int
}

type Mode int
const (
	ModeTitle Mode = iota
	ModeGame
	ModeGameOver
)
var (
    arcadeFont      font.Face
	smallArcadeFont font.Face
)
// fonts and sizes
func init() {
	tt, err := truetype.Parse(fonts.ArcadeN_ttf)
	if err != nil {
		log.Fatal(err)
	}
	const dpi = 72
	arcadeFont = truetype.NewFace(tt, &truetype.Options{
		Size:    fontSize,
		DPI:     dpi,
		Hinting: font.HintingFull,
	})
	smallArcadeFont = truetype.NewFace(tt, &truetype.Options{
		Size:    smallFontSize,
		DPI:     dpi,
		Hinting: font.HintingFull,
	})
}
// in the future have a laser type struct, spriteImgNum, and number of animations
type Game struct {
    mode Mode
    level int
    // tracks location of player and maybe health
    Player struct {
        Body
        health    int
        laserType int 
        canShoot  bool
        sp        int
        // consider adding in height and width of player object
        // all of the sprites seem to be the same
        // TODO set global width
    }
    PLasers []*Laser
    Enemies []*Enemy
    ELasers []*Laser
    gameoverCount int
}

// load images
func init() {
    // sprites
	img, _, err := image.Decode(bytes.NewReader(resources.Sprites_png))
	if err != nil {
		log.Fatal(err)
	}
    gameImages, _ = ebiten.NewImageFromImage(img, ebiten.FilterDefault)

    // backgrounds
    img, _, err = image.Decode(bytes.NewReader(resources.Starfieldreal_jpg))
	if err != nil {
		log.Fatal(err)
	}
	bgImage, _ = ebiten.NewImageFromImage(img, ebiten.FilterDefault)
}

// background image logic from 
// # https://github.com/hajimehoshi/ebiten/blob/master/examples/infinitescroll/main.go
var (
    theViewport = &viewport{}
)

type viewport struct {
	x16 int
	y16 int
}

func (p *viewport) Move() {
	w, h := bgImage.Size()
	maxX16 := w * 16
	maxY16 := h * 16

	p.x16 += w / 32
	p.y16 += h / 32
	p.x16 %= maxX16
	p.y16 %= maxY16
}
```

This code contains the main game loop and various functions that are called each frame to update and draw the game.

The Update function is called each frame and handles the different game modes. In the ModeTitle mode, the function displays a message on the screen and waits for the player to press a key or touch the screen to start the game. In the ModeGame mode, the function updates the game state, moves and draws the objects, and checks for collisions. In the ModeGameOver mode, the function displays a message on the screen and waits for the player to press a key or touch the screen to restart the game.

The CreateLevel function is called to create a new level of enemies for the game. It clears the existing bullets and spawns a number of enemies based on the current level.

The jump function returns true if the player has pressed a key, clicked the mouse, or touched the screen.

The moveShip function moves the player's ship based on user input. The shootLaser function shoots a laser from the player's ship if the player has pressed a key or clicked the mouse. The moveAndDrawLasers function moves and draws the player's lasers, while the moveAndDrawEnemies function moves and draws the enemies. The drawShip function draws the player's ship on the screen. The drawHealthBar function draws a health bar for the player. The moveAndDrawEnemyLasers function moves and draws the enemy lasers. The checkCollisions function checks for collisions between the enemies and the player's lasers. The checkPlayerLaserCollision function checks for collisions between the player and the enemy lasers. The checkGameOver function checks if the game is over and changes the game mode accordingly.

```go

// player health bar
var (
    playerHB *ebiten.Image
    playerHBoutline *ebiten.Image
)

func (p *viewport) Position() (int, int) {
	return p.x16, p.y16
}

func NewGame() *Game {
	g := &Game{}
	g.init()
	return g
}

// random number generation
func init() {
    rand.Seed(time.Now().UnixNano())
}

// initial Player
func (g *Game) init() {
        
    _, _, _, width, height := utils.ImageData(images[playerSpriteStartNum])
    g.Player.sp = playerSpriteStartNum
    g.Player.Body.x = ScreenWidth / 2
    g.Player.Body.y = ScreenHeight - 100
    g.Player.Body.width = width 
    g.Player.Body.height = height
    g.Player.health = 100
    g.Player.canShoot = true 
    g.level = 0
    g.Player.Body.vx = 5
    g.Player.Body.vy = 5

    g.CreateLevel()
}

func (g *Game) CreateLevel() {
    g.level = g.level + 1 
    gameLevel := g.level + 10
    enemySprite := 50
    // clear bullets 
    g.PLasers = nil
    g.ELasers = nil
    // spawn enemies based on level
    for i := 1; i <= gameLevel; i++ {
        enemySprite = (rand.Intn(10)) + 50
        g.addEnemyRand(enemySprite)
    }
}
// copied from flappyplane, but basic functionality any key pressed
func jump() bool {
	if inpututil.IsKeyJustPressed(ebiten.KeySpace) {
		return true
	}
	if inpututil.IsMouseButtonJustPressed(ebiten.MouseButtonLeft) {
		return true
	}
	if len(inpututil.JustPressedTouchIDs()) > 0 {
		return true
	}
	return false
}

// main game loop
func (g *Game) Update(screen *ebiten.Image) error {
    switch g.mode {
    // allow user to jump from title screen
    // and title screen
    case ModeTitle:
        msg := []string{
			"Game Created Using Ebiten",
			"Created By David Li.",
		}
		for i, l := range msg {
            x := (ScreenWidth - len(l)) / 2
            y := (ScreenHeight) / 2
			text.Draw(screen, l, smallArcadeFont, x, y + i*40, color.White)
		}
        if jump() {
			g.mode = ModeGame
        }
    // main game mode with enemies, move objects and draw objects
    // main game loop
    // TODO refactor to separate movement and drawing, perhaps for efficiency reasons
    case ModeGame:
        if ebiten.IsDrawingSkipped() {
            return nil
        }
        // draw background
        ScrollBG(screen)
        // TPS counter
        fps := fmt.Sprintf("TPS: %f", ebiten.CurrentTPS())
        ebitenutil.DebugPrint(screen, fps)
        // show if ship should move
        g.moveShip()
        // check if laser is shot
        g.shootLaser()
        // draw and update lasers
        // maybe goroutine some of this
        g.moveAndDrawLasers(screen)
        g.moveAndDrawEnemies(screen)
        g.drawShip(screen)   
        g.drawHealthBar(screen)
        g.moveAndDrawEnemyLasers(screen)
        g.checkCollisions()
        g.checkPlayerLaserCollision()
        // g.drawLasers(screen)
        // check if game over
        g.checkGameOver()
    // game over instance
    case ModeGameOver:
        // TODO DELETE ALL LASER, RESET PLAYER HEALTH, ETC, or add it to init
        msg := []string{
			"Game Over :(",
			"Created By David Li.",
		}
		for i, l := range msg {
            x := (ScreenWidth - len(l)) / 2
            y := (ScreenHeight) / 2
			text.Draw(screen, l, smallArcadeFont, x, y + i*40, color.White)
		}
        if g.gameoverCount > 0 {
            g.gameoverCount--
        }
        if g.gameoverCount == 0 && jump() {
            g.init()
            g.mode = ModeTitle
        }
    }
    return nil
}

// check if player got hit by enemy lasers
func (g *Game) checkPlayerLaserCollision() {
    // issues occur if you delete the same object during iteration
    // instead have a list of lasers to delete and then delete them outside the loop
    // check player lasers to player collisions
    if (count % 5 == 0) {
        for j := 0; j < len(g.ELasers); j++ {
            pelHit := g.checkPlayerELaserCollision(j)
            if (pelHit) {
                g.Player.health -= 1
                pelHit = false
                g.removeEnemyLaser(j)
            }
        }
    }
}
```



The game has three modes: title screen, game, and game over. The game has a background image that scrolls indefinitely and the player can shoot lasers to destroy enemies. The player's health is tracked and if it reaches 0, the game enters game over mode.

The Game struct contains information about the current game mode, level, player, player's lasers, enemies, enemy lasers, and gameover count. The Body struct represents the basic information needed to draw and update the position of a sprite. The Enemy struct is a type of Body with additional fields for its sprite number and health. The Laser struct is also a type of Body with an additional field for its sprite number.

The game has a number of initialization functions that set up the game images, audio, and fonts. The Update function is the main game loop that handles the different game modes and updates the game state. The game has functions for moving and drawing the player, lasers, and enemies, and for checking collisions between these objects. There are also functions for adding and removing enemies and lasers.

```go

// not sure if I should "goroutine it all", it appears game is using goroutines already
// goroutine still causes issues, I think I want collisions to be synced.
func (g *Game) checkCollisions() {
    if (count % 5 == 0) {
        for i := 0; i < len(g.Enemies); i++ {
            s := g.Enemies[i]
            // since we are only checking collision between all enemies and a single player, this approach is fine
            pHit := g.checkPlayerEnemyCollision(s)
            if (pHit) {
                g.Player.health -= 1
            }
            for j :=0; j < len(g.PLasers); j++ {

                eHit := g.checkEnemyLaserCollision(s,j)
                if (eHit) {
                    eHit = false
                    g.removeLaser(j)
                    // make sure enemy exists before removing in, thats what you got to do with goroutines
                    if len(g.Enemies) > i {
                        g.Enemies[i].health -= 3
                    }
                    // remove enemy, convert to explosion object that will be erased later

                }
            }
        }
    }
}

// Collision Functions

// check laserEnemyCollision
func  (g* Game) checkPlayerELaserCollision(j int) (bool) {
    el := g.ELasers[j]
    // adjust body to correct looking 
    p := g.Player
    return BodyCollided(&p.Body, &el.Body)
}

func (g* Game) checkEnemyLaserCollision(e* Enemy, j int) (bool) {
    p := g.PLasers[j]
    return BodyCollided(&e.Body, &p.Body)
}

// check laserEnemyCollision
func  (g* Game) checkPlayerEnemyCollision(e* Enemy) (bool) {
    // fmt.Println(g.Player.Body)
    return BodyCollided(&e.Body,&g.Player.Body)
}
// check if bodies have collided
func BodyCollided(r1 *Body,  r2 *Body) (bool) {
    // compute rectangle 1
    r1L, r1R, r1T, r1B := ComputeRect(r1)
    // compute rectangle 2
    r2L, r2R, r2T, r2B := ComputeRect(r2)
    // fmt.Println(r1L, r1R, r1T, r1B)
    // fmt.Println(r2L, r2R, r2T, r2B)
    return (r1L < r2R && r1R > r2L &&
        r1B > r2T && r1T < r2B)
}

func ComputeRect(rect *Body) (float64, float64, float64, float64) {
    rectL := rect.x - float64(rect.width / 2)
    rectR := rect.x + float64(rect.width / 2)
    rectT := rect.y - float64(rect.height / 2)
    rectB := rect.y + float64(rect.height / 2)

    return rectL, rectR, rectT, rectB
}

// since I am using goroutines I need to check if the specified enemy exists every time this function 
// is called
func (g *Game) removeEnemy(i int) {
    s := g.Enemies
    if i >=0 && i < len(s) {
        s[i] = s[len(s)-1]
        g.Enemies =  s[:len(s)-1]
    }
}

func (g *Game) removeEnemyLaser(i int) {
    s := g.ELasers
    if i >= 0 && i < len(s) {
        s[i] = s[len(s)-1]
        g.ELasers =  s[:len(s)-1]
    }
}

func (g *Game) removeLaser(i int) {
    s := g.PLasers
    if i >= 0 && i < len(s) {
        s[i] = s[len(s)-1]
        g.PLasers =  s[:len(s)-1]
    }
}

// give player laser type, add laser struct to Player struct
func (g *Game) shootLaser() {
    // if issue persists, use count instead of goroutine to determine when player can shoot
    if ebiten.IsKeyPressed(ebiten.KeySpace) {
        // Selects preloaded sprite
        if (g.Player.canShoot) {
            // make new laser
            g.addLaser()
            g.Player.canShoot = false
        }
    }
    // wait 200 millseconds before player can shoot
    if (count % 20 == 0) {
        g.Player.canShoot = true
    }

}

/*
 *
 * Adding Lasers, Enemies functions, and powerups in the future
 */
// adding new 
func (g *Game) addLaser() {
    laserPlayer.Rewind()
    laserPlayer.Play()
    _, _, _, ipw, iph := utils.ImageData(images[playerSpriteStartNum])
    pw := float64(ipw)
    ph := float64(iph)
    px := g.Player.Body.x + pw / 2
    py := g.Player.Body.y - ph
    // vx not used outside of initialization
    vx := 1.00
    vy := 3.00
    snum := 105
    _, _, _, width, height := utils.ImageData(images[snum])
    // fmt.Println("shooting a laser")
    g.PLasers = append(g.PLasers, &Laser{Body{px, py, vx, vy, width, height}, snum})

}


// TODO FInish this function
// ADD SPECIFIC FUNCTIONALITY for enemy
func (g *Game) addEnemyLoc(snum int) {
    emax := 5 
    emin := -5
    px := float64(rand.Intn(ScreenWidth))
    py := float64(rand.Intn(ScreenHeight / 2) + ScreenHeight / 4) 
    vx := float64(emin + rand.Intn(emax-emin+1))
    vy := float64(emin + rand.Intn(emax-emin+1))

    _, _, _, width, height := utils.ImageData(images[snum])

    health := 2
    // fmt.Println("shooting a laser")
    g.Enemies = append(g.Enemies, &Enemy{Body{px, py, vx, vy, width, height}, snum, health})

}
```

It looks like this code is for a 2D space shooter game. The Game struct appears to store the state of the game, including the player's ship and any enemies, bullets, or other objects in the game. The Update function appears to be the main game loop, where the game logic is executed and objects are moved and drawn on the screen. The init function appears to be used to set up the initial state of the game, including the position of the player's ship and the number of enemies to spawn. The CreateLevel function appears to be used to create a new level of the game, which involves clearing any existing bullets and spawning new enemies based on the current level number. The jump function appears to be used to detect when the player has pressed a key or mouse button to perform some action, such as starting the game or jumping in a platformer. The checkCollisions function appears to be used to detect when objects in the game have collided with each other and update their state accordingly. The resetLevel function appears to be used to reset the game state when the player has lost or completed a level. The addEnemyRand function appears to be used to spawn a new enemy at a random location on the screen, and the enemyShootLaser function appears to be used to make an enemy shoot a bullet. The drawShip and drawHealthBar functions appear to be used to draw the player's ship and health bar on the screen, respectively.


```go
// TODO Make the spawn location within a randomized region
// sum is the sprite num corresponding to sheet.xml
func (g *Game) addEnemyRand(snum int) {
    emax := 5 
    emin := -5
    spawny := 0.75
    px := float64(rand.Intn(ScreenWidth))
    py := float64(spawny*float64(rand.Intn(ScreenHeight)) + ScreenHeight / 8) 
    vx := float64(emin + rand.Intn(emax-emin+1))
    vy := float64(emin + rand.Intn(emax-emin+1))

    _, _, _, width, height := utils.ImageData(images[snum])

    health := 2
    g.Enemies = append(g.Enemies, &Enemy{Body{px, py, vx, vy, width, height}, snum, health})

}

// destroy all generated game objects, return player to starting point, etc ...
func (g* Game) resetLevel() {

}

// create new enemy laser
func (g *Game) enemyShootLaser(x float64, y float64) {
    // vx not used outside of initialization
    vx := 1.00 
    vy := rand.Float64() * 4 + 0.01
    snum := rand.Intn(10) + 110
    _, _, _, width, height := utils.ImageData(images[snum])
    g.ELasers = append(g.ELasers, &Laser{Body{x, y, vx, vy, width, height}, snum})
}

// move and draw lasers
func (g *Game) moveAndDrawEnemyLasers(screen *ebiten.Image) {

    for i := 0; i < len(g.ELasers); i++ {
        s := g.ELasers[i]
        _, x, y, width, height := utils.ImageData(images[s.sp])
        op := &ebiten.DrawImageOptions{}
        op.GeoM.Translate(float64(s.x), float64(s.y))
        op.Filter = ebiten.FilterLinear
        screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
        if (s.y > ScreenHeight) {
            g.removeEnemyLaser(i)
        } else {
            g.ELasers[i].y += g.ELasers[i].vy
        }
	}
}
/*
 *
 * Movement and Drawing Functions --- Ships, background and enemies, lasers
 */
// draws the player ship using game object player data 
func (g *Game) drawShip(screen *ebiten.Image) {
	count++
	op := &ebiten.DrawImageOptions{}
    // move to player location
    i := (count / 10) % 7
    op.GeoM.Translate(g.Player.Body.x, g.Player.Body.y)
    // player ships from number 207 to 215
	_, x, y, width, height := utils.ImageData(images[playerSpriteStartNum+i])
	op.Filter = ebiten.FilterLinear
    screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
}


// draw health bar
func (g *Game) drawHealthBar(screen *ebiten.Image) {
    w := 10
    h := 10
    health := g.Player.health
    _, _, _, width, height := utils.ImageData(images[13])
    if playerHBoutline == nil {
        // Create an 16x16 image
        playerHBoutline, _ = ebiten.NewImage(width-5, height-5, ebiten.FilterNearest)
    } 

    // Fill the square with the white color
    playerHBoutline.Fill(color.NRGBA{0xff, 0x00, 0x00, 0xff})
    op := &ebiten.DrawImageOptions{}
    op.GeoM.Translate(float64(w+1), float64(h+1))

    // Draw the square image to the screen with an empty option
    screen.DrawImage(playerHBoutline, op)
    if health > 0 {
        playerHB, _ = ebiten.NewImage(health*width/100, height, ebiten.FilterNearest)
    }
    playerHB.Fill(color.NRGBA{0x00, 0xff, 0x00, 0xff})
    // if playerHB == nil {
    // Create an 16x16 image    
   
    // } 
    op = &ebiten.DrawImageOptions{}
    op.GeoM.Translate(float64(w), float64(h))
    screen.DrawImage(playerHB, op)

}

// move and draw enemies
func (g *Game) moveAndDrawEnemies(screen *ebiten.Image) {
    for i := 0; i < len(g.Enemies); i++ {
        s := g.Enemies[i]
        // destroy enemy if health is low, maybe seperate loop to remove glittery behaviour
        if (s.health < 0) {
            g.removeEnemy(i)
            continue
        }
        // update enemies
        if (s.x < 0 ) {
            g.Enemies[i].Body.vx = -g.Enemies[i].Body.vx
        } else if (s.x > ScreenWidth) {
            g.Enemies[i].Body.vx = -g.Enemies[i].Body.vx
        }
        g.Enemies[i].Body.x += g.Enemies[i].Body.vx
        // draw image
        _, x, y, width, height := utils.ImageData(images[s.sp])
        op := &ebiten.DrawImageOptions{}
        op.GeoM.Translate(float64(s.Body.x), float64(s.Body.y))
        screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)

        // make bullet be shot every 20 seconds
        if (count % 200 == 0) {
            elaserx := s.x
            elasery := s.y
            g.enemyShootLaser(elaserx, elasery)
        }
    }
    // go to next level if all enemies are dead
    if len(g.Enemies) == 0 {
        g.CreateLevel()
    }
}

// move and draw lasers
func (g *Game) moveAndDrawLasers(screen *ebiten.Image) {
    // get player data to determine where bullet should spawn
    // consider getting global height width for player object later
    for i := 0; i < len(g.PLasers); i++ {
        s := g.PLasers[i]
        _, x, y, width, height := utils.ImageData(images[s.sp])
        op := &ebiten.DrawImageOptions{}
        // op.GeoM.Rotate(90 * math.Pi / 180)
        op.GeoM.Translate(float64(s.x), float64(s.y))
        screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
        if (s.y < -float64(height)) {
            g.removeLaser(i)
        } else {
            g.PLasers[i].y -= g.PLasers[i].vy
        }
	}
}


// make the background scroll
func ScrollBG(screen *ebiten.Image) {
    theViewport.Move()
    x16, y16 := theViewport.Position()
	offsetX, offsetY := float64(-x16) /16, float64(-y16) /16

	// Draw bgImage on the screen repeatedly.
	const repeat = 3
	w, h := bgImage.Size()
	for j := 0; j < repeat; j++ {
		for i := 0; i < repeat; i++ {
            op := &ebiten.DrawImageOptions{}
			op.GeoM.Translate(float64(w*i), float64(h*j))
			op.GeoM.Translate(offsetX, offsetY)
			screen.DrawImage(bgImage, op)
		}
    }
}

func (g *Game) moveShip() {
	// Controls
	if ebiten.IsKeyPressed(ebiten.KeyA) || ebiten.IsKeyPressed(ebiten.KeyLeft) {
        // Selects preloaded sprite
        if (int(g.Player.Body.x) > - g.Player.Body.width / 2) {
            g.Player.Body.x -= g.Player.Body.vx
        }
	} else if ebiten.IsKeyPressed(ebiten.KeyD) || ebiten.IsKeyPressed(ebiten.KeyRight) {
        // Moves character 3px left
        if (int(g.Player.Body.x) < ScreenWidth - g.Player.Body.width / 2) {
            g.Player.Body.x += g.Player.Body.vx
        }
	} else if ebiten.IsKeyPressed(ebiten.KeyW) || ebiten.IsKeyPressed(ebiten.KeyUp) {
        if (int(g.Player.Body.y) > -g.Player.Body.height / 2) {
            g.Player.Body.y -= g.Player.Body.vy
        }
	} else if ebiten.IsKeyPressed(ebiten.KeyS) || ebiten.IsKeyPressed(ebiten.KeyDown) {

        if (int(g.Player.Body.y) < ScreenHeight - g.Player.Body.width / 2) {
            g.Player.Body.y += g.Player.Body.vy
        }
  }
}

// functions to check if game is over, level should proceed, perhaps even boss level
func (g *Game) checkGameOver() {
    if g.Player.health < 0 {
        g.mode = ModeGameOver
    }
}

func main() {
    g := NewGame()
    // add const screenHeight and screenWidth later
    if err := ebiten.Run(g.Update, ScreenWidth, ScreenHeight, ScaleFactor, "Space Shooter!"); err != nil {
        panic(err)
    }
}
```