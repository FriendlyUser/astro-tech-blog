---
title: "Vue 3 Six Years On: What Changed from 3.0 to 3.6"
description: "Vue 3.0 shipped in September 2020. What each minor release added since, from script setup and defineModel to 3.5's reactivity rewrite and 3.6's Vapor Mode."
tags: ["Vue", "Vue 3", "JavaScript", "TypeScript", "Vapor Mode", "Web Development"]
pubDate: "2026-11-09T16:00:00.000Z"
imgSrc: "/imgs/2026/vue_3_since_launch.webp"
imgAlt: "A green timeline of Vue releases from 3.0 to 3.6 drawn as stacked chevrons"
---

Vue 3.0 ("One Piece") came out on September 18, 2020. Six years later the stable line is 3.5 (3.5.45 shipped on November 5, 2026), and 3.6 has been in release candidates since July, with rc.15 tagged on November 12.

If you learned Vue 3 from the 2020 docs and have not looked closely since, a lot of the everyday code is different now. This post walks through each minor release, shows the before and after for the features I would actually change in an old codebase, and ends with a short upgrade checklist.

## The releases at a glance

| Version | Released | What it is remembered for |
|---|---|---|
| 3.0 "One Piece" | 2020-09-18 | Composition API, Proxy-based reactivity, Teleport, fragments, TypeScript rewrite |
| 3.1 "Pluto" | 2021-06-07 | `@vue/compat`, the migration build for Vue 2 apps |
| 3.2 "Quintessential Quintuplets" | 2021-08-09 | `<script setup>` stable, `v-bind()` in CSS, `effectScope`, `v-memo` |
| 3.3 "Rurouni Kenshin" | 2023-05-11 | Generic components, imported types in `defineProps`, `defineSlots`, `defineOptions` |
| 3.4 "Slam Dunk" | 2023-12-29 | Template parser about 2x faster, `defineModel` stable, `:id` shorthand |
| 3.5 | 2024-09-03 | Reactivity memory cut by about half, reactive props destructure, `useTemplateRef`, `useId`, lazy hydration |
| 3.6 (RC) | rc.1 on 2026-07-18 | Reactivity rebuilt on alien-signals, opt-in Vapor Mode |

