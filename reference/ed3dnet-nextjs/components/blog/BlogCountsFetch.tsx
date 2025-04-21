"use server";

import React from "react";

import { fetchBlogCounts } from "../../lib/sanity/queries/blogs/build-counts";

import { BlogCounts, type BlogIndexProps } from "./BlogCounts";

export type BlogIndexFetchProps = Omit<BlogIndexProps, "rollup"> & {};

export const BlogCountsFetch = async (props: BlogIndexFetchProps) => {
  const rollup = await fetchBlogCounts();

  return <BlogCounts {...props} rollup={rollup} />;
};
