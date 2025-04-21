import { type Metadata } from "next";
import React from "react";

import { BlogIndexFetch } from "../../../../../../components/blog/BlogIndexFetch";
import { fetchBlogCounts } from "../../../../../../lib/sanity/queries/blogs/build-counts";
import { type ListBlogPostsParameters } from "../../../../../../lib/sanity/queries/blogs/list";
import {
  POSTS_PER_PAGE,
  createIndexMetadata,
} from "../../../../_helpers/metadata";

export const dynamic = "force-dynamic";

export type BlogTagIndexPageProps = {
  params: Promise<{
    tag: string;
    pageNumber: string;
  }>;
};

export async function generateMetadata(
  props: BlogTagIndexPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const tag = params.tag.toLowerCase();

  return createIndexMetadata({
    title: `Posts with the "${tag}" tag`,
    description: "",
    pageNumber: parseInt(params.pageNumber, 10),
    totalPostCount: (await fetchBlogCounts()).tags[tag] ?? 0,
    urlForPage: (pageNumber) => `/blog/by-category/${tag}/page/${pageNumber}`,
  });
}

export default async function BlogTagIndexPage(props: BlogTagIndexPageProps) {
  const params = await props.params;
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));
  const tag = params.tag.toLowerCase();

  const queryArgs: ListBlogPostsParameters = {
    offset: (pageNumber - 1) * POSTS_PER_PAGE,
    limit: POSTS_PER_PAGE,
    tag,
  };

  return (
    <BlogIndexFetch
      title={
        <>
          Posts with the <em>{tag}</em> tag
        </>
      }
      pageNumber={pageNumber}
      queryArgs={queryArgs}
      countsFetcher={(blogCounts) => blogCounts.tags[tag]}
      currentCountable={{ type: "tag", value: tag }}
      urlForPage={(pageNumber) => `/blog/by-tag/${tag}/page/${pageNumber}`}
    />
  );
}