Release dates are from the [vuejs/core releases](https://github.com/vuejs/core/releases).

## 3.0: the big rewrite

3.0 was the break with Vue 2. Most of what people now think of as "Vue 3" arrived here:

- **Composition API.** `setup()`, `ref`, `reactive`, `computed` and `watch` let you group code by feature instead of by option type.
- **Proxy-based reactivity.** Adding a property to an object or setting an array index is tracked. You no longer need `Vue.set`.
- **Fragments, Teleport and Suspense.** Components can have more than one root node. `<Teleport>` renders a modal into `body`. `<Suspense>` was marked experimental, and it still is.
- **Multiple `v-model`s** on one component, and an `emits` option for declaring events.
- **The codebase moved to TypeScript**, which is why the editor types are so much better than they were in Vue 2.

The Options API never went away, and it still works in 3.6. You can migrate one component at a time.

## 3.1 and 3.2: making the migration possible

3.1 shipped `@vue/compat`, a build of Vue 3 that runs most Vue 2 code and logs a warning for every deprecated API it hits. For big Vue 2 apps, this was the way across.

3.2 is the release that changed how Vue code looks day to day, because `<script setup>` became stable:

```vue
<!-- Before: setup() with an explicit return -->
<script>
import { ref } from 'vue';
export default {
  setup() {
    const count = ref(0);
    const increment = () => count.value++;
    return { count, increment };
  },
};
</script>

<!-- After: <script setup>, everything at the top level is available to the template -->
<script setup>
import { ref } from 'vue';
const count = ref(0);
const increment = () => count.value++;
</script>
```

3.2 also added:

- `v-bind()` inside `<style>`, so CSS can read component state.
- `effectScope()` for grouping watchers so they can be disposed together. Pinia and VueUse rely on it.
- `v-memo` for skipping re-renders of large lists.
- `defineCustomElement` for shipping Vue components as web components.

## 3.3: TypeScript catches up

Before 3.3, `defineProps<Props>()` only worked with types declared in the same file. 3.3 lets you import the props type from another file, and it added a set of macros that remove a lot of boilerplate:

```vue
<script setup lang="ts" generic="T extends { id: string }">
import type { BaseListProps } from './types';

defineOptions({ name: 'SelectList', inheritAttrs: false });

const props = defineProps<BaseListProps & { items: T[] }>();

// The shorter tuple syntax for typed events
const emit = defineEmits<{
  select: [item: T];
}>();

defineSlots<{
  item(props: { item: T }): any;
}>();
</script>
```

- **Generic components** (`generic="T"`) mean a list or select component can be typed by what it holds.
- **`defineOptions`** replaces the second `<script>` block people added just to set `name` or `inheritAttrs`.
- **`defineSlots`** gives slot props real types.
- **`toValue()`** and getter support in `toRef()` make composables that accept "a ref, a getter or a plain value" easy to write.

3.3 also deprecated Reactivity Transform (the `$ref` syntax), which was removed from core in 3.4.

## 3.4: faster compiler and defineModel

3.4 rewrote the template parser, making it about twice as fast, and refactored reactivity so a `computed` only triggers its effects when its value actually changes. Build times went down and many redundant re-renders went away without code changes.

The feature most people noticed is `defineModel`, which became stable:

```vue
<!-- Before: a prop plus an emit for every v-model -->
<script setup>
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <input :value="props.modelValue" @input="emit('update:modelValue', $event.target.value)" />
</template>

<!-- After -->
<script setup>
const model = defineModel();
</script>
<template>
  <input v-model="model" />
</template>
```

3.4 also added the same-name shorthand: `<img :src :alt>` means `:src="src" :alt="alt"`. Hydration mismatch errors for server-rendered apps became much more specific, and the `__VUE_PROD_HYDRATION_MISMATCH_DETAILS__` flag lets you keep those details in production.

## 3.5: less memory, fewer workarounds

3.5 changed no syntax, but it reworked the reactivity system again. The Vue team reported about 56% less memory use and much faster tracking of large, deeply reactive arrays. The developer-facing additions remove several common workarounds.

**Reactive props destructure is stable.** Destructured props stay reactive, and default values use normal JavaScript syntax instead of `withDefaults`:

```vue
<script setup lang="ts">
const { size = 'md', disabled = false } = defineProps<{
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}>();
// To watch a destructured prop, wrap it in a getter: watch(() => size, ...)
</script>
```

**`useTemplateRef()`** replaces the trick of declaring a `ref(null)` with the same name as the template `ref` attribute:

```vue
<script setup>
import { onMounted, useTemplateRef } from 'vue';
const input = useTemplateRef('search');
onMounted(() => input.value?.focus());
</script>
<template><input ref="search" /></template>
```

The other 3.5 additions are:

- **Lazy hydration.** `defineAsyncComponent` accepts a `hydrate` strategy (`hydrateOnVisible()`, `hydrateOnIdle()`, `hydrateOnInteraction('click')`, `hydrateOnMediaQuery(...)`), so server-rendered components below the fold can wait. This is the same idea as Astro's `client:visible`, but inside a Vue app.
- **`useId()`** for stable IDs that match between server and client, mostly for `label`/`aria-*` attributes.
- **`<Teleport defer>`**, which can target an element rendered later in the same tree.
- **`onWatcherCleanup()`** for cancelling a stale fetch inside a watcher, plus `pause()` and `resume()` on watchers and a numeric `deep` option for limiting traversal depth.
- **`data-allow-mismatch`** to silence an expected hydration mismatch, such as a timestamp.

## 3.6: alien-signals and Vapor Mode

3.6 has two separate parts.

**The reactivity core was rebuilt on [alien-signals](https://github.com/stackblitz/alien-signals).** The API (`ref`, `computed`, `watch`) is the same; it uses less memory and runs faster. Apps on 3.6 get this without opting in.

**Vapor Mode** is a new way of compiling single-file components. A Vapor component compiles to code that updates the DOM directly, with no virtual DOM. According to the 3.6 beta notes, it matches Solid and Svelte 5 in the [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark). It is opt-in per component, and only for `<script setup>`:

```vue
<script setup vapor>
import { ref } from 'vue';
const count = ref(0);
</script>
<template>
  <button @click="count++">{{ count }}</button>
</template>
```

You can use Vapor components in two ways:

- In a whole app created with `createVaporApp()`. This leaves the virtual DOM runtime out of the bundle entirely, which makes the baseline much smaller.
- Inside a normal `createApp()` app, by installing `vaporInteropPlugin`. You can then convert one hot page or widget at a time.

Vapor reached feature parity with the virtual DOM mode in 3.6.0-beta.1 (December 23, 2025). The exception is `<Suspense>`, which is not supported in Vapor-only apps. The release notes still describe Vapor as unstable. They recommend it for performance-sensitive parts of existing apps and for small new apps, not for converting a large app wholesale.

As of November 14, 2026, 3.6 is at rc.15, and 3.5.x is still what `npm install vue` gives you. I would try 3.6 on a branch now, but wait for 3.6.0 before shipping Vapor components.

## Upgrading code written in the 3.0–3.2 style

If a codebase was written early in Vue 3's life, these are the changes worth making, roughly in order of payoff:

1. **Move `setup()` components to `<script setup>`.** It is less code, and every later feature assumes it.
2. **Replace `modelValue` + `update:modelValue` pairs with `defineModel()`.**
3. **Replace `withDefaults` with destructured props** and plain default values.
4. **Replace same-named `ref(null)` template refs with `useTemplateRef()`.**
5. **Delete the second `<script>` block** that only sets `name` or `inheritAttrs`, and use `defineOptions()`.
6. **Make shared list and table components generic** instead of typing them as `any`.
7. **Use lazy hydration** for heavy, below-the-fold components in Nuxt or other SSR apps.
8. **Leave Vapor Mode for later.** Try it on one leaf component once 3.6.0 is stable.

None of these are breaking changes. Every Vue 3 minor release has kept 3.0 code working, which is a big part of why the move from Vue 2 is still the only migration most teams remember.

## More from this week

This is part of a series of posts from November 8 to 14, 2026:

- [Recording API Traffic in Chrome: HAR Files, the Recorder and Replaying It in Tests](/posts/tech/2026/recording_api_traffic_in_chrome/)
- [Vue 3 Frameworks in 2026, and What Changed in Astro](/posts/tech/2026/vue_frameworks_and_astro_in_2026/)
- [Static Recompilation: How Old Games (and Old Software) Become Native Apps](/posts/tech/2026/static_recompilation_games_and_software/)
- [AI Investing Research Systems: ai-berkshire and the Agents Built on Buffett](/posts/tech/2026/ai_investing_research_systems/)
- [AI in Fall 2026: Gated Frontier Models, Computer Use and a Stateless MCP](/posts/tech/2026/ai_advancements_fall_2026/)
- [What Changed in Claude Code in 2026](/posts/tech/2026/claude_code_changes_2026/)
