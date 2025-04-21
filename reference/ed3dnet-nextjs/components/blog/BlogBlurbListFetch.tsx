"use server";

import React from "react";

import {
  type ListBlogPostsParameters,
  listBlogPosts,
} from "../../lib/sanity/queries/blogs/list";

import { BlogBlurbList } from "./BlogBlurbList";

export type BlogListProps = ListBlogPostsParameters;

export const BlogBlurbListFetch = async (props: BlogListProps) => {
  const blogPosts = await listBlogPosts(props);

  return <BlogBlurbList blogPosts={blogPosts} />;
};
