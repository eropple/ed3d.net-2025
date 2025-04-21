import { type Metadata } from "next";
import React from "react";

import { BlogIndexFetch } from "../../../../components/blog/BlogIndexFetch";
import { fetchBlogCounts } from "../../../../lib/sanity/queries/blogs/build-counts";
import { type ListBlogPostsParameters } from "../../../../lib/sanity/queries/blogs/list";
import { POSTS_PER_PAGE, createIndexMetadata } from "../../_helpers/metadata";

export const dynamic = "force-dynamic";

export type BlogIndexPageProps = {
  params: Promise<{
    pageNumber: string;
  }>;
};

export async function generateMetadata(
  props: BlogIndexPageProps,
): Promise<Metadata> {
  const params = await props.params;
  return createIndexMetadata({
    title: "All posts",
    description: "",
    pageNumber: parseInt(params.pageNumber, 10),
    totalPostCount: (await fetchBlogCounts()).all,
    urlForPage: (pageNumber) => `/blog/page/${pageNumber}`,
  });
}

export default async function BlogIndexPage(props: BlogIndexPageProps) {
  const params = await props.params;
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));

  const queryArgs: ListBlogPostsParameters = {
    offset: (pageNumber - 1) * POSTS_PER_PAGE,
    limit: POSTS_PER_PAGE,
  };

  return (
    <BlogIndexFetch
      title={<>All posts</>}
      pageNumber={pageNumber}
      queryArgs={queryArgs}
      countsFetcher={(blogCounts) => blogCounts.all}
      currentCountable={{ type: "all", value: "" }}
      urlForPage={(pageNumber) => `/blog/page/${pageNumber}`}
    />
  );
}
