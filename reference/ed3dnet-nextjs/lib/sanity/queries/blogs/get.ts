import { CONFIG } from "../../../config";
import { q, sanityQueryCDN, sanityQueryDirect } from "../../client";

import {
  type BlogContent,
  blogProjection,
  blogShortProjection,
} from "./_shared";

export type GetBlogPostParameters = {
  slug: string;
};

const getBlogPostQuery = q
  .parameters<GetBlogPostParameters>()
  .star.filterByType("blogPost")
  .filterBy("slug.current == $slug")
  .filterRaw(`stages.${CONFIG().SANITY_CONTENT_STAGE} == true`)
  .project(blogProjection);

export const getBlogPost = async (
  args: GetBlogPostParameters,
  bypassCdn?: boolean,
): Promise<BlogContent | null> => {
  const runner = bypassCdn ? sanityQueryDirect : sanityQueryCDN;
  console.log("getBlogPost", getBlogPostQuery, args);
  const [blogPost] = await runner(getBlogPostQuery, { parameters: args });

  return blogPost ?? null;
};
