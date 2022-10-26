import type { IFrontmatter } from 'astro-boilerplate-components';
import { ColorTags, Section, Tags } from 'astro-boilerplate-components';
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
        <h1 className="text-center text-3xl font-bold">
          {props?.frontmatter.title}
        </h1>
        <div className="mt-2 text-center text-sm text-gray-400">
          By {AppConfig?.author} on {props?.frontmatter?.pubDate}
        </div>
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
        <div className="mx-auto mt-5 max-w-prose">
          <div className="aspect-w-3 aspect-h-2">
            <img
              className="h-full w-full rounded-lg object-cover object-center"
              src={props?.frontmatter.imgSrc}
              alt={props?.frontmatter.imgAlt}
              loading="lazy"
            />
          </div>

          <div className="prose prose-invert mt-8 prose-img:rounded-lg">
            {props.children}
          </div>
        </div>
      </div>
    </main>
  </Section>
);

export { BlogPost };
