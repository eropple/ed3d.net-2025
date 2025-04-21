import React from "react";

export type BlogIndexPagerProps = {
  pageNumber: number;
  lastPage: number;
  urlForPage: (pageNumber: number) => string;
};

export const BlogIndexPager: React.FC<BlogIndexPagerProps> = (props) => {
  return (
    <div className="grid grid-cols-3 py-2 italic">
      <div className="col-span-1 text-left">
        {props.pageNumber > 1 ? (
          <a
            href={props.urlForPage(props.pageNumber - 1)}
            className="underline"
          >
            &laquo; previous
          </a>
        ) : null}
      </div>
      <div className="col-span-1 text-center">
        <h2>
          Page {props.pageNumber} of {props.lastPage}{" "}
        </h2>
      </div>
      <div className="col-span-1 text-right">
        {props.pageNumber < props.lastPage ? (
          <a
            href={props.urlForPage(props.pageNumber + 1)}
            className="underline"
          >
            next &raquo;
          </a>
        ) : null}
      </div>
    </div>
  );
};
