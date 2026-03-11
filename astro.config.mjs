import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from "@tailwindcss/vite";
import { rehypeShiki } from '@astrojs/markdown-remark'
// import rehypeMermaid from 'rehype-mermaid'


// https://astro.build/config
export default defineConfig({
  base: '.', // Set a path prefix.
  site: 'https://friendlyuser.github.io', // Use to generate your sitemap and canonical URLs in your final build.


  markdown: {
    shikiConfig: {
      // Choose from Shiki's built-in themes (or add your own)
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      theme: 'monokai',
    },
    rehypePlugins: [
      // rehypeMermaid,
      rehypeShiki,
    ],
  },
  vite: { plugins: [tailwindcss()]},
  // sitemap(), 
  integrations: [react(), sitemap()]
});
