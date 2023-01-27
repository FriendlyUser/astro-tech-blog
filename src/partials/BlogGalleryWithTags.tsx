import type { Page } from 'astro';
import type { CollectionEntry } from 'astro:content';

import { BlogCard } from './BlogCard';

type IRecentPostsProps = {
  postList: Page<CollectionEntry<'blog'>> | CollectionEntry<'blog'>[];
};
function isPage(
  postList: Page<CollectionEntry<'blog'>> | CollectionEntry<'blog'>[]
): pet is CollectionEntry<'blog'>[] {
  return (postList as Page<CollectionEntry<'blog'>>).currentPage !== undefined;
}

const BlogGallery = (props: IRecentPostsProps) => {
  if (!isPage(props.postList)) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {props.postList.map((elt) => (
          <BlogCard key={elt.slug} instance={elt} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {props.postList.data.map((elt) => (
        <BlogCard key={elt.slug} instance={elt} />
      ))}
    </div>
  );
};

export { BlogGallery };
