---
tags: ['css', 'vue']
title: Css Animations in Vue
description: Vue is a popular JavaScript framework that allows developers to create dynamic, reactive user interfaces. One of the ways Vue makes this possible is by allowing developers to easily integrate CSS animations into their Vue components. In this article, we will explore how to use CSS animations in Vue.
pubDate: Fri, 21 March 2024
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.png
---

Vue is a popular JavaScript framework that allows developers to create dynamic, reactive user interfaces. One of the ways Vue makes this possible is by allowing developers to easily integrate CSS animations into their Vue components. In this article, we will explore how to use CSS animations in Vue.

First, we need to understand what CSS animations are. CSS animations are a way to add motion and dynamic effects to elements on a webpage. Animations can be triggered by events such as hovering over an element, clicking on it, or simply loading the page. CSS animations can be applied to a wide range of CSS properties, such as color, opacity, and position, among others.

To use CSS animations in Vue, we can take advantage of Vue's built-in support for CSS classes. Vue components can define their own styles using scoped CSS, which means that styles only apply to the component they are defined in. We can use this feature to define CSS classes that apply the animations we want to use.

Let's start with a simple example. Suppose we have a Vue component that displays a button. We want to add an animation that makes the button pulse when the user hovers over it. Here's how we can do it:


```vue
<template>
  <button class="pulse">Click me!</button>
</template>

<style scoped>
.pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
```

In this example, we define a CSS class called "pulse" that applies an animation called "pulse" to the button. The "pulse" animation is defined using the @keyframes rule, which defines how the animation should change over time. In this case, the animation scales the button up by 20% and then back down to its original size.

We also specify that the animation should run indefinitely using the infinite keyword.

To trigger the animation when the user hovers over the button, we can add a :hover pseudo-class to the CSS selector, like this:

```vue
.pulse:hover {
  animation: pulse 1s infinite;
}
```

Now the button will pulse whenever the user hovers over it.

We can also use Vue's data and computed properties to control the animation. For example, we could define a isPulsing data property that determines whether the button should pulse or not:

```vue
<template>
  <button :class="{'pulse': isPulsing}" @click="isPulsing = !isPulsing">
    {{ isPulsing ? 'Stop pulsing' : 'Start pulsing' }}
  </button>
</template>

<style scoped>
.pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>

<script>
export default {
  data() {
    return {
      isPulsing: false,
    };
  },
};
</script>
```

In this example, we define a isPulsing data property that is initially set to false. We use Vue's class binding syntax to conditionally apply the "pulse" class based on the value of isPulsing. We also add a click handler that toggles the value of isPulsing when the button is clicked.

This is just a simple example of how to use CSS animations in Vue. You can apply the same techniques to create more complex animations and control them using Vue's data and computed properties.

Another useful feature of Vue is its transitions system. Transitions allow you to apply animations when elements are added, removed, or updated in the DOM. You can use Vue's <transition> component to define a transition and apply it to any element that is wrapped by the component.

Here's an example of how to use Vue's transition component to apply a fade-in animation to a list of items:

```vue
<template>
  <div>
    <button @click="addItem">Add item</button>
    <transition-group name="fade" tag="ul">
      <li v-for="item in items" :key="item.id">{{ item.text }}</li>
    </transition-group>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>

<script>
export default {
  data() {
    return {
      items: [],
    };
  },
  methods: {
    addItem() {
      this.items.push({
        id: Date.now(),
        text: `Item ${this.items.length + 1}`,
      });
    },
  },
};
</script>
```

In this example, we define a button that adds a new item to the list when clicked. The list is wrapped in a <transition-group> component, which applies the transition to each list item. We define the "fade" transition using CSS classes that specify how the opacity of the element should change over time. We also specify the tag prop to tell Vue to render the transition as a ul element.

Vue provides several hooks that allow you to control the transition. For example, you can use the before-enter hook to set the initial state of the element before the animation starts:

```vue
<template>
  <div>
    <button @click="addItem">Add item</button>
    <transition-group name="fade" tag="ul">
      <li v-for="item in items" :key="item.id" v-bind:style="{ 'background-color': item.color }" v-on:before-enter="beforeEnter">
        {{ item.text }}
      </li>
    </transition-group>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s, transform 0.5s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%);
}

.fade-leave-active {
  position: absolute;
}

.fade-move {
  transition: transform 0.5s;
}

.fade-move-active {
  transition: transform 0.5s, opacity 0.5s;
}
</style>

<script>
export default {
  data() {
    return {
      items: [],
    };
  },
  methods: {
    addItem() {
      this.items.push({
        id: Date.now(),
        text: `Item ${this.items.length + 1}`,
        color: this.getRandomColor(),
      });
    },
    beforeEnter(el) {
      el.style.opacity = 0;
      el.style.transform = 'translateX(-50%)';
    },
    getRandomColor() {
      return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    },
  },
};
</script>
```

In this example, we define a beforeEnter method that sets the initial state of the element before the fade-in animation starts. We also add a new property to the items object, which is the color of each item. We use a helper method called getRandomColor to generate a random color for each new item.

We also add more CSS classes to define the animation when items are moved or leave the DOM. The fade-move and fade-move-active classes define how the position and opacity of the element should change when it is moved, while the fade-leave-active class defines the animation when an item is removed from the list.

Vue's transition system also provides several other hooks and props that you can use to control the animation, such as after-enter, before-leave, after-leave, appear, and mode. You can use these to create more complex animations, such as staggered animations or animations that depend on the state of other components in your application.

In summary, using CSS animations in Vue can help you create dynamic and engaging user interfaces. By combining Vue's reactive data system with CSS animations, you can create complex and responsive animations that are easy to maintain and modify. Whether you're building a simple button animation or a complex transition system, Vue's built-in features make it easy to add animation to your applications.
