// import type { CustomIFrontMatter } from '@/partials/BlogPost';

export const sortByDate = (posts: any[]) => {
  return posts.sort(
    (a, b) =>
      new Date(b.frontmatter.pubDate).valueOf() -
      new Date(a.frontmatter.pubDate).valueOf()
  );
};
