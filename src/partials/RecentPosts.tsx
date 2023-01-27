import type { CollectionEntry } from 'astro:content';
import { GradientText, Section } from 'astro-boilerplate-components';

import { BlogGallery } from './BlogGalleryWithTags';

type IRecentPostsProps = {
  postList: CollectionEntry<'blog'>[];
};

const RecentPosts = (props: IRecentPostsProps) => (
  <Section
    title={
      <div className="flex items-baseline justify-between">
        <div>
          Recent <GradientText>Posts</GradientText>
        </div>

        <div className="text-sm">
          <a href="/posts">View all Posts →</a>
        </div>
      </div>
    }
  >
    <BlogGallery postList={props.postList} />
  </Section>
);

export { RecentPosts };
