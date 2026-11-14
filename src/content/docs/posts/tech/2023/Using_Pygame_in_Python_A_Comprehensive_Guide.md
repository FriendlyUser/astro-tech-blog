---
description: Install Pygame, set up a game loop with a fixed frame rate, handle keyboard input, and move a sprite around the screen, in one runnable script.
imgSrc: /imgs/2023/262205434.png
layout: '@/templates/BasePost.astro'
pubDate: '2025-01-18T07:09:48.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: "Getting started with Pygame: a game loop, input and sprites"
---

Pygame is a Python library for 2D games and multimedia programs. It wraps [SDL](https://www.libsdl.org/) (SDL2 in Pygame 2), which handles the window, keyboard, mouse, joystick and audio across Windows, macOS and Linux. Pygame gives you surfaces to draw on, an event queue, sprites and rectangles with collision checks. It doesn't include a physics engine, a scene editor or a GPU renderer, so you write the game logic yourself. This post builds one small script: a window, a game loop, keyboard input and a sprite you can move.

## Installing Pygame

```bash
pip install pygame
```

The current release, pygame 2.6.1 (September 2024), ships wheels for CPython up to 3.13. On a newer Python, pip will try to build it from source, which usually fails.

If that happens, or you want a more actively released version, use [pygame-ce](https://pyga.me/), the community edition fork. It's a drop-in replacement: you still write `import pygame`, and the code in this post runs unchanged on both.

```bash
pip install pygame-ce
```

Install one or the other, not both, because they use the same import name.

## The game loop

Every Pygame program has the same skeleton: initialise, open a window, then loop until the user quits. Each pass through the loop handles events, updates the game state and draws a frame:

```python
import pygame

pygame.init()
screen = pygame.display.set_mode((800, 600))
pygame.display.set_caption("My First Game")
clock = pygame.time.Clock()

running = True
while running:
    # 1. Handle events
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # 2. Update game state (nothing yet)

    # 3. Draw
    screen.fill((0, 0, 0))  # clear to black
    pygame.display.flip()   # show the frame

    clock.tick(60)  # cap at 60 frames per second

pygame.quit()
```

`clock.tick(60)` sleeps just long enough to hold the loop at 60 frames per second. Without it the loop spins as fast as the CPU allows and pins a core at 100%.

You must call `pygame.event.get()` (or `pygame.event.pump()`) every frame, even if you ignore the events. Otherwise the operating system decides the window has stopped responding.

## Keyboard input

There are two ways to read the keyboard, and games usually need both:

- **Events** (`pygame.KEYDOWN`, `pygame.KEYUP`) fire once per key press. Use them for one-off actions such as quitting, jumping or opening a menu.
- **`pygame.key.get_pressed()`** returns the current state of every key. Use it for continuous actions such as movement, where you care whether the key is held down this frame.

## Sprites and a complete example

A `pygame.sprite.Sprite` bundles an `image` (a Surface) with a `rect` (its position and size). A `pygame.sprite.Group` holds sprites and can update and draw them all in one call. Here is the whole thing put together: a red square you move with the arrow keys, and Escape to quit.

```python
import pygame

WIDTH, HEIGHT = 800, 600
SPEED = 300  # pixels per second


class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((50, 50))
        self.image.fill((255, 0, 0))
        self.rect = self.image.get_rect(center=(WIDTH // 2, HEIGHT // 2))

    def update(self, dt):
        keys = pygame.key.get_pressed()
        dx = keys[pygame.K_RIGHT] - keys[pygame.K_LEFT]
        dy = keys[pygame.K_DOWN] - keys[pygame.K_UP]
        self.rect.x += round(dx * SPEED * dt)
        self.rect.y += round(dy * SPEED * dt)
        self.rect.clamp_ip(pygame.Rect(0, 0, WIDTH, HEIGHT))  # stay on screen


pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("My First Game")
clock = pygame.time.Clock()

player = Player()
all_sprites = pygame.sprite.Group(player)

running = True
while running:
    dt = clock.tick(60) / 1000  # seconds since the last frame

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            running = False

    all_sprites.update(dt)

    screen.fill((0, 0, 0))
    all_sprites.draw(screen)
    pygame.display.flip()

pygame.quit()
```

A few things worth noticing:

- `Group.update(dt)` passes its arguments through to each sprite's `update()`, so every sprite gets the frame time.
- Movement is scaled by `dt`, the time since the last frame, so the square moves at 300 pixels per second whether the game runs at 60 fps or drops to 30.
- `Rect` stores integer coordinates, so very slow movement can round to zero each frame. If you need sub-pixel movement, keep the position in a `pygame.Vector2` and copy it into `rect` after updating.

## Next steps

- **Collisions:** `rect.colliderect(other_rect)` checks two rectangles, and `pygame.sprite.spritecollide(sprite, group, dokill)` checks one sprite against a group. That's enough for most arcade-style games.
- **Images:** load sprites with `pygame.image.load("player.png").convert_alpha()`. The `convert_alpha()` call converts the image to the screen's pixel format once, instead of on every blit.
- **Sound:** `pygame.mixer.Sound("hit.wav").play()` for effects, and `pygame.mixer.music` for streaming background music.

## Further reading

- [Pygame documentation](https://www.pygame.org/docs/)
- [pygame-ce documentation](https://pyga.me/docs/)
