import clsx from "clsx";
import Link from "next/link";
import React from "react";

import { shortDateStyle } from "../../lib/dates";
import {
  type BlogContent,
  type BlogShortContent,
} from "../../lib/sanity/queries/blogs/list";
import {
  blogPostUrl,
  blogCategoryListUrl,
  blogTagListUrl,
} from "../../lib/url-builders";
import { ArticleTitle } from "../ArticleTitle";

export type BlogBlurbProps = {
  blog: BlogShortContent | BlogContent;

  showCTA?: boolean;
};

export const BlogBlurb: React.FC<BlogBlurbProps> = (props) => {
  const { blog } = props;

  const tags = blog.tags ?? [];

  const tagUrls = tags.map((t) => t.slug);

  return (
    <article>
      <ArticleTitle title={blog.title} href={blogPostUrl(blog.slug)} />
      <div className="grid grid-cols-3 mt-2">
        <div className="col-span-2">
          <p>
            {blog.blurb}&nbsp;
            {props.showCTA ? (
              <Link
                href={blogPostUrl(blog.slug)}
                className="italic font-semibold"
              >
                read the post &raquo;
              </Link>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg">{shortDateStyle(blog.date)}</p>
          <p className="italic">
            <Link href={blogCategoryListUrl(blog.category.slug)}>
              {blog.category.slug}
            </Link>
          </p>
          <ul className="italic text-sm">
            {tags.map((tag, idx) => (
              <li key={idx} className="inline-block pl-2">
                <Link href={blogTagListUrl(tag.slug)} className="normal-link">
                  {tag.slug}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
};
