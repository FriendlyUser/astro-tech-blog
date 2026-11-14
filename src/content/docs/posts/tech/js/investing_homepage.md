---
tags: ['js', "stonks", "vue", "css"]
title: SVG wave hero section for an investing homepage with Vue and Vuesax
description: Generating SVG wave paths in a Vue component, and building an animated wave hero section for an investing blog homepage with Nuxt 2 and Vuesax.
pubDate: Mon, 5 October 2023
lastUpdated: 2026-11-14
imgSrc: /imgs/2023/2094095868.png
---
:::caution
The hero section below uses Nuxt 2 and Vuesax, both built on Vue 2. Vue 2 reached end of life on 31 December 2023 and Nuxt 2 on 30 June 2024. Vuesax 4 was only ever published as an alpha, depends on Vue Router 3 (Vue 2 only), and hasn't had a release since 2022. The SVG and CSS parts carry over to Vue 3 or Nuxt 3+ unchanged; replace `vs-row`/`vs-col` with a CSS grid or another component library.
:::

An investing homepage is a landing page for market notes, research and tools. This post builds the top of one: a hero section with a heading, an illustration and a purple wave along the bottom edge that drifts sideways.

## Generating wave paths in Vue

You can draw a wave by sampling a sine function and joining the points into an SVG path. This component draws three overlapping waves with different phase offsets:

```vue
<template>
  <svg width="100%" viewBox="0 0 1440 320" preserveAspectRatio="none">
    <path
      v-for="(d, index) in waves"
      :key="index"
      :d="d"
      :fill="fill"
      fill-opacity="0.4"
    />
  </svg>
</template>

<script>
export default {
  data() {
    return {
      waves: [],
      fill: '#f8bbd0'
    }
  },
  mounted() {
    for (let i = 0; i < 3; i++) {
      this.waves.push(this.drawWave(i * 480))
    }
  },
  methods: {
    drawWave(shift) {
      let d = ''
      for (let x = 0; x <= 1440; x += 5) {
        const y = 160 + Math.sin((x + shift) / 30) * 50
        d += `${x === 0 ? 'M' : 'L'} ${x} ${y} `
      }
      // Close the shape along the bottom edge so the fill sits under the wave
      return d + 'L 1440 320 L 0 320 Z'
    }
  }
}
</script>
```

`drawWave` builds the path's `d` attribute: a `M` (move) to the first point, then `L` (line) commands every 5 units, then two lines down to the bottom corners and `Z` to close the shape. `shift` offsets the phase of each wave so the three don't line up, and `fill-opacity` lets them show through each other. Change the `/ 30` divisor to adjust the wavelength and the `* 50` multiplier to adjust the height.

This draws static waves; nothing here moves. The hero section below gets its movement from CSS.

## The hero section

This version uses a pre-drawn wave path (the kind you can export from a wave generator) and animates it with a CSS keyframe that shifts the SVG horizontally:

```vue
<template>
  <div class="wave-container">
    <div class="hero-container">
      <div class="grid hero-grid">
        <vs-row justify="center">
          <vs-col xs="12" lg="6">
            <div class="hero-body">
              <h2>Personal Investment</h2>
              <h3>Blog</h3>
              <p>Providing free open source tools and writing down my investment thoughts.</p>
            </div>
          </vs-col>
          <vs-col xs="12" lg="6">
            <div class="hero-img-container">
              <img class="hero-image" src="~/static/undraw_investing_7u74.svg" alt="" />
            </div>
          </vs-col>
        </vs-row>
      </div>
    </div>
    <div class="wave-svg">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
        <path fill="#5b3cc4" fill-opacity="1" d="M0,320L21.8,293.3C43.6,267,87,213,131,213.3C174.5,213,218,267,262,288C305.5,309,349,299,393,282.7C436.4,267,480,245,524,229.3C567.3,213,611,203,655,202.7C698.2,203,742,213,785,229.3C829.1,245,873,267,916,261.3C960,256,1004,224,1047,218.7C1090.9,213,1135,235,1178,218.7C1221.8,203,1265,149,1309,160C1352.7,171,1396,245,1418,282.7L1440,320L1440,0L1418.2,0C1396.4,0,1353,0,1309,0C1265.5,0,1222,0,1178,0C1134.5,0,1091,0,1047,0C1003.6,0,960,0,916,0C872.7,0,829,0,785,0C741.8,0,698,0,655,0C610.9,0,567,0,524,0C480,0,436,0,393,0C349.1,0,305,0,262,0C218.2,0,175,0,131,0C87.3,0,44,0,22,0L0,0Z"></path>
      </svg>
    </div>
  </div>
</template>

<script>
export default {}
</script>

<style>
.wave-container {
  background: #5b3cc4;
  color: #fff;
  text-align: center;
  overflow: hidden;
}

.hero-container {
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  padding-bottom: 25px;
  margin-bottom: -1px;
  z-index: 10;
}

@media (min-width: 769px) {
  .hero-container {
    margin-top: 125px;
  }
}

@media (max-width: 768px) {
  .hero-container {
    margin-top: 100px;
  }
}

.hero-grid {
  z-index: 5;
}

.hero-body {
  margin: auto;
  padding: 1px 6px;
  text-align: right;
}

.hero-img-container {
  max-width: 350px;
  max-height: 220px;
  margin: auto;
}

.hero-image {
  max-width: 100%;
}

.wave-svg {
  position: relative;
  background-color: white;
  display: block;
  transform-origin: bottom;
  margin-top: -100px;
  z-index: 1;
}

@keyframes wave {
  0% { margin-left: 0; }
  10% { margin-left: -200px; }
  40% { margin-left: -400px; }
  60% { margin-left: -200px; }
  75% { margin-left: -300px; }
  95% { margin-left: -50px; }
  100% { margin-left: -5px; }
}

.wave-svg > svg:nth-of-type(1) {
  animation: wave 7s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
}
</style>
```

How it fits together:

- `.wave-container` has the same purple background as the wave path, so the hero text and the top of the wave read as one block. `overflow: hidden` clips the SVG when it slides left.
- The SVG path is filled purple from the top down to the wave line; below the line it is transparent, so the white background of `.wave-svg` forms the bottom edge. `margin-top: -100px` pulls the wave up under the hero content.
- The movement comes from the `wave` keyframes, which change the SVG's `margin-left` between 0 and -400px over 7 seconds and loop forever.
- `vs-row` and `vs-col` are Vuesax grid components; `xs="12" lg="6"` stacks the text and image on small screens and puts them side by side on large ones.
- In Nuxt 2, `~/static/...` resolves to the project's `static/` directory.

The first version of this post also included leftovers from the Nuxt starter template, which are removed here: unused `Logo` and `VuesaxLogo` imports, a block of unused CSS classes, and a `mounted` hook that held Nuxt's top loading bar open for five seconds (it didn't delay or affect the wave).

## Gotchas

- When the SVG slides left by up to 400px, its right edge moves inside the container and the white background of `.wave-svg` can show at the top right. Making the SVG wider than its container (for example `width: calc(100% + 400px)`) keeps it covered.
- Animating `margin-left` triggers layout on every frame. Animating `transform: translateX(...)` gives the same visual effect and can be handled by the compositor.
- Respect users who have reduced motion turned on by disabling the animation inside `@media (prefers-reduced-motion: reduce)`.
