import { CONFIG } from "../../../config";
import { q, sanityQueryCDN, sanityQueryDirect } from "../../client";

import { blogProjection, blogShortProjection } from "./_shared";

export type ListBlogPostsParameters = {
  offset?: number;
  limit?: number;
  category?: string;
  tag?: string;
};
const listBlogPostsBaseQuery = (args: ListBlogPostsParameters) => {
  const count = args.limit ?? 10;
  const start = (args.offset ?? 0) * count;

  let ret01 = q
    .parameters<ListBlogPostsParameters>()
    .star.filterByType("blogPost")
    .filterRaw(`stages.${CONFIG().SANITY_CONTENT_STAGE} == true`);

  if (args.category) {
    ret01 = ret01.filterRaw("category->slug.current == $category");
  }

  if (args.tag) {
    ret01 = ret01.filterRaw(`$tag in tags[]->slug.current`);
  }

  ret01 = ret01
    .order("date desc")
    .order("title desc") // tiebreaker
    .slice(start, start + count);

  return ret01;
};

const listBlogPostsQuery = (args: ListBlogPostsParameters) => {
  return listBlogPostsBaseQuery(args).project(blogProjection);
};

const listBlogPostsShortQuery = (args: ListBlogPostsParameters) => {
  return listBlogPostsBaseQuery(args).project(blogShortProjection);
};

export const listBlogPosts = async (
  args: ListBlogPostsParameters,
  bypassCdn?: boolean,
) => {
  const runner = bypassCdn ? sanityQueryDirect : sanityQueryCDN;
  const ret = await runner(listBlogPostsQuery(args), { parameters: args });

  return ret;
};
export const listBlogPostsShort = async (
  args: ListBlogPostsParameters,
  bypassCdn?: boolean,
) => {
  const runner = bypassCdn ? sanityQueryDirect : sanityQueryCDN;
  const ret = await runner(listBlogPostsShortQuery(args), { parameters: args });

  return ret;
};
