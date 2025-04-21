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

export type BlogCategoryIndexPageProps = {
  params: Promise<{
    category: string;
    pageNumber: string;
  }>;
};

export async function generateMetadata(
  props: BlogCategoryIndexPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const category = params.category.toLowerCase();

  return createIndexMetadata({
    title: `Posts in the "${category}" category`,
    description: "",
    pageNumber: parseInt(params.pageNumber, 10),
    totalPostCount: (await fetchBlogCounts())?.categories[category]?.total ?? 0,
    urlForPage: (pageNumber) =>
      `/blog/by-category/${category}/page/${pageNumber}`,
  });
}

export default async function BlogCategoryIndexPage(
  props: BlogCategoryIndexPageProps,
) {
  const params = await props.params;
  const pageNumber = Math.max(1, parseInt(params.pageNumber, 10));
  const category = params.category.toLowerCase();

  const queryArgs: ListBlogPostsParameters = {
    offset: (pageNumber - 1) * POSTS_PER_PAGE,
    limit: POSTS_PER_PAGE,
    category,
  };

  return (
    <BlogIndexFetch
      title={
        <>
          Posts in the <em>{category}</em> category
        </>
      }
      pageNumber={pageNumber}
      queryArgs={queryArgs}
      countsFetcher={(blogCounts) => blogCounts.categories[category].total}
      currentCountable={{ type: "category", value: category }}
      urlForPage={(pageNumber) =>
        `/blog/by-category/${category}/page/${pageNumber}`
      }
    />
  );
}
