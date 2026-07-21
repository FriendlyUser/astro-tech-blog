import { defineConfig, memoryCache } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from "@tailwindcss/vite";
import mermaid from 'astro-mermaid';
import { unified } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
  // base: '.', // Set a path prefix.
  site: 'https://friendlyuser.github.io', // Use to generate your sitemap and canonical URLs in your final build.


  markdown: {
    shikiConfig: {
      // Choose from Shiki's built-in themes (or add your own)
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      theme: 'monokai',
    },
    processor: unified(),
  },
  vite: { plugins: [tailwindcss()]},
  cache: {
    provider: memoryCache(),
  },
  // sitemap(), 
  integrations: [
    react(), 
    sitemap({
      // Change the full URL to a relative path
      customPages: ['/ads.txt'],
    }),
    mermaid({
      theme: 'forest',
      autoTheme: true
    })
  ]
});
