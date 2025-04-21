import React from "react";

import { type BlogContent } from "../../lib/sanity/queries/blogs/list";
import { LongFormContent } from "../long-form/LongFormContent";

import { BlogBlurb } from "./BlogBlurb";

export type BlogPostProps = {
  blog: BlogContent;
};

export const BlogPost: React.FC<BlogPostProps> = ({ blog }) => {
  return (
    <>
      <BlogBlurb blog={blog} />
      <hr className="my-4" />
      <LongFormContent content={blog.body} />
      <div className="long-form-content">
        <p className="text-right">&ndash;{blog.author.shortName}</p>
      </div>
    </>
  );
};
