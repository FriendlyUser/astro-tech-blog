---
description: Make line, scatter, bar, histogram, 3D and animated plots with Matplotlib's
  object-oriented API, then label, combine and save them.
imgSrc: /imgs/2023/1637557246.png
layout: '@/templates/BasePost.astro'
pubDate: '2024-04-03T11:06:50.000Z'
lastUpdated: 2026-11-14
tags: ["python"]
title: 'Matplotlib basics: line, scatter, bar, 3D and animated plots'
---

Matplotlib is the standard plotting library for Python. It draws static, animated and interactive figures and saves them as PNG, SVG or PDF. Higher-level libraries such as Seaborn and pandas' `.plot()` are built on it, so even if you mostly use those, you'll end up reaching for Matplotlib to adjust the details.

The examples were run with Matplotlib 3.10. The current release, 3.11, requires Python 3.11 or later.

## Installing

```bash
pip install matplotlib
# or
conda install matplotlib
```

## Two ways to call Matplotlib

Matplotlib has two interfaces:

- **pyplot functions** such as `plt.plot()` and `plt.title()`. These act on whichever figure and axes are "current". They're quick to type in a notebook.
- **The object-oriented (OO) API.** You create a `Figure` and one or more `Axes` explicitly with `plt.subplots()`, then call methods on them, such as `ax.plot()` and `ax.set_title()`.

The Matplotlib docs recommend the OO API for anything beyond a quick one-off plot, because it's always clear which axes you're drawing on. The examples below use it.

```python
import matplotlib.pyplot as plt
import numpy as np
```

## A labelled line plot

```python
x = np.linspace(0, 10, 100)

fig, ax = plt.subplots()
ax.plot(x, np.sin(x), color="tab:blue", linestyle="-", label="sin(x)")
ax.plot(x, np.cos(x), color="tab:green", linestyle="--", label="cos(x)")
ax.set_title("Sine and cosine")
ax.set_xlabel("x")
ax.set_ylabel("y")
ax.legend()

plt.show()
```

`label=` sets the text that `ax.legend()` shows. Colours can be named colours (`"green"`), entries from the default colour cycle (`"tab:blue"`), or hex strings (`"#1f77b4"`).

## Scatter, bar and histogram in one figure

`plt.subplots(rows, cols)` returns a figure and a NumPy array of axes. `layout="constrained"` adjusts the spacing so titles and tick labels don't overlap:

```python
rng = np.random.default_rng(seed=0)
x = np.linspace(0, 10, 100)

fig, axs = plt.subplots(2, 2, figsize=(8, 6), layout="constrained")

axs[0, 0].plot(x, np.sin(x))
axs[0, 0].set_title("Line")

axs[0, 1].scatter(rng.random(50), rng.random(50))
axs[0, 1].set_title("Scatter")

axs[1, 0].bar(["A", "B", "C", "D", "E"], [3, 7, 2, 5, 8])
axs[1, 0].set_title("Bar")

axs[1, 1].hist(rng.standard_normal(1000), bins=30)
axs[1, 1].set_title("Histogram")

plt.show()
```

`np.random.default_rng` is NumPy's current random number API. A fixed seed means you get the same plot every run.

## Saving figures

`plt.show()` opens a window (or renders inline in Jupyter). To write a file, call `savefig` before `show`:

```python
fig.savefig("plots.png", dpi=150, bbox_inches="tight")
fig.savefig("plots.svg")  # vector output; format comes from the extension
```

`bbox_inches="tight"` trims extra whitespace around the figure.

## 3D plots

Pass `projection="3d"` when you create the axes. Since Matplotlib 3.2 you don't need to import `Axes3D` first:

```python
rng = np.random.default_rng(seed=0)

fig = plt.figure()
ax = fig.add_subplot(projection="3d")
ax.scatter(rng.standard_normal(100), rng.standard_normal(100), rng.standard_normal(100))
ax.set_xlabel("X")
ax.set_ylabel("Y")
ax.set_zlabel("Z")

plt.show()
```

You can also write `fig, ax = plt.subplots(subplot_kw={"projection": "3d"})`.

## Animations

`FuncAnimation` calls an update function once per frame:

```python
import matplotlib.animation as animation

fig, ax = plt.subplots()
x = np.linspace(0, 2 * np.pi, 100)
(line,) = ax.plot(x, np.sin(x))


def update(frame):
    line.set_ydata(np.sin(x + 0.1 * frame))
    return (line,)


ani = animation.FuncAnimation(fig, update, frames=100, interval=50, blit=True)
plt.show()
```

Adding `0.1 * frame` inside the `sin` moves the wave to the left over time. To move it right, subtract instead.

Keep a reference to the animation object (`ani` here). If it's garbage-collected, the animation stops. To save it as a GIF, use `ani.save("sine.gif", writer="pillow", fps=20)`. Pillow is already a Matplotlib dependency. Saving to MP4 needs `ffmpeg` installed.

## Gotchas

- Mixing `plt.*` calls with OO calls works, but `plt.title()` acts on the *current* axes, which may not be the one you meant. Pick one style per figure.
- In a script, `plt.show()` blocks until you close the window. On a server or in CI with no display, call `matplotlib.use("Agg")` before importing `pyplot`, and save to files instead.
- Each `plt.subplots()` call creates a new figure, and pyplot keeps figures alive until you close them. In loops that make many plots, call `plt.close(fig)` after saving to avoid running out of memory.

## Further reading

- [Matplotlib quick start guide](https://matplotlib.org/stable/users/explain/quick_start.html)
- [Plot types gallery](https://matplotlib.org/stable/plot_types/index.html)
- [Animation API](https://matplotlib.org/stable/api/animation_api.html)
