import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';

import react from "@astrojs/react";
import vue from "@astrojs/vue";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  integrations: [preact(), react(), vue(), tailwind(), sitemap()],
  build: {
    site: "https://friendlyuser.github.io"
  },
});
