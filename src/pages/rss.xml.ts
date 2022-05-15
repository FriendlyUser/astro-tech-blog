import rss from '@astrojs/rss';
const postImportResult = import.meta.globEager('./posts/**/*.md');
const posts = Object.values(postImportResult);
export const get = () => rss({
    // `<title>` field in output xml
    title: 'Personal Blog',
    // `<description>` field in output xml
    description: 'Technical Blog for my personal projects',
    // base URL for RSS <item> links
    // SITE will use "site" from your project's astro.config.
    site: "https://friendlyuser.github.io",
    // list of `<item>`s in output xml
    // simple example: generate items for every md file in /src/pages
    // see "Generating items" section for required frontmatter and advanced use cases
    items: posts.map((post) => ({
        link: post.url,
        title: post.frontmatter.title,
        pubDate: post.frontmatter.pubDate,
      })),
    // (optional) inject custom xml
    customData: `<language>en-us</language>`,
  });