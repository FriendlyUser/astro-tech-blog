type INewerOlderPaginationProps = {
  page: any;
};

const NewerOlderPagination = (props: INewerOlderPaginationProps) => (
  <div className="flex justify-center gap-8">
    {props.page.url.prev && <a href={props.page.url.prev}>← Newer Posts</a>}
    {props.page.url.next && <a href={props.page.url.next}>Older Posts →</a>}
  </div>
);

export { NewerOlderPagination };
