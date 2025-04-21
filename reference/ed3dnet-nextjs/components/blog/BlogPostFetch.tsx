"use server";

import { type Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

import { defaultMetadata } from "../../app/metadata";
import { SITE_NAME } from "../../lib/constants";
import { getBlogPost } from "../../lib/sanity/queries/blogs/get";

import { BlogPost } from "./BlogPost";

export type BlogPostFetchProps = {
  slug: string;
};

export async function fetchPostPageMetadata(
  props: BlogPostFetchProps,
): Promise<Metadata> {
  const blogPost = await getBlogPost(props);

  if (!blogPost) {
    return notFound();
  }

  const title = `${blogPost.title} | ${SITE_NAME}`;

  return {
    ...defaultMetadata(),
    title,
    description: blogPost.blurb,
    openGraph: {
      title: blogPost.title,
      siteName: SITE_NAME,
      description: blogPost.blurb,
      images: [],
      publishedTime: new Date(blogPost.date).toISOString(),
    },
    twitter: {
      card: "summary",
      site: SITE_NAME,
      creator: "@edropple",
      title: blogPost.title,
      description: blogPost.blurb,
    },
  };
}

export const BlogPostFetch = async (props: BlogPostFetchProps) => {
  const blogPost = await getBlogPost(props);

  if (!blogPost) {
    return notFound();
  }

  return <BlogPost blog={blogPost} />;
};
