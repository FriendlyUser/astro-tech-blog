---
tags: ['js', "stonks"]
title: Investing homepage with waves animation
description: Using JS and vuesax to show waves.
pubDate: Mon, 5 October 2023
imgSrc: /imgs/2023/2094095868.png
---
An investing homepage can provide a central location for an individual or organization to access financial market information, research, and tools to make informed investment decisions. It can also serve as a hub for managing a portfolio, tracking investments, and monitoring performance. Additionally, a homepage can provide resources such as educational materials, news updates, and access to financial advisors or other professionals for guidance. Overall, an investing homepage can be a useful tool for individuals and organizations to stay informed and make strategic decisions about their investments.


Here is an example of a wave animation using Vue.js:


```vue
html`<template>
 <div>
 <svg width="100%" height="100%" viewBox="0 0 1440 320">
 <path
 v-for="(item, index) in waves"
 :key="index"
 :d="item"
 :fill="fill"
 />
 </svg>
 </div>
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
 this.waves.push(this.drawWave(i \* 480))
 }
 },
 methods: {
 drawWave(shift) {
 let data = ''
 for (let x = 0; x <= 1440; x++) {
 let y = Math.sin((x + shift) / 30) \* 50
 if (x === 0) {
 data += `M ${x} ${160 + y}
 } else {
 data += ` L ${x} ${160 + y}
 }
 }
 return data + ' Z'
 }
 }
}
</script>
```
This code is using v-for to loop through an array of wave paths and render them as SVG paths. The `drawWave` method is used to generate the d attribute for each path, which represents the shape of the wave. The `shift` variable is used to offset the position of each wave and create a sense of movement. The `fill` variable is used to set the color of the wave.

You can customize this code to suit your needs, such as adjusting the amplitude, frequency, or color of the waves. Also you can use CSS to style the SVG as you want.


```vue 
 <template>
  <div>
    <div class="wave-container">
      <div class="hero-container">
        <div class="grid hero-grid">
          <vs-row justify="center">
            <vs-col xs="12" lg="6">
              <div class='hero-body'>
                <h2>Personal Investment</h2>
                <h3>Blog</h3>
                <p>Providing free open source tools and writing down my investment thoughts.</p>
              </div>
            </vs-col>
            <vs-col xs="12" lg="6">
              <div class="hero-img-container">
                <img class='hero-image' src="~/static/undraw_investing_7u74.svg" />
              </div>
            </vs-col>
          </vs-row>
        </div>
      </div>
      <div class='wave-svg'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320">
          <path fill="#5b3cc4" fill-opacity="1" d="M0,320L21.8,293.3C43.6,267,87,213,131,213.3C174.5,213,218,267,262,288C305.5,309,349,299,393,282.7C436.4,267,480,245,524,229.3C567.3,213,611,203,655,202.7C698.2,203,742,213,785,229.3C829.1,245,873,267,916,261.3C960,256,1004,224,1047,218.7C1090.9,213,1135,235,1178,218.7C1221.8,203,1265,149,1309,160C1352.7,171,1396,245,1418,282.7L1440,320L1440,0L1418.2,0C1396.4,0,1353,0,1309,0C1265.5,0,1222,0,1178,0C1134.5,0,1091,0,1047,0C1003.6,0,960,0,916,0C872.7,0,829,0,785,0C741.8,0,698,0,655,0C610.9,0,567,0,524,0C480,0,436,0,393,0C349.1,0,305,0,262,0C218.2,0,175,0,131,0C87.3,0,44,0,22,0L0,0Z"></path>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
import Logo from '~/components/Logo.vue'
import VuesaxLogo from '~/components/VuesaxLogo.vue'

export default {
  components: {
    Logo,
    VuesaxLogo
  },
  mounted() {
    this.$nextTick(() => {
      this.$nuxt.$loading.start()

      setTimeout(() => this.$nuxt.$loading.finish(), 5000)
    })
  }
}
</script>

<style>

.hero-grid {
  z-index: 5;
}
.hero-img-container {
  max-width: 350px;
  max-height: 220px;
  margin: auto;
}

.hero-body {
  margin: auto;
  padding: 1px 6px;
  text-align: right;
}
.hero-image {
  max-width: 100%;
}
@media (min-width: 768px) and (max-width: 979px) {
  .hero-image {
    right: 100px;
  }
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
  .img-container {
    margin-top: 50px;
  }
}
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family:
    'Quicksand',
    'Source Sans Pro',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  display: block;
  font-weight: 300;
  font-size: 55px;
  color: #35495e;
  letter-spacing: 1px;
  text-transform: capitalize;
  margin: 25px 0;
}

.subtitle {
  font-weight: 300;
  font-size: 1.1rem;
  color: #526488;
  word-spacing: 2px;
  padding-bottom: 15px;
  max-width: 600px;
}

.subtitle a {
  font-weight: 500;
  color: inherit;
}

.links {
  padding-top: 15px;
  margin-bottom: 20px;
}

.content-logos {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 500px;
}

.plus {
  font-size: 2.5rem;
  margin: 15px;
  color: #35495e;
}

.h3 {
  font-family:
    'Quicksand',
    'Source Sans Pro',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  font-weight: 400;
  margin: 10px;
}

.wave-container {
  background: #5b3cc4;
  color: #FFF;
  text-align: center;
  overflow: hidden;
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
  0% {
    margin-left: 0;
  }
  10% {
    margin-left: -200px;
  }
  40% {
    margin-left: -400px;
  }
  60% {
    margin-left: -200px;
  }
  75% {
    margin-left: -300px;
  }
  95% {
    margin-left: -50px;
  }
  100% {
    margin-left: -5px;
  }
}


.wave-svg > svg:nth-of-type(1) {
  animation: wave 7s cubic-bezier( 0.36, 0.45, 0.63, 0.53) infinite;
}


</style>
 
 ```

This is an example of how to use Vue.js to create a wave animation as part of a larger webpage. In this example, the wave animation is implemented using an SVG path that is styled with CSS. The wave is contained within a "wave-svg" div and is positioned below a "hero-container" div that contains the main content of the page. The "hero-container" div includes a grid layout using Vuesax components (vs-row and vs-col) to arrange the content, including a heading, a subtitle, and an image. The example also includes some media queries to adjust the layout for different screen sizes. Finally, the example uses a mounted() lifecycle method to add a loading spinner that starts when the page loads and finishes after 5 seconds.


This code is an example of how to use Vue.js and the Vuesax library to create a wave animation that can be used in a website or web application. The animation is created using an SVG path element that is styled with CSS and rendered on the page using Vue template syntax. The wave-svg class is applied to the SVG element which contains the path element, which is the element that creates the wave animation. The animation itself is done using the CSS fill property and the fill-opacity property to create the wave effect.

The code also makes use of Vuesax's grid system to create a responsive layout for the wave animation and other elements on the page, such as an image and some text. Additionally, the code uses a mounted lifecycle hook to show a loading spinner for 5 seconds before the wave animation is shown, this can be removed if not necessary.


