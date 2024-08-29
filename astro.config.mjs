import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';
import { rehypeShiki } from '@astrojs/markdown-remark'
import rehypeMermaid from 'rehype-mermaid'


// https://astro.build/config
export default defineConfig({
  // base: '.', // Set a path prefix.
  site: 'https://friendlyuser.github.io', // Use to generate your sitemap and canonical URLs in your final build.
  // Important!
  // base: '/astro-tech-blog',
  // Only official '@astrojs/*' integrations are currently supported by Astro.
  // Add 'experimental.integrations: true' to make 'astro-robots-txt' working
  // with 'astro build' command.

  markdown: {
    shikiConfig: {
      // Choose from Shiki's built-in themes (or add your own)
      // https://github.com/shikijs/shiki/blob/main/docs/themes.md
      theme: 'monokai',
    },
    rehypePlugins: [
      rehypeMermaid,
      rehypeShiki,
    ],
  },
  
  integrations: [react(), tailwind({}), sitemap(), robotsTxt()],
});
