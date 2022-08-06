import type { MarkdownInstance } from 'astro-boilerplate-components';

import type { CustomIFrontMatter } from '@/partials/BlogPost';

export const sortByDate = (posts: MarkdownInstance<CustomIFrontMatter>[]) => {
  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.pubDate).valueOf() -
      new Date(a.frontmatter.pubDate).valueOf()
  );
};
