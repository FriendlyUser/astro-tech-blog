// src/components/PaginationHeader.tsx

type IPaginationHeaderProps = {
  title: string;
  description: string;
};

const PaginationHeader = (props: IPaginationHeaderProps) => (
  <div className="text-center">
    <h1 className="text-3xl font-bold text-gray-100">{props.title}</h1>

    <div className="mt-3 text-gray-200">{props.description}</div>
  </div>
);

export { PaginationHeader };
