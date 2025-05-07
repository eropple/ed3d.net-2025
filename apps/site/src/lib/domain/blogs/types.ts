import { type Static, Type } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";

// Basic types used across blog entities
export const SlugType = Type.Object({
  current: Type.String(),
});
export type SlugType = Static<typeof SlugType>;

export const ImageType = Type.Object({
  url: Type.String(),
  altText: Type.Optional(Type.String()),
});
export type ImageType = Static<typeof ImageType>;

// Author
export const AuthorType = Type.Object({
  slug: Type.String(),
  fullName: Type.String(),
  shortName: Type.String(),
  email: Type.String(),
  url: Type.String(),
  avatar: Type.Optional(ImageType),
});
export type AuthorType = Static<typeof AuthorType>;

// Category
export const CategoryType = Type.Object({
  slug: Type.String(),
  description: Type.Optional(Type.String()),
});
export type CategoryType = Static<typeof CategoryType>;

// Tag
export const TagType = Type.Object({
  slug: Type.String(),
});
export type TagType = Static<typeof TagType>;

// Blog content components
export const BlockType = Type.Object({
  _type: Type.String(),
  _key: Type.String(),
  children: Type.Optional(Type.Array(
    Type.Object({
      _type: Type.String(),
      _key: Type.String(),
      text: Type.Optional(Type.String()),
      marks: Type.Optional(Type.Array(Type.String())),
    })
  )),
  markDefs: Type.Optional(Type.Array(Type.Object({}))),
  style: Type.Optional(Type.String()),
});

// Image with alt
export const ImageWithAltType = Type.Object({
  _type: Type.Literal("imageWithAlt"),
  _key: Type.String(),
  altText: Type.String(),
  caption: Type.Optional(Type.String()),
  attribution: Type.Optional(Type.String()),
  image: Type.Object({
    url: Type.String(),
    extension: Type.Optional(Type.String()),
    lqip: Type.Optional(Type.String()),
  }),
});

// Code block
export const CodeBlockType = Type.Object({
  _type: Type.Literal("codeBlock"),
  _key: Type.String(),
  code: Type.Object({
    language: Type.Optional(Type.String()),
    filename: Type.Optional(Type.String()),
    code: Type.Optional(Type.String()),
    highlightedLines: Type.Optional(Type.Array(Type.Number())),
  }),
});

// YouTube embed
export const YouTubeEmbedType = Type.Object({
  _type: Type.Literal("youtubeEmbed"),
  _key: Type.String(),
  title: Type.Optional(Type.String()),
  youtubeId: Type.String(),
});

// Divider
export const DividerType = Type.Object({
  _type: Type.Literal("divider"),
  _key: Type.String(),
  title: Type.Optional(Type.String()),
});

// BlockQuote and Epigraph share similar structure
const QuoteBaseType = {
  _key: Type.String(),
  body: Type.Optional(Type.Array(Type.Object({}))), // Simplified
  speaker: Type.Optional(Type.String()),
  work: Type.Optional(Type.String()),
  citeHref: Type.Optional(Type.String()),
};

export const BlockQuoteType = Type.Object({
  _type: Type.Literal("blockQuote"),
  ...QuoteBaseType,
});

export const EpigraphType = Type.Object({
  _type: Type.Literal("epigraph"),
  ...QuoteBaseType,
});

// Replace BlogContentType with LongFormContentBlocksType
export const LongFormContentBlocksType = Type.Array(
  Type.Union([
    BlockType,
    ImageWithAltType,
    CodeBlockType,
    YouTubeEmbedType,
    DividerType,
    BlockQuoteType,
    EpigraphType,
  ])
);
export type LongFormContentBlocksType = Static<typeof LongFormContentBlocksType>;

// Blog post short (for listings)
export const BlogPostShortType = Type.Object({
  slug: Type.String(),
  title: Type.String(),
  blurb: Type.String(),
  date: Type.String(),
  author: AuthorType,
  category: CategoryType,
  tags: Type.Array(TagType),
});
export type BlogPostShortType = Static<typeof BlogPostShortType>;

// Full blog post
export const BlogPostType = Type.Object({
  slug: Type.String(),
  title: Type.String(),
  blurb: Type.String(),
  date: Type.String(),
  body: LongFormContentBlocksType,
  author: AuthorType,
  category: CategoryType,
  tags: Type.Array(TagType),
});
export type BlogPostType = Static<typeof BlogPostType>;

// Query parameters
export const GetBlogPostParamsType = Type.Object({
  slug: Type.String(),
});
export type GetBlogPostParamsType = Static<typeof GetBlogPostParamsType>;

export const ListBlogPostsParamsType = Type.Object({
  offset: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  category: Type.Optional(Type.String()),
  tag: Type.Optional(Type.String()),
});
export type ListBlogPostsParamsType = Static<typeof ListBlogPostsParamsType>;

// Blog counts
export const CategoryCountType = Type.Object({
  slug: Type.String(),
  description: Type.String(),
  total: Type.Number(),
});
export type CategoryCountType = Static<typeof CategoryCountType>;

export const BlogCountsType = Type.Object({
  all: Type.Number(),
  categories: Type.Record(Type.String(), CategoryCountType),
  tags: Type.Record(Type.String(), Type.Number()),
  byMonths: Type.Record(Type.String(), Type.Number()),
});
export type BlogCountsType = Static<typeof BlogCountsType>;