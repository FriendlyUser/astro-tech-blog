---
tags: ['jsx', 'vue']
title: Building a Caesar cipher component in Vue 3
description: A small Vue 3 single-file component that encrypts and decrypts text with a Caesar shift, including handling negative and large shift values.
pubDate: Fri, 4 April 2024
lastUpdated: 2026-11-14
layout: "@/templates/BasePost.astro"
imgSrc: /imgs/2023/358691897-blank-card-on-brown-table.webp
---

A Caesar cipher replaces each letter with the letter a fixed number of positions further along the alphabet. With a shift of 3, `A` becomes `D`, `B` becomes `E`, and `Z` wraps around to `C`. Suetonius records Julius Caesar using a shift of 3, which is where the name comes from.

It offers no real security: there are only 25 useful keys, so you can try them all by hand. It is still a good small exercise for string handling and for building a Vue component with two-way binding.

## The shift function

Keep the cipher logic in a plain function so it can be tested outside Vue. Decrypting is just shifting by the negative amount, so one function covers both directions.

```js
function shiftText(text, amount) {
  // Normalise to 0–25 so negative shifts, shifts over 26 and empty input all work
  const k = ((Math.trunc(Number(amount) || 0) % 26) + 26) % 26;

  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= 'Z' ? 65 : 97; // 'A' or 'a'
    return String.fromCharCode(((ch.charCodeAt(0) - base + k) % 26) + base);
  });
}

shiftText('Hello, World!', 3);  // 'Khoor, Zruog!'
shiftText('Khoor, Zruog!', -3); // 'Hello, World!'
```

The `((x % 26) + 26) % 26` step matters. In JavaScript `%` keeps the sign of the left operand, so `-3 % 26` is `-3`. Without the normalisation a negative shift produces character codes below `A` and you get punctuation instead of letters.

## The component

This is a Vue 3 single-file component using `<script setup>`. The message is encrypted or decrypted in place, so pressing **Encrypt** and then **Decrypt** with the same shift gets you back the original text.

```vue
<script setup>
import { ref } from 'vue';

const message = ref('');
const shift = ref(3);

function shiftText(text, amount) {
  const k = ((Math.trunc(Number(amount) || 0) % 26) + 26) % 26;
  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + k) % 26) + base);
  });
}

function encrypt() {
  message.value = shiftText(message.value, shift.value);
}

function decrypt() {
  message.value = shiftText(message.value, -shift.value);
}
</script>

<template>
  <div>
    <input v-model="message" type="text" placeholder="Enter message" />
    <input v-model.number="shift" type="number" placeholder="Shift" />
    <button @click="encrypt">Encrypt</button>
    <button @click="decrypt">Decrypt</button>
    <p>Result: {{ message }}</p>
  </div>
</template>
```

`v-model.number` converts the shift input to a number, but it gives you an empty string when the field is cleared. The `Number(amount) || 0` in `shiftText` treats that as a shift of 0 instead of producing `NaN` characters.

## Gotchas

- Only the ASCII letters `A–Z` and `a–z` are shifted. Accented letters, digits and punctuation pass through unchanged.
- A shift of 13 (ROT13) is its own inverse: encrypting twice returns the original text.
- If you prefer the Options API, the same `shiftText` function works as a method. The original version of this post used `data()` and `methods` and had the negative-shift bug described above.

## Further reading

- [Vue `<script setup>`](https://vuejs.org/api/sfc-script-setup.html)
- [Vue form input bindings and `v-model` modifiers](https://vuejs.org/guide/essentials/forms.html#modifiers)
