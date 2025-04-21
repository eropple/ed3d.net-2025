import { type InferFragmentType } from "groqd";

import { q } from "../../client";
import { authorProjection } from "../authors";

export const categoryShortProjection = q
  .fragmentForType<"blogCategory">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
  }));
export const tagShortProjection = q
  .fragmentForType<"blogTag">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
  }));

export const blogShortProjection = q
  .fragmentForType<"blogPost">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
    title: sub.field("title"),
    blurb: sub.field("blurb"),
    date: sub.field("date"),

    author: sub.field("author").deref().project(authorProjection),
    category: sub.field("category").deref().project(categoryShortProjection),
    tags: sub.field("tags[]").deref().project(tagShortProjection),
  }));

export type BlogShortContent = InferFragmentType<typeof blogShortProjection>;

export const blogProjection = q
  .fragmentForType<"blogPost">()
  .project((sub) => ({
    slug: sub.field("slug").field("current", q.string()),
    title: sub.field("title"),
    blurb: sub.field("blurb"),
    date: sub.field("date"),
    body: sub.field("body[]"),

    author: sub.field("author").deref().project(authorProjection),
    category: sub.field("category").deref().project(categoryShortProjection),
    tags: sub.field("tags[]").deref().project(tagShortProjection),
  }));

export type BlogContent = InferFragmentType<typeof blogProjection>;
