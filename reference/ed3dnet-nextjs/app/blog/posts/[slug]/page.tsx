import { type Metadata } from "next";
import React from "react";

import {
  BlogPostFetch,
  fetchPostPageMetadata,
} from "../../../../components/blog/BlogPostFetch";

export const dynamic = "force-dynamic";

export type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(
  props: BlogPostPageProps,
): Promise<Metadata> {
  const params = await props.params;
  return fetchPostPageMetadata({
    slug: params.slug,
  });
}

export default async function BlogPostPage(props: BlogPostPageProps) {
  const params = await props.params;
  return (
    <div>
      <BlogPostFetch slug={params.slug} />
      <hr className="my-4" />
      <p className="text-center italic">
        <a href="/blog">back to the blog index</a>
      </p>
    </div>
  );
}
