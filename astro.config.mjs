import { defineConfig, memoryCache } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import { unified } from '@astrojs/markdown-remark';
import remarkDropLeadingH1 from './src/utils/remarkDropLeadingH1.mjs';
import { ADSENSE_CLIENT, GA4_ID, gtagInit } from './src/utils/analytics.mjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://friendlyuser.github.io';
const REPO = 'https://github.com/FriendlyUser/astro-tech-blog';

// AdSense on every Starlight page, plus Google Analytics 4 once GA4_ID is set.
const analyticsHead = [
  {
    tag: 'script',
    attrs: {
      async: true,
      src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
      crossorigin: 'anonymous',
    },
  },
  ...(GA4_ID
    ? [
        { tag: 'script', attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}` } },
        { tag: 'script', content: gtagInit },
      ]
    : []),
];

// Sitemap: <lastmod> from each post's pubDate, keyed by URL path.
const POSTS_DIR = fileURLToPath(new URL('./src/content/docs/posts/', import.meta.url));
function postDates() {
  const dates = new Map();
  const walk = (dir) => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.mdx?$/i.test(ent.name)) {
        const m = readFileSync(full, 'utf8').match(/^pubDate:\s*['"]?(.+?)['"]?\s*$/m);
        const d = m ? new Date(m[1]) : undefined;
        if (!d || Number.isNaN(d.valueOf())) continue;
        const rel = relative(POSTS_DIR, full).replace(/\\/g, '/').replace(/\.mdx?$/i, '');
        dates.set(`/posts/${rel}/`, d.toISOString());
      }
    }
  };
  walk(POSTS_DIR);
  return dates;
}
const POST_DATES = postDates();

// Kept out of the sitemap: tag pages (mostly one or two posts each; the /topics/ pages
// are the hubs) and the classic homepage.
const SITEMAP_EXCLUDE = [/\/tags\//, /\/old_site\/$/];

// https://astro.build/config
export default defineConfig({
  site: SITE,
  markdown: {
    processor: unified(),
    remarkPlugins: [remarkDropLeadingH1],
  },
  vite: { plugins: [tailwindcss()] },
  cache: {
    provider: memoryCache(),
  },
  integrations: [
    // mermaid must come before starlight so diagrams are handled before Expressive Code.
    mermaid({
      theme: 'forest',
      autoTheme: true,
    }),
    starlight({
      title: 'FriendlyUser',
      description:
        'Software development tutorials, experiments and notes by David Li: Python, Rust, Go, JavaScript, AI, DevOps and investing tools.',
      favicon: '/favicon.ico',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/FriendlyUser' },
        { icon: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/david-l-b1671a10b/' },
        { icon: 'rss', label: 'RSS', href: '/rss.xml' },
      ],
      components: {
        Header: './src/components/starlight/Header.astro',
        SiteTitle: './src/components/starlight/SiteTitle.astro',
        Sidebar: './src/components/starlight/Sidebar.astro',
        PageTitle: './src/components/starlight/PageTitle.astro',
        Footer: './src/components/starlight/Footer.astro',
        Head: './src/components/starlight/Head.astro',
      },
      customCss: ['./src/styles/starlight.css'],
      head: analyticsHead,
      editLink: { baseUrl: `${REPO}/edit/main/` },
      // The custom Sidebar builds its own navigation from the blog index; this keeps
      // Starlight from autogenerating a 555-link sidebar for every page.
      sidebar: [{ label: 'All posts', link: '/posts/' }],
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      expressiveCode: {
        shiki: {
          // Map the ad-hoc fence labels used across the posts onto bundled grammars.
          langAlias: {
            dotnet: 'csharp',
            'c#': 'csharp',
            golang: 'go',
            sh: 'bash',
            console: 'bash',
            ps1: 'powershell',
            Javascript: 'javascript',
            Dockerfile: 'docker',
            gradle: 'groovy',
            svg: 'xml',
            ejs: 'html',
            srt: 'plaintext',
            swig: 'plaintext',
            gcss: 'plaintext',
            gmk: 'plaintext',
            thrift: 'plaintext',
          },
        },
      },
    }),
    react(),
    sitemap({
      filter: (page) => !SITEMAP_EXCLUDE.some((re) => re.test(page)),
      serialize(item) {
        let path = new URL(item.url).pathname;
        try {
          path = decodeURI(path);
        } catch {}
        const lastmod = POST_DATES.get(path);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
