---
description: 'Build a small space shooter with Pygame Zero: actors, keyboard input, shooting, collisions, a score and a game-over screen, in about 70 lines of Python.'
imgSrc: /imgs/2023/359936451.png
layout: '@/templates/BasePost.astro'
pubDate: '2023-06-16T23:52:29.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: 'Pygame Zero: build a simple space shooter in Python'
---

Pygame Zero is a thin layer over Pygame aimed at beginners and classrooms. You don't write a game loop or an event loop: you define `draw()` and `update()` functions plus a few named event handlers, and Pygame Zero calls them for you. Images and sounds are loaded by name from folders next to your script.

This post builds a small space shooter. The player moves a ship left and right, fires bullets with the space bar, and loses when an enemy reaches the bottom of the screen.

## Installing

```bash
pip install pgzero
```

This installs Pygame Zero 1.2.1 (the current release on PyPI) along with Pygame and NumPy. Pygame 2.6.1 publishes prebuilt wheels for Python 3.6 to 3.13. On a newer Python, pip will try to build Pygame from source, which usually fails without the SDL development headers, so use Python 3.13 or older in a virtual environment.

## Project layout

Pygame Zero looks for images in an `images/` folder beside the script and refers to them by lowercase file name without the extension:

```text
spaceshooter/
├── spaceshooter.py
└── images/
    ├── spaceship.png
    ├── enemy.png
    └── bullet.png
```

Any small PNGs will do. Free sprite packs such as [Kenney's Space Shooter Redux](https://kenney.nl/assets/space-shooter-redux) work well, once you rename the files.

## The full game

```python
import random

import pgzrun

WIDTH = 800
HEIGHT = 600

player = Actor("spaceship", midbottom=(WIDTH // 2, HEIGHT - 10))
bullets = []
enemies = []
score = 0
game_over = False


def spawn_enemy():
    if game_over:
        return
    enemy = Actor("enemy")
    enemy.x = random.randint(40, WIDTH - 40)
    enemy.bottom = 0
    enemies.append(enemy)


def draw():
    screen.clear()
    player.draw()
    for bullet in bullets:
        bullet.draw()
    for enemy in enemies:
        enemy.draw()
    screen.draw.text(f"Score: {score}", (10, 10), color="white")
    if game_over:
        screen.draw.text(
            "GAME OVER", center=(WIDTH // 2, HEIGHT // 2), fontsize=60, color="red"
        )


def update():
    global score, game_over
    if game_over:
        return

    if keyboard.left:
        player.x -= 5
    if keyboard.right:
        player.x += 5
    player.x = max(player.width // 2, min(player.x, WIDTH - player.width // 2))

    # Iterate over copies so we can remove items from the real lists.
    for bullet in bullets[:]:
        bullet.y -= 10
        if bullet.bottom < 0:
            bullets.remove(bullet)

    for enemy in enemies[:]:
        enemy.y += 2
        for bullet in bullets[:]:
            if enemy.colliderect(bullet):
                bullets.remove(bullet)
                enemies.remove(enemy)
                score += 1
                break
        else:
            if enemy.bottom > HEIGHT:
                game_over = True


def on_key_down(key):
    if key == keys.SPACE and not game_over:
        bullets.append(Actor("bullet", midbottom=player.midtop))


clock.schedule_interval(spawn_enemy, 1.0)

pgzrun.go()
```

Run it with:

```bash
python spaceshooter.py
```

## How it works

### Setup and the window

`import pgzrun` at the top injects Pygame Zero's built-in names (`Actor`, `screen`, `keyboard`, `keys`, `clock` and others) into your script. `pgzrun.go()` at the bottom starts the game loop, so it must be the last line. `WIDTH` and `HEIGHT` set the window size.

Your editor or linter may warn that `Actor` and `screen` are undefined, because they only exist at runtime. Alternatively, leave out the two `pgzrun` lines and start the game with the `pgzrun spaceshooter.py` command.

### Actors

An `Actor` is a sprite with a position. `Actor("spaceship")` loads `images/spaceship.png`. You can place it with keyword arguments such as `midbottom=(x, y)`, or set attributes later: `x`, `y`, `left`, `right`, `top`, `bottom`, `center`, `midtop` and so on. The width and height come from the image.

`spawn_enemy()` creates an enemy at a random horizontal position just above the top of the screen. `clock.schedule_interval(spawn_enemy, 1.0)` calls it once a second.

### draw() and update()

Pygame Zero calls `update()` and then `draw()` on each frame, aiming for 60 frames per second. Keep game logic in `update()` and rendering in `draw()`.

- `keyboard.left` and `keyboard.right` are `True` while those keys are held, which gives smooth movement. The `max`/`min` line clamps the ship to the screen.
- Bullets move up 10 pixels per frame and are removed once they leave the top of the screen.
- Enemies move down 2 pixels per frame. Each one is checked against every bullet with `colliderect`, which tests whether the two bounding boxes overlap.
- The `for ... else` runs the `else` branch only if the inner loop didn't `break`, meaning the enemy wasn't hit. That's where we check whether it reached the bottom.

The loops iterate over copies (`bullets[:]`, `enemies[:]`) because removing items from a list while looping over it skips elements.

### Events

`on_key_down(key)` is called once per key press, which suits firing better than `keyboard.space` would (that is `True` on every frame the key is held). Each press creates a bullet at the ship's nose.

### Game over

Instead of calling `exit()` the moment an enemy gets through, the game sets a `game_over` flag. `update()` stops moving things, `spawn_enemy()` stops adding enemies, and `draw()` shows the message, so the player can see the final score.

## Ideas for extending it

- Add sounds: put `shoot.wav` in a `sounds/` folder and call `sounds.shoot.play()` in `on_key_down`.
- Speed up enemy spawning as the score rises, using `clock.unschedule` and `clock.schedule_interval` with a shorter delay.
- Restart the game when the player presses `R` after a game over, by resetting the lists, score and flag.
- Use `colliderect` between enemies and the player to end the game on contact.

## Further reading

- [Pygame Zero documentation](https://pygame-zero.readthedocs.io/en/stable/), especially the [built-in objects](https://pygame-zero.readthedocs.io/en/stable/builtins.html) and [event hooks](https://pygame-zero.readthedocs.io/en/stable/hooks.html) pages
- [Pygame Zero on GitHub](https://github.com/lordmauve/pgzero)
