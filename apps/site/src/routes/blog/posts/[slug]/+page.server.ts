import { error } from "@sveltejs/kit";

import type { BlogContent } from "../../../../lib/server/domain/blogs/projections.js";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { slug } = params;

  const logger = locals.logger.child({ fn: "/blog/posts/[slug]/+page.server.ts:load", params });
  const blogPost = await locals.deps.blogPosts.getBlogPost(
    {
      slug
    }
  );

  if (!blogPost) {
    logger.warn({ slug }, "Blog post not found");
    throw error(404, {
      message: "Blog post not found"
    });
  }

  logger.debug({ slug }, "Blog post found");

  const imageUrlsByKey: Record<string, string> = {};

  // TODO: this cast is not great. I'm not sure how to prove it's OK though.
  for (const item of blogPost.body as BlogContent["body"]) {
    if (item._type === "imageWithAlt" && item.image) {
      imageUrlsByKey[item._key] = item.image.url!;
    }
  }

  return {
    slug,
    blogPost,
    imageUrlsByKey
  };
};
