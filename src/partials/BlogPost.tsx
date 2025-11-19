import type { ReactNode } from 'react';

import { Section } from '@/components/Section';
import { ColorTags, Tags } from '@/components/Tags';
import { AppConfig } from '@/utils/AppConfig';

// export interface CustomIFrontMatter extends IFrontmatter {
//   tags: string[];
//   projects?: any[];
// }
type IBlogPostProps = {
  frontmatter: any;
  children: ReactNode;
};

const BlogPost = (props: IBlogPostProps) => (
  <Section key={props.frontmatter.title}>
    <div>
      <h1 className="text-center text-3xl font-bold">
        {props?.frontmatter.title}
      </h1>
      <div className="mt-2 text-center text-sm text-gray-400">
        By {AppConfig?.author} on {props?.frontmatter?.pubDate}
      </div>
      <div className="flex place-content-center pt-2">
        {props?.frontmatter?.tags?.map((tag) => {
          let color;
          if (['python', 'strapi'].includes(tag)) {
            color = ColorTags.GREEN;
          }
          if (['dash', 'plotly'].includes(tag)) {
            color = ColorTags.BLUE;
          }
          if (tag === 'vuepress') {
            color = ColorTags.FUCHSIA;
          }
          if (tag === 'openapi') {
            color = ColorTags.LIME;
          }
          if (['flutter', 'remotion', 'dart'].includes(tag)) {
            color = ColorTags.SKY;
          }
          if (['golang'].includes(tag)) {
            color = ColorTags.ORANGE;
          }
          if (['javascript', 'strapi'].includes(tag)) {
            color = ColorTags.EMERALD;
          }
          if (['git', 'docker'].includes(tag)) {
            color = ColorTags.ZINC;
          }
          if (['react', 'nextjs', 'astro', 'alfred'].includes(tag)) {
            color = ColorTags.RED;
          }
          if (!color) {
            color = ColorTags.CYAN;
          }
          return (
            <>
              <Tags color={color}>
                {' '}
                <a href={`/tags/${tag}`} style={{ paddingRight: '3px' }}>
                  {' '}
                  <category>{tag} </category>
                </a>
              </Tags>
              &nbsp;
            </>
          );
        })}
      </div>
      <div className="mx-auto mt-5 max-w-prose">
        <div className="aspect-h-2 aspect-w-3">
          <img
            className="h-full w-full rounded-lg object-cover object-center"
            src={props?.frontmatter.imgSrc}
            alt={props?.frontmatter.imgAlt}
            loading="lazy"
          />
        </div>

        <div className="prose prose-invert mt-8 prose-img:rounded-lg">
          <content>{props.children}</content>
        </div>
      </div>
    </div>
  </Section>
);

export { BlogPost };
