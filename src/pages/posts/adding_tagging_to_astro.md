---
title: How to add
description: My Thoughts on what todo with jcenter/bintray going down.
alt: Tagging in Astro
setup: |
  import Layout from '../../layouts/BlogPost.astro'
  import Cool from '../../components/Author.astro'
pubDate: Wed, 15 Dec 2021 13:00:00 GMT
tags: ["astro"]
---

# Summary

While adding tags to my personal blog, I was surprised at how easy it is. For each individual post, I have noticed how easy it is. To start, add the tag to each individual blog post in markdown, this is similar to how other frameworks like hugo academic expect posts to be tagged.


```yaml
title: How to add tags to astro
description: My Thoughts on what todo with jcenter/bintray going down.
alt: Tagging in Astro 
pubDate: Sat, 26 June 2022 13:00:00 GMT
tags: ["astro"]
```

Afterwards, for the astro component that render the page, you can extract the prop passed in.


```
const {content} = Astro.props;
const {title, description, publishDate, author, heroImage, permalink, alt, tags} = content;
```

Tags will be an array of strings.

In order to render the tags, you can loop through an array and display different colours based on the tags.

```jsx
{tags?.map(tag => {
    let color = "";
    if (tag === "python") {
        color = "green";
    } 
    if (tag === "dash" ) {
        color = "blue"
    }
    if (tag === "vuepress") {
        color = "purple"
    }
    if (tag === "openapi") {
        color = "yellow"
    }
    if (!color) {
        color = "black"
    }
    const className = `bg-${color}-100 text-${color}-800 text-sm font-medium mr-2 px-2.5 py-0.5 rounded dark:bg-${color}-200 dark:text-${color}-800`
    return (
    <span class={className}><p href={`/tags/${tag}`}>{tag}</p></span>
    )
})}
```

In my case I am using tailwind to display different labels, but anything will do.

After this step, tags should be displayed on your posts and during the preview for your posts.

However, its common to want to see all posts in a particular category.

For static site generators like next.js and astro, you have to define all the paths in a dynamic route.

So we need to grab all the posts and all the unique tags. Then get all the posts with the tag corresponding to that particular route. Sample code provided below.

```jsx
const allPosts = await Astro.glob('../posts/*.md');

export async function getStaticPaths() {
  const allPosts = await Astro.glob('../posts/*.md');
  // get all tags
  const tags = allPosts.map(post => {
    const tags = post.frontmatter.tags;
    return tags;
  }).reduce((acc, val) => acc.concat(val), []);

  // get unique tags
  const uniqueTags = [...new Set(tags)];
  // map to params
  const paths = uniqueTags.map(tag => {
    return {
      params: {
        tag
      }
    }
  });
  return paths;
}

const { tag } = Astro.params;

// filter pages by tag
const posts = allPosts.filter(post => {
  const tags = post.frontmatter.tags;
  return tags.includes(tag);
}).sort((a, b) => {
  return new Date(b.frontmatter.date) - new Date(a.frontmatter.date);
}).filter(post => post !== null);
```

Hopefully this post gives you an idea on how to implement a tagging system in astro.

TODO
* figure out how to have tag specific rss feeds, dont think this is easily possible at the moment.