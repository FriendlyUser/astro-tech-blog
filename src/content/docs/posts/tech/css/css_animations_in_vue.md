---
tags: ['css', 'vue']
title: "CSS animations in Vue 3: keyframes, class bindings and TransitionGroup"
description: "Animate Vue 3 components with CSS keyframes, toggle animations with class bindings, and animate list items with TransitionGroup and its CSS classes."
pubDate: Fri, 21 March 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/1492118595.webp
---

Vue doesn't need an animation library for most UI motion. Plain CSS `@keyframes` and transitions handle the animation itself, Vue's class bindings decide when it runs, and the built-in `<Transition>` and `<TransitionGroup>` components add classes at the right moments when elements enter or leave the DOM. The examples use Vue 3 single-file components with `<script setup>`.

## A keyframe animation in a component

This button pulses only while the pointer is over it:

```vue
<template>
  <button class="pulse">Click me!</button>
</template>

<style scoped>
.pulse:hover {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
</style>
```

`@keyframes` describes how the property changes over one cycle (grow to 120% at the halfway mark, then back), and `infinite` repeats it. Because the `animation` declaration is on `.pulse:hover`, the animation stops when the pointer leaves. Put it on `.pulse` instead if you want it to run all the time.

`scoped` styles only apply to this component. Vue also rewrites the keyframe name so a `pulse` animation in another component won't clash with this one.

## Toggling an animation with reactive state

To start and stop the animation from code, bind the class to a piece of state:

```vue
<script setup>
import { ref } from 'vue';

const isPulsing = ref(false);
</script>

<template>
  <button :class="{ pulse: isPulsing }" @click="isPulsing = !isPulsing">
    {{ isPulsing ? 'Stop pulsing' : 'Start pulsing' }}
  </button>
</template>

<style scoped>
.pulse {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
}
</style>
```

`:class="{ pulse: isPulsing }"` adds the `pulse` class only while `isPulsing` is true, and the click handler flips it.

## Animating list items with TransitionGroup

Keyframes on a class can't animate an element that is being removed, because it's gone from the DOM before anything runs. `<Transition>` (for a single element) and `<TransitionGroup>` (for `v-for` lists) solve that: they keep the element around long enough to play the leave animation, and they add classes at each stage. With `name="fade"`, the classes are:

- `fade-enter-from`, `fade-enter-active`, `fade-enter-to` while an element is inserted
- `fade-leave-from`, `fade-leave-active`, `fade-leave-to` while it is removed
- `fade-move` (TransitionGroup only) on items that change position because of an insert or removal

```vue
<script setup>
import { ref } from 'vue';

const items = ref([]);
let nextId = 1;

function randomColor() {
  return `#${Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, '0')}`;
}

function addItem() {
  items.value.unshift({ id: nextId, text: `Item ${nextId}`, color: randomColor() });
  nextId++;
}

function removeItem(id) {
  items.value = items.value.filter((item) => item.id !== id);
}
</script>

<template>
  <div>
    <button @click="addItem">Add item</button>
    <TransitionGroup name="fade" tag="ul" class="list">
      <li
        v-for="item in items"
        :key="item.id"
        :style="{ backgroundColor: item.color }"
        @click="removeItem(item.id)"
      >
        {{ item.text }}
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.list {
  position: relative;
}

.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* Take leaving items out of the flow so the others can slide into place. */
.fade-leave-active {
  position: absolute;
}
</style>
```

Clicking **Add item** inserts a new item at the top, which fades and slides in while the existing items slide down via `fade-move`. Clicking an item removes it; it fades out and the items below move up. Every item needs a unique, stable `:key`, which is why the example uses a counter rather than the array index.

`tag="ul"` tells `<TransitionGroup>` to render a `<ul>` around the items. In Vue 3 it renders no wrapper element unless you set `tag`.

## JavaScript hooks

If you need to set something up in code at a particular stage, `<Transition>` and `<TransitionGroup>` emit hooks such as `@before-enter`, `@enter`, `@after-enter`, `@before-leave`, `@leave` and `@after-leave`. They go on the transition component, not on the child elements:

```vue
<TransitionGroup name="fade" tag="ul" @after-enter="onAfterEnter">
  <!-- items -->
</TransitionGroup>
```

Each hook receives the DOM element. Use them for things CSS can't express, such as staggering items by reading a `data-index` attribute and setting a `transition-delay`, or driving a JavaScript animation library.

## Gotchas

- **Vue 2 class names.** Vue 2 used `v-enter` / `fade-enter` for the starting state. Vue 3 renamed it to `fade-enter-from` (and `leave` to `leave-from`). Old snippets that use `.fade-enter` silently do nothing in Vue 3.
- **Reduced motion.** Wrap infinite or large animations in `@media (prefers-reduced-motion: no-preference) { … }` so users who have turned motion off in their OS don't get them.
- **Animate cheap properties.** `opacity` and `transform` animate smoothly; animating `width`, `height` or `top` forces layout on every frame.

## Further reading

- [Vue: Transition](https://vuejs.org/guide/built-ins/transition.html)
- [Vue: TransitionGroup](https://vuejs.org/guide/built-ins/transition-group.html)
- [Vue: Animation techniques](https://vuejs.org/guide/extras/animation.html)
