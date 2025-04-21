import { type InferFragmentType } from "groqd";

import { q } from "../../sanity/query-builder.js";

// Author projection
export const authorProjection = q
  .fragmentForType<"author">()
  .project((sub) => ({
    slug: sub.field("slug.current", q.string()),
    fullName: sub.field("fullName"),
    shortName: sub.field("shortName"),
    email: sub.field("email"),
    url: sub.field("url"),

    avatar: sub
      .field("avatar.asset")
      .deref()
      .project((sub2) => ({
        altText: sub2.field("altText"),
        url: sub2.field("url"),
      })),
  }));

// Category projection (short version)
export const categoryShortProjection = q
  .fragmentForType<"blogCategory">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
    description: sub.field("description"),
  }));

// Tag projection (short version)
export const tagShortProjection = q
  .fragmentForType<"blogTag">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
  }));

// Blog projection (short version for listings)
export const blogShortProjection = q
  .fragmentForType<"blogPost">()
  .project((sub) => ({
    slug: sub.field("slug.current", q.string()),
    title: sub.field("title"),
    blurb: sub.field("blurb"),
    date: sub.field("date"),

    author: sub.field("author").deref().project(authorProjection),
    category: sub.field("category").deref().project(categoryShortProjection),
    tags: sub.field("tags[]").deref().project(tagShortProjection),
  }));

// Blog projection (full version with body content)
export const blogProjection = q
  .fragmentForType<"blogPost">()
  .project((sub) => ({
    slug: sub.field("slug.current", q.string()),
    title: sub.field("title"),
    blurb: sub.field("blurb"),
    date: sub.field("date"),
    body: sub.field("body[]"),

    author: sub.field("author").deref().project(authorProjection),
    category: sub.field("category").deref().project(categoryShortProjection),
    tags: sub.field("tags[]").deref().project(tagShortProjection),
  }));

// Export types for the projections
export type BlogContent = InferFragmentType<typeof blogProjection>;
export type BlogShortContent = InferFragmentType<typeof blogShortProjection>;