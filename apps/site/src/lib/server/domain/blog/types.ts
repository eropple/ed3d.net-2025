import { Type, type Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

import { TextEnvelopeBlurb, TextEnvelopeLongform, Tiptap2TextEnvelope } from "../text/types.js";
import { UserPublic } from "../users/types.js";

import { BlogPostCategoryIds, BlogPostIds, BlogPostTagIds } from "./ids.js";

/**
 * Basic blog post category information
 */
export const BlogPostCategory = Type.Object({
  __type: Type.Literal("BlogPostCategory"),
  categoryId: BlogPostCategoryIds.TRichId,
  name: Type.String(),
  slug: Type.String(),
});

export type BlogPostCategory = Static<typeof BlogPostCategory>;
export const BlogPostCategoryChecker = TypeCompiler.Compile(BlogPostCategory);

/**
 * Basic blog post tag information
 */
export const BlogPostTag = Type.Object({
  __type: Type.Literal("BlogPostTag"),
  tagId: BlogPostTagIds.TRichId,
  slug: Type.String(),
});

export type BlogPostTag = Static<typeof BlogPostTag>;
export const BlogPostTagChecker = TypeCompiler.Compile(BlogPostTag);

/**
 * Blog post content revision
 */
export const BlogPostRevision = Type.Object({
  __type: Type.Literal("BlogPostRevision"),
  revisionId: Type.String({ format: "uuid" }),
  createdAt: Type.Number(),
  creator: UserPublic,
  content: TextEnvelopeLongform,
});

export type BlogPostRevision = Static<typeof BlogPostRevision>;
export const BlogPostRevisionChecker = TypeCompiler.Compile(BlogPostRevision);

/**
 * Brief blog post information for listings
 */
export const BlogPostBrief = Type.Object({
  __type: Type.Literal("BlogPostBrief"),
  postId: BlogPostIds.TRichId,
  slug: Type.String(),
  title: Type.String(),
  description: TextEnvelopeBlurb,
  author: UserPublic,
  categories: Type.Array(BlogPostCategory),
  tags: Type.Array(BlogPostTag),
  publishedAt: Type.Optional(Type.Number()),
  createdAt: Type.Number(),
  updatedAt: Type.Number(),
});

export type BlogPostBrief = Static<typeof BlogPostBrief>;
export const BlogPostBriefChecker = TypeCompiler.Compile(BlogPostBrief);

/**
 * Complete blog post with content
 */
export const BlogPostFull = Type.Composite([
  Type.Omit(BlogPostBrief, ["__type"]),
  Type.Object({
    __type: Type.Literal("BlogPostFull"),
    revision: BlogPostRevision,
  })
]);

export type BlogPostFull = Static<typeof BlogPostFull>;
export const BlogPostFullChecker = TypeCompiler.Compile(BlogPostFull);

/**
 * Blog post filter criteria
 */
export const BlogPostFilter = Type.Object({
  __type: Type.Literal("BlogPostFilter"),
  authorIds: Type.Optional(Type.Array(Type.String())),
  categoryIds: Type.Optional(Type.Array(BlogPostCategoryIds.TRichId)),
  tagIds: Type.Optional(Type.Array(BlogPostTagIds.TRichId)),
  tagSlugs: Type.Optional(Type.Array(Type.String())),
  publishedBefore: Type.Optional(Type.Number()),
  publishedAfter: Type.Optional(Type.Number()),
  textSearch: Type.Optional(Type.String()),
  includeUnpublished: Type.Optional(Type.Boolean()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
});

export type BlogPostFilter = Static<typeof BlogPostFilter>;
export const BlogPostFilterChecker = TypeCompiler.Compile(BlogPostFilter);

