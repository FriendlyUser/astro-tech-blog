---
title: Building a space shooter in Go with Ebiten (v1 API)
description: A walkthrough of a small 2D space shooter written in Go with Ebiten v1, covering audio, sprites, the game loop, collisions and spawning enemies.
alt: Screenshot utilty for mobile apps
layout: '@/templates/BasePost.astro'
pubDate: Wed, 13 March 2023 13:00:00 GMT
lastUpdated: 2026-11-14
tags: ["ebiten", "golang", "go"]
imgSrc: '/imgs/2022/android_emulator_pixel_3.png'
imgAlt: 'Image post 6'
---

:::caution
This game was written against the pre-2.0 Ebiten API (import path `github.com/hajimehoshi/ebiten`, no `/v2`).
The engine is now called Ebitengine, and the current release is v2.10.6. The code below will not compile against v2
without changes. See [Porting to Ebitengine v2](#porting-to-ebitengine-v2) at the end.
:::

This is a walkthrough of a small top-down space shooter written in Go with [Ebiten](https://ebitengine.org/).
The player moves a ship, shoots lasers at enemies that bounce across the screen, and dodges their shots. When every
enemy is dead, the next level spawns more of them. The full source is in
[FriendlyUser/spaceshooter](https://github.com/FriendlyUser/spaceshooter).

The code depends on two packages from that repository:

- `utils` reads sprite metadata (position and size of each sprite in the sheet) from `resources/sheet.xml`.
  `utils.ImageData(images[n])` returns the sprite's name, x, y, width and height.
- `resources` holds the sprite sheet, background, laser sound and music embedded as byte slices.

## Audio

The first part sets up an audio context at 22050 Hz, a player for the laser sound, and a looping music track.
`audio/wav` and `audio/vorbis` are Ebiten's own decoders.

`audio.NewInfiniteLoop` takes the loop length in **bytes**, not seconds. Ebiten's decoders output 16-bit stereo PCM,
so one second is `4 * sampleRate` bytes.

```go
package main

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"math/rand"

	"github.com/golang/freetype/truetype"
	"github.com/hajimehoshi/ebiten"
	"github.com/hajimehoshi/ebiten/audio"
	"github.com/hajimehoshi/ebiten/audio/vorbis"
	"github.com/hajimehoshi/ebiten/audio/wav"
	"github.com/hajimehoshi/ebiten/ebitenutil"
	"github.com/hajimehoshi/ebiten/examples/resources/fonts"
	"github.com/hajimehoshi/ebiten/inpututil"
	"github.com/hajimehoshi/ebiten/text"
	"golang.org/x/image/font"

	resources "github.com/FriendlyUser/spaceshooter/resources"
	utils "github.com/FriendlyUser/spaceshooter/utils"
)

// sprite numbers are hardcoded from resources/sheet.xml
const (
	playerSpriteStartNum = 207
	playerSpriteEndNum   = 215
	ScreenWidth          = 1920
	ScreenHeight         = 1440
	ScaleFactor          = 0.5
	fontSize             = 64
	smallFontSize        = fontSize / 2

	sampleRate         = 22050
	loopLengthInSecond = 17
)

var (
	// sprite metadata from sheet.xml
	images, _  = utils.ReadImageData()
	gameImages *ebiten.Image
	bgImage    *ebiten.Image
	// frame counter, incremented once per frame in drawShip
	count = 0
)

var (
	audioContext *audio.Context
	laserPlayer  *audio.Player
	musicPlayer  *audio.Player
)

func init() {
	var err error
	audioContext, err = audio.NewContext(sampleRate)
	if err != nil {
		log.Fatal(err)
	}

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

	// loop the first 17 seconds of the track forever (16-bit stereo = 4 bytes per sample frame)
	s := audio.NewInfiniteLoop(oggS, loopLengthInSecond*4*sampleRate)

	musicPlayer, err = audio.NewPlayer(audioContext, s)
	if err != nil {
		log.Fatal(err)
	}
	musicPlayer.SetVolume(0.5)
	musicPlayer.Play()
}
```

## Types, fonts and images

Every moving object embeds a `Body` with a position, velocity and size. `Enemy` adds a sprite number and health,
and `Laser` adds a sprite number. The game has three modes (title, playing, game over), stored in `Game.mode`.

The background scroll comes from Ebiten's
[infinite scroll example](https://github.com/hajimehoshi/ebiten/blob/main/examples/infinitescroll/main.go):
the viewport tracks its offset in 1/16 pixels and moves a little each frame.

```go
type Body struct {
	// position
	x float64
	y float64
	// velocity
	vx float64
	vy float64
	// size, from sheet.xml
	width  int
	height int
}

type Enemy struct {
	Body
	sp     int
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

type Game struct {
	mode  Mode
	level int
	Player struct {
		Body
		health    int
		laserType int
		canShoot  bool
		sp        int
	}
	PLasers       []*Laser
	Enemies       []*Enemy
	ELasers       []*Laser
	gameoverCount int
}

// load the sprite sheet and background
func init() {
	img, _, err := image.Decode(bytes.NewReader(resources.Sprites_png))
	if err != nil {
		log.Fatal(err)
	}
	gameImages, _ = ebiten.NewImageFromImage(img, ebiten.FilterDefault)

	img, _, err = image.Decode(bytes.NewReader(resources.Starfieldreal_jpg))
	if err != nil {
		log.Fatal(err)
	}
	bgImage, _ = ebiten.NewImageFromImage(img, ebiten.FilterDefault)
}

var theViewport = &viewport{}

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

func (p *viewport) Position() (int, int) {
	return p.x16, p.y16
}
```

The JPEG background needs `image/jpeg` registered (the blank import above), otherwise `image.Decode` fails with
`image: unknown format`.

## The game loop

In Ebiten v1 you pass a single update function to `ebiten.Run`, and it both updates and draws. `Update` switches on
the mode:

- **Title**: draw two lines of text and wait for space, a left click or a touch (`jump`).
- **Game**: scroll the background, move the ship, fire lasers, move and draw everything, then check collisions and
  whether the player is dead.
- **Game over**: draw a message and reset the game on the next input.

`CreateLevel` clears all lasers and spawns `level + 10` enemies with random sprites.

```go
var (
	playerHB        *ebiten.Image
	playerHBoutline *ebiten.Image
)

func NewGame() *Game {
	g := &Game{}
	g.init()
	return g
}

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
	g.level++
	numEnemies := g.level + 10
	g.PLasers = nil
	g.ELasers = nil
	for i := 0; i < numEnemies; i++ {
		g.addEnemyRand(rand.Intn(10) + 50)
	}
}

// any key press, click or touch, borrowed from Ebiten's flappy example
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

func drawCentered(screen *ebiten.Image, lines []string) {
	for i, l := range lines {
		// ArcadeN is monospaced, so each character is about smallFontSize pixels wide
		x := (ScreenWidth - len(l)*smallFontSize) / 2
		y := ScreenHeight / 2
		text.Draw(screen, l, smallArcadeFont, x, y+i*40, color.White)
	}
}

func (g *Game) Update(screen *ebiten.Image) error {
	switch g.mode {
	case ModeTitle:
		drawCentered(screen, []string{
			"Game Created Using Ebiten",
			"Created By David Li.",
		})
		if jump() {
			g.mode = ModeGame
		}
	case ModeGame:
		if ebiten.IsDrawingSkipped() {
			return nil
		}
		ScrollBG(screen)
		ebitenutil.DebugPrint(screen, fmt.Sprintf("TPS: %f", ebiten.CurrentTPS()))
		g.moveShip()
		g.shootLaser()
		g.moveAndDrawLasers(screen)
		g.moveAndDrawEnemies(screen)
		g.drawShip(screen)
		g.drawHealthBar(screen)
		g.moveAndDrawEnemyLasers(screen)
		g.checkCollisions()
		g.checkPlayerLaserCollision()
		g.checkGameOver()
	case ModeGameOver:
		drawCentered(screen, []string{
			"Game Over :(",
			"Created By David Li.",
		})
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
```

## Collisions

Each body is treated as an axis-aligned rectangle centred on `(x, y)`, and two bodies collide when the rectangles
overlap. Collisions are only checked every fifth frame.

Objects are removed by swapping them with the last element and shrinking the slice. That is O(1), but it means the
loops must run **backwards**: iterating forwards skips the element that was swapped into the current index, which
showed up as enemies and lasers flickering for a frame.

```go
// player hit by enemy lasers
func (g *Game) checkPlayerLaserCollision() {
	if count%5 != 0 {
		return
	}
	for j := len(g.ELasers) - 1; j >= 0; j-- {
		if g.checkPlayerELaserCollision(j) {
			g.Player.health--
			g.removeEnemyLaser(j)
		}
	}
}

// enemies touching the player, and player lasers hitting enemies
func (g *Game) checkCollisions() {
	if count%5 != 0 {
		return
	}
	for _, e := range g.Enemies {
		if g.checkPlayerEnemyCollision(e) {
			g.Player.health--
		}
		for j := len(g.PLasers) - 1; j >= 0; j-- {
			if g.checkEnemyLaserCollision(e, j) {
				g.removeLaser(j)
				// dead enemies are removed in moveAndDrawEnemies
				e.health -= 3
			}
		}
	}
}

func (g *Game) checkPlayerELaserCollision(j int) bool {
	return BodyCollided(&g.Player.Body, &g.ELasers[j].Body)
}

func (g *Game) checkEnemyLaserCollision(e *Enemy, j int) bool {
	return BodyCollided(&e.Body, &g.PLasers[j].Body)
}

func (g *Game) checkPlayerEnemyCollision(e *Enemy) bool {
	return BodyCollided(&e.Body, &g.Player.Body)
}

func BodyCollided(r1 *Body, r2 *Body) bool {
	r1L, r1R, r1T, r1B := ComputeRect(r1)
	r2L, r2R, r2T, r2B := ComputeRect(r2)
	return r1L < r2R && r1R > r2L &&
		r1B > r2T && r1T < r2B
}

func ComputeRect(rect *Body) (float64, float64, float64, float64) {
	rectL := rect.x - float64(rect.width/2)
	rectR := rect.x + float64(rect.width/2)
	rectT := rect.y - float64(rect.height/2)
	rectB := rect.y + float64(rect.height/2)
	return rectL, rectR, rectT, rectB
}

func (g *Game) removeEnemy(i int) {
	s := g.Enemies
	if i >= 0 && i < len(s) {
		s[i] = s[len(s)-1]
		g.Enemies = s[:len(s)-1]
	}
}

func (g *Game) removeEnemyLaser(i int) {
	s := g.ELasers
	if i >= 0 && i < len(s) {
		s[i] = s[len(s)-1]
		g.ELasers = s[:len(s)-1]
	}
}

func (g *Game) removeLaser(i int) {
	s := g.PLasers
	if i >= 0 && i < len(s) {
		s[i] = s[len(s)-1]
		g.PLasers = s[:len(s)-1]
	}
}
```

## Shooting and spawning

The player can fire once, then `canShoot` is reset every 20 frames (a third of a second at Ebiten's default 60 ticks
per second). Lasers start just above the ship and move up 3 pixels per frame.

Enemies spawn at a random x and in a vertical band of the screen, with a random velocity between -5 and 5. Enemy
lasers get a random downward speed and one of ten laser sprites.

```go
func (g *Game) shootLaser() {
	if ebiten.IsKeyPressed(ebiten.KeySpace) && g.Player.canShoot {
		g.addLaser()
		g.Player.canShoot = false
	}
	if count%20 == 0 {
		g.Player.canShoot = true
	}
}

func (g *Game) addLaser() {
	laserPlayer.Rewind()
	laserPlayer.Play()
	_, _, _, ipw, iph := utils.ImageData(images[playerSpriteStartNum])
	pw := float64(ipw)
	ph := float64(iph)
	px := g.Player.Body.x + pw/2
	py := g.Player.Body.y - ph
	vx := 1.00 // not used after creation
	vy := 3.00
	snum := 105
	_, _, _, width, height := utils.ImageData(images[snum])
	g.PLasers = append(g.PLasers, &Laser{Body{px, py, vx, vy, width, height}, snum})
}

// snum is the sprite number in sheet.xml
func (g *Game) addEnemyRand(snum int) {
	emax := 5
	emin := -5
	spawny := 0.75
	px := float64(rand.Intn(ScreenWidth))
	py := spawny*float64(rand.Intn(ScreenHeight)) + ScreenHeight/8
	vx := float64(emin + rand.Intn(emax-emin+1))
	vy := float64(emin + rand.Intn(emax-emin+1))

	_, _, _, width, height := utils.ImageData(images[snum])

	health := 2
	g.Enemies = append(g.Enemies, &Enemy{Body{px, py, vx, vy, width, height}, snum, health})
}

func (g *Game) enemyShootLaser(x float64, y float64) {
	vx := 1.00 // not used after creation
	vy := rand.Float64()*4 + 0.01
	snum := rand.Intn(10) + 110
	_, _, _, width, height := utils.ImageData(images[snum])
	g.ELasers = append(g.ELasers, &Laser{Body{x, y, vx, vy, width, height}, snum})
}
```

Since Go 1.20 the global `math/rand` source is seeded automatically, so the original `rand.Seed(time.Now().UnixNano())`
call is no longer needed (and `rand.Seed` is deprecated).

## Moving and drawing

Every sprite is drawn from one sprite sheet with `SubImage`, using the coordinates from `sheet.xml`. The ship cycles
through seven animation frames, changing every 10 frames. Enemies bounce off the left and right edges, and every 200
frames (about 3.3 seconds at 60 TPS) each one fires a laser. When the last enemy dies, the next level starts.

The health bar images are created once and reused. Creating a new `ebiten.Image` every frame, as the first version
did, allocates a GPU texture each time.

```go
func (g *Game) moveAndDrawEnemyLasers(screen *ebiten.Image) {
	for i := len(g.ELasers) - 1; i >= 0; i-- {
		s := g.ELasers[i]
		_, x, y, width, height := utils.ImageData(images[s.sp])
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(s.x, s.y)
		op.Filter = ebiten.FilterLinear
		screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
		if s.y > ScreenHeight {
			g.removeEnemyLaser(i)
		} else {
			s.y += s.vy
		}
	}
}

func (g *Game) drawShip(screen *ebiten.Image) {
	count++
	op := &ebiten.DrawImageOptions{}
	i := (count / 10) % 7
	op.GeoM.Translate(g.Player.Body.x, g.Player.Body.y)
	_, x, y, width, height := utils.ImageData(images[playerSpriteStartNum+i])
	op.Filter = ebiten.FilterLinear
	screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
}

func (g *Game) drawHealthBar(screen *ebiten.Image) {
	const barX, barY = 10, 10
	_, _, _, width, height := utils.ImageData(images[13])
	if playerHB == nil {
		playerHBoutline, _ = ebiten.NewImage(width-5, height-5, ebiten.FilterNearest)
		playerHBoutline.Fill(color.NRGBA{0xff, 0x00, 0x00, 0xff})
		playerHB, _ = ebiten.NewImage(width, height, ebiten.FilterNearest)
		playerHB.Fill(color.NRGBA{0x00, 0xff, 0x00, 0xff})
	}

	op := &ebiten.DrawImageOptions{}
	op.GeoM.Translate(barX+1, barY+1)
	screen.DrawImage(playerHBoutline, op)

	// draw only the part of the green bar that matches the remaining health
	if w := g.Player.health * width / 100; w > 0 {
		op = &ebiten.DrawImageOptions{}
		op.GeoM.Translate(barX, barY)
		screen.DrawImage(playerHB.SubImage(image.Rect(0, 0, w, height)).(*ebiten.Image), op)
	}
}

func (g *Game) moveAndDrawEnemies(screen *ebiten.Image) {
	for i := len(g.Enemies) - 1; i >= 0; i-- {
		s := g.Enemies[i]
		if s.health < 0 {
			g.removeEnemy(i)
			continue
		}
		// bounce off the left and right edges
		if s.x < 0 || s.x > ScreenWidth {
			s.vx = -s.vx
		}
		s.x += s.vx

		_, x, y, width, height := utils.ImageData(images[s.sp])
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(s.x, s.y)
		screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)

		if count%200 == 0 {
			g.enemyShootLaser(s.x, s.y)
		}
	}
	if len(g.Enemies) == 0 {
		g.CreateLevel()
	}
}

func (g *Game) moveAndDrawLasers(screen *ebiten.Image) {
	for i := len(g.PLasers) - 1; i >= 0; i-- {
		s := g.PLasers[i]
		_, x, y, width, height := utils.ImageData(images[s.sp])
		op := &ebiten.DrawImageOptions{}
		op.GeoM.Translate(s.x, s.y)
		screen.DrawImage(gameImages.SubImage(image.Rect(x, y, x+width, y+height)).(*ebiten.Image), op)
		if s.y < -float64(height) {
			g.removeLaser(i)
		} else {
			s.y -= s.vy
		}
	}
}

// tile the background 3x3 and offset it by the viewport position
func ScrollBG(screen *ebiten.Image) {
	theViewport.Move()
	x16, y16 := theViewport.Position()
	offsetX, offsetY := float64(-x16)/16, float64(-y16)/16

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

// WASD or arrow keys, one direction at a time
func (g *Game) moveShip() {
	p := &g.Player.Body
	if ebiten.IsKeyPressed(ebiten.KeyA) || ebiten.IsKeyPressed(ebiten.KeyLeft) {
		if int(p.x) > -p.width/2 {
			p.x -= p.vx
		}
	} else if ebiten.IsKeyPressed(ebiten.KeyD) || ebiten.IsKeyPressed(ebiten.KeyRight) {
		if int(p.x) < ScreenWidth-p.width/2 {
			p.x += p.vx
		}
	} else if ebiten.IsKeyPressed(ebiten.KeyW) || ebiten.IsKeyPressed(ebiten.KeyUp) {
		if int(p.y) > -p.height/2 {
			p.y -= p.vy
		}
	} else if ebiten.IsKeyPressed(ebiten.KeyS) || ebiten.IsKeyPressed(ebiten.KeyDown) {
		if int(p.y) < ScreenHeight-p.height/2 {
			p.y += p.vy
		}
	}
}

func (g *Game) checkGameOver() {
	if g.Player.health < 0 {
		g.mode = ModeGameOver
	}
}

func main() {
	g := NewGame()
	if err := ebiten.Run(g.Update, ScreenWidth, ScreenHeight, ScaleFactor, "Space Shooter!"); err != nil {
		log.Fatal(err)
	}
}
```

## Known issues

- Sprites are drawn with `(x, y)` as the top-left corner, but `ComputeRect` treats `(x, y)` as the centre, so hit
  boxes are offset by half a sprite up and to the left.
- `moveShip` uses an `else if` chain, so the ship can't move diagonally.
- Because updating and drawing happen in the same function, returning early when `ebiten.IsDrawingSkipped()` is true
  also skips the game logic for that frame. Ebiten v2 fixes this by splitting `Update` and `Draw`.
- `count` is incremented in `drawShip`, so all timers (shooting, enemy fire, collision checks) only run in game mode.

## Porting to Ebitengine v2

The main changes needed to build this against `github.com/hajimehoshi/ebiten/v2`:

- `ebiten.Run(update, w, h, scale, title)` is replaced by `ebiten.RunGame(game)`. The game implements
  `Update() error`, `Draw(screen *ebiten.Image)` and `Layout(outsideWidth, outsideHeight int) (int, int)`; set the
  window with `ebiten.SetWindowSize` and `ebiten.SetWindowTitle`. Move all drawing into `Draw` and drop
  `IsDrawingSkipped`.
- `ebiten.NewImage(w, h)` and `ebiten.NewImageFromImage(img)` take no filter argument and return no error.
- `audio.NewContext(sampleRate)` returns only `*audio.Context`, and players are created with
  `audioContext.NewPlayer(src)`.
- Use `wav.DecodeWithSampleRate(sampleRate, src)` and `vorbis.DecodeWithSampleRate(sampleRate, src)` with
  `bytes.NewReader(...)` as the source. The old `Decode(context, src)` functions are deprecated.
- `ebiten.CurrentTPS` is deprecated in favour of `ebiten.ActualTPS`, and `Image.Size` is deprecated in favour of
  `Image.Bounds()`.

## Further reading

- [Ebitengine documentation](https://ebitengine.org/en/documents/)
- [Ebitengine v2 API reference](https://pkg.go.dev/github.com/hajimehoshi/ebiten/v2)
- [Ebitengine examples](https://ebitengine.org/en/examples/)
