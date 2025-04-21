import { notFound } from "next/navigation";
import React, { type JSX } from "react";

import { POSTS_PER_PAGE } from "../../app/blog/_helpers/metadata";
import {
  type BlogCountsRollup,
  fetchBlogCounts,
} from "../../lib/sanity/queries/blogs/build-counts";
import {
  type ListBlogPostsParameters,
  listBlogPosts,
} from "../../lib/sanity/queries/blogs/list";
import { PageTitle } from "../typography/PageTitle";

import { BlogBlurbList } from "./BlogBlurbList";
import { BlogCountsFetch } from "./BlogCountsFetch";
import { BlogIndexPager } from "./BlogIndexPager";

export type BlogIndexFetchProps = {
  title: JSX.Element;
  pageNumber: number;
  queryArgs: Omit<ListBlogPostsParameters, "offset" | "limit">;
  currentCountable: { type: string; value: string };
  countsFetcher: (blogCounts: BlogCountsRollup) => number;
  urlForPage: (pageNumber: number) => string;
};

export const BlogIndexFetch = async (props: BlogIndexFetchProps) => {
  const { pageNumber, currentCountable } = props;

  const [blogPosts, blogCounts] = await Promise.all([
    listBlogPosts({
      ...props.queryArgs,
      offset: (pageNumber - 1) * POSTS_PER_PAGE,
      limit: POSTS_PER_PAGE,
    }),
    fetchBlogCounts(),
  ]);

  if (blogPosts.length === 0) {
    return notFound();
  }

  let totalCount: number;
  if (currentCountable.type === "all") {
    totalCount = blogCounts.all;
  } else if (currentCountable.type === "tag") {
    totalCount = blogCounts.tags[currentCountable.value];
  } else if (currentCountable.type === "category") {
    totalCount = blogCounts.categories[currentCountable.value].total;
  } else if (currentCountable.type === "date") {
    totalCount = blogCounts.byMonths[currentCountable.value];
  } else {
    throw new Error(`Unknown countable type: ${currentCountable.type}`);
  }

  const lastPage = Math.ceil(props.countsFetcher(blogCounts) / POSTS_PER_PAGE);

  return (
    <>
      <PageTitle>{props.title}</PageTitle>
      <div className="md:grid md:grid-cols-3 lg:grid-cols-4 md:gap-8">
        <div className="md:col-span-2 lg:col-span-3 gap-8">
          <BlogIndexPager
            pageNumber={pageNumber}
            lastPage={lastPage}
            urlForPage={props.urlForPage}
          />
          <BlogBlurbList blogPosts={blogPosts} />
        </div>
        <div className="invisible md:visible">
          <BlogCountsFetch current={props.currentCountable} />
        </div>
      </div>
    </>
  );
};
