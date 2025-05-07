import { type InferFragmentType } from "groqd";

import { q } from "../../sanity/query-builder.js";
import type { LongFormBlockContent } from "../../sanity/sanity-content-types.js";

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

export const imageWithAltProjection = q
  .fragmentForType<"imageWithAlt">()
  .project((sub) => ({
    _type: sub.field("_type"),
    altText: sub.field("altText"),
    caption: sub.field("caption"),
    attribution: sub.field("attribution"),
    image: sub
      .field("image")
      .field("asset")
      .deref()
      // this WANTS to be notNull() but it blows up GRQOD
  }));
export type ImageWithAltContent = InferFragmentType<typeof imageWithAltProjection>;

export const youtubeEmbedProjection = q
  .fragmentForType<"youtubeEmbed">()
  .project((sub) => ({
    title: sub.field("title"),
    youtubeId: sub.field("youtubeId"),
  }));
export type YoutubeEmbedContent = InferFragmentType<typeof youtubeEmbedProjection>;

export const codeBlockProjection = q
  .fragmentForType<"codeBlock">()
  .project((sub) => ({
    _type: sub.field("_type"),
    code: sub.field("code").project(sub2 => ({
      language: sub2.field("language"),
      filename: sub2.field("filename"),
      code: sub2.field("code"),
      highlightedLines: sub2.field("highlightedLines[]"),
    })),
  }));
export type CodeBlockContent = InferFragmentType<typeof codeBlockProjection>;

  // LongFormBlockContent projection
export const longFormBlockContentProjection = q
  .fragment<LongFormBlockContent[number]>() // Using indexed type to get element type
  .project((bodySub) => ({
    _key: bodySub.field("_key"),
    _type: bodySub.field("_type"),

    ...bodySub.conditionalByType({
      block: {
        children: true,
        style: true,
        listItem: true,
        markDefs: true,
        level: true,
      },


      divider: {
        title: true,
      },

      blockQuote: {
        body: true,
        speaker: true,
        work: true,
        citeHref: true,
      },

      epigraph: {
        body: true,
        speaker: true,
        work: true,
        citeHref: true,
      },

      youtubeEmbed: youtubeEmbedProjection,
      imageWithAlt: imageWithAltProjection,
      codeBlock: codeBlockProjection,
    }),
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

    // Process each body array item with conditional handling
    body: sub.field("body[]").project(longFormBlockContentProjection),

    author: sub.field("author").deref().project(authorProjection),
    category: sub.field("category").deref().project(categoryShortProjection),
    tags: sub.field("tags[]").deref().project(tagShortProjection),
  }));


// Export types for the projections
export type BlogContent = InferFragmentType<typeof blogProjection>;
export type BlogShortContent = InferFragmentType<typeof blogShortProjection>;