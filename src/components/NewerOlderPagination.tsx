// src/components/NewerOlderPagination.tsx

type IPageUrl = {
  prev?: string;
  next?: string;
};

// Minimal interface for the Astro Page object
type IPropPage = {
  url: IPageUrl;
};

type INewerOlderPaginationProps = {
  page: IPropPage;
};

const NewerOlderPagination = (props: INewerOlderPaginationProps) => (
  <div className="flex justify-center gap-8 font-medium text-gray-200">
    {props.page.url.prev && (
      <a
        href={props.page.url.prev}
        className="transition-colors hover:text-indigo-400 hover:underline"
      >
        ← Newer Posts
      </a>
    )}
    {props.page.url.next && (
      <a
        href={props.page.url.next}
        className="transition-colors hover:text-indigo-400 hover:underline"
      >
        Older Posts →
      </a>
    )}
  </div>
);

export { NewerOlderPagination };
