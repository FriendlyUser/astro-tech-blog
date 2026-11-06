import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

/**
 * Blog posts live in src/content/docs/posts and are rendered by Starlight.
 *
 * `generateId` keeps the file path exactly (case, apostrophes, `++` and all), so every
 * post keeps the URL it had when posts were pages under src/pages/posts:
 *   src/content/docs/posts/tech/2023/Rust's_Traits.md -> /posts/tech/2023/Rust's_Traits/
 * (Starlight's default would slugify and lowercase these, breaking existing links.)
 */
const keepPath = ({ entry }: { entry: string }) => entry.replace(/\.(md|mdx)$/i, '').replace(/\/index$/, '');

const optionalDate = z.preprocess((v) => {
  if (v == null || v === '') return undefined;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.valueOf()) ? undefined : d;
}, z.date().optional());

const tagList = z.preprocess(
  (v) => (v == null ? [] : Array.isArray(v) ? v.map(String) : String(v).split(',').map((t) => t.trim())),
  z.array(z.string()).default([])
);

export const collections = {
  docs: defineCollection({
    loader: docsLoader({ generateId: keepPath }),
    schema: docsSchema({
      extend: z.object({
        pubDate: optionalDate,
        tags: tagList,
        imgSrc: z.string().optional(),
        imgAlt: z.string().optional(),
        alt: z.string().optional(),
      }),
    }),
  }),
};
