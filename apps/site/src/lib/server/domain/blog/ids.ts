import { createRichIdUtils, type RichId } from "../../utils/rich-id.js";

export type BlogPostId = RichId<"blog">;
export const BlogPostIds = createRichIdUtils("blog");

export type BlogPostRevisionId = RichId<"blog_rev">;
export const BlogPostRevisionIds = createRichIdUtils("blog_rev");

export type BlogPostCategoryId = RichId<"blog_cat">;
export const BlogPostCategoryIds = createRichIdUtils("blog_cat");

export type BlogPostTagId = RichId<"blog_tag">;
export const BlogPostTagIds = createRichIdUtils("blog_tag");
