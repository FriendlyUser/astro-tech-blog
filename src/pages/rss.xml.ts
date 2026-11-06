import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { AppConfig } from '@/utils/AppConfig';
import { getBlogIndex } from '@/utils/blogIndex';

// Astro 7 endpoints export uppercase method handlers (the old `get` export no longer ran).
export async function GET(context: APIContext) {
  const { posts } = await getBlogIndex();
  return rss({
    title: AppConfig.site_name,
    description: AppConfig.description,
    site: context.site ?? 'https://friendlyuser.github.io',
    items: posts.map((p) => ({
      title: p.title,
      description: p.description,
      pubDate: p.date,
      link: p.url,
      categories: p.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
