import { defineConfig, memoryCache } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import mermaid from 'astro-mermaid';
import { unified } from '@astrojs/markdown-remark';
import remarkDropLeadingH1 from './src/utils/remarkDropLeadingH1.mjs';

const SITE = 'https://friendlyuser.github.io';
const REPO = 'https://github.com/FriendlyUser/astro-tech-blog';

// Same Google Analytics / AdSense tags the blog pages always had.
const analyticsHead = [
  {
    tag: 'script',
    attrs: {
      async: true,
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2479144310234386',
      crossorigin: 'anonymous',
    },
  },
  { tag: 'script', attrs: { async: true, src: 'https://www.googletagmanager.com/gtag/js?id=UA-119155027-6' } },
  {
    tag: 'script',
    content:
      "window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'UA-119155027-6');",
  },
];

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
      customPages: [`${SITE}/ads.txt`],
    }),
  ],
});
