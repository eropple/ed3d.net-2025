import React from "react";

import {
  type BlogContent,
  type BlogShortContent,
} from "../../lib/sanity/queries/blogs/list";

import { BlogBlurb } from "./BlogBlurb";

export type BlogBlurbListProps = {
  blogPosts: ReadonlyArray<BlogContent | BlogShortContent>;
};

export const BlogBlurbList: React.FC<BlogBlurbListProps> = ({
  blogPosts,
}: BlogBlurbListProps) => {
  return (
    <>
      {blogPosts.flatMap((blogPost, idx) => [
        idx === 0 ? null : <hr key={`d${idx}`} className="my-8" />,
        <BlogBlurb key={idx} showCTA blog={blogPost} />,
      ])}
    </>
  );
};
