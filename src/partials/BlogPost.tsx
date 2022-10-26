import type { IFrontmatter } from 'astro-boilerplate-components';
import {
  ColorTags,
  PostContent,
  PostHeader,
  Section,
  Tags,
} from 'astro-boilerplate-components';
import type { ReactNode } from 'react';

import { AppConfig } from '@/utils/AppConfig';

export interface CustomIFrontMatter extends IFrontmatter {
  tags: string[];
}
type IBlogPostProps = {
  frontmatter: CustomIFrontMatter;
  children: ReactNode;
};

const BlogPost = (props: IBlogPostProps) => (
  <Section>
    <main>
      <div>
        <PostHeader content={props?.frontmatter} author={AppConfig?.author} />
        <div className="flex place-content-center pt-2">
          {props?.frontmatter?.tags?.map((tag) => {
            let color;
            if (tag === 'python') {
              color = ColorTags.GREEN;
            }
            if (tag === 'dash') {
              color = ColorTags.BLUE;
            }
            if (tag === 'vuepress') {
              color = ColorTags.FUCHSIA;
            }
            if (tag === 'openapi') {
              color = ColorTags.LIME;
            }
            if (tag === 'flutter') {
              color = ColorTags.SKY;
            }
            if (!color) {
              color = ColorTags.CYAN;
            }
            return (
              <div>
                <Tags color={color}>
                  {' '}
                  <a href={`/tags/${tag}`}>{tag} </a>
                </Tags>
              </div>
            );
          })}
        </div>
        <PostContent content={props?.frontmatter}>{props.children}</PostContent>
      </div>
    </main>
  </Section>
);

export { BlogPost };
