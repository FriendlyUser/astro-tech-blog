import type { MarkdownInstance } from 'astro';

import { BlogGallery } from '@/components/BlogGallery';
// import type { IFrontmatter } from 'astro-boilerplate-components';
import { GradientText } from '@/components/GradientText';
import { Section } from '@/components/Section';

type IRecentPostsProps = {
  postList: MarkdownInstance<any>[];
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
