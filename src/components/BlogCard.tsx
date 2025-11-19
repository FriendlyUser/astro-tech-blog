import type { MarkdownInstance } from 'astro';
import { format } from 'date-fns';

// import type { IFrontmatter } from '../types/IFrontMatter';
import { Badge } from './Badge'; // Import the new Badge component

type IBlogCardProps = {
  instance: MarkdownInstance<any>;
};

const BlogCard = (props: IBlogCardProps) => (
  <a
    className="group hover:no-underline focus:no-underline"
    href={props.instance.url}
  >
    <div className="overflow-hidden rounded-md bg-slate-800 transition hover:-translate-y-1">
      <div className="aspect-h-2 aspect-w-3 relative">
        <img
          className="h-full w-full object-cover object-center"
          src={props.instance.frontmatter.imgSrc}
          alt={props.instance.frontmatter.imgAlt}
          loading="lazy"
        />
        {/* Example: Using Badge for category/tags on top of image */}
        {props.instance.frontmatter.tags && (
          <div className="absolute right-2 top-2 flex gap-2">
            {props.instance.frontmatter.tags.slice(0, 2).map((tag: string) => (
              <Badge key={tag} color="indigo">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="px-3 pb-6 pt-4">
        <h2 className="text-xl font-semibold transition-colors group-hover:text-indigo-400">
          {props.instance.frontmatter.title}
        </h2>

        <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
          <span>
            {format(
              new Date(props.instance.frontmatter.pubDate),
              'LLL d, yyyy'
            )}
          </span>
        </div>

        <div className="mt-2 text-sm text-gray-300">
          {props.instance.frontmatter.description}
        </div>
      </div>
    </div>
  </a>
);

export { BlogCard };
