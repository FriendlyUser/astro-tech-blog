---
tags: ['go', 'wails']
title: Basic wails app to call the donald trump api
description: Barebones wails app to call the donald trump api
pubDate: Fri, 10 January 2024
layout: "@/templates/BasePost.astro"
imgSrc: "/imgs/2023/1246994641.png"
---


# Bails wails apap

1. Install Wails by following the instructions on their website: https://wails.app/.
2. Open your terminal and navigate to the directory where you want to create your project.
3. Run wails init to create a new project.
4. When prompted, choose Vue as your front-end template. Or use https://github.com/misitebao/wails-template-vue

Next we have choices on how we can call the api. We can either use the go backend to call the api, or we can use the front end to call the api. I will show both ways.

## Front-end only integration
5. Navigate to the frontend/src/components directory of your project and open the Hello.vue file.
6. In the `<script>` section of the file, import Axios with import axios from 'axios'.
7. In the methods object of your Vue component, add a new method that uses Axios to make an HTTP GET request to the https://www.tronalddump.io/ API to retrieve a quote. For example:

```jsx
methods: {
  getQuote() {
    axios.get('https://api.tronalddump.io/random/quote')
      .then(response => {
        this.quote = response.data.value;
      });
  }
}
```


In the `<template>` section of your Vue component, add an element that displays the retrieved quote using double curly braces ({{ }}) syntax.

```jsx
<template>
  <div>
    <p>{{ quote }}</p>
  </div>
</template>
```


## Using go as a backend


In your Wails project directory, navigate to the backend directory and open the main.go file.
Import the net/http package at the top of the file with import "net/http".
In your main function, create a new function that makes an HTTP GET request to the ‘https://api.tronalddump.io/random/quote’ API using the http.Get() method. For example:

```go
func getQuote() string {
  resp, err := http.Get("https://api.tronalddump.io/random/quote")
  if err != nil {
    // handle error
  }
  defer resp.Body.Close()
  body, err := ioutil.ReadAll(resp.Body)
  if err != nil {
    // handle error
  }
  return string(body)
}
```

### Complete version

```go
package main

import (
  "github.com/leaanthony/mewn"
  "github.com/wailsapp/wails"
  "net/http"
  "io/ioutil"
)

func basic() string {
  return "Hello World!"
}

func getQuote() string {
  resp, err := http.Get("https://api.tronalddump.io/random/quote")
  if err != nil {
    // handle error
  }
  defer resp.Body.Close()
  body, err := ioutil.ReadAll(resp.Body)
  if err != nil {
    // handle error
  }
  return string(body)
}

func main() {

  js := mewn.String("./frontend/dist/app.js")
  css := mewn.String("./frontend/dist/app.css")

  app := wails.CreateApp(&wails.AppConfig{
    Width:     1024,
    Height:    768,
    Title:     "test",
    JS:        js,
    CSS:       css,
    Colour:    "#131313",
    Resizable: true,
})
app.Bind(basic)
app.Bind(getQuote)
app.Run()
}
```

And here’s an example of what your Hello.vue file in the frontend/src/components directory of your Wails project could look like:

```vue
<template>
<div>
<h1>{{ message }}</h1>
<button @click="getQuote">Get Quote</button>
<p>{{ quote }}</p>
</div>
</template>

<script>
import axios from 'axios';

export default {
name: 'Hello',
data() {
return {
message: 'Hello from Vue!',
quote: ''
}
},
methods: {
getQuote() {
window.backend.getQuote().then(result => this.quote = result);
}
}
}
</script>

<style scoped>

</style>
```

### To run the app

To run your Wails app, follow these steps:

Open your terminal and navigate to the root directory of your Wails project.
Run the command wails build to build your project. This will create an executable file for your app in the build directory of your project.
To run your app, navigate to the build directory and run the executable file.
For example, on macOS or Linux you can run the command ./myapp where myapp is the name of your executable file.

On Windows, you can double-click on the .exe file to run it.

I hope this helps! Let me know if you have any further questions.

Received message. To run your Wails app, follow these steps: 1. Open your terminal and navigate to the root directory of your Wails project. 2. Run the command `wails build` to build your project. This will create an executable file for your app in the `build` directory of your project. 3. To run your app, navigate to the `build` directory and run the executable file. For example, on macOS or Linux you can run the command `./myapp` where `myapp` is the name of your executable file. On Windows, you can double-click on the `.exe` file to run it. I hope this helps! Let me know if you have any further questions.
