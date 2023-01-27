import type { CollectionEntry } from 'astro:content';
import { format } from 'date-fns';

type IBlogCardProps = {
  instance: CollectionEntry<'blog'>;
};

const BlogCard = (props: IBlogCardProps) => (
  <a className="hover:translate-y-1" href={props.instance.slug}>
    <div className="overflow-hidden rounded-md bg-slate-800">
      <div className="aspect-w-3 aspect-h-2">
        <img
          className="h-full w-full object-cover object-center"
          src={props.instance.data.imgSrc}
          alt={props.instance.data.alt}
          loading="lazy"
        />
      </div>

      <div className="px-3 pt-4 pb-6 text-center">
        <h2 className="text-xl font-semibold">{props.instance.data.title}</h2>

        <div className="mt-1 text-xs text-gray-400">
          {format(new Date(props.instance.data.pubDate), 'LLL d, yyyy')}
        </div>

        <div className="mt-2 text-sm">{props.instance.data.description}</div>
      </div>
    </div>
  </a>
);

export { BlogCard };
